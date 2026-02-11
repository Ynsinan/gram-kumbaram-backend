# Deployment Guide - Backend

## Environment Configuration

Bu proje local development ve production ortamları için farklı env konfigürasyonlarına sahiptir.

### Environment Files

- **`.env.local`** - Local development ortamı için (git'e commit edilmez)
- **`.env.production`** - Production için (git'e commit edilmez)
- **`.env.example`** - Örnek template dosyası (git'e commit edilir)

### Available Environment Variables

| Variable | Description | Local Default | Production Default |
|----------|-------------|---------------|-------------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/gold_wallet` | Dokploy managed |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | dev-secret | **MUST BE SET** |
| `JWT_EXPIRES_IN` | JWT token expiration | `7d` | `7d` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | **MUST BE SET** | **MUST BE SET** |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | **MUST BE SET** | **MUST BE SET** |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL | `http://localhost:4000/auth/google/callback` | `https://api.gramkumbaram.com/auth/google/callback` |
| `PORT` | Server port | `4000` | `4000` |
| `NODE_ENV` | Environment mode | `development` | `production` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` | `https://gramkumbaram.com` |
| `ENABLE_SWAGGER` | Enable Swagger UI | `true` | `false` |
| `SWAGGER_BASIC_AUTH_USER` | Swagger basic auth username | - | `admin` |
| `SWAGGER_BASIC_AUTH_PASS` | Swagger basic auth password | - | **SET IF ENABLED** |
| `ENABLE_DEBUG` | Debug mode flag | `true` | `false` |
| `ENABLE_RATE_LIMITING` | Rate limiting flag | `false` | `true` |
| `API_TIMEOUT` | API timeout (ms) | `30000` | `30000` |
| `MAX_REQUEST_SIZE` | Max request body size | `100kb` | `100kb` |

### Setup Instructions

#### 1. Local Development

```bash
# Copy example file to .env.local
cp .env.example .env.local

# Edit .env.local with your settings
# Make sure to:
# 1. Set up local PostgreSQL database
# 2. Generate strong JWT_SECRET (min 32 chars)
# 3. Configure Google OAuth (see OAUTH_SETUP.md)

# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Run migrations
npm run prisma:migrate

# Start development server
npm run dev
```

#### 2. Production Setup

```bash
# .env.production is a template
# In production, set these via Dokploy environment variables
# DO NOT commit actual production secrets to git

# Production environment variables MUST include:
# - DATABASE_URL (from Dokploy PostgreSQL)
# - JWT_SECRET (strong 32+ char secret)
# - GOOGLE_CLIENT_ID (production OAuth client)
# - GOOGLE_CLIENT_SECRET (production OAuth secret)
# - GOOGLE_CALLBACK_URL (production callback)
# - FRONTEND_URL (production frontend URL)
```

---

## Docker Deployment

### Building the Image

```bash
# Build with default production settings
docker build -t gold-portfolio-backend .

# The Dockerfile sets production defaults
# Runtime env vars will override these
```

### Running Locally with Docker

```bash
# Run with environment file
docker run -p 4000:4000 \
  --env-file .env.local \
  gold-portfolio-backend

# Or with individual env vars
docker run -p 4000:4000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="your-secret" \
  -e GOOGLE_CLIENT_ID="..." \
  -e GOOGLE_CLIENT_SECRET="..." \
  -e GOOGLE_CALLBACK_URL="..." \
  -e FRONTEND_URL="http://localhost:3000" \
  gold-portfolio-backend
```

---

## Dokploy Deployment

### Method 1: Using Dokploy Environment Variables (Recommended)

Dokploy dashboard'dan environment variables ekleyin:

```
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public
JWT_SECRET=<generate-with-crypto.randomBytes>
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=https://api.gramkumbaram.com/auth/google/callback
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://gramkumbaram.com
ENABLE_SWAGGER=false
ENABLE_DEBUG=false
ENABLE_RATE_LIMITING=true
```

### Method 2: Using Package.json Scripts

Backend'te built-in script'ler var:

```bash
# Development with .env.local
npm run dev:local

# Production with .env.production
npm run start:prod
```

Bu script'ler otomatik olarak ilgili env dosyasını `.env` olarak kopyalar.

---

## Database Migrations

### Local Development

```bash
# Create and apply migration
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio

# Generate Prisma Client
npm run prisma:generate
```

### Production

```bash
# Deploy migrations (doesn't create new migrations)
npm run prisma:migrate:prod
```

**Important:** Dockerfile'daki `CMD` zaten migration'ları deploy eder:

```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

---

## Environment Management Best Practices

### 1. Never Commit Secrets

```bash
# .gitignore already includes:
.env
.env.local
.env*.local
.env.real
```

### 2. Use Centralized Config

All environment variables are validated and centralized in `src/config/env.ts`:

```typescript
import { env, isDevelopment, logEnvConfig } from './config/env';

// Always use env config instead of process.env
const port = env.PORT;  // ✅ Good (validated)
const port = process.env.PORT;  // ❌ Avoid (not validated)

// Environment checks
if (isDevelopment()) {
  logEnvConfig();
}
```

### 3. Automatic Validation

The config automatically validates all required variables on startup using Zod:

```typescript
// src/config/env.ts validates:
// - DATABASE_URL (required, non-empty string)
// - JWT_SECRET (required, min 32 characters)
// - GOOGLE_CLIENT_ID (required)
// - GOOGLE_CLIENT_SECRET (required)
// - GOOGLE_CALLBACK_URL (required, valid URL)
```

If validation fails, the app will **not start** and will show clear error messages.

### 4. JWT Secret Generation

**CRITICAL:** JWT_SECRET must be at least 32 characters for security!

```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use:
openssl rand -hex 32
```

### 5. Google OAuth Setup

See `OAUTH_SETUP.md` for detailed instructions on:
- Creating Google OAuth credentials
- Configuring authorized origins
- Setting up callback URLs
- Separate credentials for local/production

---

## Troubleshooting

### Issue: "DATABASE_URL is required"

**Solution:** Make sure DATABASE_URL is set in your environment:

```bash
# Local development
# Check .env.local file

# Docker
docker run -e DATABASE_URL="postgresql://..." ...

# Dokploy
# Add DATABASE_URL in Dokploy dashboard
```

### Issue: "JWT_SECRET must be at least 32 characters"

**Solution:** Generate a proper JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Issue: Prisma Client errors

**Solution:** Regenerate Prisma Client:

```bash
npm run prisma:generate
```

### Issue: Google OAuth errors

**Solution:**
1. Check OAUTH_SETUP.md for correct setup
2. Verify callback URL matches Google Console
3. Ensure CLIENT_ID and CLIENT_SECRET are correct
4. Check authorized origins in Google Console

### Issue: CORS errors in production

**Solution:** Make sure FRONTEND_URL matches your actual frontend domain:

```bash
# Single origin
FRONTEND_URL=https://gramkumbaram.com

# Multiple origins (comma-separated)
FRONTEND_URL=https://gramkumbaram.com,https://www.gramkumbaram.com
```

---

## Quick Reference

```bash
# Local Development
npm run dev                      # Uses current .env
npm run dev:local                # Copies .env.local to .env and runs

# Production
npm run build                    # Build TypeScript
npm run start                    # Run production build
npm run start:prod               # Copies .env.production to .env and runs

# Database
npm run prisma:generate          # Generate Prisma Client
npm run prisma:migrate           # Create and apply migration
npm run prisma:migrate:prod      # Deploy migrations (production)
npm run prisma:studio            # Open Prisma Studio

# Docker
docker build -t app .            # Build image
docker run -p 4000:4000 \        # Run container
  --env-file .env.local app

# Dokploy
# Set env vars in Dokploy dashboard
# Dockerfile handles migrations automatically
```

---

## Security Checklist

- [ ] JWT_SECRET is at least 32 characters
- [ ] JWT_SECRET is different between local/production
- [ ] DATABASE_URL uses SSL in production (`?sslmode=require`)
- [ ] GOOGLE_CLIENT_SECRET is kept secret
- [ ] .env files are in .gitignore
- [ ] ENABLE_SWAGGER is false in production (or protected with basic auth)
- [ ] ENABLE_DEBUG is false in production
- [ ] ENABLE_RATE_LIMITING is true in production
- [ ] FRONTEND_URL only includes trusted origins
- [ ] CORS is properly configured
