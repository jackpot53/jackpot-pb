---
phase: 02-asset-transaction-management
verified: 2026-04-10T15:01:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open /assets, click '자산 추가', fill in all fields including ticker for a live asset, submit"
    expected: "Asset appears in /assets table with correct AssetTypeBadge color and '—' in 평단가/현재가/수익% columns"
    why_human: "Visual layout, badge color rendering, and redirect behavior require browser verification"
  - test: "Navigate to a saved asset, go to 거래내역 tab, add a buy transaction for a USD asset"
    expected: "Exchange rate field is visible; KRW preview updates on blur; transaction appears in the list with correct date and amount"
    why_human: "Client-side KRW preview and conditional field visibility require browser interaction"
  - test: "Click the Ban icon on an existing non-voided transaction, confirm in the dialog"
    expected: "Row becomes opacity-50 with line-through styling; Pencil/Ban icons disappear from that row; holdings row is re-computed"
    why_human: "Visual void styling and real-time holdings update require browser verification"
  - test: "Navigate to a savings or real_estate asset, go to 개요 tab, click '현재 가치 업데이트'"
    expected: "Form appears; after submission the entry appears in the valuation history list sorted descending"
    why_human: "Conditional UI section visibility and append-only insert with history display require browser verification"
  - test: "Navigate to a live asset (e.g. stock_kr), go to 개요 tab"
    expected: "The '현재 가치 업데이트' button is NOT visible; only asset metadata is shown"
    why_human: "Conditional section suppression for live assets requires browser verification"
---

# Phase 2: Asset & Transaction Management Verification Report

