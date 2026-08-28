# Arena OS

> One workspace. Every AI. Every tool. One autonomous developer operating system.

Arena OS is a **personal AI operating system** for a single developer. It
orchestrates multiple AI models, specialized agents, developer tools
(GitHub, Supabase, Railway, Firebase), and a native **Stellar / x402** Web3
payment & verification layer behind one command center.

This repository is a **real, runnable MVP foundation** built from the product
spec. External integrations are isolated behind adapters; anything that needs a
credential or live service degrades gracefully to a clearly-labeled mock so the
full mission flow works offline.

## Architecture (spec §43, §56)

```
apps/web (Next.js)  ──  src/
  core/        ids, shared result types
  domain/      mission, agent, model, tool, payment, stellar entities
  db/          Postgres schema (Drizzle) + memory/pg repository
  ai/          model gateway: OpenAI / Gemini / Claude adapters + router + failover
  agents/      commander, research, code, qa, deployment, stellar
  tools/       tool gateway: registry, permissions, audit, adapters
  stellar/     wallet, receipt anchoring, x402 policy engine
  mission/     mission engine (staged pipeline) + verification engine
  security/    capability permissions + session
  app/         Command Center UI + /api/v1 routes
contracts/arena-receipt/   Soroban receipt contract
```

## Quick start

```bash
cp .env.example .env.local      # defaults run fully offline (memory DB + mock model)
npm install
npm run dev                     # http://localhost:3000  (login: dev@arena.os / arena-dev)
```

To use real services, fill the relevant keys in `.env.local`:
`OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`,
`STELLAR_SECRET_KEY`, `X402_FACILITATOR_URL`, and set `ARENA_DB_DRIVER=postgres`
with `DATABASE_URL` (apply `src/db/schema.sql` first).

## The MVP mission flow (spec §52)

User: *"Inspect my GitHub issue, fix it, run the tests, and use the external
analysis API if necessary. You can spend up to 1 XLM."*

1. Command Center creates a **Mission**.
2. **Commander** plans the task graph.
3. **Research** reads the GitHub issue.
4. Optional **x402 payment** is evaluated against policy; if above threshold,
   the mission pauses at `awaiting_approval` with an in-UI payment request.
5. **Code** implements the fix on a branch; **QA** runs tests.
6. **Deployment** creates a preview.
7. **Verification** engine confirms results (never trusts claims).
8. **Stellar** anchors a receipt hash on-chain (Soroban / testnet).
9. Mission is marked **VERIFIED** with full audit trail.

Run a mission from the Command Center and watch it progress live, or hit the
API directly:

```bash
curl -X POST localhost:3000/api/v1/missions \
  -H 'content-type: application/json' \
  -d '{"title":"Fix issue #42","description":"...","allowPaidApi":true,"budgetXlm":1}'
```

## API (spec §34)

`POST /api/v1/missions` · `GET /api/v1/missions/:id` ·
`POST /api/v1/missions/:id/approve` · `POST /api/v1/agents/run` ·
`POST /api/v1/tools/execute` · `POST /api/v1/payments/request` ·
`GET /api/v1/activity` · `GET /api/v1/models` · `GET /api/v1/integrations` ·
`GET /api/v1/stellar`

## Engineering rules honored (spec §56)

- No fake integrations in production paths; mocks are isolated and labeled.
- Credentials are server-side only and never sent to models.
- Agents receive least-privilege capabilities; production ops need approval.
- Every important action is auditable.
- Provider / blockchain / tool code is behind adapters and gateways.

## Status

Phase 1–6 foundation is implemented and runnable. Phases 7–8 (hardened
security, polish, real-time websockets) and marketplace/agent-economy features
(spec §54) are the next evolution.
