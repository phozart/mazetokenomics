# Maze Tokenomics

A comprehensive crypto token analysis and vetting tool for evaluating token safety, holder distribution, and contract risks.

## Features

- **Token Analysis** - Submit tokens for automated security analysis
- **Risk Scoring** - Automatic and manual risk assessment with configurable checks
- **Holder Analysis** - Deep dive into holder distribution, whale tracking, and wallet clustering
- **Watchlist** - Track favorite tokens with live price data from DexScreener
- **Multi-Chain Support** - Supports Ethereum, Solana, and other EVM-compatible chains
- **User Management** - Role-based access control (Admin, User, Viewer)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **APIs**: DexScreener, GoPlus, Etherscan, Helius

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd vetting-tool
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Configure the following in `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/vetting_tool"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3003"

# Optional API keys for enhanced analysis
ETHERSCAN_API_KEY=""
MORALIS_API_KEY=""
HELIUS_API_KEY=""
```

4. Set up the database:
```bash
npx prisma migrate dev
npx prisma db seed
```

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3003](http://localhost:3003) in your browser.

### Default Login

- **Username**: `maze`
- **Password**: `maze`

## Docker Deployment

### Using Docker Compose (Recommended)

Start the full stack with PostgreSQL:

```bash
docker compose up -d
```

This starts:
- `maze-tokenomics-db` - PostgreSQL on port 5433
- `maze-tokenomics-app` - Application on port 3003

### Environment Variables

Set these in your environment or `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | (set by compose) |
| `NEXTAUTH_SECRET` | Session encryption key | (required) |
| `NEXTAUTH_URL` | Application URL | http://localhost:3003 |
| `ETHERSCAN_API_KEY` | Etherscan API key | (optional) |
| `MORALIS_API_KEY` | Moralis API key | (optional) |
| `HELIUS_API_KEY` | Helius API key for Solana | (optional) |

### Building Manually

```bash
docker build -t maze-tokenomics .
```

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Project Structure

```
vetting-tool/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── account/        # User account settings
│   │   ├── dashboard/      # Main dashboard
│   │   ├── queue/          # Analysis queue
│   │   ├── tokens/         # Token management
│   │   ├── users/          # User management (admin)
│   │   └── watchlist/      # Token watchlist
│   ├── api/                # API routes
│   └── login/              # Authentication
├── components/             # React components
│   ├── layout/             # Layout components
│   ├── tokens/             # Token-related components
│   ├── ui/                 # Reusable UI components
│   └── watchlist/          # Watchlist components
├── lib/                    # Utilities and services
│   ├── auth.js             # Authentication helpers
│   ├── prisma.js           # Database client
│   └── services/           # External API services
├── prisma/                 # Database schema and migrations
└── __tests__/              # Test files
```

## API Endpoints

### Tokens
- `GET /api/tokens` - List all tokens
- `POST /api/tokens` - Submit new token for analysis
- `GET /api/tokens/[id]` - Get token details
- `POST /api/tokens/[id]/run-checks` - Run analysis checks

### Watchlist
- `GET /api/watchlist` - Get user's watchlist
- `POST /api/watchlist` - Add token to watchlist
- `DELETE /api/watchlist/[id]` - Remove from watchlist
- `GET /api/watchlist/prices` - Fetch live prices

### Users
- `GET /api/users` - List users (admin only)
- `POST /api/users` - Create user (admin only)
- `PATCH /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
