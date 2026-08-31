# Arena OS — Architecture

## Monorepo Structure

```
arena-os/
├── apps/
│   └── web/                  # Next.js 14+ App Router (main application)
│       ├── src/
│       │   ├── app/          # Next.js App Router pages and API routes
│       │   ├── components/   # React UI components
│       │   ├── core/         # Shared utilities (IDs, crypto, types)
│       │   ├── domain/       # Domain model types and constructors
│       │   ├── db/           # Database schema (Drizzle) + repositories
│       │   ├── ai/           # Model gateway (in-app, delegates to packages)
│       │   ├── agents/       # Agent implementations (in-app for now)
│       │   ├── tools/        # Tool adapters (in-app for now)
│       │   ├── stellar/      # Stellar integration (in-app for now)
│       │   ├── mission/      # Mission engine
│       │   └── security/     # Session + permission logic
│       └── ...
├── packages/
│   ├── ai-core/              # Shared AI types and interfaces
│   ├── model-gateway/        # Model routing and failover
│   ├── agent-runtime/        # Agent lifecycle and capability enforcement
│   ├── tool-gateway/         # Tool registry, permissions, dispatch
│   ├── github/               # GitHub API adapter
│   ├── supabase/             # Supabase integration
│   ├── firebase/             # Firebase integration
│   ├── railway/              # Railway deployment adapter
│   ├── stellar/              # Stellar/Soroban integration
│   ├── x402/                 # x402 payment protocol
│   ├── security/             # Encrypted secrets store
│   └── database/             # Shared database types
├── contracts/
│   └── arena-receipt/        # Soroban smart contract
├── docs/                     # Documentation
└── infrastructure/           # Deployment and infrastructure configs
```

## Design Principles

1. **Adapter pattern**: Every external integration (GitHub, Supabase, Railway, etc.) is behind an adapter in its own package. Real implementations degrade gracefully when credentials are missing.

2. **Capability-based permissions**: Agents receive only the capabilities required for their mission. Production operations require elevated approval.

3. **Encrypted secrets**: All secrets are encrypted at rest using AES-256-GCM. The `@arena-os/security` package is the only place where plaintext secrets exist, and only transiently during decryption.

4. **Audit trail**: Every important action is logged as an audit event. The audit log is append-only and immutable.

5. **No fake integrations**: Production code paths never return hardcoded fake data. Mocks are isolated, clearly labeled, and only used when a service is not configured.

## Package Dependencies

```
@arena-os/security ← (standalone, no internal deps)
@arena-os/database ← (standalone, Drizzle types)
@arena-os/ai-core ← (standalone, shared types)
@arena-os/model-gateway ← @arena-os/security
@arena-os/agent-runtime ← @arena-os/ai-core, @arena-os/security, @arena-os/tool-gateway
@arena-os/tool-gateway ← @arena-os/security
@arena-os/github ← @arena-os/security
@arena-os/supabase ← @arena-os/security
@arena-os/firebase ← @arena-os/security
@arena-os/railway ← @arena-os/security
@arena-os/stellar ← @arena-os/security
@arena-os/x402 ← @arena-os/security
```

## Database Schema

See `apps/web/src/db/schema.ts` for the authoritative Drizzle schema.
See `apps/web/src/db/schema.sql` for the raw DDL.

### Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts (multi-user ready) |
| `workspaces` | Workspaces owned by users |
| `projects` | Projects within workspaces |
| `missions` | Autonomous missions with full audit trail |
| `tasks` | Individual tasks within missions |
| `agents` | Agent registry (commander, research, code, etc.) |
| `models` | AI model registry |
| `model_providers` | Provider connection status |
| `tools` | Tool registry |
| `tool_permissions` | Agent-tool permission matrix |
| `secrets` | Encrypted secrets store |
| `workflows` | Reusable workflow definitions |
| `workflow_runs` | Workflow execution history |
| `integrations` | External service connections |
| `api_keys` | Scoped API keys for external access |
| `agent_runs` | Agent execution logs |
| `tool_runs` | Tool execution logs |
| `payments` | x402 payment records |
| `payment_policies` | Spending policies per workspace |
| `stellar_transactions` | Stellar blockchain transactions |
| `receipts` | Mission receipt digests |
| `audit_events` | Immutable audit log |
| `memories` | Agent memory store |

## Authentication

The MVP uses session-cookie auth with HMAC-signed tokens. The session payload carries `userId`, `email`, and `role` — structured for multi-user even though the MVP starts with a single developer account.

See `src/security/session-core.ts` for the signing logic and `src/security/session.ts` for the cookie helpers.
