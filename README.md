# Gold Portfolio Tracker Backend

Physical gold investment tracker API with real-time pricing from altin.in.

## Features

- **Google OAuth** authentication
- **Buy/Sell** transaction tracking
- **Real-time gold prices** from altin.in
- **Portfolio calculation** with FIFO cost basis
- **Realized/Unrealized** profit tracking
- **Swagger** API documentation
- **Docker** ready deployment

## Tech Stack

- Node.js 20+ / TypeScript (Strict)
- Express.js / PostgreSQL + Prisma
- Axios + Cheerio (scraping)
- JWT Authentication / Swagger

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Google OAuth credentials ([Google Console](https://console.cloud.google.com/apis/credentials))

### 1. Install & Configure

```bash
npm install
cp .env.example .env
# .env dosyasini kendi degerlerinizle doldurun
```

### 2. Start PostgreSQL

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Database Migration

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Start Dev Server

```bash
npm run dev
# http://localhost:4000
```

## API Documentation

Swagger UI: `http://localhost:4000/api-docs`

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

## Available Scripts

```bash
npm run dev              # Development server
npm run build            # Build TypeScript
npm run start            # Production server
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
npm run docker:dev       # Start dev PostgreSQL
npm run docker:down      # Stop Docker containers
```

## Service Management

```bash
# Start
docker start gold-wallet-db-dev   # PostgreSQL
npm run dev                       # Dev server

# Stop
docker stop gold-wallet-db-dev    # PostgreSQL
# Ctrl+C                         # Dev server
```

## Production Deployment

1. Push code to Git repository
2. In Dokploy, create new service from Git
3. Set environment variables (see `.env.example`)
4. Deploy - Dockerfile handles migrations automatically

## License

ISC
