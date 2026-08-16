param(
  [Parameter(Mandatory = $true)]
  [string]$RegistryId
)

$ErrorActionPreference = "Stop"

$registry = $RegistryId.TrimEnd("/")
$webImage = "${registry}/saasweb"
$bffImage = "${registry}/saasbff"

docker build -f ".\apps\web\Dockerfile" -t $webImage .
docker build -f ".\apps\bff\Dockerfile" -t $bffImage .

docker push $webImage
docker push $bffImage

Write-Host "Pushed web image: $webImage"
Write-Host "Pushed BFF image: $bffImage"
