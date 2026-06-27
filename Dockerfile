# Multi-stage production Dockerfile for SkyIT Ventures Full-Stack App
# Stage 1: Install dependencies and build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for build step)
RUN npm ci

# Copy application source files
COPY . .

# Run the production build command
RUN npm run build

# Stage 2: Minimal production runtime image
FROM node:20-alpine
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy dependency manifests and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled assets and configurations from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public_firebase ./public_firebase
COPY --from=builder /app/firebase.json ./firebase.json

# Expose the production port
EXPOSE 3000

# Start the full-stack Express server
CMD ["npm", "start"]
