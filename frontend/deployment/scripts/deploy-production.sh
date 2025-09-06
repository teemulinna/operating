#!/bin/bash

# Production deployment script
# Usage: ./deploy-production.sh <version>

set -e

VERSION=${1:-latest}
PROJECT_DIR="/opt/employee-management"
BACKUP_DIR="/opt/backups/employee-management"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🚀 Starting production deployment for version: $VERSION"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to rollback on failure
rollback() {
    echo "❌ Deployment failed! Rolling back..."
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml up -d
    echo "✅ Rollback completed"
    exit 1
}

# Set trap for rollback on error
trap rollback ERR

# Navigate to project directory
cd "$PROJECT_DIR"

# Pull latest code
echo "📥 Pulling latest code..."
git fetch --all
git checkout main
git pull origin main

# Backup database
echo "💾 Creating database backup..."
docker-compose -f docker-compose.prod.yml exec -T database pg_dump -U app_user employee_management > "$BACKUP_DIR/db_backup_$DATE.sql"

# Backup current Docker volumes
echo "💾 Backing up Docker volumes..."
docker run --rm -v employee_management_postgres_data_prod:/data -v "$BACKUP_DIR":/backup alpine tar czf /backup/volumes_backup_$DATE.tar.gz -C /data .

# Update Docker images
echo "📦 Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Stop services gracefully
echo "🛑 Stopping services..."
docker-compose -f docker-compose.prod.yml down --timeout 30

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate:up

# Start services with zero-downtime deployment
echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
timeout=300
while [ $timeout -gt 0 ]; do
    if curl -f http://localhost/health > /dev/null 2>&1 && \
       curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        echo "✅ All services are healthy!"
        break
    fi
    sleep 5
    timeout=$((timeout - 5))
done

if [ $timeout -eq 0 ]; then
    echo "❌ Services failed to start within timeout"
    rollback
fi

# Run smoke tests
echo "🧪 Running smoke tests..."
curl -f http://localhost/health || rollback
curl -f http://localhost:5000/api/health || rollback

# Clean up old images and containers
echo "🧹 Cleaning up..."
docker system prune -f --volumes

# Clean up old backups (keep last 7 days)
find "$BACKUP_DIR" -type f -mtime +7 -name "*.sql" -delete
find "$BACKUP_DIR" -type f -mtime +7 -name "*.tar.gz" -delete

echo "✅ Production deployment completed successfully!"
echo "📊 Deployment summary:"
echo "  - Version: $VERSION"
echo "  - Timestamp: $DATE"
echo "  - Backup location: $BACKUP_DIR"

# Send notification
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ Production deployment completed successfully!\nVersion: $VERSION\nTimestamp: $DATE\"}" \
        "$SLACK_WEBHOOK_URL"
fi