# Multi-stage Docker build for production deployment
# ==================================================

# Stage 1: Build backend
FROM node:18-alpine AS backend-builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies including dev dependencies for build
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY seeds/ ./seeds/

# Build the application
RUN npm run build

# Stage 2: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend for production
RUN npm run build

# Stage 3: Production runtime
FROM node:18-alpine AS production

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    tini \
    curl \
    && rm -rf /var/cache/apk/*

# Create app user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Set working directory
WORKDIR /app

# Copy built backend from builder stage
COPY --from=backend-builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=backend-builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=backend-builder --chown=appuser:appgroup /app/package.json ./

# Copy built frontend from builder stage
COPY --from=frontend-builder --chown=appuser:appgroup /app/frontend/dist ./public

# Copy additional files
COPY --chown=appuser:appgroup migrations/ ./migrations/
COPY --chown=appuser:appgroup seeds/ ./seeds/

# Create necessary directories
RUN mkdir -p /app/logs && chown appuser:appgroup /app/logs

# Set environment to production
ENV NODE_ENV=production

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/server.js"]