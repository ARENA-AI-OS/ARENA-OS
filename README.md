# Arena OS

> One workspace. Every AI. Every tool. One autonomous developer operating system.

Arena OS is a **personal AI operating system** for a single developer. It
orchestrates multiple AI models, specialized agents, developer tools
(GitHub, Supabase, Railway, Firebase), and a native **Stellar / x402** Web3
payment & verification layer behind one command center.

## Monorepo Structure

```
arena-os/
├── apps/web/                  # Next.js 15 App Router (main application)
├── packages/
│   ├── ai-core/               # Shared AI types and interfaces
│   ├── model-gateway/         # Model routing and failover (stub)
│   ├── agent-runtime/         # Agent lifecycle management (stub)
│   ├── tool-gateway/          # Tool registry and dispatch (stub)
│   ├── github/                # GitHub API adapter (stub)
│   ├── supabase/              # Supabase adapter (stub)
│   ├── firebase/              # Firebase adapter (stub)
│   ├── railway/               # Railway adapter (stub)
│   ├── stellar/               # Stellar/Soroban integration (stub)
│   ├── x402/                  # x402 payment protocol (stub)
│   ├── security/              # Encrypted secrets store (real)
│   └── database/              # Shared database types (real)
├── contracts/arena-receipt/   # Soroban receipt contract
├── docs/                      # Architecture documentation
└── infrastructure/            # Deployment configs
```

## Tech Stack

- **Runtime**: Next.js 15 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS 3 with custom Arena theme
- **Database**: PostgreSQL via Drizzle ORM (or in-memory for dev)
- **Build**: Turborepo + pnpm workspaces
- **Auth**: HMAC session cookies (multi-user ready)
- **Security**: AES-256-GCM encrypted secrets store

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment config
cp apps/web/.env.example apps/web/.env.local

# Run the development server
pnpm dev
# → http://localhost:3000
# Login: dev@arena.os / arena-dev
```

## Development

```bash
# Run all apps in dev mode
pnpm dev

# Typecheck everything
pnpm typecheck

# Lint
pnpm lint

# Run a specific package
pnpm --filter @arena-os/web dev
```

## What's Real vs Stubbed (Prompt 1)

### Real ✅
- Monorepo structure with pnpm workspaces + Turborepo
- Next.js 15 App Router with full routing
- Complete PostgreSQL schema (22 tables) with Drizzle ORM
- In-memory repository that runs end-to-end with zero external deps
- Encrypted secrets store (AES-256-GCM) in `@arena-os/security`
- Session-based auth (HMAC-signed, multi-user ready)
- Full dark-theme UI: Command Center, Settings, Login
- ESLint + Prettier across the monorepo
- Capability-based permission system

### Stubbed (Prompts 2-6) 🔨
- `@arena-os/model-gateway` — will route to OpenAI/Gemini/Claude
- `@arena-os/agent-runtime` — will manage agent execution
- `@arena-os/tool-gateway` — will orchestrate tool calls
- `@arena-os/github` — will make real GitHub API calls
- `@arena-os/supabase` — will connect to Supabase
- `@arena-os/firebase` — will connect to Firebase
- `@arena-os/railway` — will manage Railway deployments
- `@arena-os/stellar` — will interact with Stellar blockchain
- `@arena-os/x402` — will process micropayments

## Engineering Rules

- **No fake integrations** in production code paths. Mocks are isolated and labeled.
- **Secrets never leave the server** and are never interpolated into AI prompts.
- **Agents receive least-privilege capabilities**; production ops need approval.
- **Every important action is auditable** via the audit_events table.
- **Provider/tool code is behind adapters** and gateways.

## Database

The app defaults to an in-memory store (`ARENA_DB_DRIVER=memory`). To use PostgreSQL:

```bash
# Set in .env.local
ARENA_DB_DRIVER=postgres
DATABASE_URL=postgresql://user:pass@localhost:5432/arena_os

# Apply schema
psql "$DATABASE_URL" -f apps/web/src/db/schema.sql
# Or via Drizzle
pnpm --filter @arena-os/web db:push
```

## Environment Variables

See `apps/web/.env.example` for the full list of configurable environment
variables. Key categories:

- **Core**: `ARENA_DB_DRIVER`, `DATABASE_URL`, `ARENA_SESSION_SECRET`
- **AI**: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`
- **Integrations**: `GITHUB_TOKEN`, `SUPABASE_URL`, `RAILWAY_TOKEN`
- **Stellar**: `STELLAR_SECRET_KEY`, `STELLAR_NETWORK`
- **Payments**: `X402_FACILITATOR_URL`

## License

Private — Arena OS
