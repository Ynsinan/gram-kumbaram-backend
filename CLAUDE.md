# Gold Portfolio Tracker Backend

> Node.js 20+ | TypeScript (Strict) | Express.js | PostgreSQL 16 | Prisma ORM

**Purpose**: Track physical gold investments (Buy & Sell) with real-time price data and calculate profit/loss using FIFO cost basis.

## Quick Reference

### Commands
- `npm run dev` - Start development server with watch mode
- `npm run build` - Compile TypeScript to dist/
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run docker:dev` - Start PostgreSQL container

### Key Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/auth/google` | Initiate Google OAuth | No |
| GET | `/auth/google/callback` | OAuth callback, issues JWT | No |
| GET | `/auth/me` | Get current user | Yes |
| GET | `/api/prices` | Get all gold prices | No |
| GET | `/api/prices/:goldType` | Get specific gold price | No |
| POST | `/api/transactions` | Create BUY/SELL transaction | Yes |
| GET | `/api/transactions` | List user transactions | Yes |
| GET | `/api/portfolio` | Get portfolio with FIFO P/L | Yes |
| DELETE | `/api/transactions/:id` | Delete transaction | Yes |

### Critical Business Rules
- **FIFO Cost Basis**: Portfolio calculations use First In, First Out
- **SELL Validation**: MUST verify sufficient balance before allowing sale
- **Gold Types**: Only `gram`, `ceyrek`, `yarim`, `cumhuriyet` allowed
- **Quantity**: ALWAYS positive for both BUY and SELL transactions

---

## Project Overview

**Core Flow**:
1. User logs in via Google OAuth → receives JWT token (7-day expiry)
2. User records transactions: **BUY** or **SELL**
3. System validates that user has enough gold to sell
4. System calculates **Net Portfolio** with FIFO cost basis

**Tech Stack**:
| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+ LTS |
| Language | TypeScript (Strict Mode) |
| Framework | Express.js |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Auth | Passport.js (Google OAuth) + JWT |
| Validation | Zod |
| API Docs | Swagger (swagger-jsdoc + swagger-ui-express) |
| Scraping | Axios + Cheerio |

---

## Database Schema (Prisma)

### User Model
```prisma
model User {
  id           String             @id @default(uuid())
  email        String             @unique
  name         String
  googleId     String             @unique
  createdAt    DateTime           @default(now())
  transactions GoldTransaction[]
}
```

### GoldTransaction Model
```prisma
model GoldTransaction {
  id              String          @id @default(uuid())
  userId          String
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  type            TransactionType
  goldType        String          // 'gram', 'ceyrek', 'yarim', 'cumhuriyet'
  quantity        Float           // ALWAYS positive
  pricePerUnit    Float           // Price at transaction time (TL)
  transactionDate DateTime
  createdAt       DateTime        @default(now())
}
```

### TransactionType Enum
```prisma
enum TransactionType {
  BUY
  SELL
}
```

---

## Gold Types & Pricing

### Gold Types Table

| ID | Code | Display Name (Turkish) |
|----|------|------------------------|
| 1 | `gram` | Gram Altın |
| 2 | `ceyrek` | Çeyrek Altın |
| 3 | `yarim` | Yarım Altın |
| 4 | `cumhuriyet` | Cumhuriyet Altını |

### GoldPrice Interface
```typescript
interface GoldPrice {
  id: number;        // 1, 2, 3, or 4
  name: string;      // Display name (Turkish)
  buyPrice: number;  // Alış fiyatı (TL)
  sellPrice: number; // Satış fiyatı (TL)
}
```

### Price Data Sources

**Primary**: `https://altin.in` (international number format: `5323.9200`)
**Fallback**: `https://bigpara.hurriyet.com.tr/altin/` (Turkish format: `6.908,23`)

- **Cache Duration**: 60 seconds
- **Response**: Includes `source` field indicating data origin
- **Proxy**: Disabled for scraping (direct connection)

---

## API Specifications

### Authentication Endpoints (`/auth`)

#### GET `/auth/google`
Initiate Google OAuth flow.

**Response**: Redirects to Google OAuth consent screen

---

#### GET `/auth/google/callback`
OAuth callback that issues JWT token.

**Query Parameters**:
- `code` - OAuth authorization code

