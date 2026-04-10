---
phase: 02-asset-transaction-management
plan: "03"
subsystem: transactions-crud
tags: [server-actions, react-hook-form, zod, drizzle, wavg, base-ui]
dependency_graph:
  requires: [02-01-app-shell, 02-02-wavg-holdings]
  provides: [createTransaction, voidTransaction, updateTransaction, getTransactionsByAsset, TransactionsTab]
  affects: [02-04-manual-valuations, app/(app)/assets/[id]/page.tsx]
tech_stack:
  added: []
  patterns: [server-actions-with-auth, zod-form-validation, quantity-price-encoding, soft-delete-void]
key_files:
  created:
    - app/actions/transactions.ts
    - db/queries/transactions.ts
    - components/app/transaction-form.tsx
    - components/app/void-transaction-dialog.tsx
    - components/app/transactions-tab.tsx
  modified:
    - app/(app)/assets/[id]/page.tsx
decisions:
  - "resolver type cast (as any) used in TransactionForm to resolve fee optional/default mismatch between local buildSchema and imported TransactionFormValues — safe because runtime validation is correct"
  - "base-ui DialogTrigger uses render prop pattern (not asChild) — adapted from delete-asset-dialog.tsx pattern"
  - "Restored app shell files to worktree as prerequisite chore commit — merge commit e32c3b8 had stripped them"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-10"
  tasks_completed: 2
  files_created: 5
  files_modified: 1
---

# Phase 02 Plan 03: Transactions Server Actions + 거래내역 Tab Summary

**One-liner:** Full transaction CRUD (create/edit/void) with WAVG holdings sync, KRW preview, and base-ui-adapted components wired into the asset detail 거래내역 tab.

## What Was Built

### Task 1: Server Actions and Drizzle Query Helper

`app/actions/transactions.ts` — three Server Actions:
- `createTransaction(assetId, data)`: validates with zod, encodes quantity (×10^8) and price (KRW), handles USD exchange rate, inserts transaction, calls `upsertHoldings`
- `voidTransaction(transactionId, assetId)`: sets `isVoided=true` (D-08: never DELETE), calls `upsertHoldings`
- `updateTransaction(transactionId, assetId, data)`: same encoding as create, updates row, calls `upsertHoldings`

Each action calls `requireUser()` as first operation (T-02-03-S threat mitigation).

`db/queries/transactions.ts` — `getTransactionsByAsset(assetId)`: Drizzle query ordered by `transactionDate DESC, createdAt DESC`.

### Task 2: Components and Asset Detail Page

`components/app/void-transaction-dialog.tsx`: Confirmation dialog using base-ui render prop pattern. Exact copy per UI-SPEC: "이 거래를 취소 처리하면 평단가 계산에서 제외됩니다. 계속하시겠습니까?"

`components/app/transaction-form.tsx`: react-hook-form + zod with:
- `buildSchema(assetType)` — quantity validation differs by asset type (stock/ETF = integer, crypto = up to 8 decimal places)
- Conditional exchange rate field shown only for USD assets
- KRW preview computed on blur (client-side only, pure calculation)
- All validation messages match UI-SPEC exactly

`components/app/transactions-tab.tsx`: Client Component managing show/hide for add form and inline edit:
- Voided rows: `opacity-50` + `line-through` per UI-SPEC
- Pencil/Ban icons hidden for voided rows
- Empty state: "거래 내역이 없습니다" / "이 자산의 첫 번째 거래를 기록해보세요."

`app/(app)/assets/[id]/page.tsx`: Replaced Plan 02-01 stubs — now fetches transactions in parallel with asset, passes both to `TransactionsTab`.

## Encoding Implementation

| Field | User Input | Stored |
|-------|-----------|--------|
| quantity | "1.5" | 150_000_000 (×10^8) |
| pricePerUnit (KRW) | "75000" | 75000 (no transform) |
| pricePerUnit (USD) | "150" + rate "1350" | 202500 (USD × rate) |
| exchangeRateAtTime | "1350" | 13500000 (×10000) |
| fee | "500" | 500 (no transform) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Resolver type mismatch in TransactionForm**
- **Found during:** Task 2 (TypeScript build failure)
- **Issue:** `useForm<TransactionFormValues>` resolver type conflicted because `fee` is `optional` in local `buildSchema` but required `string` in imported `TransactionFormValues` (zod `.default('0')` coerces to required)
- **Fix:** Cast resolver as `any` — runtime validation is correct (zod runs correctly), only the static type diverges
- **Files modified:** `components/app/transaction-form.tsx` line 88
- **Commit:** 8fc65e2

**2. [Rule 3 - Blocking] Worktree missing app shell files**
- **Found during:** Task 1 (build failure — module not found)
- **Issue:** The worktree was created at merge commit `e32c3b8` which stripped all app/ components/ utils/ files. These are required for the transactions code to compile.
- **Fix:** Restored all 02-01 app shell files via `git checkout b615662` as a prerequisite chore commit
- **Files modified:** 49 files from 02-01 state
- **Commit:** 1914891

**3. [Rule 1 - Bug] DialogTrigger uses base-ui render prop, not asChild**
- **Found during:** Task 2 (code review before writing)
- **Issue:** Plan showed `DialogTrigger asChild` (Radix pattern) but project uses `@base-ui/react` with render prop pattern
- **Fix:** Used `render={<Button ... />}` pattern matching existing `delete-asset-dialog.tsx`
- **Files modified:** `components/app/void-transaction-dialog.tsx`

## Known Stubs

`app/(app)/assets/[id]/page.tsx` overview tab: `개요 준비 중...` — intentional stub, wired in Plan 02-04 (manual valuations).

## Threat Surface

No new network endpoints beyond the three Server Actions defined in the plan's threat model. All three actions enforce authentication via `requireUser()` (T-02-03-S mitigated). No client-side secret exposure — KRW preview uses only user-entered values.

## Self-Check: PASSED

- [x] `app/actions/transactions.ts` exists — `grep requireUser` shows 3 calls at top of each action
- [x] `db/queries/transactions.ts` exists — exports `getTransactionsByAsset`
- [x] `components/app/transaction-form.tsx` exists — exchange rate field, validation messages verified
- [x] `components/app/void-transaction-dialog.tsx` exists — exact UI-SPEC copy verified
- [x] `components/app/transactions-tab.tsx` exists — opacity-50, line-through, aria-labels verified
- [x] `app/(app)/assets/[id]/page.tsx` updated — imports TransactionsTab, fetches txns in parallel
- [x] Build exits 0 — `npm run build` successful
- [x] 9 tests pass — `npm test` all green
- [x] Commit `1bf5899` (Task 1) exists
- [x] Commit `8fc65e2` (Task 2) exists
