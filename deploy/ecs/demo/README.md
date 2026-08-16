# ECS Demo Deployment

This folder contains the simplest ECS/Fargate demo deployment for the SaaS app.

It deploys one ECS service with one Fargate task containing two containers:

- `web`: Next.js app on port `3000`, exposed through the task public IP
- `bff`: Express BFF on port `3001`, available only inside the task through `localhost:3001`

Demo mode uses SQLite inside the task filesystem. Keep desired count at `1`; each Fargate task has its own local SQLite file.

## What This Deployment Uses

```text
1 VPC
1 public subnet
1 ECS Fargate service
1 public IP on the ECS task
1 security group allowing inbound TCP 3000
No ALB
No target group
No NAT gateway
```

## Files

- `deploy.bat`: creates or updates the ECS service
- `undeploy.bat`: removes the ECS demo service, task definitions, and demo log group
- `set-input.bat.example`: template for local deployment variables
- `set-input.bat`: your local variable file; ignored by git

## Step 1: Build And Push Docker Images

From the project root, run:

```bash
./build.sh <registry_id>
```

Example:

```bash
./build.sh <aws-account-id>.dkr.ecr.eu-west-1.amazonaws.com
```

This builds and pushes:

```text
<registry_id>/saasweb
<registry_id>/saasbff
```

On Windows PowerShell, you can use:

```powershell
.\build.ps1 -RegistryId "<aws-account-id>.dkr.ecr.eu-west-1.amazonaws.com"
```

## Step 2: Prepare AWS Resources

Create or identify these AWS resources:

- VPC
- one public subnet in that VPC
- security group in the same VPC
- ECS cluster
- ECS task execution role
- ECR repositories/images for `saasweb` and `saasbff`

The subnet must be public. Its route table must include:

```text
0.0.0.0/0 -> Internet Gateway
```

The security group must allow inbound access to the web container:

```text
TCP 3000 from your IP/32
```

For a quick temporary demo, you can allow:

```text
TCP 3000 from 0.0.0.0/0
```

Outbound should allow all traffic.

## Step 3: Create set-input.bat

Copy the example file:

```bat
copy deploy\ecs\demo\set-input.bat.example deploy\ecs\demo\set-input.bat
```

Edit `deploy\ecs\demo\set-input.bat` with your real values.

`set-input.bat` is ignored by git so account IDs, subnet IDs, security group IDs, and secrets are not accidentally committed.

Example shape:

```bat
set REGISTRY_ID=<aws-account-id>.dkr.ecr.eu-west-1.amazonaws.com
set AWS_REGION=eu-west-1
set CLUSTER_NAME=aitest-cluster
set EXECUTION_ROLE_ARN=arn:aws:iam::<aws-account-id>:role/ecsTaskExecutionRole
set NEXTAUTH_URL=http://localhost:3000
set NEXTAUTH_SECRET=replace-with-a-secret
set SUBNET_ID=subnet-xxxxxxxx
set SECURITY_GROUP_ID=sg-xxxxxxxx
set SERVICE_NAME=aitest-svc
```

Generate a stronger `NEXTAUTH_SECRET` with:

```bat
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 4: Deploy

From the project root, load the variables:

```bat
deploy\ecs\demo\set-input.bat
```

Then deploy:

```bat
deploy\ecs\demo\deploy.bat
```

The script will:

- create the CloudWatch log group if needed
- generate a task definition
- register the task definition
- create or update the ECS service
- wait for the service to stabilize
- print the public URL

Open the printed URL:

```text
http://<task-public-ip>:3000
```

Use `http`, not `https`, for this simple public-IP deployment.

## Step 5: Update NEXTAUTH_URL

On the first run, `NEXTAUTH_URL` is usually:

```text
http://localhost:3000
```

After deployment, the script prints the task public URL.

Edit `deploy\ecs\demo\set-input.bat` and change:

```bat
set NEXTAUTH_URL=http://localhost:3000
```

to:

```bat
set NEXTAUTH_URL=http://<task-public-ip>:3000
```

Then reload variables and redeploy:

```bat
deploy\ecs\demo\set-input.bat
deploy\ecs\demo\deploy.bat
```

This keeps auth-related URLs aligned with the deployed site. The application logout button also avoids server-side redirects, so it should stay on the current host.

Why this is two steps: AWS assigns the Fargate public IP only after the task starts, but `NEXTAUTH_URL` is read when the container starts. Updating it requires a new task.

## Step 6: Undeploy

Load the same variables:

```bat
deploy\ecs\demo\set-input.bat
```

Run:

```bat
deploy\ecs\demo\undeploy.bat
```

This removes:

- ECS service
- active task definitions for the demo task family
- CloudWatch log group `/ecs/ai-saas-demo`

It intentionally leaves these untouched:

- ECS cluster
- VPC
- subnet
- security group
- ECR repositories/images
- IAM roles

## Useful AWS Commands

List ECS clusters:

```bat
aws ecs list-clusters --region eu-west-1
```

Get the ECS execution role ARN:

```bat
aws iam get-role --role-name ecsTaskExecutionRole --query "Role.Arn" --output text
```

List subnets:

```bat
aws ec2 describe-subnets --region eu-west-1 --query "Subnets[*].[SubnetId,VpcId,AvailabilityZone,MapPublicIpOnLaunch]" --output table
```

List security groups:

```bat
aws ec2 describe-security-groups --region eu-west-1 --query "SecurityGroups[*].[GroupId,GroupName,VpcId]" --output table
```

Confirm images exist:

```bat
aws ecr describe-images --region eu-west-1 --repository-name saasweb
aws ecr describe-images --region eu-west-1 --repository-name saasbff
```

## Later: Move Behind An Existing ALB

This is possible, but it should be done by updating the ECS service to use an ALB target group. Do not manually attach an ALB to one running task.

The target group should use:

```text
Target type: ip
Protocol: HTTP
Port: 3000
Health check path: /login
Same VPC as the ECS service
```

After moving behind the ALB:

- set `NEXTAUTH_URL` to the ALB URL or domain
- restrict ECS task inbound `TCP 3000` to the ALB security group
- disable public IP only if the task still has outbound access through NAT or VPC endpoints

An ALB handles inbound traffic only. Without public IP, the task still needs outbound access for image pulls and logs.

