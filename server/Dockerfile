FROM node:18-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies with clean cache and production only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application source code
COPY . .

# Create necessary directories
RUN mkdir -p uploads logs temp

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Run as non-root user for security
USER node

# Start the application
CMD ["node", "index.js"]