# ============================================
# Stage 1: Build the React application
# ============================================
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy source files and build
COPY . .

# Build args for environment variables
ARG VITE_SERVER_URL=""
ARG VITE_CLIENT_URL=""
ARG VITE_IMAGEKIT_PUBLIC_KEY=""
ARG VITE_IMAGEKIT_URL_ENDPOINT=""

# Set environment variables for Vite build
ENV VITE_SERVER_URL=${VITE_SERVER_URL}
ENV VITE_CLIENT_URL=${VITE_CLIENT_URL}
ENV VITE_IMAGEKIT_PUBLIC_KEY=${VITE_IMAGEKIT_PUBLIC_KEY}
ENV VITE_IMAGEKIT_URL_ENDPOINT=${VITE_IMAGEKIT_URL_ENDPOINT}

RUN npm run build

# ============================================
# Stage 2: Serve with Nginx
# ============================================
FROM nginx:stable-alpine AS production

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]