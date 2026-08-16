@echo off
setlocal

if "%AWS_REGION%"=="" (
  echo AWS_REGION is not set.
  echo Set AWS_REGION and CLUSTER_NAME first, or pass values by setting environment variables.
  exit /b 1
)

if "%CLUSTER_NAME%"=="" (
  echo CLUSTER_NAME is not set.
  exit /b 1
)

if "%SERVICE_NAME%"=="" set "SERVICE_NAME=ai-saas-demo"
if "%TASK_FAMILY%"=="" set "TASK_FAMILY=ai-saas-demo"
if "%LOG_GROUP_NAME%"=="" set "LOG_GROUP_NAME=/ecs/ai-saas-demo"

set "AWS_REGION=%AWS_REGION: =%"
set "CLUSTER_NAME=%CLUSTER_NAME: =%"
set "SERVICE_NAME=%SERVICE_NAME: =%"
set "TASK_FAMILY=%TASK_FAMILY: =%"

echo Undeploying ECS demo service...
echo Region: %AWS_REGION%
echo Cluster: %CLUSTER_NAME%
echo Service: %SERVICE_NAME%
echo Task family: %TASK_FAMILY%
echo Log group: %LOG_GROUP_NAME%
echo.

echo Checking ECS service...
aws ecs describe-services --region "%AWS_REGION%" --cluster "%CLUSTER_NAME%" --services "%SERVICE_NAME%" --query "services[0].status" --output text > "%TEMP%\ecs-demo-service-status.txt" 2>nul
set /p SERVICE_STATUS=<"%TEMP%\ecs-demo-service-status.txt"

if /i "%SERVICE_STATUS%"=="ACTIVE" (
  echo Scaling service to zero...
  aws ecs update-service --region "%AWS_REGION%" --cluster "%CLUSTER_NAME%" --service "%SERVICE_NAME%" --desired-count 0 >nul

  echo Waiting for running tasks to stop...
  aws ecs wait services-stable --region "%AWS_REGION%" --cluster "%CLUSTER_NAME%" --services "%SERVICE_NAME%"

  echo Deleting ECS service...
  aws ecs delete-service --region "%AWS_REGION%" --cluster "%CLUSTER_NAME%" --service "%SERVICE_NAME%" --force >nul

  echo Waiting for service deletion...
  aws ecs wait services-inactive --region "%AWS_REGION%" --cluster "%CLUSTER_NAME%" --services "%SERVICE_NAME%"
) else (
  echo ECS service is not active or was not found. Skipping service deletion.
)

echo Deregistering active task definitions for family %TASK_FAMILY%...
for /f "usebackq delims=" %%A in (`aws ecs list-task-definitions --region "%AWS_REGION%" --family-prefix "%TASK_FAMILY%" --status ACTIVE --query "taskDefinitionArns[]" --output text`) do (
  for %%B in (%%A) do (
    echo Deregistering %%B
    aws ecs deregister-task-definition --region "%AWS_REGION%" --task-definition "%%B" >nul
  )
)

echo Deleting CloudWatch log group if it exists...
aws logs delete-log-group --region "%AWS_REGION%" --log-group-name "%LOG_GROUP_NAME%" >nul 2>nul

echo.
echo Undeploy complete.
echo Left untouched: ECS cluster, subnet, security group, ECR repositories/images, IAM roles.
