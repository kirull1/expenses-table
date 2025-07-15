#!/bin/bash

set -e

export ENV="${ENV:=testing}"
export BUILD_TIMESTAMP=$(date +%s)

# Default values
REGISTRY="cr.yandex/crp3olms00pvav1sae1q"
REPOSITORY="expenses"
TAG=${ENV}

FULL_IMAGE_NAME_FRONTEND="${REGISTRY}/${REPOSITORY}/frontend:${TAG}"
FULL_IMAGE_NAME_SERVER="${REGISTRY}/${REPOSITORY}/server:${TAG}"

echo "===== Building Docker images ====="

echo "Building Docker image directly from project..."
# Build frontend image with build arguments
docker build  --platform linux/amd64 \
  --build-arg NODE_ENV=${ENV} \
  --build-arg BUILD_TIMESTAMP=${BUILD_TIMESTAMP} \
  -t ${FULL_IMAGE_NAME_FRONTEND} \
  -f Dockerfile .

# Build server image with build arguments
docker build --platform linux/amd64 \
  --build-arg NODE_ENV=${ENV} \
  -t ${FULL_IMAGE_NAME_SERVER} \
  -f Dockerfile-server .

echo "===== Docker image built successfully ====="

# Check if we need to push the image
echo "===== Pushing Docker image to registry ====="

docker login ${REGISTRY}

# Push the images
docker push ${FULL_IMAGE_NAME_FRONTEND}
docker push ${FULL_IMAGE_NAME_SERVER}

echo "===== Docker image pushed successfully to ${FULL_IMAGE_NAME_FRONTEND} and ${FULL_IMAGE_NAME_SERVER} ====="

echo "===== Release process completed ====="
