# Oracle Embed

**Every idle BMONI wallet becomes a revenue line — at zero cost to users who never engage.**

## The idea

Most fintech AI features monetize the wrong thing: a subscription (a cost
users must justify before ever seeing value) or nothing at all (advice
as a loss-leader). Oracle Embed monetizes the moment the advice actually
works — a performance fee, charged only when a recommendation converts
into a real, user-approved transaction.

No engagement, no charge. No subscription to cancel, no free tier to
abuse. The AI only gets paid when it's right *and* the user acts on it —
which means it's the rare fintech feature whose incentives are already
aligned with the user's: it earns nothing by nagging, only by helping.

## Why this shocks the unit economics

A typical embedded-wallet provider's revenue scales with transaction
volume and account count — headcount-shaped growth. Oracle Embed's
revenue scales with *how good the AI's advice is*, on wallets that
already exist, using rails BMONI has already built. It's not a new
product line requiring new users — it's a monetization layer over the
users BMONI already has, that costs nothing to run against a wallet that
never touches it.

## What's real, right now

- **Live-verified against BMONI's own sandbox**, not a mockup: a
  ₦180,000 recommendation produces a real ₦179,100 net transfer proposal
  and a real ₦900 (0.5%) fee proposal — both genuine BMONI `TRANSFER`
  proposals, both individually shown to the user before either is signed.
  (`apps/oracle-web/src/lib/fees.ts`, `/api/proposals/recommend`.)
- **Zero new trust required from BMONI.** The fee mechanism uses their
  existing proposal API exactly as documented — no new contract to
  audit, no new operator key to trust, nothing to deploy on their side.
- **A real, buildable embeddable widget**
  (`packages/oracle-embed` — `pnpm build` produces a working
  CJS/ESM/`.d.ts` bundle right now) that BMONI's own engineers could
  `npm install` directly into their app, rather than linking out to a
  separate site.
- **A path to an atomic on-chain version**
  (`contracts/oracle-fee-router`, 17/17 tests passing) for if/when
  BMONI's proposal API grows a contract-call type — designed and tested
  now, not deployed, not oversold as more than that.

## What's still ahead

Full detail lives in each component's own README, not restated here:
`apps/oracle-web/README.md` (custody caveat, live API findings),
`packages/oracle-embed/README.md` (no RN wrapper yet, no theming API),
`contracts/oracle-fee-router/README.md` (not deployed, not audited). The
honesty is the point — every claim above is either something that ran
against BMONI's real sandbox in this repo's history, or is labeled as
not there yet.
