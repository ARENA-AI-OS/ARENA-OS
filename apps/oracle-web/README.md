# Oracle

An AI-powered financial decision simulator on BMONI's embedded Ethereum wallet
infrastructure. Ethereum via BMONI — not Stellar. This app shares nothing
with `sepgate-app` / `sepgate-contract` or the rest of this monorepo: no
imports, no shared database, no shared auth, no shared design system. It
lives at `apps/oracle-web` only because that's where the rest of this
project's repos live; it does not depend on any of them.

## Status — what's real, what's mocked, what's missing

**REAL**, live-tested against BMONI's sandbox (`embedded-dev.bmoni.com`)
with the Bunch Dillon persona, end to end, through this app's own routes —
not just curled against BMONI directly:

- Full onboarding lifecycle: create user → generate + PIN-encrypt an owner
  key in-browser → sign the owner-proof challenge (EIP-191) → deploy the
  smart wallet → submit KYC → activate the Nigeria rail. Verified reaching
  genuine `anchorStatus: "active"`.
- KYC document upload (identification, proof of address) against BMONI's
  real endpoints, including their actual multipart field names and the
  ~2KB minimum file size.
- Real balances (`GET /api/balances`) and real transaction history
  (`GET /api/transactions`), used to derive the simulator's burn rate when
  history exists.
