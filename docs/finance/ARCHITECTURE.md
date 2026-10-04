# SAIMÔR Finance Architecture

## Overview

SAIMÔR Finance is the **finance operating layer**, not a crypto dashboard. It provides structured visibility into company and personal financial state with strict separation between the two.

**Core Principle**: CORE holds financial truth, Finance presents it structured, MÔRA explains changes and may suggest actions but **never invents numbers**.

## Data Flow

```
Providers (XRPL, banks, etc.)
           │
           ▼
  ┌─────────────────┐
  │   Connections   │ ── Evidence/Sync status
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │      CORE       │ ── Single source of truth
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  Finance State  │ ── Structured aggregation
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │   Finance UI    │ ── Presentation layer
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │      MÔRA       │ ── Explains, suggests, never signs
  └─────────────────┘
```

## Hard Rules

### 1. Personal/Company Separation
- **owner** field strictly enforced: `'personal' | 'company'`
- Personal assets **NEVER** count in company totals
- Company aggregation filters by `owner === 'company'`
- Personal aggregation filters by `owner === 'personal'`
- Validation function `validateOwnerSeparation()` detects violations

### 2. Read-Only XRPL Access
Allowed operations:
- `account_info` - Balance, reserves, sequence
- `account_lines` - Trust lines
- `account_tx` - Transaction history
- `account_nfts` - NFT holdings
- `account_objects` - Account objects
- `server_info` - Network state, reserve parameters

**FORBIDDEN** (no code paths exist):
- Payment
- NFTokenMint, NFTokenBurn, NFTokenModify
- OfferCreate, OfferCancel
- AccountSet, TrustSet
- Any DEX/AMM operations
- Any transaction submission

### 3. No Secrets
- No seeds (`s...` family seeds)
- No private keys
- No secrets in repo, env files, logs, JSON, client bundles, or APIs
- Only public addresses (`r...` format)

### 4. Evidence Tracking
Every number has provenance:
```typescript
interface FinanceEvidence {
  source: string;           // 'xrpl_mainnet', 'mock', etc.
  fetchedAt: string;        // ISO timestamp
  ledgerIndex?: number;     // XRPL ledger index
  validatedLedger?: number; // Validated ledger sequence
  confidence: 'live' | 'stale' | 'estimated' | 'mock';
}
```

### 5. No Mocks as Real
- Unconnected sources show status `'not_connected'`
- Mock data has `confidence: 'mock'`
- UI must clearly label unverified sources

## Known Accounts

### SAIMÔR Sovereign Treasury
- **Address**: `rG3P7J5iWPon74PFxVuPemJzoGSz4XnWUB`
- **Owner**: `company`
- **Role**: `SAIMOR_SOVEREIGN_TREASURY`
- **Purpose**: Company sovereign treasury, read-only
- **Initial Deposit**: 111 XRP
- **Status**: READ ONLY

### SAIMÔR Origin Hot Minter
- **Address**: `rNmQjteRtj68W3AJz3AHxjpGH5HfkW1Lk6`
- **Owner**: `company`
- **Role**: `SAIMOR_ORIGIN_HOT_MINTER`
- **Purpose**: Operational hot wallet for NFT minting
- **IMPORTANT**: This is NOT the treasury. Treasury ≠ Hot Minter must be visible everywhere.

### Personal Wallets (Founder's Xaman)
- **Owner**: `personal`
- Addresses not hardcoded in codebase
- Never counted as company assets
- Never used as issuer
- Never merged with company accounts

## ORIGIN NFT

### #111 — Klarheit im Wandel
- **NFTokenID**: `001A138896FFC115A26EB4E8D497207ACAA8C7CB7D80C385CDB238CB0666FA87`
- **Issuer**: `rNmQjteRtj68W3AJz3AHxjpGH5HfkW1Lk6` (Hot Minter)
- **Standard**: XLS-20
- **Flags**: 26 (OnlyXRP, Transferable, Mutable)
- **Transfer Fee**: 5000 (5%)
- **Art IPFS**: `ipfs://QmY41PCna6XHqdSxfSgP1z9CS9NzwVgD6ZcQGFLZoJRdxx`
- **Metadata IPFS**: `ipfs://QmQ481ZaPQQcFmtz3bCt4CPCMSC6D6WRZjcURudkgrCV3b`
- **Status**: `LIVE_GENESIS_MAINNET_PROOF`

### #001-#110
- **Status**: `PAUSED_AWAITING_FINAL_ART`
- No mint/list/pin code paths should be triggered

## Data Model (Company)

