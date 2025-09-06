# Frontend Dockerfile - Multi-stage build for React application
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM node:18-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "start"]

# Build stage
FROM base AS build
COPY . .
RUN npm ci && npm run build

# Production stage
FROM nginx:alpine AS production
COPY --from=build /app/build /usr/share/nginx/html
COPY docker/frontend/nginx.conf /etc/nginx/nginx.conf
COPY docker/frontend/default.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]