# Database Dockerfile - PostgreSQL with initialization scripts
FROM postgres:15-alpine

# Install additional extensions
RUN apk add --no-cache postgresql-contrib

# Copy initialization scripts
COPY docker/database/init-scripts/ /docker-entrypoint-initdb.d/

# Copy custom configuration
COPY docker/database/postgresql.conf /etc/postgresql/postgresql.conf
COPY docker/database/pg_hba.conf /etc/postgresql/pg_hba.conf

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD pg_isready -U ${POSTGRES_USER:-postgres} || exit 1

EXPOSE 5432