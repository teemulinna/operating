#!/bin/bash

# Employee Management System Deployment Script
# Usage: ./deploy.sh [environment] [options]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT=${1:-production}
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/deployment/docker/docker-compose.yml"

# Default values
BACKUP_BEFORE_DEPLOY=true
RUN_MIGRATIONS=true
RUN_TESTS=false
FORCE_RECREATE=false
NO_CACHE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --no-backup)
      BACKUP_BEFORE_DEPLOY=false
      shift
      ;;
    --no-migrations)
      RUN_MIGRATIONS=false
      shift
      ;;
    --run-tests)
      RUN_TESTS=true
      shift
      ;;
    --force-recreate)
      FORCE_RECREATE=true
      shift
      ;;
    --no-cache)
      NO_CACHE=true
      shift
      ;;
    --help)
      echo "Usage: $0 [environment] [options]"
      echo "Options:"
      echo "  --no-backup       Skip database backup"
      echo "  --no-migrations   Skip database migrations"
      echo "  --run-tests       Run tests before deployment"
      echo "  --force-recreate  Force recreate containers"
      echo "  --no-cache        Build without cache"
      echo "  --help           Show this help message"
      exit 0
      ;;
    *)
      shift
      ;;
  esac
done

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Error handler
error_handler() {
  log_error "Deployment failed at line $1"
  log_info "Rolling back changes..."
  rollback
  exit 1
}

trap 'error_handler $LINENO' ERR

# Check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."
  
  # Check if Docker is installed and running
  if ! docker --version >/dev/null 2>&1; then
    log_error "Docker is not installed or not in PATH"
    exit 1
  fi
  
  if ! docker info >/dev/null 2>&1; then
    log_error "Docker daemon is not running"
    exit 1
  fi
  
  # Check if Docker Compose is available
  if ! docker compose version >/dev/null 2>&1; then
    log_error "Docker Compose is not available"
    exit 1
  fi
  
  # Check if .env file exists
  if [[ ! -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]]; then
    log_error "Environment file .env.$ENVIRONMENT not found"
    exit 1
  fi
  
  log_success "Prerequisites check passed"
}

# Load environment variables
load_environment() {
  log_info "Loading environment variables for $ENVIRONMENT..."
  
  if [[ -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env.$ENVIRONMENT" | xargs)
    log_success "Environment variables loaded"
  else
    log_error "Environment file not found: .env.$ENVIRONMENT"
    exit 1
  fi
}

# Run tests
run_tests() {
  if [[ "$RUN_TESTS" == "true" ]]; then
    log_info "Running tests..."
    cd "$PROJECT_ROOT"
    npm test
    log_success "Tests passed"
  fi
}

# Backup database
backup_database() {
  if [[ "$BACKUP_BEFORE_DEPLOY" == "true" ]]; then
    log_info "Creating database backup..."
    
    BACKUP_DIR="$PROJECT_ROOT/backups"
    mkdir -p "$BACKUP_DIR"
    
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # Use pg_dump via Docker
    docker compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_dump \
      -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE" || {
      log_warning "Database backup failed, but continuing deployment"
    }
    
    if [[ -f "$BACKUP_FILE" ]]; then
      log_success "Database backup created: $BACKUP_FILE"
    fi
  fi
}

# Build and deploy
build_and_deploy() {
  log_info "Building and deploying application..."
  
  cd "$PROJECT_ROOT"
  
  # Build arguments
  BUILD_ARGS=""
  if [[ "$NO_CACHE" == "true" ]]; then
    BUILD_ARGS="$BUILD_ARGS --no-cache"
  fi
  
  # Deployment arguments
  DEPLOY_ARGS=""
  if [[ "$FORCE_RECREATE" == "true" ]]; then
    DEPLOY_ARGS="$DEPLOY_ARGS --force-recreate"
  fi
  
  # Stop existing containers
  log_info "Stopping existing containers..."
  docker compose -f "$DOCKER_COMPOSE_FILE" down
  
  # Build images
  log_info "Building Docker images..."
  docker compose -f "$DOCKER_COMPOSE_FILE" build $BUILD_ARGS
  
  # Start services
  log_info "Starting services..."
  docker compose -f "$DOCKER_COMPOSE_FILE" up -d $DEPLOY_ARGS
  
  log_success "Application deployed successfully"
}

# Run database migrations
run_migrations() {
  if [[ "$RUN_MIGRATIONS" == "true" ]]; then
    log_info "Running database migrations..."
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    sleep 10
    
    # Run migrations
    docker compose -f "$DOCKER_COMPOSE_FILE" exec app npm run migrate
    
    log_success "Database migrations completed"
  fi
}

# Health check
health_check() {
  log_info "Performing health check..."
  
  MAX_ATTEMPTS=30
  ATTEMPT=1
  
  while [[ $ATTEMPT -le $MAX_ATTEMPTS ]]; do
    if curl -f -s http://localhost:3000/api/health >/dev/null; then
      log_success "Health check passed"
      return 0
    fi
    
    log_info "Health check attempt $ATTEMPT/$MAX_ATTEMPTS failed, retrying in 10 seconds..."
    sleep 10
    ((ATTEMPT++))
  done
  
  log_error "Health check failed after $MAX_ATTEMPTS attempts"
  return 1
}

# Show deployment status
show_status() {
  log_info "Deployment Status:"
  echo "===================="
  docker compose -f "$DOCKER_COMPOSE_FILE" ps
  echo ""
  
  log_info "Service URLs:"
  echo "API: http://localhost:3000"
  echo "Grafana: http://localhost:3001"
  echo "Prometheus: http://localhost:9090"
  echo ""
  
  log_info "Logs:"
  echo "To view logs: docker compose -f $DOCKER_COMPOSE_FILE logs -f [service]"
}

# Rollback function
rollback() {
  log_warning "Rolling back deployment..."
  
  # Stop current containers
  docker compose -f "$DOCKER_COMPOSE_FILE" down
  
  # TODO: Implement proper rollback logic
  # This could involve:
  # - Restoring from backup
  # - Reverting to previous Docker image
  # - Rolling back database migrations
  
  log_info "Rollback completed"
}

# Cleanup function
cleanup() {
  log_info "Cleaning up old Docker images and containers..."
  
  # Remove unused images
  docker image prune -f
  
  # Remove unused volumes (be careful with this)
  # docker volume prune -f
  
  log_success "Cleanup completed"
}

# Main deployment flow
main() {
  log_info "Starting deployment to $ENVIRONMENT environment..."
  
  check_prerequisites
  load_environment
  run_tests
  backup_database
  build_and_deploy
  run_migrations
  
  if health_check; then
    show_status
    log_success "Deployment completed successfully!"
  else
    log_error "Deployment failed health check"
    rollback
    exit 1
  fi
  
  # Optional cleanup
  if [[ "${CLEANUP_AFTER_DEPLOY:-false}" == "true" ]]; then
    cleanup
  fi
}

# Run main function
main "$@"