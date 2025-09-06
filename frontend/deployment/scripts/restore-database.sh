#!/bin/bash

# Database restore script
# Usage: ./restore-database.sh <backup_file> [environment]

set -e

BACKUP_FILE="$1"
ENVIRONMENT=${2:-production}
COMPOSE_FILE="docker-compose.prod.yml"

if [ -z "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file path is required"
    echo "Usage: ./restore-database.sh <backup_file> [environment]"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

if [ "$ENVIRONMENT" = "staging" ]; then
    COMPOSE_FILE="docker-compose.staging.yml"
fi

echo "⚠️  WARNING: This will restore the database from backup!"
echo "Environment: $ENVIRONMENT"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    exit 1
fi

echo "🔄 Starting database restore..."

# Stop the application to prevent connections
echo "🛑 Stopping application services..."
docker-compose -f "$COMPOSE_FILE" stop backend frontend

# Create a backup of current database before restore
echo "💾 Creating backup of current database..."
CURRENT_BACKUP="/tmp/pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql"
docker-compose -f "$COMPOSE_FILE" exec -T database pg_dump -U app_user employee_management > "$CURRENT_BACKUP"
echo "Current database backed up to: $CURRENT_BACKUP"

# Drop and recreate database
echo "🗄️ Recreating database..."
docker-compose -f "$COMPOSE_FILE" exec -T database psql -U app_user -d postgres -c "DROP DATABASE IF EXISTS employee_management;"
docker-compose -f "$COMPOSE_FILE" exec -T database psql -U app_user -d postgres -c "CREATE DATABASE employee_management;"

# Restore from backup
echo "📥 Restoring database from backup..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker-compose -f "$COMPOSE_FILE" exec -T database psql -U app_user -d employee_management
else
    cat "$BACKUP_FILE" | docker-compose -f "$COMPOSE_FILE" exec -T database psql -U app_user -d employee_management
fi

# Start services
echo "🚀 Starting application services..."
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Run health checks
echo "🔍 Running health checks..."
if curl -f http://localhost/health > /dev/null 2>&1 && \
   curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Database restore completed successfully!"
    echo "💾 Previous database backed up to: $CURRENT_BACKUP"
else
    echo "❌ Health checks failed after restore"
    echo "🔄 Consider rolling back using: $CURRENT_BACKUP"
    exit 1
fi