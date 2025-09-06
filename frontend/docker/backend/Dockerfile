# Backend Dockerfile - Multi-stage build for Node.js application
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM node:18-alpine AS development
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5000
USER node
CMD ["dumb-init", "node", "server.js"]

# Production stage
FROM base AS production
COPY --chown=node:node . .
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

EXPOSE 5000
CMD ["dumb-init", "node", "server.js"]