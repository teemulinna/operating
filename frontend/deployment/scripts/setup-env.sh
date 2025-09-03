#!/bin/bash

# Environment Setup Script for Employee Management System
# Usage: ./setup-env.sh [environment]

set -e

# Configuration
ENVIRONMENT=${1:-development}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Generate secure random string
generate_secret() {
  openssl rand -hex 32
}

# Generate JWT secret
generate_jwt_secret() {
  openssl rand -base64 64
}

# Create environment file
create_env_file() {
  local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
  
  if [[ -f "$env_file" ]]; then
    log_warning "Environment file already exists: $env_file"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log_info "Keeping existing environment file"
      return 0
    fi
  fi
  
  log_info "Creating environment file: $env_file"
  
  # Generate secrets
  JWT_SECRET=$(generate_jwt_secret)
  DB_PASSWORD=$(generate_secret)
  REDIS_PASSWORD=$(generate_secret)
  GRAFANA_PASSWORD=$(generate_secret)
  
  cat > "$env_file" << EOF
# Environment Configuration for $ENVIRONMENT
NODE_ENV=$ENVIRONMENT

# Server Configuration
PORT=3000
API_VERSION=v1

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=employee_management_$ENVIRONMENT
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD
DB_DIALECT=postgres
DB_LOGGING=false

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# Redis Configuration (for caching and sessions)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=$REDIS_PASSWORD

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=logs/app.log

# Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880

# Email Configuration (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@company.com

# Monitoring Configuration
GRAFANA_USER=admin
GRAFANA_PASSWORD=$GRAFANA_PASSWORD

# Security Configuration
BCRYPT_ROUNDS=12
SESSION_SECRET=$(generate_secret)

# Feature Flags
ENABLE_SWAGGER=true
ENABLE_METRICS=true
ENABLE_AUDIT_LOG=true

# Development specific (if development)
$(if [[ "$ENVIRONMENT" == "development" ]]; then
cat << DEV_EOF
# Development specific settings
DB_LOGGING=true
LOG_LEVEL=debug
ENABLE_CORS=true
DEV_EOF
fi)

# Production specific (if production)
$(if [[ "$ENVIRONMENT" == "production" ]]; then
cat << PROD_EOF
# Production specific settings
DB_SSL=true
FORCE_HTTPS=true
TRUST_PROXY=true
HELMET_ENABLED=true
PROD_EOF
fi)
EOF

  log_success "Environment file created: $env_file"
}

# Create directories
create_directories() {
  log_info "Creating necessary directories..."
  
  local dirs=(
    "logs"
    "uploads"
    "temp"
    "backups"
    "ssl"
  )
  
  for dir in "${dirs[@]}"; do
    mkdir -p "$PROJECT_ROOT/$dir"
    log_info "Created directory: $dir"
  done
  
  log_success "Directories created"
}

# Install dependencies
install_dependencies() {
  log_info "Installing dependencies..."
  
  cd "$PROJECT_ROOT"
  
  if [[ ! -f "package.json" ]]; then
    log_warning "package.json not found, skipping dependency installation"
    return 0
  fi
  
  npm install
  log_success "Dependencies installed"
}

# Setup database
setup_database() {
  log_info "Setting up database for $ENVIRONMENT..."
  
  # Check if PostgreSQL is running
  if ! pg_isready -q 2>/dev/null; then
    log_warning "PostgreSQL is not running. Please start PostgreSQL and run migrations manually."
    return 0
  fi
  
  # Create database if it doesn't exist
  local db_name="employee_management_$ENVIRONMENT"
  
  if ! psql -lqt | cut -d \| -f 1 | grep -qw "$db_name"; then
    log_info "Creating database: $db_name"
    createdb "$db_name"
    log_success "Database created: $db_name"
  else
    log_info "Database already exists: $db_name"
  fi
}

# Generate SSL certificates for development
generate_ssl_certs() {
  if [[ "$ENVIRONMENT" == "development" ]]; then
    log_info "Generating self-signed SSL certificates for development..."
    
    local ssl_dir="$PROJECT_ROOT/ssl"
    local cert_file="$ssl_dir/cert.pem"
    local key_file="$ssl_dir/key.pem"
    
    if [[ ! -f "$cert_file" || ! -f "$key_file" ]]; then
      openssl req -x509 -newkey rsa:4096 -keyout "$key_file" -out "$cert_file" \
        -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Company/CN=localhost"
      
      log_success "SSL certificates generated"
    else
      log_info "SSL certificates already exist"
    fi
  fi
}

# Create initial admin user script
create_admin_user_script() {
  log_info "Creating admin user setup script..."
  
  cat > "$PROJECT_ROOT/scripts/create-admin.js" << 'EOF'
const bcrypt = require('bcrypt');
const { User } = require('../src/models');

async function createAdminUser() {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@company.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin123!';
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ where: { email } });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create admin user
    const admin = await User.create({
      email,
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin'
    });
    
    console.log(`Admin user created: ${admin.email}`);
    console.log(`Password: ${password}`);
    console.log('Please change the password after first login!');
    
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdminUser();
EOF
  
  log_success "Admin user script created"
}

# Show next steps
show_next_steps() {
  log_info "Setup completed for $ENVIRONMENT environment!"
  echo ""
  echo "Next steps:"
  echo "1. Review and update the environment file: .env.$ENVIRONMENT"
  echo "2. Start your database server (PostgreSQL)"
  echo "3. Run database migrations: npm run migrate"
  echo "4. Create admin user: node scripts/create-admin.js"
  echo "5. Start the application: npm run $ENVIRONMENT"
  echo ""
  echo "For Docker deployment:"
  echo "1. Update docker-compose.yml with your settings"
  echo "2. Run: ./deployment/scripts/deploy.sh $ENVIRONMENT"
  echo ""
  echo "Important files created:"
  echo "- .env.$ENVIRONMENT (environment variables)"
  echo "- scripts/create-admin.js (admin user setup)"
  if [[ "$ENVIRONMENT" == "development" ]]; then
    echo "- ssl/cert.pem, ssl/key.pem (SSL certificates)"
  fi
}

# Main function
main() {
  log_info "Setting up $ENVIRONMENT environment..."
  
  create_env_file
  create_directories
  generate_ssl_certs
  create_admin_user_script
  install_dependencies
  setup_database
  
  show_next_steps
}

# Run main function
main "$@"