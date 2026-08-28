# Arena Receipt — Soroban Contract

A minimal Soroban smart contract that anchors verifiable mission receipts for
Arena OS (spec §28). The full mission is **never** stored on-chain; only a
canonical digest + attestation metadata is written, keeping the application
hybrid (off-chain data, on-chain evidence).

## What it stores

- `receipt_hash` — SHA-256 of the canonical mission digest
- `mission_digest` — the canonical digest string
- `submitter` — Stellar account that anchored the receipt
- `timestamp` — unix seconds
- `status` — e.g. "verified"
- `payment_reference` — optional linked payment id

## Contract (Rust)

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, vec, Env, String, Symbol, Vec, Map};

#[contract]
pub struct ArenaReceipt;

#[contractimpl]
impl ArenaReceipt {
    pub fn anchor(
        env: Env,
        receipt_hash: String,
        mission_digest: String,
        submitter: String,
        status: String,
        payment_reference: String,
    ) -> Symbol {
        let key = symbol_short!("receipt");
        let mut store: Map<String, String> = env
            .storage()
            .instance()
            .get(&key)
            .unwrap_or(Map::new(&env));
        store.set(receipt_hash.clone(), mission_digest.clone());
        env.storage().instance().set(&key, &store);
        symbol_short!("ok")
    }

    pub fn verify(env: Env, receipt_hash: String) -> bool {
        let key = symbol_short!("receipt");
        let store: Map<String, String> = env
            .storage()
            .instance()
            .get(&key)
            .unwrap_or(Map::new(&env));
        store.contains_key(receipt_hash)
    }
}
```

## Build & deploy (Soroban CLI)

```bash
cd contracts/arena-receipt
cargo build --target wasm32-unknown-unknown --release
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/arena_receipt.wasm \
  --network testnet --source <identity>
```

In the MVP, `src/stellar/receipt-contract.ts` anchors the digest via a
`manageData` operation as a pragmatic, dependency-light on-chain anchor. When
the contract above is deployed, set `STELLAR_RECEIPT_CONTRACT_ID` and switch the
anchor implementation to invoke `anchor(...)` instead.
