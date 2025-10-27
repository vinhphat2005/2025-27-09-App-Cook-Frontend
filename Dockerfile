# Frontend Dockerfile for Expo React Native
FROM node:20-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Install global dependencies
RUN npm install -g @expo/cli@latest

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (use npm install to handle version mismatches)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Expose Expo dev server ports
EXPOSE 19000 19001 19002 8081

# Create startup script that works on any machine
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'echo "🍳 ===== COOK APP FRONTEND STARTING ===== 🍳"' >> /start.sh && \
    echo 'echo ""' >> /start.sh && \
    echo 'echo "🚀 Starting Expo Development Server..."' >> /start.sh && \
    echo 'echo "📱 Scan QR code with Expo Go app"' >> /start.sh && \
    echo 'echo "🌐 Backend API: $API_BASE_URL"' >> /start.sh && \
    echo 'echo "🔗 DevTools: http://localhost:19000"' >> /start.sh && \
    echo 'echo ""' >> /start.sh && \
    echo 'echo "📋 Network Info:"' >> /start.sh && \
    echo 'echo "   - Any WiFi network will work"' >> /start.sh && \
    echo 'echo "   - Mobile and computer must be on same WiFi"' >> /start.sh && \
    echo 'echo "   - Docker handles all IP configuration"' >> /start.sh && \
    echo 'echo ""' >> /start.sh && \
    echo 'echo "🎯 Ready for mobile scanning..."' >> /start.sh && \
    echo 'echo ""' >> /start.sh && \
    echo 'npx expo start --lan --clear' >> /start.sh && \
    chmod +x /start.sh

# Start command
CMD ["/start.sh"]