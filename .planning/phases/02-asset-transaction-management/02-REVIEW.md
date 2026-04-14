---
phase: 02-asset-transaction-management
reviewed: 2026-04-10T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - app/actions/assets.ts
  - app/actions/transactions.ts
  - app/actions/manual-valuations.ts
  - app/(app)/layout.tsx
  - app/(app)/assets/page.tsx
  - app/(app)/assets/new/page.tsx
  - app/(app)/assets/[id]/page.tsx
  - app/(app)/assets/[id]/edit/page.tsx
  - components/app/asset-form.tsx
  - components/app/asset-type-badge.tsx
  - components/app/delete-asset-dialog.tsx
  - components/app/header.tsx
  - components/app/sidebar.tsx
  - components/app/overview-tab.tsx
  - components/app/transaction-form.tsx
  - components/app/transactions-tab.tsx
  - components/app/void-transaction-dialog.tsx
  - db/queries/assets.ts
  - db/queries/transactions.ts
  - db/queries/manual-valuations.ts
  - lib/holdings.ts
  - tests/holdings.test.ts
findings:
  critical: 2
  warning: 5
  info: 4
  total: 11
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-10
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

This phase implements asset CRUD, transaction management, manual valuations, and WAVG holdings computation. The overall structure is solid: server actions validate with Zod, auth is checked on every action, and the `computeHoldings` pure function is well-tested. Two critical issues require attention before this can be considered production-ready: the asset delete action leaves `manual_valuations` rows orphaned (only `transactions` and `holdings` are cleaned up), and the `deleteAsset` action runs three separate DELETE statements without a transaction, leaving the database in a partially-deleted state if any step fails. Several warnings cover logic errors that could produce incorrect financial calculations or silent failures in the UI.

---

## Critical Issues

### CR-01: `deleteAsset` does not delete `manual_valuations` rows

**File:** `app/actions/assets.ts:68-72`
**Issue:** The cascade-delete sequence deletes `transactions` and `holdings` for an asset but skips `manual_valuations`. After `deleteAsset` runs, orphaned rows remain in `manual_valuations` with a foreign-key reference to a non-existent asset. If a new asset is later assigned the same UUID (unlikely with UUIDs but architecturally incorrect), stale valuation data would contaminate it. More practically, the orphaned rows waste storage and indicate a correctness gap.
**Fix:**
```typescript
// app/actions/assets.ts — add this import
import { manualValuations } from '@/db/schema/manual-valuations'

// Inside deleteAsset, between step 1 and step 2:
await db.delete(transactions).where(eq(transactions.assetId, id))
await db.delete(manualValuations).where(eq(manualValuations.assetId, id))  // ADD
await db.delete(holdings).where(eq(holdings.assetId, id))
await db.delete(assets).where(eq(assets.id, id))
```

### CR-02: `deleteAsset` runs multi-step deletes without a database transaction

**File:** `app/actions/assets.ts:68-72`
**Issue:** The four sequential `db.delete()` calls (transactions → holdings → asset) are not wrapped in a database transaction. If the process crashes or a query fails after step 1 but before step 3, the asset row remains with its child rows partially deleted. This leaves the database in an inconsistent state that cannot be recovered without manual intervention. This is especially risky because `deleteAsset` issues a `redirect()` afterward — any error thrown mid-sequence will not be caught.
**Fix:**
```typescript
export async function deleteAsset(id: string): Promise<AssetActionError | void> {
  await requireUser()
  if (!id) return { error: '자산 ID가 없습니다.' }

  await db.transaction(async (tx) => {
    await tx.delete(transactions).where(eq(transactions.assetId, id))
    await tx.delete(manualValuations).where(eq(manualValuations.assetId, id))
    await tx.delete(holdings).where(eq(holdings.assetId, id))
    await tx.delete(assets).where(eq(assets.id, id))
  })

  revalidatePath('/assets')
  redirect('/assets')
}
```

---

## Warnings

