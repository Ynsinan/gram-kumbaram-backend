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

# Set production environment
ENV NODE_ENV=production

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

# Default port (can be overridden by environment)
ENV PORT=3000

# Expose common ports
EXPOSE 3000 4000

# Health check - uses shell to read PORT env variable
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
  CMD sh -c 'wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1'

# Start the application
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]