**Response**: Redirects to frontend with JWT token

---

#### GET `/auth/me`
Get current authenticated user.

**Headers**: `Authorization: Bearer <jwt_token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**JWT Payload**: `{ userId, email, name }`
**Token Expiry**: 7 days

---

### Prices Endpoints (`/api/prices`)

#### GET `/api/prices`
Get all gold prices (cached for 60 seconds).

**Query Parameters**:
- `refresh=true` - Force cache refresh (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "prices": {
      "gram": { "id": 1, "name": "Gram Altın", "buyPrice": 7025, "sellPrice": 7085 },
      "ceyrek": { "id": 2, "name": "Çeyrek Altın", "buyPrice": 11774, "sellPrice": 12014 },
      "yarim": { "id": 3, "name": "Yarım Altın", "buyPrice": 23549, "sellPrice": 24029 },
      "cumhuriyet": { "id": 4, "name": "Cumhuriyet Altını", "buyPrice": 48462, "sellPrice": 48952 }
    },
    "lastUpdated": "2026-02-09T18:45:30.974Z",
    "source": "altin.in"
  }
}
```

---

#### GET `/api/prices/:goldType`
Get specific gold type price.

**URL Parameters**:
- `goldType` - One of: `gram`, `ceyrek`, `yarim`, `cumhuriyet`

---

### Transactions Endpoints (`/api/transactions`)

#### POST `/api/transactions`
Create a new transaction (BUY or SELL).

**Headers**: `Authorization: Bearer <jwt_token>`

**Request Body**:
```json
{
  "type": "BUY" | "SELL",
  "goldType": "gram" | "ceyrek" | "yarim" | "cumhuriyet",
  "quantity": 10,
  "pricePerUnit": 7000,
  "date": "2026-02-09"
}
```

**Validation Rules**:
- `type` MUST be `BUY` or `SELL`
- `goldType` MUST be one of: `gram`, `ceyrek`, `yarim`, `cumhuriyet`
- `quantity` MUST be positive number
- `pricePerUnit` MUST be positive number
- For SELL: `currentHoldings >= quantity` (returns 400 if insufficient)

**Error Response (Insufficient Balance)**:
```json
{
  "success": false,
  "error": "Insufficient gold balance"
}
```

---

#### GET `/api/transactions`
List all transactions for authenticated user.

**Headers**: `Authorization: Bearer <jwt_token>`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "BUY",
      "goldType": "gram",
      "quantity": 10,
      "pricePerUnit": 7000,
      "transactionDate": "2026-02-09T00:00:00.000Z",
      "createdAt": "2026-02-09T12:30:00.000Z"
    }
  ]
}
```

---

#### GET `/api/transactions/holdings`
Get current holdings summary (net quantity per gold type).

**Headers**: `Authorization: Bearer <jwt_token>`

---

#### GET `/api/transactions/:id`
Get specific transaction by ID.

**Headers**: `Authorization: Bearer <jwt_token>`

---

#### DELETE `/api/transactions/:id`
Delete a transaction.

**Headers**: `Authorization: Bearer <jwt_token>`

---

### Portfolio Endpoint (`/api/portfolio`)

#### GET `/api/portfolio`
Get portfolio summary with profit/loss calculations using FIFO.

**Headers**: `Authorization: Bearer <jwt_token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "totalPortfolioValue": 71018.18,
    "totalCost": 70000,
    "totalUnrealizedProfitLoss": 1018.18,
    "totalRealizedProfit": 0,
    "assets": [
      {
        "goldType": "gram",
        "netQuantity": 10,
        "averageCost": 7000,
        "totalCost": 70000,
        "currentPrice": 7101.82,
        "currentValue": 71018.18,
        "unrealizedProfitLoss": 1018.18,
        "realizedProfit": 0
      }
    ]
  }
}
```

---

## Business Logic Rules

### Transaction Validation

**CRITICAL - SELL Transaction Validation**:
```typescript
// MUST verify sufficient balance before allowing SELL
const currentHoldings = calculateCurrentHoldings(userId, goldType);
if (transaction.type === "SELL" && currentHoldings < transaction.quantity) {
  throw new Error("Insufficient gold balance");
}
```

**General Validation**:
1. `quantity` MUST be positive for both BUY and SELL
2. `goldType` MUST be: `gram`, `ceyrek`, `yarim`, or `cumhuriyet`
3. `pricePerUnit` MUST be positive
4. Dates in ISO 8601 format or `YYYY-MM-DD`

### Portfolio Calculation (FIFO)

**Cost Basis Method**: First In, First Out (FIFO)

**How FIFO Works**:
1. Sort all transactions by `transactionDate` ascending
2. For BUY: Add to inventory queue
3. For SELL: Deduct from oldest BUY transactions first
4. Calculate realized profit: `(sellPrice - costBasis) * quantity`
5. Calculate unrealized profit: `(currentPrice - averageCost) * remainingQuantity`

**Example**:
```
BUY 10 gram @ 7000 TL (2026-01-01)
BUY 5 gram @ 7100 TL (2026-01-05)
SELL 8 gram @ 7200 TL (2026-01-10)