### WR-01: `computeHoldings` produces negative `totalCostKrw` when sell quantity exceeds position

**File:** `lib/holdings.ts:46-49`
**Issue:** The sell branch subtracts `soldCostBasis` from `totalCostKrw` unconditionally. There is no guard against selling more units than are currently held (`totalQuantity`). If transactions arrive in an unexpected order or if a user records a sell before a buy (e.g., short-sale scenario, data entry error), `totalQuantity` and `totalCostKrw` both go negative. This produces nonsense holdings data that is persisted to the DB via `upsertHoldings`, silently corrupting the portfolio state.
**Fix:**
```typescript
} else if (tx.type === 'sell') {
  if (tx.quantity > totalQuantity) {
    // Guard: cannot sell more than held — skip or throw
    // For data-integrity, skip silently and log; caller should validate upstream
    continue
  }
  const soldCostBasis = Math.round((tx.quantity / 1e8) * avgCostPerUnit)
  totalQuantity -= tx.quantity
  totalCostKrw -= soldCostBasis
}
```
A test covering this edge case should also be added to `tests/holdings.test.ts`.

### WR-02: `updateTransaction` can silently change the currency encoding for a USD transaction

**File:** `app/actions/transactions.ts:114-158`
**Issue:** `updateTransaction` re-fetches the asset's `currency` and re-encodes prices, but it does not update the `currency` column on the transaction row itself (line 147-155 `set(...)` block does not include `currency`). This is only correct if the asset's currency can never change. However, `updateAsset` (`app/actions/assets.ts:45-61`) allows changing the `currency` field of an asset without migrating existing transaction rows. If a user first creates a USD asset, records transactions, then edits the asset to KRW currency, subsequent calls to `updateTransaction` would encode `pricePerUnit` as KRW but the transaction row retains `currency = 'USD'`, making the stored `exchangeRateAtTime` misleading and the cost basis wrong.
**Fix:** Either (a) prevent changing `currency` on an existing asset (best), or (b) include a migration step in `updateAsset` that re-encodes all existing transactions when currency changes. Option (a) is simpler:
```typescript
// In assetSchema or updateAsset, enforce that currency cannot be changed
// for assets with existing transactions — query transaction count before allowing the update.
const txCount = await db.select({ count: sql`count(*)` }).from(transactions).where(eq(transactions.assetId, id))
if (txCount[0].count > 0 && parsed.data.currency !== existingAsset.currency) {
  return { error: '거래 내역이 있는 자산의 통화는 변경할 수 없습니다.' }
}
```

### WR-03: `voidTransaction` and `deleteAsset` do not verify ownership of the resource

**File:** `app/actions/transactions.ts:102-112`, `app/actions/assets.ts:63-75`
**Issue:** Both `voidTransaction` and `deleteAsset` call `requireUser()` to confirm the caller is authenticated but do not verify that the authenticated user _owns_ the resource being modified. Any authenticated user (in a future multi-user scenario or if auth tokens are shared) can void any transaction or delete any asset by knowing its ID. The project is currently single-user, but the auth layer is already Supabase-based with a real user ID available. Since `assets` and `transactions` tables have no `userId` column, enforcing ownership requires adding that column or using Supabase RLS policies. This should be treated as a design gap to resolve before any multi-user expansion.
**Fix:** In the short term, add a `userId` column to `assets` and check it on every mutation:
```typescript
// In deleteAsset and voidTransaction:
const user = await requireUser()
const row = await db.select({ userId: assets.userId }).from(assets).where(eq(assets.id, id)).limit(1)
if (!row[0] || row[0].userId !== user.id) return { error: '권한이 없습니다.' }
```

### WR-04: `createTransaction` does not close the add-form after a successful submit

