@echo off
setlocal

if "%SERVICE_NAME%"=="" set "SERVICE_NAME=ai-saas-demo"

set "REGISTRY_ID=%REGISTRY_ID: =%"
set "AWS_REGION=%AWS_REGION: =%"
set "CLUSTER_NAME=%CLUSTER_NAME: =%"
set "EXECUTION_ROLE_ARN=%EXECUTION_ROLE_ARN: =%"
set "SUBNET_ID=%SUBNET_ID: =%"
set "SECURITY_GROUP_ID=%SECURITY_GROUP_ID: =%"
set "SERVICE_NAME=%SERVICE_NAME: =%"

if "%REGISTRY_ID%"=="" (
  echo REGISTRY_ID is not set.
  exit /b 1
)

if "%AWS_REGION%"=="" (
  echo AWS_REGION is not set.
  exit /b 1
)

if "%CLUSTER_NAME%"=="" (
  echo CLUSTER_NAME is not set.
  exit /b 1
)

if "%EXECUTION_ROLE_ARN%"=="" (
  echo EXECUTION_ROLE_ARN is not set.
  exit /b 1
)

if "%NEXTAUTH_URL%"=="" (
  echo NEXTAUTH_URL is not set.
  exit /b 1
)

if "%NEXTAUTH_SECRET%"=="" (
  echo NEXTAUTH_SECRET is not set.
  exit /b 1
)

if "%SUBNET_ID%"=="" (
  echo SUBNET_ID is not set.
  exit /b 1
)

if "%SECURITY_GROUP_ID%"=="" (
  echo SECURITY_GROUP_ID is not set.
  exit /b 1
)

set "TASK_FAMILY=ai-saas-demo"
set "LOG_GROUP_NAME=/ecs/ai-saas-demo"
set "DATABASE_URL=file:/tmp/saas-demo/demo.db"
set "REGISTRY=%REGISTRY_ID%"
if "%REGISTRY:~-1%"=="/" set "REGISTRY=%REGISTRY:~0,-1%"
set "WEB_IMAGE=%REGISTRY%/saasweb"
set "BFF_IMAGE=%REGISTRY%/saasbff"
set "SCRIPT_DIR=%~dp0"
set "TASK_DEF_FILE=%SCRIPT_DIR%task-definition.generated.json"
set "SERVICE_FILE=%SCRIPT_DIR%service.generated.json"

echo Creating CloudWatch log group if needed...
aws logs create-log-group --region "%AWS_REGION%" --log-group-name "%LOG_GROUP_NAME%" >nul 2>nul

echo Writing task definition...
(
echo {
echo   "family": "%TASK_FAMILY%",
echo   "networkMode": "awsvpc",
echo   "requiresCompatibilities": ["FARGATE"],
echo   "cpu": "1024",
echo   "memory": "2048",
echo   "executionRoleArn": "%EXECUTION_ROLE_ARN%",
echo   "runtimePlatform": {
echo     "cpuArchitecture": "X86_64",
echo     "operatingSystemFamily": "LINUX"
echo   },
echo   "containerDefinitions": [
echo     {
echo       "name": "bff",
echo       "image": "%BFF_IMAGE%",
echo       "essential": true,
echo       "portMappings": [
echo         { "containerPort": 3001, "protocol": "tcp", "appProtocol": "http" }
echo       ],
echo       "environment": [
echo         { "name": "PORT", "value": "3001" },
echo         { "name": "WEB_APP_URL", "value": "%NEXTAUTH_URL%" },
echo         { "name": "DB_PROVIDER", "value": "sqlite" },
echo         { "name": "DATABASE_URL", "value": "%DATABASE_URL%" },
echo         { "name": "DB_BOOTSTRAP_ON_START", "value": "true" },
echo         { "name": "DB_SEED_ON_START", "value": "false" }
echo       ],
echo       "logConfiguration": {
echo         "logDriver": "awslogs",
echo         "options": {
echo           "awslogs-group": "%LOG_GROUP_NAME%",
echo           "awslogs-region": "%AWS_REGION%",
echo           "awslogs-stream-prefix": "bff"
echo         }
echo       }
echo     },
echo     {
echo       "name": "web",
echo       "image": "%WEB_IMAGE%",
echo       "essential": true,
echo       "dependsOn": [
echo         { "containerName": "bff", "condition": "START" }
echo       ],
echo       "portMappings": [
echo         { "containerPort": 3000, "protocol": "tcp", "appProtocol": "http" }
echo       ],
echo       "environment": [
echo         { "name": "PORT", "value": "3000" },
echo         { "name": "HOSTNAME", "value": "0.0.0.0" },
echo         { "name": "NEXTAUTH_URL", "value": "%NEXTAUTH_URL%" },
echo         { "name": "NEXTAUTH_SECRET", "value": "%NEXTAUTH_SECRET%" },
echo         { "name": "WEB_APP_URL", "value": "%NEXTAUTH_URL%" },
echo         { "name": "BFF_INTERNAL_URL", "value": "http://localhost:3001" },
echo         { "name": "NEXT_PUBLIC_BFF_URL", "value": "http://localhost:3001" },
echo         { "name": "STYLE", "value": "default" },
echo         { "name": "MENU_LAYOUT", "value": "left" },
echo         { "name": "DB_PROVIDER", "value": "sqlite" },
echo         { "name": "DATABASE_URL", "value": "%DATABASE_URL%" },
echo         { "name": "DB_BOOTSTRAP_ON_START", "value": "true" },
echo         { "name": "DB_SEED_ON_START", "value": "true" }
echo       ],
echo       "logConfiguration": {
echo         "logDriver": "awslogs",
echo         "options": {
echo           "awslogs-group": "%LOG_GROUP_NAME%",
echo           "awslogs-region": "%AWS_REGION%",
echo           "awslogs-stream-prefix": "web"
echo         }
echo       }
echo     }
echo   ]
echo }
) > "%TASK_DEF_FILE%"