| Field | Type | Description |
|-------|------|-------------|
| `sovereignTreasuryXrp` | `number \| null` | Treasury balance (null if error) |
| `hotMinterXrp` | `number \| null` | Hot minter balance (null if error) |
| `realizedSalesXrp` | `number` | Only actual completed sales |
| `aggregateAskingPriceXrp` | `number` | Sum of open NFT asking prices - **NOT an asset** |
| `floorPriceXrp` | `number \| null` | Only when determinable, else null |
| `totalCashXrp` | `number` | Treasury + Hot Minter |
| `totalOperationallyBoundXrp` | `number` | Capital bound in operations |

### Important Distinctions
- **Cash/Treasury**: Actual liquid XRP holdings
- **Operationally Bound**: Hot minter, reserves
- **Realized Revenue**: Only completed sales
- **Open Listings**: Asking prices (NOT counted as assets)
- **Market/Floor Data**: Only when verifiable
- **Unrealized Valuations**: Clearly marked as estimates

## Reserve Calculation

Reserves are fetched live from `server_info`:
```typescript
reserveRequired = baseReserve + (ownerCount × incrementReserve)
availableXrp = balance - reserveRequired
```

As of 2026-10-04:
- Base Reserve: 1 XRP
- Owner Reserve: 0.2 XRP per object

## Module Structure

```
lib/finance/
├── index.ts          # Public exports
├── types.ts          # Type definitions, known accounts, feed schema
├── xrplProvider.ts   # Read-only XRPL access (incl. NFT sell offers)
├── aggregation.ts    # State aggregation with owner separation
└── moraContext.ts    # MÔRA context with change detection

app/api/finance/
└── xrpl/route.ts     # API endpoint (modes: single, company, feed, mora)

docs/finance/
└── ARCHITECTURE.md   # This document
```

## Feed Schema (finance-xrpl/1)

Compatible with local `yori_finance_live_treasury.json`:

```typescript
{
  system: 'saimor-finance',
  schema_version: 'finance-xrpl/1',
  mode: 'read-only',
  generated_at_utc: string,
  network: 'mainnet',
  reserves: { base_xrp, increment_xrp, validated_ledger },
  accounts: [{ address, role, label, balance_xrp, available_xrp, ... }],
  company: {
    sovereign_treasury_xrp, hot_minter_xrp,
    cash_total_xrp, available_total_xrp, reserved_total_xrp,
    realized_sales_xrp, aggregate_asking_price_xrp,
    open_listings_count, floor_price_xrp
  },
  personal: { included: false },
  origin: { genesis_111: {...}, collection: {...} },
  providers: { xrpl, bank_psd2, revolut_business, bitvavo, xtb }
}
```

## MÔRA Context

MÔRA receives read-only finance context:
- Company balances (treasury, hot minter, totals)
- Open listings with note: "NOT counted as assets"
- Origin NFT status and sell offers
- Provider connection status
- Recent changes detected via snapshot comparison

Change types detected:
- `balance_changed` - XRP balance changed
- `new_transaction` - New transaction detected
- `listing_created` - NFT sell offer created
- `listing_sold` - NFT listing sold/cancelled
- `owner_count_changed` - Reserve objects changed

## Future Provider Integration

Target flow for additional providers:
1. **Bank/PSD2** via finAPI
2. **Revolut Business** API
3. **Bitvavo** exchange
4. **XTB** statements
5. **Physical assets** manual entry

Each provider will follow the same pattern:
- Connection with status tracking
- Evidence for all values
- Owner field for personal/company separation
- Clear labeling of unverified data

## Cross-Repo Dependencies

### saimor-core (Backend)
- `/v3/finance/sources` - Provider configuration
- `/v3/finance/connections` - Connection status
- Finance state persistence

### yori (Local Engine)
Files on founder's laptop (not in GitHub):
- `scripts/yori_finance_treasury_engine.py`
- `xrpl/mint/yori_finance_live_treasury.json`
- `scripts/setup_mainnet_wallet_and_111.py`
- `scripts/mint_saimor_xrpl.py`
- `art/saimor_origin_nft_portal.html`

The finance data format is designed so these local tools can align with the same structure.

## Testing

Tests verify:
1. Personal/company separation enforced
2. Asking price NOT counted as asset
3. Reserve math correct
4. Error handling for unfunded accounts
5. No mock data presented as real
6. No signing functions exported
7. Treasury ≠ Hot Minter distinction

Run tests:
```bash
npx jest --testPathPattern="__tests__/lib/finance"
```

## Security Audit Checklist

- [ ] No seeds in git history
- [ ] No private keys in any file
- [ ] No secrets in .env committed
- [ ] No secrets in JSON/logs/HTML
- [ ] No secrets in client bundles
- [ ] All XRPL access read-only
- [ ] Owner separation validated
