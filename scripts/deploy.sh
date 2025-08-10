#!/bin/bash
set -e

echo "🚀 Starting NotionLock deployment..."

# Check if we're in the right directory
if [ ! -f "docker/docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

# Copy production environment
echo "🔧 Setting up production environment..."
if [ -f ".env_prod" ]; then
    cp .env_prod .env
    echo "✅ Production environment configured"
else
    echo "⚠️  Warning: .env_prod not found, using existing .env"
fi

# Stop current containers
echo "🛑 Stopping current containers..."
docker compose -f docker/docker-compose.yml down --timeout 30 || true

# Pull latest images
echo "📥 Pulling base images..."
docker compose -f docker/docker-compose.yml pull postgres redis || true

# Nuclear option: complete frontend rebuild
echo "☢️  NUCLEAR REBUILD: Removing ALL frontend traces..."
docker compose -f docker/docker-compose.yml stop frontend || true
docker compose -f docker/docker-compose.yml rm -f frontend || true

# Remove ALL related images
echo "🗑️  Removing all notionlock images..."
docker images | grep notionlock | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

# Clean ALL docker cache
echo "🧹 Nuclear cleaning of Docker cache..."
docker builder prune -af || true
docker system prune -f || true

# Verify frontend code is latest
echo "📝 Latest commits:"
git log --oneline -3

# Build frontend completely fresh
echo "🔨 Building frontend from absolute scratch..."
DOCKER_BUILDKIT=0 docker compose -f docker/docker-compose.yml --env-file .env build --no-cache --pull frontend

echo "🚀 Starting all containers..."
docker compose -f docker/docker-compose.yml --env-file .env up -d

# Wait for containers to start
echo "⏳ Waiting for containers to initialize..."
sleep 15

# Check container status
echo "📊 Container status:"
docker compose -f docker/docker-compose.yml ps

# Check if frontend built correctly
echo "🔍 Checking frontend build..."
if docker compose -f docker/docker-compose.yml exec frontend ls /usr/share/nginx/html/static/js/ >/dev/null 2>&1; then
    echo "✅ Frontend static files found"
    
    # Check if our debug message is in the built JS
    echo "🔍 Checking if new code is in build..."
    if docker compose -f docker/docker-compose.yml exec frontend grep -r "Header rendered, current language" /usr/share/nginx/html/static/js/ >/dev/null 2>&1; then
        echo "✅ New debug code found in build!"
    else
        echo "❌ Debug code NOT found - build might be using old cache"
    fi
else
    echo "❌ Frontend build might have failed - no static files found"
fi

# Health checks
echo "🔍 Running health checks..."
sleep 5

# Test API health
if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend API is healthy"
else
    echo "⚠️  Backend API might not be ready yet (this is normal on first deployment)"
fi

# Clean up old images
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Services should be available at:"
echo "   🌐 Frontend: https://notionlock.com"
echo "   🔧 API: https://api.notionlock.com"
echo ""
echo "📝 To check logs: docker compose -f docker/docker-compose.yml logs -f"
echo "🔄 To restart: docker compose -f docker/docker-compose.yml restart"