echo Registering task definition...
for /f "usebackq delims=" %%A in (`aws ecs register-task-definition --region "%AWS_REGION%" --cli-input-json "file://%TASK_DEF_FILE%" --query "taskDefinition.taskDefinitionArn" --output text`) do set "TASK_DEFINITION_ARN=%%A"

if "%TASK_DEFINITION_ARN%"=="" (
  echo Failed to register task definition.
  exit /b 1
)

echo Registered task definition: %TASK_DEFINITION_ARN%

set "NETWORK_CONFIG=awsvpcConfiguration={subnets=[%SUBNET_ID%],securityGroups=[%SECURITY_GROUP_ID%],assignPublicIp=ENABLED}"

aws ecs describe-services --region "%AWS_REGION%" --cluster "%CLUSTER_NAME%" --services "%SERVICE_NAME%" --query "services[0].status" --output text > "%TEMP%\ecs-service-status.txt" 2>nul
set /p SERVICE_STATUS=<"%TEMP%\ecs-service-status.txt"

if /i "%SERVICE_STATUS%"=="ACTIVE" (
  echo Updating ECS service: %SERVICE_NAME%
  aws ecs update-service --region "%AWS_REGION%" --cluster "%CLUSTER_NAME%" --service "%SERVICE_NAME%" --task-definition "%TASK_DEFINITION_ARN%" --desired-count 1 --network-configuration "%NETWORK_CONFIG%" --force-new-deployment
) else (
  echo Writing service definition...
  (
  echo {
  echo   "cluster": "%CLUSTER_NAME%",
  echo   "serviceName": "%SERVICE_NAME%",
  echo   "taskDefinition": "%TASK_DEFINITION_ARN%",
  echo   "desiredCount": 1,
  echo   "launchType": "FARGATE",
  echo   "platformVersion": "1.4.0",
  echo   "networkConfiguration": {
  echo     "awsvpcConfiguration": {
  echo       "subnets": ["%SUBNET_ID%"],
  echo       "securityGroups": ["%SECURITY_GROUP_ID%"],
  echo       "assignPublicIp": "ENABLED"
  echo     }
  echo   },
  echo   "deploymentConfiguration": {
  echo     "maximumPercent": 200,
  echo     "minimumHealthyPercent": 0
  echo   }
  echo }
  ) > "%SERVICE_FILE%"

  echo Creating ECS service: %SERVICE_NAME%
  aws ecs create-service --region "%AWS_REGION%" --cli-input-json "file://%SERVICE_FILE%"
)

if errorlevel 1 (
  echo ECS deployment command failed.
  exit /b 1
)

echo Waiting for service to become stable...
aws ecs wait services-stable --region "%AWS_REGION%" --cluster "%CLUSTER_NAME%" --services "%SERVICE_NAME%"

if errorlevel 1 (
  echo Service did not become stable. Check ECS service events and CloudWatch logs.
  exit /b 1
)

echo Looking up task public IP...
for /f "usebackq delims=" %%A in (`aws ecs list-tasks --region "%AWS_REGION%" --cluster "%CLUSTER_NAME%" --service-name "%SERVICE_NAME%" --desired-status RUNNING --query "taskArns[0]" --output text`) do set "TASK_ARN=%%A"
for /f "usebackq delims=" %%A in (`aws ecs describe-tasks --region "%AWS_REGION%" --cluster "%CLUSTER_NAME%" --tasks "%TASK_ARN%" --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value | [0]" --output text`) do set "ENI_ID=%%A"
for /f "usebackq delims=" %%A in (`aws ec2 describe-network-interfaces --region "%AWS_REGION%" --network-interface-ids "%ENI_ID%" --query "NetworkInterfaces[0].Association.PublicIp" --output text`) do set "PUBLIC_IP=%%A"

echo Deployment complete.
echo Web image: %WEB_IMAGE%
echo BFF image: %BFF_IMAGE%
echo Public URL: http://%PUBLIC_IP%:3000

if /i "%NEXTAUTH_URL%"=="http://localhost:3000" (
  echo.
  echo NEXTAUTH_URL is still http://localhost:3000.
  echo Logout and auth redirects will use localhost until you redeploy with the public URL.
  echo.
  echo Rerun:
  echo set NEXTAUTH_URL=http://%PUBLIC_IP%:3000
  echo deploy\ecs\demo\deploy.bat
)
