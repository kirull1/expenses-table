FROM node:20.11.1-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy all project files
COPY . .

# Set build arguments and environment variables
ARG NODE_ENV=production
ARG BUILD_TIMESTAMP
ENV NODE_ENV=${NODE_ENV}
ENV BUILD_TIMESTAMP=${BUILD_TIMESTAMP:-unknown}

# Build the application with proper environment
RUN npm run build

# Nginx stage
FROM nginx:1.25.3-alpine

# Copy built files and nginx configuration
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-docker.conf /etc/nginx/conf.d/default.conf

# Create a build-time.conf file that will be included by nginx
RUN echo "add_header X-Build-Time \"Build-Time-Header\";" > /etc/nginx/conf.d/build-time.conf

# Create entrypoint directory if it doesn't exist
RUN mkdir -p /docker-entrypoint.d/

# Use a script to replace the placeholder with the actual build timestamp at runtime
RUN echo "#!/bin/sh" > /docker-entrypoint.d/90-update-build-time.sh && \
    echo "sed -i \"s/Build-Time-Header/\$BUILD_TIMESTAMP/g\" /etc/nginx/conf.d/build-time.conf" >> /docker-entrypoint.d/90-update-build-time.sh && \
    chmod +x /docker-entrypoint.d/90-update-build-time.sh

# Create a custom entrypoint script
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'set -e' >> /docker-entrypoint.sh && \
    echo 'for f in /docker-entrypoint.d/*; do' >> /docker-entrypoint.sh && \
    echo '  if [ -x "$f" ]; then' >> /docker-entrypoint.sh && \
    echo '    echo "Running $f"' >> /docker-entrypoint.sh && \
    echo '    "$f"' >> /docker-entrypoint.sh && \
    echo '  fi' >> /docker-entrypoint.sh && \
    echo 'done' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 80

# Start with our custom entrypoint
CMD ["/docker-entrypoint.sh"]
