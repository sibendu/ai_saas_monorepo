param(
  [string]$K8sPath = "k8s",
  [switch]$RunKubectl,
  [switch]$ValidateSchema
)

$ErrorActionPreference = "Stop"

function Assert-FileExists {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Missing required manifest: $Path"
  }
}

function Assert-Contains {
  param(
    [string]$Path,
    [string]$Pattern,
    [string]$Message
  )

  $content = Get-Content -Raw -LiteralPath $Path
  if ($content -notmatch $Pattern) {
    throw $Message
  }
}

$requiredFiles = @(
  "namespace.yaml",
  "configmap.yaml",
  "secret.yaml",
  "web-deployment.yaml",
  "web-service.yaml",
  "bff-deployment.yaml",
  "bff-service.yaml",
  "postgres-statefulset.yaml",
  "postgres-service.yaml",
  "postgres-pvc.yaml",
  "ingress.yaml"
)

foreach ($file in $requiredFiles) {
  Assert-FileExists (Join-Path $K8sPath $file)
}

Assert-Contains (Join-Path $K8sPath "bff-service.yaml") "type:\s*ClusterIP" `
  "BFF service must stay internal with type: ClusterIP."
Assert-Contains (Join-Path $K8sPath "web-deployment.yaml") "BFF_INTERNAL_URL" `
  "Web deployment must configure BFF_INTERNAL_URL."
Assert-Contains (Join-Path $K8sPath "configmap.yaml") "BFF_INTERNAL_URL:\s*http://saas-bff-service:3001" `
  "ConfigMap must target the internal BFF service name."
Assert-Contains (Join-Path $K8sPath "ingress.yaml") "saas-web-service" `
  "Ingress must route to the web service."

$ingressContent = Get-Content -Raw -LiteralPath (Join-Path $K8sPath "ingress.yaml")
if ($ingressContent -match "saas-bff-service") {
  throw "Ingress must not route to the BFF service."
}

$bffServiceContent = Get-Content -Raw -LiteralPath (Join-Path $K8sPath "bff-service.yaml")
if ($bffServiceContent -match "type:\s*(LoadBalancer|NodePort)") {
  throw "BFF service must not be LoadBalancer or NodePort."
}

foreach ($manifest in Get-ChildItem -LiteralPath $K8sPath -Filter "*.yaml") {
  Assert-Contains $manifest.FullName "(?m)^apiVersion:\s*\S+" "$($manifest.Name) must declare apiVersion."
  Assert-Contains $manifest.FullName "(?m)^kind:\s*\S+" "$($manifest.Name) must declare kind."
  Assert-Contains $manifest.FullName "(?m)^metadata:" "$($manifest.Name) must declare metadata."
  Assert-Contains $manifest.FullName "(?m)^\s+name:\s*\S+" "$($manifest.Name) must declare metadata.name."
}

if ($RunKubectl) {
  $kubectlArgs = @("apply", "--dry-run=client", "-f", $K8sPath)
  if (-not $ValidateSchema) {
    $kubectlArgs += "--validate=false"
  }

  & kubectl @kubectlArgs
  if ($LASTEXITCODE -ne 0) {
    throw "kubectl validation failed with exit code $LASTEXITCODE."
  }
}
