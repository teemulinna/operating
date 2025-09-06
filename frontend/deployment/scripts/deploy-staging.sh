#!/bin/bash

# Staging deployment script
# Usage: ./deploy-staging.sh

set -e

PROJECT_DIR="/opt/employee-management"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🚀 Starting staging deployment..."

# Navigate to project directory
cd "$PROJECT_DIR"

# Pull latest code
echo "📥 Pulling latest code..."
git fetch --all
git checkout develop
git pull origin develop

# Stop current services
echo "🛑 Stopping current services..."
docker-compose -f docker-compose.staging.yml down

# Remove old volumes for fresh start
echo "🧹 Cleaning up old data..."
docker volume prune -f

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.staging.yml up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.staging.yml exec -T backend npm run migrate:up

# Seed test data
echo "🌱 Seeding test data..."
docker-compose -f docker-compose.staging.yml exec -T backend npm run seed:staging

# Run health checks
echo "🔍 Running health checks..."
curl -f http://staging.yourdomain.com/health || { echo "❌ Frontend health check failed"; exit 1; }
curl -f http://staging-api.yourdomain.com/health || { echo "❌ Backend health check failed"; exit 1; }

# Clean up
echo "🧹 Cleaning up..."
docker system prune -f

echo "✅ Staging deployment completed successfully!"

# Send notification
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ Staging deployment completed successfully!\nTimestamp: $DATE\nURL: http://staging.yourdomain.com\"}" \
        "$SLACK_WEBHOOK_URL"
fi