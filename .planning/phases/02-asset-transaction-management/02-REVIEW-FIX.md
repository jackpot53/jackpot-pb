---
phase: 02-asset-transaction-management
fixed_at: 2026-04-10T07:44:46Z
review_path: .planning/phases/02-asset-transaction-management/02-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 6
skipped: 1
status: partial
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-04-10T07:44:46Z
**Source review:** .planning/phases/02-asset-transaction-management/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (CR-01, CR-02, WR-01, WR-02, WR-03, WR-04, WR-05)
- Fixed: 6
- Skipped: 1

## Fixed Issues

### CR-01: `deleteAsset` does not delete `manual_valuations` rows

**Files modified:** `app/actions/assets.ts`
**Commit:** 00e64d6
**Applied fix:** Added `import { manualValuations } from '@/db/schema/manual-valuations'` and included `tx.delete(manualValuations)` inside the delete transaction (committed together with CR-02).

### CR-02: `deleteAsset` runs multi-step deletes without a database transaction

**Files modified:** `app/actions/assets.ts`
**Commit:** 00e64d6
**Applied fix:** Wrapped all four sequential DELETE statements (transactions, manualValuations, holdings, assets) inside `db.transaction(async (tx) => { ... })` to make the cascade-delete atomic. Committed atomically with CR-01 since both changes are in the same function.

### WR-01: `computeHoldings` produces negative `totalCostKrw` when sell quantity exceeds position

**Files modified:** `lib/holdings.ts`
**Commit:** 0a15399
**Applied fix:** Added a guard at the start of the `sell` branch that checks `if (tx.quantity > totalQuantity)` and skips the transaction with a `console.warn`, preventing negative quantity and cost basis values from being persisted.

### WR-02: `updateTransaction` can silently change the currency encoding for a USD transaction

**Files modified:** `app/actions/assets.ts`
**Commit:** 29ff1f1
**Applied fix:** Applied option (a) from the review suggestion — added a pre-update check in `updateAsset` that fetches the existing asset currency and, if it differs from the requested new currency, queries the transaction count. If any transactions exist, the update is rejected with error `'거래 내역이 있는 자산의 통화는 변경할 수 없습니다.'`. Also added `sql` to the drizzle-orm import.

### WR-04: `createTransaction` does not close the add-form after a successful submit

**Files modified:** `components/app/transactions-tab.tsx`
**Commit:** 94a248d
**Applied fix:** Changed the `onSubmit` prop of the add-form `TransactionForm` from a direct `createTransaction` call to an async wrapper that calls `setShowAddForm(false)` when `result?.error` is falsy, matching the pattern suggested in the review.

### WR-05: `decodeQuantity` uses floating-point division that can lose precision for large integer quantities

**Files modified:** `components/app/transactions-tab.tsx`
**Commit:** 2321a2b
**Applied fix:** Replaced the float-division implementation (`stored / 1e8` + `toFixed(8)`) with integer arithmetic: `Math.floor(stored / 1e8)` for the integer part and `stored % 1e8` for the fractional part, padded to 8 digits with trailing zeros stripped. This matches the implementation suggested in the review exactly.

## Skipped Issues

### WR-03: `voidTransaction` and `deleteAsset` do not verify ownership of the resource

**File:** `app/actions/transactions.ts:102-112`, `app/actions/assets.ts:63-75`
**Reason:** The suggested fix requires adding a `userId` column to the `assets` table, which is a breaking schema migration (existing rows have no userId). This would require: (1) adding `userId` to `db/schema/assets.ts`, (2) generating and writing a new Drizzle migration SQL file, (3) updating ownership checks across all mutation actions. This is an architectural change beyond a targeted code fix. The reviewer explicitly notes "The project is currently single-user" and frames this as "a design gap to resolve before any multi-user expansion" — deferring to a dedicated schema-migration task is the appropriate scope boundary.
**Original issue:** Both `voidTransaction` and `deleteAsset` authenticate the caller but do not verify the caller owns the resource being mutated.

---

_Fixed: 2026-04-10T07:44:46Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
