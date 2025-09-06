#!/bin/bash

# Database backup script
# Usage: ./backup-database.sh [environment]

set -e

ENVIRONMENT=${1:-production}
BACKUP_DIR="/opt/backups/employee-management"
DATE=$(date +%Y%m%d_%H%M%S)
COMPOSE_FILE="docker-compose.prod.yml"

if [ "$ENVIRONMENT" = "staging" ]; then
    COMPOSE_FILE="docker-compose.staging.yml"
fi

echo "📦 Creating database backup for $ENVIRONMENT environment..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create database dump
docker-compose -f "$COMPOSE_FILE" exec -T database pg_dump -U app_user employee_management > "$BACKUP_DIR/db_${ENVIRONMENT}_${DATE}.sql"

# Compress the backup
gzip "$BACKUP_DIR/db_${ENVIRONMENT}_${DATE}.sql"

# Create volume backup
docker run --rm \
    -v employee_management_postgres_data_prod:/data \
    -v "$BACKUP_DIR":/backup \
    alpine tar czf "/backup/volumes_${ENVIRONMENT}_${DATE}.tar.gz" -C /data .

# Clean up old backups (keep last 30 days for production, 7 days for staging)
RETENTION_DAYS=30
if [ "$ENVIRONMENT" = "staging" ]; then
    RETENTION_DAYS=7
fi

find "$BACKUP_DIR" -type f -name "db_${ENVIRONMENT}_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -type f -name "volumes_${ENVIRONMENT}_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Database backup completed: $BACKUP_DIR/db_${ENVIRONMENT}_${DATE}.sql.gz"

# Upload to S3 if configured
if [ -n "$AWS_S3_BACKUP_BUCKET" ]; then
    echo "☁️ Uploading backup to S3..."
    aws s3 cp "$BACKUP_DIR/db_${ENVIRONMENT}_${DATE}.sql.gz" "s3://$AWS_S3_BACKUP_BUCKET/database/"
    aws s3 cp "$BACKUP_DIR/volumes_${ENVIRONMENT}_${DATE}.tar.gz" "s3://$AWS_S3_BACKUP_BUCKET/volumes/"
    echo "✅ Backup uploaded to S3"
fi