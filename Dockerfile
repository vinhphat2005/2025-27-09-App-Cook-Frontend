# Frontend Dockerfile for Expo React Native
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    curl \
    git \
    bash

# Set working directory
WORKDIR /app

# Install Expo CLI globally
RUN npm install -g @expo/cli@latest

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Expose Expo dev server ports
EXPOSE 19000 19001 19002 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:19000 || exit 1

# Start Expo development server with LAN support
CMD ["npx", "expo", "start", "--lan", "--clear"]
