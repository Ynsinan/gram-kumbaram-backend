# Gold Portfolio Tracker Backend

Physical gold investment tracker API with real-time pricing from altin.in.

> **For AI-Assisted Development**: This project includes a [`CLAUDE.md`](./CLAUDE.md) file with detailed API specifications, business logic rules, and database schema for AI-assisted development with Claude Code.

## Features

- **Google OAuth** authentication
- **Buy/Sell** transaction tracking
- **Real-time gold prices** from altin.in
- **Portfolio calculation** with FIFO cost basis
- **Realized/Unrealized** profit tracking
- **Swagger** API documentation
- **Docker** ready for Dokploy deployment

## Tech Stack

- Node.js (LTS)
- TypeScript (Strict)
- Express.js
- PostgreSQL + Prisma
- Axios + Cheerio (scraping)
- JWT Authentication
- Swagger/OpenAPI

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Google OAuth credentials (see [OAUTH_SETUP.md](./OAUTH_SETUP.md) for detailed instructions)

### 1. Clone and Install

```bash
git clone <repo-url>
cd physical-golden-wallet-backend
npm install
```

### 2. Environment Setup

**IMPORTANT:** Read [OAUTH_SETUP.md](./OAUTH_SETUP.md) for complete OAuth configuration guide.

#### For Local Development

```bash
cp .env.example .env
```

Edit `.env` with your **local development** values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gold_wallet?schema=public"
JWT_SECRET="local-dev-secret-key-change-in-production"
GOOGLE_CLIENT_ID="your-local-google-client-id"
GOOGLE_CLIENT_SECRET="your-local-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:4000/auth/google/callback"
PORT=4000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

#### For Production

See [OAUTH_SETUP.md](./OAUTH_SETUP.md) for production OAuth setup. You'll need to:
1. Create a separate OAuth Client in Google Console for production
2. Configure `.env.production` with production credentials
3. Use `npm run start:prod` to run with production settings

### 3. Start PostgreSQL (Docker)

```bash
# Development mode (only PostgreSQL)
docker-compose -f docker-compose.dev.yml up -d
```

### 4. Database Migration

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

## API Documentation

Swagger UI available at: `http://localhost:3000/api-docs`

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/auth/google` | Google OAuth login |
| GET | `/auth/google/callback` | OAuth callback |
| GET | `/auth/me` | Get current user |
| GET | `/api/prices` | Get all gold prices |
| GET | `/api/prices/:type` | Get specific gold price |
| GET | `/api/transactions` | List transactions |
| POST | `/api/transactions` | Create transaction |
| GET | `/api/transactions/:id` | Get transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/transactions/holdings` | Get holdings summary |
| GET | `/api/portfolio` | Get portfolio summary |

### Transaction Types

- `BUY` - Record gold purchase
- `SELL` - Record gold sale (validates sufficient balance)

### Gold Types

- `gram` - Gram Altın
- `ceyrek` - Çeyrek Altın
- `yarim` - Yarım Altın
- `cumhuriyet` - Cumhuriyet Altını

## Production Deployment (Dokploy)

### Option 1: Full Docker Compose

```bash
docker-compose up -d --build
```

### Option 2: Dokploy Deploy

1. Push code to your Git repository
2. In Dokploy, create new service from Git
3. Set environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_CALLBACK_URL` (update with production URL)
   - `FRONTEND_URL` (your frontend domain)
4. Deploy

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing secret (min 10 chars) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | Yes | OAuth callback URL |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (default: development) |
| `FRONTEND_URL` | No | Frontend URL for CORS & redirects |

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (uses .env)
npm run dev:local        # Start dev with .env.local
npm run dev:prod         # Start dev with .env.production (testing)

# Production
npm run build            # Build TypeScript
npm run start            # Start production server (uses .env)
npm run start:local      # Start with .env.local
npm run start:prod       # Start with .env.production

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run dev migrations
npm run prisma:migrate:prod  # Deploy production migrations
npm run prisma:studio    # Open Prisma Studio

# Docker
npm run docker:dev       # Start dev PostgreSQL
npm run docker:down      # Stop Docker containers
```

### Environment-Specific Commands

The project supports multiple environment configurations:

- **`.env`** - Active environment file (git-ignored)
- **`.env.local`** - Local development settings
- **`.env.production`** - Production settings
- **`.env.example`** - Template for new setups

To switch environments:
```bash
# Use local environment
npm run dev:local

# Use production environment (for testing)
npm run dev:prod
```

Or manually copy the desired environment file:
```bash
# Switch to local
cp .env.local .env

# Switch to production
cp .env.production .env
```

### Project Structure

```
physical-golden-wallet/
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── config/
│   │   ├── database.ts     # Prisma client
│   │   ├── env.ts          # Environment validation
│   │   ├── passport.ts     # Google OAuth config
│   │   └── swagger.ts      # Swagger/OpenAPI config
│   ├── middleware/
│   │   └── auth.middleware.ts  # JWT authentication
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── portfolio.routes.ts
│   │   ├── prices.routes.ts
│   │   └── transactions.routes.ts
│   ├── services/
│   │   ├── portfolio.service.ts
│   │   ├── scraper.service.ts
│   │   └── transaction.service.ts
│   ├── types/
│   │   └── index.ts
│   ├── validators/
│   │   └── transaction.validator.ts
│   └── index.ts            # App entry point
├── docker-compose.yml      # Production compose
├── docker-compose.dev.yml  # Dev compose (PostgreSQL only)
├── Dockerfile              # Multi-stage production build
└── package.json
```

## Service Management

### Start Services

```bash
# 1. Start PostgreSQL container
docker start gold-wallet-db-dev

# 2. Start development server (in project directory)
npm run dev
```

### Stop Services

```bash
# 1. Stop dev server
# Press Ctrl + C in the terminal running npm run dev

# 2. Stop PostgreSQL container
docker stop gold-wallet-db-dev
```

### Quick Reference

| Action | Command |
|--------|---------|
| Start PostgreSQL | `docker start gold-wallet-db-dev` |
| Stop PostgreSQL | `docker stop gold-wallet-db-dev` |
| Start Server | `npm run dev` |
| Stop Server | `Ctrl + C` |

### Useful Commands

```bash
# Check Docker container status
docker ps -a

# Check what's running on port 3000
netstat -ano | findstr :3000

# View PostgreSQL logs
docker logs gold-wallet-db-dev
```

### Service URLs (when running)

- **API Base:** http://localhost:3000
- **Swagger Docs:** http://localhost:3000/api-docs
- **Health Check:** http://localhost:3000/health
- **Gold Prices:** http://localhost:3000/api/prices

## License

ISC