**File:** `components/app/transactions-tab.tsx:46-58`
**Issue:** The add-form `TransactionForm` is passed `onCancel={() => setShowAddForm(false)}` but its `onSubmit` handler (`(data) => createTransaction(asset.id, data)`) never calls `setShowAddForm(false)` on success. After a successful transaction save, the form stays visible. The user must click "취소" to dismiss it. This is a UX bug — successful mutation should close the form.
**Fix:**
```tsx
// In TransactionsTab, wrap the onSubmit to close form on success:
onSubmit={async (data) => {
  const result = await createTransaction(asset.id, data)
  if (!result?.error) setShowAddForm(false)
  return result
}}
```

### WR-05: `decodeQuantity` uses floating-point division that can lose precision for large integer quantities

**File:** `components/app/transactions-tab.tsx:28-31`
**Issue:** `decodeQuantity` divides the stored `×10^8` integer by `1e8` using floating-point arithmetic, then applies `toFixed(8)`. For large quantities (e.g., `stored = 999999999999999` — the maximum safe JS integer range is ~9×10^15, so quantities above ~90 million units will experience floating-point imprecision after division). This value is then passed back to `updateTransaction` as the `quantity` string, which re-encodes it via `encodeQuantity`. The round-trip is not guaranteed to be lossless for extreme values.
**Fix:** This is low risk for typical equity quantities but relevant for crypto. At minimum, add a comment; for correctness, use a string-based decimal library for the decode:
```typescript
function decodeQuantity(stored: number): string {
  // Integer division to avoid float rounding: work with integer arithmetic
  const intPart = Math.floor(stored / 1e8)
  const fracPart = stored % 1e8
  if (fracPart === 0) return intPart.toString()
  return `${intPart}.${fracPart.toString().padStart(8, '0').replace(/0+$/, '')}`
}
```

---

## Info

### IN-01: Zod schema duplicated between server action and client form

**File:** `app/actions/assets.ts:12-19`, `components/app/asset-form.tsx:26-33`
**Issue:** `assetSchema` is defined identically in both files. If a new asset type or field constraint is added to the server-side schema, the client-side copy must be updated manually. Same duplication exists between `app/actions/manual-valuations.ts:16-25` and `components/app/overview-tab.tsx:20-28`.
**Fix:** Export the schema from the action file and import it in the component:
```typescript
// app/actions/assets.ts — add export
export const assetSchema = z.object({ ... })

// components/app/asset-form.tsx — remove local definition, import instead
import { assetSchema } from '@/app/actions/assets'
```

### IN-02: `formatKrw` helper duplicated across three components

**File:** `components/app/overview-tab.tsx:32-34`, `components/app/transaction-form.tsx:70-72`, `components/app/transactions-tab.tsx:24-26`
**Issue:** The same `formatKrw` function is copy-pasted with slight variations (one calls `Math.round`, others do not). This is a maintenance hazard — a change to currency formatting (e.g., adding `₩` prefix) must be applied in multiple places.
**Fix:** Extract to a shared utility, e.g. `lib/format.ts`:
```typescript
export function formatKrw(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value))
}
```

### IN-03: `ASSET_TYPE_LABELS` constant duplicated across three files

**File:** `components/app/asset-form.tsx:35-43`, `components/app/overview-tab.tsx:36-40`, `components/app/asset-type-badge.tsx` (uses a `BADGE_MAP`)
**Issue:** The asset type label mapping is defined in multiple places. Adding a new asset type requires updating all three.
**Fix:** Centralise in a shared constants file (e.g., `lib/asset-types.ts`) and import from there.

### IN-04: `getTransactionsByAsset` returns all transactions including voided ones — no filter option

**File:** `db/queries/transactions.ts:8-14`
**Issue:** The query always returns all transactions (including voided ones). Every consumer must filter `isVoided` manually. Currently only one consumer exists (`transactions-tab.tsx`), but as the codebase grows, filtering at the query layer would be cleaner and prevent future consumers from accidentally including voided transactions.
**Fix:** Consider adding an optional `includeVoided` parameter defaulting to `true` for backward compatibility, or a separate `getActiveTransactionsByAsset` query used where voided records should be excluded.

---

_Reviewed: 2026-04-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
