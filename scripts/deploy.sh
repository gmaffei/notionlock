#!/bin/bash

echo "🚀 Deploying NotionLock..."

# Build images
docker-compose -f docker/docker-compose.yml build

# Deploy
docker-compose -f docker/docker-compose.yml up -d

echo "✅ Deployment completed!"