- Money-movement plumbing: create proposal → approve → fetch the raw
  signing digest → sign client-side with no EIP-191 prefix → submit. Every
  step of this was exercised live (see "Live findings" below) short of an
  actual funded transfer, which needs a manually-credited sandbox balance
  BMONI grants on request (see [Request test tokens](https://bkey.mintlify.app/request-test-tokens.md)) —
  not something obtainable inside this session.
- Webhook signature verification (`/api/webhooks/bmoni`): HMAC-SHA256 over
  the raw body, constant-time compare, dedup by event id. Verified with a
  synthetic signed payload. **Not yet registered** with BMONI
  (`POST /v1/webhooks/config` needs a publicly reachable HTTPS
  `callbackUrl`, which a local dev server isn't) — that registration is a
  deploy-time step, not something this code can do for you.
- Wallet management (`/wallet`): real deposit-account details, Nigerian
  bank withdrawal (verify → register → offramp → approve → sign), real
  transaction history. See "Live findings" for two more doc-vs-live
  discrepancies found here.
- Auto-save (`/autosave`): a real, live-verified gap-fill feature — BMONI's
  own platform has no standing/recurring savings mechanism. On a deposit
  event, this creates AND approves a real TRANSFER proposal automatically
  (live-verified: a simulated ₦50,000 deposit against a 10% rule produced
  a real ₦5,000 proposal, `PENDING_SIGNATURES`, `currentApprovals: 1`) —
  the user only has to tap Confirm and enter their PIN, not build the
  transaction. See `src/lib/autosave.ts` for why it deliberately stops at
  the signature rather than fully automating it (would need a
  shared-across-users server co-signer key — a materially worse custody
  model, see below).

**STUBBED / SIMULATED** (clearly labeled in the UI, never silently upgraded):

- The simulator's three branching futures (do nothing / spend / save), the
  day-by-day projection, runway, and risk level are a simple linear model
  over real balance + real-or-estimated burn rate — a simulation, not
  financial advice, and the UI says so.
- Black Swan mode and the stress toggles (income −30%, unexpected ₦70,000
  expense, rent +20%) are illustrative shocks applied to the same model —
  not drawn from any real risk feed.
- When a wallet has no transaction history yet (true for every freshly
  onboarded sandbox wallet), monthly burn falls back to a user-editable
  estimate, visibly badged `mock` — never presented as real.

**MISSING**:

- Biometric capture UI. The endpoint (`POST /kyc/documents/biometric`,
  multipart field `selfie`) is wired in `lib/bmoni.ts` but there's no
  camera-capture component. Not required for the Nigeria rail (see below);
  required for USD/EUR/MXN's Global KYC path.
- A real-time channel for webhook-driven UI updates. The webhook handler
  logs and dedupes events server-side, but the onboarding wizard still
  polls `GET /api/onboard/status` client-side rather than reacting to a
  pushed event — there's no SSE/WebSocket layer yet.
- A device-bound / hardware-backed key store (see **Custody**, below).

## Live findings — where BMONI's docs and the live API disagree

Every non-trivial detail in `lib/bmoni.ts` was checked against a live call
to the sandbox before being written down, because the docs and the deployed
API disagree in a few places that would otherwise fail silently:

- **Nigeria's NGN rail activates without any document upload.** BMONI's own
  lifecycle docs frame KYC uploads as a prerequisite for rail activation in
  general; live-tested, `POST /onboarding/start-nigeria` alone (BVN + wallet
  address) is sufficient to reach `anchorStatus: "active"`. Uploads are
  real requirements for the USD Enhanced-Due-Diligence stage
  (`POST /kyc/activate`), not for Nigeria's local account.
- **`POST /v1/users` returns `{ user: {...} }`**, not `{ data: {...} }` as
  BMONI's own quickstart example shows.
- **`PATCH /kyc` takes `address` / `streetLine1` / `identificationNumbers[].number`**,
  not the `addressDetails` / `street` / `.value` shape shown in the
  quickstart walkthrough (the Nigeria-specific KYC reference page and the
  live OpenAPI schema agree with each other; the quickstart page doesn't).
- **The three document-upload endpoints use different multipart field
  names**: `files` (array) for identification and proof-of-address, but
  `selfie` (array) for biometric. Guessing `file` singular, or `files` for
  biometric, fails.
- **`GET .../sign-payload` returns `signingPayloadHash`**, not `hashToSign`
  as the signing-reference doc's example shows. Same 32-byte digest, sign
  it the same way (no EIP-191 prefix).
- **`POST .../proposals/{id}/approve` is missing from BMONI's own published
  OpenAPI spec** (`embedded-dev.bmoni.com/docs/openapi.json` has no
  `/approve` path for proposals) but works live — verified with a real call
  against the sandbox, which returned `200` and recorded the approval. This
  is worth flagging to BMONI; it's built here because it demonstrably
  works, not because it's documented.
- The balances and wallets endpoints return unwrapped arrays/objects
  (`balance`, not `amount`; no `{ data }` envelope) — several of BMONI's
  own doc examples show a `{ data: {...} }` wrapper that the live responses
  don't have.
- **`GET .../bank-accounts/deposit-accounts/NGN` returns `{ accounts: [...] }`**,
  a list, not a single account object — and each entry's fields are
  `bankName`/`bankCode`, not `name`/`code` as the OpenAPI schema's own
  naming (`NigerianBankOutput`) suggested before checking its actual
  properties.
- **`POST .../onramp/vba/nigeria` requires a real UUID `bankAccountId`** for
  a *personal* virtual bank account. A freshly onboarded Nigeria user in
  the sandbox is issued a *pooled/shared* deposit account instead
  (id `"pooled-vba-1"`, resolved by a `depositMessage` reference rather
  than a personal NUBAN) — passing that pooled id to `onramp/vba/nigeria`
  is rejected (`"bankAccountId must be a UUID"`). So the "link a VBA to
  this wallet" flow BMONI's docs describe isn't reachable from standard
  onboarding in the sandbox; the deposit UI shows the pooled account and
  its reference directly instead.
- **`ADD_MEMBER` proposals take a `targetUserId`**, not a raw wallet
  address — confirmed from the live OpenAPI's `SmartWalletProposalData`
  schema. A "server-held co-signer for automation" design built on this
  would mean a *shared* operator identity added to potentially every
  user's wallet, not a scoped per-wallet key — see `src/lib/autosave.ts`
  for why that shaped the auto-save design away from full automation.

## Custody — read this before this touches real funds

The owner private key is generated in the browser, AES-256-GCM-encrypted
with a key derived from the user's PIN (PBKDF2, 210k iterations), and
stored in `localStorage`. It is decrypted into memory only for the moment
it signs something, using `ethers.js`.

**This is not hardware-backed.** BMONI's native Flutter SDK
(`bmoni_embedded_sdk`) keeps the equivalent key in the device's Secure
Enclave (iOS) or Android Keystore — the key material never becomes
extractable software state, even to the app that owns it. This web build's
key is, at rest, an encrypted blob sitting in browser storage: recoverable
by anyone who gets the PIN and the blob, vulnerable to browser-storage
exfiltration in a way a Secure Enclave key isn't, and with no device
attestation behind it.

That's a real, material gap versus the native SDK's custody model — a
deliberate tradeoff for hackathon speed (Next.js over Flutter), not an
oversight, and not something to paper over. Before this app moves real
money for real users, this needs to become either a hardware-backed
mobile client (the native SDK this API was designed for) or a proper
custodial signing service — not a bigger PIN.

## Lifecycle

```
create user → provision smart wallet → submit KYC → activate rail (Nigeria: BVN)
  → fund wallet → move money (propose → approve → sign raw digest → submit)
```

See `src/lib/bmoni.ts` for the annotated client and the exact request/response
shapes confirmed live, and `src/app/onboard/page.tsx` for the wizard that
drives it.

## Design tokens

```
--bg-base: #151A2E        (indigo-navy)
--color-present: #E3A548  (amber — money/present)
--color-healthy-future: #4FA98C (teal)
--color-risk: #C9594A     (clay-red)
```

Newsreader (serif) for the Oracle-voice copy, IBM Plex Mono for every
number. Not a generic AI-dashboard look on purpose.

## Running it

```bash
cp .env.example .env.local   # sandbox key + base URL are already filled in
pnpm install
pnpm dev   # http://localhost:3100
```

The sandbox `x-api-key` in `.env.example` is BMONI's own shared dev key —
public in their docs, works only against `embedded-dev.bmoni.com`. Get a
partner key from `developers@bkey.me` before pointing this at production.

Sandbox test persona (**sandbox only, never for a real KYC submission**):
Bunch Dillon, BVN `95888168924`, phone `+2348000000000`. The shared sandbox
key is used by many hackathon participants, so that exact phone/email is
usually already taken — the onboarding UI defaults to the persona's name
(for BVN name-matching) but expects you to supply your own unique
email/phone.
