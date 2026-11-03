# Accord

Stellar Testnet milestone escrow for Ghanaian freelancers and international clients.
Built by Timothy Asigbey. Experimental MVP; test XLM only, unaudited.

[Demo](https://accord-ghana.vercel.app/#workspace) · [Source](https://github.com/TXMO-dev/accord-ghana) · [Founder](https://timothy-asigbey-portfolio.vercel.app/crypto/)

## What works

The client creates and funds a milestone. The freelancer submits a delivery hash;
the client verifies and releases payment. Either party can freeze an active
milestone. To settle a dispute, the freelancer signs an exact split approval,
shares the approval file privately, and the client reviews and signs the transaction.
The contract requires both parties. There is no administrator payout override.

Agreement text remains in browser-local storage and privately shared JSON files.
Only hashes and public wallet/escrow records are on chain. Losing local records
can lose the plaintext; the blockchain does not recover it.

## Run and verify

Use Node 22+ and Rust/Cargo with a native linker. From this directory:

```sh
npm ci
npm test
npm run build
node scripts/check-production-isolation.mjs
npm run test:contract
npm run dev
```

49 JavaScript tests and 14 Rust host tests passed locally on 3 November 2026.
Native tests exercise authorization, rollback, split boundaries, conservation,
replay rejection and TTL behaviour; they are not an independent audit.
`npm run test:contract` uses `cargo test --lib --locked`. SDK 23.5.3 is retained;
the lockfile resolves the host's incompatible open ed25519-dalek range to 2.2.0.
The deployed WASM is in `public/accord-escrow.wasm`; its recorded identity is in
`public/network.json`. Host tests do not prove binary reproducibility.

For a local disposable-wallet workbench, use `npm run dev:testnet` and open
`http://127.0.0.1:5173/#local-test-panel`. It requires Friendbot/Testnet access.
Disposable signing is excluded from production bundles. Never use real funds.
The integration scripts submit real Testnet transactions with memory-only random
keys. `scripts/testnet.mjs` creates a new deployment and rewrites network.json;
do not run it against an existing deployment casually.

## Reviewer path

1. Open the demo and read the Testnet setup instructions.
2. Use two separate funded Testnet wallets in a supported Varial browser.
3. Create a milestone as client, review the transaction, fund it and export JSON.
4. Open the file as freelancer, verify terms, then submit a delivery reference.
5. Verify and release as client; inspect the receipt.
6. On a second milestone, dispute and test the exact two-party settlement flow.

For wallet-free inspection, read `public/settlement-evidence.json`,
`public/workspace-evidence.json`, `public/test-evidence.json` and the tests.
These are dated synthetic test evidence, not customer usage or wallet-extension signoff.
See [OPERATIONS.txt](OPERATIONS.txt) for read-only storage lifetime monitoring.

## Current boundaries

- Varial extension end-to-end settlement signoff is pending.
- TTL snapshots exist; archived-state restoration rehearsal remains pending.
- Disputes can deadlock when parties cannot agree. No arbitration is implemented.
- No mainnet contract, fiat/mobile-money payout, private backend or audit is claimed.
- Customer interviews, pilot commitments and chapter affiliation are not claimed.
- Blockaid reported the domain flag was a false positive; don't bypass a remaining wallet warning.
- Source v0.4.1 includes recovery/monitoring improvements; consult release.json
  and deployment evidence before assuming the public site runs this exact revision.

## Funding status

Prepared for an initial SCF interest/eligibility discussion, not an approved award
or a completed Build application. Ghana chapter routing is unconfirmed. Instawards
depend on chapter engagement; initial SCF interest review is a separate route.
The $1,200 draft sprint is future work only and subject to program guidance.

MIT licensed. Third-party dependencies retain their respective licenses.
