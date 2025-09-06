-- Database initialization script
-- Create application database and user

CREATE DATABASE employee_management;
CREATE USER app_user WITH ENCRYPTED PASSWORD 'app_password';
GRANT ALL PRIVILEGES ON DATABASE employee_management TO app_user;

-- Connect to the application database
\c employee_management;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";