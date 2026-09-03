# @arena-os/oracle-embed

A drop-in React widget that turns any BMONI-powered wallet UI into a
monetized AI decision engine — the embeddable half of Oracle. This is what
"add it to BMONI's own app" actually means: not a link out to a separate
site, an `npm install` your own React (or React Native, with a thin
wrapper) codebase can mount directly.

```bash
npm install @arena-os/oracle-embed
```

```tsx
import { OracleWidget } from "@arena-os/oracle-embed";

<OracleWidget
  apiBaseUrl="https://your-oracle-backend.example.com"
  fetchOptions={{ credentials: "include" }}
  currency="CNGN"
  onMakeItReal={({ split }) => analytics.track("oracle_conversion", split)}
/>;
```

## What's real here

- `OracleWidget` is a fully working component: real balance fetch, real
  proposal creation, real client-side raw-digest signing
  (`wallet.ts` — same PBKDF2/AES-GCM PIN encryption as
  `apps/oracle-web`), real approve → sign-payload → sign flow. Built with
  `tsup`, typechecked, and verified to produce a working CJS/ESM/`.d.ts`
  bundle (`pnpm build` in this package — not aspirational, it runs).
- It is a **thin client**. All BMONI API-key-holding logic stays
  server-side, in whatever backend implements the contract below —
  never in this package, never in the browser.

## The backend contract

This widget doesn't call BMONI directly — it calls five routes on
whatever backend you point `apiBaseUrl` at:

| Route | Purpose |
| --- | --- |
| `GET /api/balances` | Real wallet balances |
| `POST /api/proposals/recommend` | Creates the net + fee proposal pair |
| `POST /api/proposals/:id/approve` | Explicit-approval gate |
| `GET /api/proposals/:id/sign-payload` | Fetches the raw digest to sign |
| `POST /api/proposals/:id/sign` | Submits the client-produced signature |

`apps/oracle-web` in this monorepo is the reference implementation of
this contract — either run it as your Oracle backend directly, or
implement the same five routes against your own infrastructure (e.g. if
BMONI wants this logic living inside their own backend rather than
calling out to a separate one). See `src/types.ts` for the exact shapes.

## Monetization

`POST /api/proposals/recommend` is where the fee lives
(`apps/oracle-web/src/lib/fees.ts`): every recommendation that converts
into "Make it real" produces two proposals — the user's net transfer, and
a small performance fee, both individually approved and signed. Nothing
is charged for advice nobody acts on. See the root pitch doc
(`apps/oracle-web/PITCH.md`) for the full monetization argument.

## Custody — same caveat as apps/oracle-web

`wallet.ts` PIN-encrypts a browser-generated key into `localStorage`.
**This is not hardware-backed** — BMONI's native SDK keeps the equivalent
key in a Secure Enclave / Android Keystore. Fine for a demo integration;
revisit before this widget, deployed standalone in a browser, touches
real funds without BMONI's native app wrapping it.

## What's not built yet

- No React Native wrapper (the component uses plain DOM styling via
  inline `style` props — portable to RN with a styling adapter, not done
  here).
- No theming API beyond inline style overrides — a real integration would
  want a `theme` prop or CSS variables instead of the current hardcoded
  colors.
- Not published to npm. `pnpm build` produces a real, installable
  `dist/`, but publishing is a deliberate step for whoever owns this
  package's npm account, not done automatically here.
