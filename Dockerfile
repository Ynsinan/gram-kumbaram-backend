# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# 1. DÜZELTME: OpenSSL buraya eklendi
RUN apk add --no-cache libc6-compat openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# ============================================
# Environment Variables
# ============================================
# These are default values for production
# Override these in Dokploy or docker run with -e flag
# ============================================

# Server Configuration
ENV NODE_ENV=production
ENV PORT=4000

# Database (must be provided at runtime)
# ENV DATABASE_URL=""

# JWT Configuration (must be provided at runtime)
# ENV JWT_SECRET=""
# ENV JWT_EXPIRES_IN="7d"

# Google OAuth (must be provided at runtime)
# ENV GOOGLE_CLIENT_ID=""
# ENV GOOGLE_CLIENT_SECRET=""
# ENV GOOGLE_CALLBACK_URL=""

# Frontend URL (must be provided at runtime)
# ENV FRONTEND_URL=""

# Feature Flags
ENV ENABLE_SWAGGER=false
ENV ENABLE_DEBUG=false
ENV ENABLE_RATE_LIMITING=true

# API Configuration
ENV API_TIMEOUT=30000
ENV MAX_REQUEST_SIZE=100kb

# 2. DÜZELTME: Runner aşamasına OpenSSL ve uyumluluk kütüphaneleri eklendi (HAYATİ!)
RUN apk add --no-cache openssl libc6-compat

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Change ownership to non-root user
RUN chown -R appuser:nodejs /app

USER appuser

# Expose port (matches PORT env variable)
EXPOSE 4000

# Health check disabled - let Dokploy/Traefik handle it
# HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
#   CMD sh -c 'wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1'

# Start the application with automatic migrations
# Migration runs first, then starts the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]