**Phase Goal:** Users can enter and manage all their assets and transaction history so the data foundation for portfolio math is complete
**Verified:** 2026-04-10T15:01:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can create, edit, and delete assets of any type with correct price type | ✓ VERIFIED | `app/actions/assets.ts` exports `createAsset`, `updateAsset`, `deleteAsset`; each calls `requireUser()` then zod `safeParse`; `deleteAsset` manually cascades child tables. Asset form renders all 7 asset types, both price types, conditional ticker field for `priceType === 'live'`. Pages at `/assets`, `/assets/new`, `/assets/[id]/edit` all exist and are wired. |
| 2 | User can record buy/sell transactions with date, quantity, price, fee — and edit or void incorrect entries | ✓ VERIFIED | `app/actions/transactions.ts` exports `createTransaction`, `voidTransaction`, `updateTransaction`; all three call `requireUser()` first; `voidTransaction` sets `isVoided=true` (never DELETE per D-08); all three call `upsertHoldings(assetId)` after mutation. `TransactionsTab` renders form with all required fields; void dialog wired; voided rows styled `opacity-50` + `line-through`; Pencil/Ban hidden for voided rows. |
| 3 | User can update the current value of a manual asset and the history of past valuations is preserved | ✓ VERIFIED | `app/actions/manual-valuations.ts` exports `createManualValuation`; uses `db.insert()` only — no `update` or `delete` (D-06/D-09); `OverviewTab` conditionally renders valuation section for `priceType === 'manual'` assets only; empty state shows '가치 업데이트 내역이 없습니다'; `getValuationsByAsset` fetches from DB ordered by `valuedAt DESC, createdAt DESC`. |
| 4 | Weighted average cost basis computed correctly for all patterns, verified by unit tests | ✓ VERIFIED | `lib/holdings.ts` exports `computeHoldings` (pure function) and `upsertHoldings` (DB helper); 8 unit tests in `tests/holdings.test.ts` cover: empty, single buy, buy+fee, two-buy WAVG, partial sell (avg unchanged), buy-after-sell, all-voided, mixed-void. `npm test -- tests/holdings.test.ts` exits 0 with 8 passed. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/(app)/layout.tsx` | Authenticated shell: Sidebar + Header + auth guard | ✓ VERIFIED | Calls `supabase.auth.getUser()`, redirects to `/login` if no user, renders `<Sidebar>` + `<Header>` + `<main>` |
| `components/app/sidebar.tsx` | Fixed sidebar with 5 nav items per D-01 | ✓ VERIFIED | `NAV_ITEMS` includes 대시보드/자산/거래내역/차트/목표; active highlight via `usePathname`; correct `href` values |
| `components/app/header.tsx` | User email + 로그아웃 button per D-02 | ✓ VERIFIED | Renders `user.email` from `supabase.auth.getUser()`; 로그아웃 button present |
| `app/(app)/assets/page.tsx` | Asset list with Table, type Badges, row actions | ✓ VERIFIED | Calls `getAssets()` (real DB query); renders shadcn Table with 종목명/유형/평단가/현재가/수익% columns; "—" in price columns; `AssetTypeBadge` per row; Pencil link + `DeleteAssetDialog` per row |
| `app/actions/assets.ts` | `createAsset`, `updateAsset`, `deleteAsset` Server Actions | ✓ VERIFIED | All 3 exported; each calls `requireUser()` first; zod `safeParse`; `deleteAsset` cascades transactions → holdings → asset |
| `db/queries/assets.ts` | `getAssets`, `getAssetById` Drizzle helpers | ✓ VERIFIED | Both present; real `db.select().from(assets)` queries |
| `components/app/asset-type-badge.tsx` | Badge mapping all 7 asset types to colors | ✓ VERIFIED | All 7 types mapped with distinct colored `className` values |
| `lib/holdings.ts` | `computeHoldings` + `upsertHoldings` | ✓ VERIFIED | Both exported; `computeHoldings` is pure (no DB calls); `upsertHoldings` uses `onConflictDoUpdate` (Drizzle upsert); integer-safe arithmetic with `Math.round` at division boundary |
| `tests/holdings.test.ts` | 8 unit tests for WAVG edge cases | ✓ VERIFIED | 8 `it()` calls covering all spec cases; all pass |
| `app/actions/transactions.ts` | `createTransaction`, `voidTransaction`, `updateTransaction` | ✓ VERIFIED | All 3 exported; each calls `requireUser()` + `upsertHoldings(assetId)` after mutation; quantity encoded ×10^8; USD price multiplied by exchange rate |
| `db/queries/transactions.ts` | `getTransactionsByAsset` Drizzle helper | ✓ VERIFIED | Real `db.select().from(transactions)` ordered by `transactionDate DESC, createdAt DESC` |
| `components/app/transaction-form.tsx` | Form with exchange rate field + KRW preview | ✓ VERIFIED | `isUSD` flag controls conditional exchange rate field; KRW preview (`≈ ₩{amount}`) computed on blur; `buildSchema(assetType)` for quantity validation |
| `components/app/void-transaction-dialog.tsx` | Void confirmation dialog | ✓ VERIFIED | Present; uses base-ui render prop pattern |
| `app/actions/manual-valuations.ts` | `createManualValuation` — INSERT only | ✓ VERIFIED | `db.insert(manualValuations)` only; no `update`/`delete`; USD→KRW conversion via exchange rate |
| `db/queries/manual-valuations.ts` | `getValuationsByAsset` Drizzle helper | ✓ VERIFIED | Real `db.select().from(manualValuations)` ordered descending |
| `components/app/overview-tab.tsx` | Conditional valuation section for manual assets | ✓ VERIFIED | `isManual = asset.priceType === 'manual'` gate; `{isManual && (…)}` block; empty state message; history list with valuations passed as props from real DB fetch |
| `app/(app)/assets/[id]/page.tsx` | Detail page with both tabs fully wired | ✓ VERIFIED | `Promise.all([getAssetById, getTransactionsByAsset, getValuationsByAsset])`; `<TransactionsTab>` and `<OverviewTab>` both receive real data; no "준비 중" stubs remaining |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/(app)/assets/page.tsx` | `db/queries/assets.ts` | `getAssets()` server component call | ✓ WIRED | Direct import + call in async Server Component |
| `app/actions/transactions.ts` | `lib/holdings.ts` | `upsertHoldings(assetId)` after each mutation | ✓ WIRED | Called at lines 98, 110, 157 — after create, void, and update respectively |
| `app/actions/transactions.ts` | `utils/supabase/server.ts` | `requireUser()` as first operation | ✓ WIRED | Lines 55, 106, 119 — first call in each action |
| `components/app/transaction-form.tsx` | `app/actions/transactions.ts` | `react-hook-form handleSubmit → createTransaction/updateTransaction` | ✓ WIRED | `onSubmit` handler calls `createTransaction` or `updateTransaction` based on `isEditing` prop |
| `components/app/overview-tab.tsx` | `app/actions/manual-valuations.ts` | form submit → `createManualValuation` | ✓ WIRED | `const result = await createManualValuation(asset.id, data)` in `onSubmit` |
| `app/(app)/assets/[id]/page.tsx` | `db/queries/manual-valuations.ts` | `getValuationsByAsset` → passed to `OverviewTab` | ✓ WIRED | `getValuationsByAsset(id)` in `Promise.all`; result passed as `valuations` prop |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `app/(app)/assets/page.tsx` | `assetList` | `db.select().from(assets)` in `db/queries/assets.ts` | Yes — real Drizzle query | ✓ FLOWING |
| `app/(app)/assets/[id]/page.tsx` | `txns` | `db.select().from(transactions)` ordered by date | Yes — real Drizzle query | ✓ FLOWING |
| `app/(app)/assets/[id]/page.tsx` | `valuations` | `db.select().from(manualValuations)` ordered descending | Yes — real Drizzle query | ✓ FLOWING |
| `lib/holdings.ts` (`upsertHoldings`) | transaction log | `db.select({type, quantity, pricePerUnit, fee, isVoided}).from(transactions)` | Yes — real Drizzle query | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 8 WAVG unit tests | `npm test -- tests/holdings.test.ts` | 8 passed, 0 failed | ✓ PASS |
| Next.js production build | `npm run build` | Compiled successfully; TypeScript clean; 7 routes generated | ✓ PASS |
| computeHoldings empty input | Pure function — verified via test #1 | `{totalQuantity:0, avgCostPerUnit:0, totalCostKrw:0}` | ✓ PASS |
| `upsertHoldings` uses `onConflictDoUpdate` | `grep onConflictDoUpdate lib/holdings.ts` | Found at line 84 | ✓ PASS |
| `createManualValuation` INSERT-only | `grep "db.update\|db.delete" app/actions/manual-valuations.ts` | Not found — only `db.insert` | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ASSET-01 | 02-01, 02-04 | 자산 종목 등록·수정·삭제 | ✓ SATISFIED | `createAsset`, `updateAsset`, `deleteAsset` implemented with auth guard; full form with all 7 types |
| ASSET-02 | 02-02, 02-03 | 매수/매도 거래 기록 | ✓ SATISFIED | `createTransaction`, `updateTransaction` with date/quantity/price/fee; `voidTransaction` for soft-delete |
| ASSET-03 | 02-04 | 부동산·예적금 현재 가치 수동 업데이트 (이력 보존) | ✓ SATISFIED | `createManualValuation` INSERT-only; history list preserved in `manual_valuations` table |
| ASSET-04 | 02-02, 02-03 | 잘못 입력한 거래 내역 수정·삭제 | ✓ SATISFIED | `updateTransaction` for edits; `voidTransaction` for soft-delete (D-08 prohibition on hard DELETE respected) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/(app)/assets/page.tsx` | 62-64 | `<TableCell>—</TableCell>` for 평단가/현재가/수익% | ℹ️ Info | Intentional per plan decision D-03: live prices wired in Phase 3; manual valuations wired in Phase 4 |

No blockers. The em-dash placeholder for price columns is explicitly intentional and documented in 02-01-SUMMARY.md Known Stubs section and plan decision D-03.

### Human Verification Required

#### 1. Asset CRUD Visual Flow

**Test:** Open `/assets`, click `자산 추가`, create a `savings` asset and a `stock_kr` asset with ticker
**Expected:** Both appear in the assets table with correct `AssetTypeBadge` colors (gray for 예적금, blue for 주식); ticker shown as muted subtext; "—" in all price columns; Pencil and Trash icons visible per row
**Why human:** Visual badge color rendering, table layout, and form field visibility (ticker only for live priceType) require browser

#### 2. USD Transaction with KRW Preview

**Test:** Navigate to a USD asset (stock_us or crypto with USD currency), go to 거래내역 tab, click `+ 거래 추가`
**Expected:** Exchange rate field is visible; entering quantity + price + exchange rate and blurring shows live `≈ ₩{amount}` preview below the fields
**Why human:** Client-side `onBlur` KRW preview is JavaScript behavior — cannot verify from static code inspection alone

#### 3. Void Transaction Visual Behavior

**Test:** On an asset with at least one transaction, click the Ban icon, confirm in the dialog
**Expected:** Row immediately shows `opacity-50` + strikethrough text; Pencil/Ban icons disappear from that row; subsequent navigation to same page still shows the voided row
**Why human:** React state update + visual class application + navigation persistence require browser

#### 4. Manual Valuation Append-Only Workflow

**Test:** Navigate to a `savings` or `real_estate` asset detail page, open 개요 tab, click `현재 가치 업데이트`, enter a value and date, submit; then add a second entry
**Expected:** Both entries appear in the history list sorted descending by date; no existing entry is modified
**Why human:** UI conditional visibility, form submission, history list rendering, and INSERT-only behavior require browser and DB interaction

#### 5. Live Asset 개요 Tab

**Test:** Navigate to a `stock_kr` or `crypto` asset, open 개요 tab
**Expected:** `현재 가치 업데이트` button is NOT visible; only asset metadata (type, currency, price type, ticker if present, notes if present) is shown
**Why human:** Conditional section suppression (`priceType !== 'manual'`) requires browser rendering verification

### Gaps Summary

No gaps found. All 4 ROADMAP success criteria are verified at the artifact, wiring, and data-flow levels. The 5 human verification items are UX/visual behaviors that cannot be confirmed from static code inspection but have solid programmatic foundations.

---

_Verified: 2026-04-10T15:01:00Z_
_Verifier: Claude (gsd-verifier)_
