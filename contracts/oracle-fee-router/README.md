# @arena-os/oracle-fee-router

The atomic, on-chain version of Oracle's performance-fee split. **Designed
and unit-tested locally — not deployed to any network, and not yet
integrated with BMONI's proposal flow.** Read this whole page before
assuming otherwise.

```bash
pnpm install
pnpm compile   # Solidity 0.8.24, OpenZeppelin 5.x
pnpm test      # 17 tests, all passing — see test/OracleFeeRouter.test.ts
```

## Why this exists, and why it isn't what's shipped

`apps/oracle-web`'s live monetization (`src/lib/fees.ts`,
`/api/proposals/recommend`) splits a recommended spend into two ordinary
BMONI `TRANSFER` proposals — one to the recipient, one to Oracle's fee
wallet. That's real, live-tested against BMONI's sandbox today, and it
requires zero new infrastructure from BMONI.

This contract is what an **atomic**, single-transaction version of the
same split would look like — the fee and the net transfer settle
together on-chain, auditable in one place, rather than as two separate
signed proposals a user has to approve individually.

It is not integrated because it can't be, yet: BMONI's smart-wallet
proposal API — verified live against their sandbox, see
`apps/oracle-web/src/lib/bmoni.ts` — only supports plain ERC20 transfers
to a fixed recipient address (`TRANSFER`, `SWAP`, and a few governance
proposal types). There is no "call an arbitrary contract" proposal type
in their documented or observed API. A BMONI smart wallet can send tokens
*to* this router's address today (that's just an ordinary transfer), but
it cannot call `createIntent` on it as part of that same signed
proposal — those would need to be two separate transactions initiated by
two different parties, at which point you've reinvented the two-proposal
REST mechanism apps/oracle-web already ships, with a smart contract in
the middle adding gas cost and complexity for no additional atomicity.

**Where this becomes useful:** if BMONI adds a generic contract-call
proposal type, or for a non-BMONI EOA-based integration where the
depositor's own wallet can call `createIntent` directly.

## Design

One pending intent per depositor at a time
(`contracts/OracleFeeRouter.sol`):

1. `createIntent(intentId, recipient, feeBps)` — registered before any
   funds move. Reverts if a previous intent for that depositor is still
   open.
2. The depositor sends the gross amount of an ERC20 token to the
   router's address (an ordinary transfer, nothing router-specific about
   it from the token's perspective — ERC20 has no transfer hooks).
3. `settle(intentId, token)` — permissionless, reads the router's own
   token balance (safe specifically *because* only one intent per
   depositor can be open at a time, so any balance increase is
   unambiguously that intent's deposit) and forwards `net` to the
   recipient, `fee` to the treasury, in one transaction.

Fee is capped at 10% (`MAX_FEE_BPS`) on-chain, regardless of what a
caller requests. `feeTreasury` is owner-updatable. Uses OpenZeppelin's
`SafeERC20`, `Ownable`, and `ReentrancyGuard`.

## What's tested (17 passing tests, `test/OracleFeeRouter.test.ts`)

Intent creation and its cap/zero-address/double-open guards, cancellation
(including rejecting cancellation by a non-depositor and of an
already-settled intent), the settle happy path (correct split, correct
events, router balance zeroed out), permissionless settlement by a third
party, rejecting settlement of an unknown/already-settled/undeposited
intent, a zero-fee edge case, and treasury-update access control.

## What's NOT done

- **Not deployed.** No funded deployer key existed in the environment
  this was built in — see `apps/oracle-web`'s README for the same
  honesty convention applied to custody. Deploying to Base Sepolia (the
  same chain BMONI's sandbox smart wallets live on — confirmed via a
  live signing payload's `chainId: 84532` during Oracle's development)
  is the natural next step once someone funds a deployer wallet.
- **No integration with BMONI's proposal flow** — see above.
- **No slippage/partial-settlement handling** — `settle` distributes the
  router's entire balance of a token against one intent; if two
  depositors' funds ever landed in the router at once for the same
  token (which the one-open-intent-per-depositor design is meant to
  prevent, but hasn't been fuzz-tested against), the accounting would be
  wrong. Treat this as a reviewed-but-not-audited contract.
- **No formal audit.** Tested, not audited. Do not deploy to mainnet
  with real funds without one.
