#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: ./build.sh <registry_id>"
  echo "Example: ./build.sh 123456789012.dkr.ecr.ap-south-1.amazonaws.com"
  exit 1
fi

REGISTRY_ID="${1%/}"

WEB_IMAGE="${REGISTRY_ID}/saasweb"
BFF_IMAGE="${REGISTRY_ID}/saasbff"

docker build -f ./apps/web/Dockerfile -t "${WEB_IMAGE}" .
docker build -f ./apps/bff/Dockerfile -t "${BFF_IMAGE}" .

docker push "${WEB_IMAGE}"
docker push "${BFF_IMAGE}"

echo "Pushed web image: ${WEB_IMAGE}"
echo "Pushed BFF image: ${BFF_IMAGE}"

