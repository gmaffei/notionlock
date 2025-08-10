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

# Build and deploy
echo "🔨 Building and starting containers..."
docker compose -f docker/docker-compose.yml --env-file .env up -d --build

# Wait for containers to start
echo "⏳ Waiting for containers to initialize..."
sleep 15

# Check container status
echo "📊 Container status:"
docker compose -f docker/docker-compose.yml ps

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