FIFO Calculation:
- Sell 8 from first BUY (10 @ 7000)
- Realized profit: (7200 - 7000) * 8 = 1600 TL
- Remaining: 2 gram @ 7000, 5 gram @ 7100
- Average cost: (2*7000 + 5*7100) / 7 = 7057.14 TL
```

---

## Project Structure

```
src/
├── config/
│   ├── database.ts          # Prisma client initialization
│   ├── env.ts               # Zod environment validation
│   ├── passport.ts          # Google OAuth strategy
│   └── swagger.ts           # OpenAPI specification
├── middleware/
│   └── auth.middleware.ts   # JWT authentication
├── routes/
│   ├── auth.routes.ts       # /auth endpoints
│   ├── portfolio.routes.ts  # /api/portfolio
│   ├── prices.routes.ts     # /api/prices
│   └── transactions.routes.ts # /api/transactions
├── services/
│   ├── portfolio.service.ts # FIFO calculation logic
│   ├── scraper.service.ts   # Price scraping (altin.in, bigpara)
│   └── transaction.service.ts # Transaction CRUD
├── types/
│   └── index.ts             # Shared TypeScript types
├── validators/
│   └── transaction.validator.ts # Zod schemas
└── index.ts                 # Express app entry point
```

---

## Development Workflow

### Environment Variables

Create `.env` file at project root:

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/gold_portfolio"

# JWT
JWT_SECRET="your-secret-key-min-10-chars"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3001/auth/google/callback"

# Server
PORT=3001
NODE_ENV=development

# Frontend (for CORS & redirects)
FRONTEND_URL="http://localhost:3000"
```

### Database Setup

```bash
# Start PostgreSQL with Docker
docker compose -f docker-compose.dev.yml up -d

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Optional: Open Prisma Studio
npx prisma studio
```

### Running the App

```bash
# Install dependencies
npm install

# Start development server (with watch mode)
npm run dev

# Server runs on http://localhost:3001
```

### API Documentation

- **Swagger UI**: http://localhost:3001/api-docs
- **OpenAPI JSON**: http://localhost:3001/api-docs.json
- **Health Check**: http://localhost:3001/health

---

## API Response Format

All API responses follow this structure:

```typescript
{
  success: boolean;
  data?: T;           // Present on success
  error?: string;     // Present on error
  message?: string;   // Optional message
}
```

---

## Authentication Pattern

Protected routes require Bearer token in Authorization header:

```http
GET /api/portfolio
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Middleware**: `src/middleware/auth.middleware.ts` validates JWT and attaches `req.user`

---

## Deployment (Docker)

### Production Build

```bash
# Build image
docker build -t gold-portfolio-backend .

# Run with docker-compose
docker compose up -d
```

**Includes**:
- Multi-stage Dockerfile (build → production)
- PostgreSQL container
- Environment variable configuration
- Health check endpoint

---

## Summary

This is a **REST API** for physical gold portfolio tracking with:

- **Google OAuth + JWT** authentication (7-day expiry)
- **FIFO cost basis** for portfolio calculations
- **Real-time price scraping** from altin.in (primary) and BigPara (fallback)
- **Transaction validation** (SELL requires sufficient balance)
- **Prisma ORM** with PostgreSQL for data persistence
- **Swagger API documentation** at `/api-docs`
- **Strict validation** with Zod (goldType, quantity, pricePerUnit)
