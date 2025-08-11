FROM --platform=linux/amd64 node:18-alpine

WORKDIR /app

# Install dependencies
RUN npm init -y && \
    npm install express axios

# Copy application code
COPY app.js .

# Create public directory for static files
RUN mkdir -p public/api/auth

# Copy web application files from the public directory in the build context
COPY public/ public/

# Expose port
EXPOSE 8080

# Install wget for health check
RUN apk --no-cache add wget

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD wget -qO- http://localhost:8080/health || exit 1

# Start the application
CMD ["node", "app.js"]