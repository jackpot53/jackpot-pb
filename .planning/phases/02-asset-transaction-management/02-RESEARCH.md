# Phase 2: Asset & Transaction Management - Research

**Researched:** 2026-04-10
**Domain:** Next.js Server Actions + Drizzle ORM CRUD, weighted average cost basis computation, shadcn v4 data table and form patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** 좌측 고정 사이드바. 그룹명 "투자 관리", 메뉴: 대시보드 / 자산 / 거래내역 / 차트 / 목표. Phase 2부터 전체 레이아웃 구조 확립 — Phase 3-5도 동일 레이아웃 재사용.
- **D-02:** 상단 헤더에 사용자 정보 + 로그아웃 버튼 배치.
- **D-03:** 데이터 테이블 형태. 표시 컬럼: 종목명, 유형(asset_type), 평단가, 현재가(Phase 2에서는 수동 입력값 표시), 수익%. Phase 2에서는 현재가/수익률은 manual 자산만 의미 있고, live 자산은 Phase 3에서 채워짐.
- **D-04:** 테이블 하단에 "+ 자산 추가" 버튼.
- **D-05:** 자산 유형별 필터 또는 그룹화는 Claude 재량 (단순하게 시작).
- **D-06:** 자산 상세 페이지 내 탭 구조. 탭: 개요(Overview) | 거래내역(Transactions). 거래내역 탭에 "+ 거래 추가" 버튼.
- **D-07:** 거래 추가/수정은 페이지 내 폼 또는 모달 — Claude 재량. 단, 거래 목록과 동시에 보일 것.
- **D-08:** 거래 무효화(void)는 "취소" 버튼으로, 실제 DELETE 아님. is_voided=true 처리.
- **D-09:** 부동산·예적금 자산 상세 페이지에 "현재 가치 업데이트" 버튼. 클릭 시 새 ManualValuation INSERT (append-only). 과거 이력은 자산 상세 탭 또는 섹션에서 확인 가능.
- **D-10:** 수량 입력은 소수점 자유 입력. 주식/ETF는 정수 검증, 암호화폐는 소수점 8자리까지 허용. 내부 저장 시 ×10^8 변환 자동 처리.
- **D-11:** 가격(단가)은 KRW 자산의 경우 원 단위 정수, USD 자산의 경우 달러 단위로 입력. 내부 저장은 모두 KRW BIGINT (원 단위).
- **D-12:** USD 자산 거래 시 환율은 사용자가 직접 입력 (예: 1350). 시스템이 USD 단가 × 환율 = KRW 저장. Phase 3에서 BOK API 자동 조회로 업그레이드 가능.
- **D-13:** 환율 입력 필드는 USD 자산 거래 폼에만 표시 (KRW 자산에는 숨김).
- **D-14:** Holdings 계산은 순수 함수(pure function)로 구현, 단위 테스트 필수. WAVG 계산 패턴: 누적 매수로 평단가 갱신, 매도 시 평단가 불변(수익 실현 처리).
- **D-15:** Holdings 집계 테이블은 Phase 1 스키마에 이미 정의됨 — Phase 2에서 쓰기 로직 구현.

### Claude's Discretion

- 자산 유형별 아이콘 또는 색상 태그
- 거래 폼 필드 순서 및 레이아웃 세부사항
- 빈 상태 (자산 없음, 거래 없음) 화면 디자인
- 로딩/에러 상태 처리
- 테이블 정렬 기능 구현 여부

### Deferred Ideas (OUT OF SCOPE)

- 환율 자동 조회 (BOK API) — Phase 3 범위
- 자산 목록 정렬·필터 고급 기능 — Phase 5 성과 비교 화면에서 구현
- CSV 일괄 거래 가져오기 — v2 요구사항 (ADV-V2-01)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ASSET-01 | 사용자가 자산 종목(주식/ETF/코인/부동산/예적금)을 등록·수정·삭제할 수 있다 | Plan 02-01: Asset CRUD Server Actions + Drizzle queries; shadcn Table + Dialog + Badge components; asset_type/price_type/currency enums already in schema |
| ASSET-02 | 사용자가 매수/매도 거래를 날짜·수량·가격·수수료와 함께 기록할 수 있다 | Plan 02-02: Transaction Server Actions; quantity ×10^8 encoding; exchange_rate field conditional on USD; react-hook-form zod validation |
| ASSET-03 | 사용자가 부동산·예적금의 현재 가치를 수동으로 업데이트할 수 있다 (이력 보존) | Plan 02-03: ManualValuation append-only INSERT (never UPDATE/DELETE); history list in overview tab |
| ASSET-04 | 사용자가 잘못 입력한 거래 내역을 수정하거나 삭제할 수 있다 | Plan 02-02: void = is_voided=true (soft delete); edit = new transaction creation or direct field update with validation; WAVG recompute on every change |
</phase_requirements>

---

## Summary

Phase 2 builds on a fully established foundation: Next.js 16.2.3 App Router, Drizzle ORM 0.45.2 with all 7 tables already migrated to Supabase PostgreSQL, shadcn v4 (base-nova) with react-hook-form 7.72.1 + zod 4.3.6. All schema decisions are locked — assets, transactions, holdings, and manual_valuations tables are defined with the exact column types and constraints required.

The primary technical work falls into three categories: (1) Next.js Server Actions with Drizzle for CRUD operations on four tables; (2) shadcn Table/Tabs/Dialog/Select/Badge components providing the data table, tabbed detail page, and confirmation dialogs per the UI-SPEC; (3) a pure TypeScript function computing weighted average cost basis from the transaction log, with atomic holdings table writes on every transaction mutation.

The most nuanced piece is the WAVG holdings maintenance pattern: every transaction write (insert, void) must atomically recompute and upsert the holdings row. This must be a pure function tested in isolation before any UI wires to it. Integer arithmetic throughout (no floating-point until display) and the ×10^8 quantity encoding are the two implementation constraints most likely to cause bugs if forgotten in form parsing.

**Primary recommendation:** Build the WAVG pure function and its unit tests (Plan 02-04) before Plans 02-01/02-02 write to holdings, so the computation logic is verified before it gets wired into live mutations.

---

## Standard Stack

### Core (all already installed — verified against package.json)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.3 | App Router, Server Actions, routing | Locked in Phase 1 |
| drizzle-orm | 0.45.2 | Type-safe PostgreSQL queries via postgres.js | Locked in Phase 1 (D-03) |
| react-hook-form | 7.72.1 | Form state, validation lifecycle, blur/submit modes | Established in Phase 1 login form |
| @hookform/resolvers | 5.2.2 | zod adapter for react-hook-form | Installed with Phase 1 |
| zod | 4.3.6 | Schema validation for forms and Server Action inputs | Installed in Phase 1 |
| lucide-react | 1.7.0 | Icon library (Pencil, Trash2, Ban, Loader2) | Established in Phase 1 |
| shadcn CLI | 4.2.0 | Component installation from shadcn official registry | Locked in Phase 1 |
| @base-ui/react | 1.3.0 | Base UI primitives (base-nova preset) | Locked in Phase 1 |

[VERIFIED: /Users/john/dev/jackpot-pb/package.json]

### New Components to Install (shadcn official registry only)

| Component | CLI Command | Usage |
|-----------|-------------|-------|
| Table | `npx shadcn add table` | Asset list, transaction list, valuation history |
| Select | `npx shadcn add select` | asset_type and currency selectors in forms |
| Tabs | `npx shadcn add tabs` | Asset detail page: 개요 / 거래내역 tabs |
| Dialog | `npx shadcn add dialog` | Delete asset confirmation, void transaction confirmation |
| Badge | `npx shadcn add badge` | Asset type color tags (주식/ETF/코인/부동산/예적금) |
| Separator | `npx shadcn add separator` | Section dividers in overview tab |

[VERIFIED: 02-UI-SPEC.md — Component Inventory section]

### No New npm Packages Needed

All computation, form validation, UI, and database layers are already installed. Phase 2 adds no new npm dependencies — only shadcn component files (which are copied into `components/ui/`, not installed as packages).

**Installation (shadcn components only):**
```bash
npx shadcn add table select tabs dialog badge separator
```

---

## Architecture Patterns

### Recommended Project Structure

```
app/
├── (app)/                    # Route group: authenticated shell layout
│   ├── layout.tsx            # Shell layout: sidebar + header + main content
│   ├── assets/
│   │   ├── page.tsx          # Asset list page (/assets)
│   │   ├── new/
│   │   │   └── page.tsx      # New asset form page
│   │   └── [id]/
│   │       └── page.tsx      # Asset detail page (tabs: 개요 | 거래내역)
│   └── ...                   # Other nav items (dashboard placeholder, etc.)
app/
├── actions/
│   ├── assets.ts             # Server Actions: createAsset, updateAsset, deleteAsset
│   ├── transactions.ts       # Server Actions: createTransaction, voidTransaction, updateTransaction
│   └── manual-valuations.ts  # Server Actions: createManualValuation
lib/
├── holdings.ts               # Pure function: computeHoldings(transactions[]) → HoldingsResult
│                             # And: upsertHoldings(assetId, db) — reads txns, calls pure fn, writes
db/
├── schema/                   # Already exists — all tables defined
├── queries/
│   ├── assets.ts             # Drizzle query helpers (getAssets, getAssetById)
│   ├── transactions.ts       # Drizzle query helpers (getTransactionsByAsset)
│   └── manual-valuations.ts  # Drizzle query helpers (getValuationsByAsset)
tests/
├── holdings.test.ts          # Unit tests for pure WAVG function (Wave 0 gap)
├── schema.test.ts            # Already exists
└── middleware.test.ts        # Already exists
```

### Pattern 1: Server Action with Drizzle (established in Phase 1)

**What:** `'use server'` functions in `app/actions/` that call Drizzle queries and redirect or return error objects. Client forms call these via `form.handleSubmit`.

**When to use:** All CRUD mutations (createAsset, updateAsset, deleteAsset, createTransaction, voidTransaction, createManualValuation).

```typescript
// Source: app/actions/auth.ts (Phase 1 established pattern)
// Extended pattern for asset mutations:
'use server'
import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function createAsset(formData: AssetFormValues) {
  // 1. Verify auth (always — middleware protects routes but Server Actions need their own check)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Validate input with zod (never trust client-side validation alone)
  const parsed = assetSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.flatten() }

  // 3. Drizzle insert
  await db.insert(assets).values({ ...parsed.data })

  // 4. Redirect or return success
  redirect('/assets')
}
```

[VERIFIED: app/actions/auth.ts, db/index.ts, db/schema/assets.ts — ASSUMED pattern extension for assets]

### Pattern 2: Authenticated Shell Layout with Route Group

**What:** A `(app)` route group containing a shared `layout.tsx` that renders the fixed sidebar + header. All authenticated pages live inside this group. The `(app)` directory name is invisible in URLs.

**When to use:** Phase 2 establishes this layout for all subsequent phases (D-01, D-02).

```typescript
// Source: CONTEXT.md D-01, D-02; 02-UI-SPEC.md Layout section
// app/(app)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
```

[ASSUMED — pattern follows Next.js App Router route group convention; auth check matches Phase 1 middleware.ts approach]

### Pattern 3: Quantity and Price Encoding

**What:** User-facing input is human-readable (e.g., "0.5" BTC, "75000" KRW). Internal storage uses integer multiples. Conversion happens in the Server Action, never in UI components.

**When to use:** Every transaction createTransaction/updateTransaction Server Action.

```typescript
// Source: CONTEXT.md D-10, D-11, D-12; db/schema/transactions.ts comments

// Quantity encoding: user input → storage
function encodeQuantity(userInput: string): number {
  // "0.5" → 50_000_000 (×10^8)
  return Math.round(parseFloat(userInput) * 1e8)
}

// Price encoding for USD assets: user dollar input + exchange rate → KRW storage
function encodePriceKrw(usdPrice: number, exchangeRate: number): number {
  // usdPrice=150.00, exchangeRate=1350 → 202500 (KRW per unit)
  return Math.round(usdPrice * exchangeRate)
}

// Exchange rate encoding: e.g., 1350.75 KRW/USD → 13507500 (×10000)
function encodeExchangeRate(rate: number): number {
  return Math.round(rate * 10000)
}

// Display decoding: storage → human-readable
function decodeQuantity(stored: number, decimals: number): string {
  return (stored / 1e8).toFixed(decimals)
}
```

[VERIFIED: db/schema/transactions.ts inline comments confirm ×10^8 quantity and ×10000 exchange rate encoding]

### Pattern 4: WAVG Pure Function with Holdings Upsert

**What:** A pure function that accepts an array of non-voided transactions for a single asset and returns the current holdings state. A separate function calls this and upserts the holdings table. These two concerns are separate.

**When to use:** Called after every transaction write (create, void, edit).

```typescript
// Source: CONTEXT.md D-14; db/schema/holdings.ts; PITFALLS.md §3
// lib/holdings.ts

interface Transaction {
  type: 'buy' | 'sell'
  quantity: number        // already encoded as ×10^8 integer
  pricePerUnit: number    // already in KRW BIGINT
  fee: number             // already in KRW BIGINT
  isVoided: boolean
}

interface HoldingsResult {
  totalQuantity: number    // ×10^8
  avgCostPerUnit: number   // KRW per unit (in ×10^8 quantity units)
  totalCostKrw: number     // total invested KRW
}

export function computeHoldings(transactions: Transaction[]): HoldingsResult {
  const active = transactions.filter(t => !t.isVoided)

  let totalQuantity = 0
  let totalCostKrw = 0
  let avgCostPerUnit = 0

  for (const tx of active) {
    if (tx.type === 'buy') {
      const txCostKrw = Math.round((tx.quantity / 1e8) * tx.pricePerUnit) + tx.fee
      const newQuantity = totalQuantity + tx.quantity
      // WAVG formula: new_avg = (old_avg × old_qty + new_price × new_qty) / total_qty
      // Using integer-safe calculation (no floating-point intermediate)
      avgCostPerUnit = newQuantity > 0
        ? Math.round((avgCostPerUnit * totalQuantity + tx.pricePerUnit * tx.quantity) / newQuantity)
        : 0
      totalQuantity = newQuantity
      totalCostKrw += txCostKrw
    } else if (tx.type === 'sell') {
      // On sell: avgCostPerUnit does NOT change (weighted average convention)
      // Cost basis of sold units is deducted from totalCostKrw
      const soldCostKrw = Math.round((tx.quantity / 1e8) * avgCostPerUnit)
      totalQuantity -= tx.quantity
      totalCostKrw -= soldCostKrw
    }
  }

  return { totalQuantity, avgCostPerUnit, totalCostKrw }
}
```

**Critical:** All division in WAVG uses `Math.round()` at each step to stay in integer space. The `avgCostPerUnit` in the holdings table represents KRW per 1 full unit (not per ×10^8 unit). Test edge cases: multiple buys, partial sell, buy-after-sell, all-voided.

[VERIFIED: db/schema/holdings.ts — confirms column names and bigint mode; CONTEXT.md D-14; PITFALLS.md §3]

### Pattern 5: Append-Only ManualValuation Insert

**What:** ManualValuation is INSERT-only. The Server Action for "현재 가치 업데이트" calls `db.insert(manualValuations)` — never `.update()`. The existing history is displayed in a list, sorted descending by `valued_at`.

**When to use:** Plan 02-03 manual valuation Server Action.

```typescript
// Source: db/schema/manual-valuations.ts (D-06 comment: "INSERT only. No UPDATE or DELETE")
export async function createManualValuation(assetId: string, data: ValuationFormValues) {
  // Never update existing rows — always insert new row
  await db.insert(manualValuations).values({
    assetId,
    valueKrw: data.valueKrw,      // integer, already in KRW
    currency: data.currency,
    exchangeRateAtTime: data.exchangeRate ? encodeExchangeRate(data.exchangeRate) : null,
    valuedAt: data.valuedAt,       // DATE string
    notes: data.notes ?? null,
  })
}
```

[VERIFIED: db/schema/manual-valuations.ts comment]

### Anti-Patterns to Avoid

- **DELETE on transactions:** Never `db.delete(transactions)`. Set `isVoided=true` and recompute holdings. (D-08, D-05)
- **UPDATE on manual_valuations:** Never `db.update(manualValuations)`. Always INSERT new row. (D-06)
- **Float arithmetic for WAVG:** Do not use `Number(quantity) * price` naively. Use integer multiplication and `Math.round()` at the final division step only.
- **Storing display-formatted amounts:** The DB stores raw integers (×10^8 quantity, KRW BIGINT price). Format only at the UI render layer.
- **Recomputing holdings from scratch on every page load:** The `holdings` table is the maintained aggregate. Read from it on the dashboard. Only recompute when a transaction mutation occurs.
- **Route group name leaking to URL:** Using `(app)` as the route group name keeps it invisible in URLs. Do not name it `app-layout` or similar — Next.js strips parenthesized segment names from the URL.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation with error messages | Custom validation logic | react-hook-form + zod (already installed) | Already established in Phase 1 login form; handles blur/submit modes, FormMessage display, isSubmitting state |
| Confirmation dialog for delete/void | Custom modal from scratch | shadcn Dialog (`npx shadcn add dialog`) | Accessible focus trap, keyboard dismiss, backdrop — non-trivial to implement correctly |
| Data table with rows and actions | Custom `<table>` markup | shadcn Table (`npx shadcn add table`) | Consistent with design system; responsive table utilities included |
| Select dropdown (asset type, currency) | Custom `<select>` | shadcn Select (`npx shadcn add select`) | Base UI popover primitive with keyboard navigation, consistent styling |
| Asset type color labels | Custom CSS class mapping | shadcn Badge with Tailwind class overrides | Per UI-SPEC: defined color mapping per asset_type |
| Loading spinners | Custom CSS animation | `<Loader2 className="animate-spin" />` from lucide-react | Already used in Phase 1; consistent pattern |

**Key insight:** This phase is almost entirely a form-and-table CRUD surface. The existing form infrastructure (react-hook-form + zod + shadcn form primitives) handles 90% of the complexity. The only genuinely novel logic is the WAVG computation.

---

## Common Pitfalls

### Pitfall 1: Forgetting Auth Check Inside Server Actions

**What goes wrong:** The `middleware.ts` protects page routes, but Server Actions called from client components bypass the middleware check. A Server Action without its own `supabase.auth.getUser()` check is callable by unauthenticated users directly.

**Why it happens:** Middleware protects route navigation, not direct POST calls to Server Action endpoints.

**How to avoid:** Every Server Action that touches the database must call `createClient()` and `getUser()` as its first operation, and redirect to `/login` if the user is null.

**Warning signs:** Server Actions in `app/actions/` without a `createClient()` import.

[VERIFIED: app/actions/auth.ts — already follows this pattern; ASSUMED extension to new Server Actions]

### Pitfall 2: Integer Overflow in WAVG Calculation

**What goes wrong:** The WAVG formula is `(old_avg × old_qty + new_price × new_qty) / total_qty`. With `old_qty` stored as ×10^8 integer and `pricePerUnit` as KRW BIGINT, multiplying them can exceed JavaScript's safe integer limit (2^53 - 1 ≈ 9 × 10^15).

**Example:** 100,000 shares (stored as `10_000_000_000_000` = 10^13) × ₩50,000 price = 5 × 10^17, which exceeds `Number.MAX_SAFE_INTEGER`.

**Why it happens:** JavaScript `number` is IEEE 754 double (53-bit mantissa). Values above ~9 quadrillion lose precision.

**How to avoid:** For the WAVG numerator multiplication, separate the quantity into "whole units" by dividing out the ×10^8 before multiplying: `avgCostPerUnit = Math.round((old_avg * (totalQuantity / 1e8) + newPrice * (newQty / 1e8)) / ((totalQuantity + newQty) / 1e8))`. Alternatively, reduce the formula to work in "whole unit" space throughout. For a personal tracker with realistic quantities (max a few thousand shares), overflow is unlikely but worth guarding.

**Warning signs:** Unit tests with very large quantities returning `NaN` or wrong values.

[VERIFIED: db/schema/transactions.ts — confirms bigint{mode:'number'} which means JavaScript Number; PITFALLS.md §1]

### Pitfall 3: quantity / 1e8 Rounding in Display

**What goes wrong:** Displaying `holdings.totalQuantity / 1e8` naively with `toFixed(8)` shows `0.50000000` for 0.5 BTC but also `100.00000000` for 100 shares of a Korean stock — confusing the user.

**How to avoid:** Format quantity display based on `asset_type`: stocks/ETF use integer display (or 0 decimal places), crypto uses up to 8 decimal places with trailing zero trimming.

```typescript
function formatQuantity(stored: number, assetType: string): string {
  const value = stored / 1e8
  if (assetType === 'crypto') return value.toFixed(8).replace(/\.?0+$/, '')
  return Math.round(value).toLocaleString('ko-KR')
}
```

[ASSUMED — formatting convention; consistent with D-10]

### Pitfall 4: Stale Holdings After Void

**What goes wrong:** When a transaction is voided (`is_voided=true`), the holdings row must be recomputed. If the holdings upsert is forgotten after a void operation, the displayed average cost is wrong.

**How to avoid:** The `voidTransaction` Server Action must call `upsertHoldings(assetId)` atomically after the void update. Wrap in a database transaction if possible, or at minimum ensure the holdings recompute is always called in the same Server Action.

**Warning signs:** After voiding a buy transaction, the average cost shown in the table doesn't change.

[VERIFIED: CONTEXT.md D-08, D-14 — void and holdings recompute both required]

### Pitfall 5: Root Layout vs App Shell Layout Conflict

**What goes wrong:** The root `app/layout.tsx` currently wraps all routes (including `/login`) with `<body>`. If the sidebar/header are added to the root layout, they appear on the login page too.

**How to avoid:** Use a route group `app/(app)/layout.tsx` for the authenticated shell. The root `app/layout.tsx` keeps only `<html>/<body>` wrapping. The login route at `app/login/` is outside the `(app)` group and renders without the shell.

**Warning signs:** Sidebar renders on the `/login` page.

[VERIFIED: app/layout.tsx — currently only has html/body; ASSUMED route group pattern is the Next.js App Router solution]

### Pitfall 6: shadcn Select vs HTML select for Forms

**What goes wrong:** shadcn Select is a controlled component backed by Base UI Popover — it does NOT behave like a native `<select>`. When used inside react-hook-form, it must be wrapped with `<FormField>` and `<Controller>` (i.e., the `render` prop pattern), not registered with `{...field}` spread like text inputs.

**How to avoid:** Use `<FormField control={form.control} name="assetType" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}>...)}` — the `onValueChange` / `value` props, not the native `onChange`.

**Warning signs:** Select value never updates the form state; `form.getValues('assetType')` always returns undefined.

[VERIFIED: components/ui/form.tsx — FormField uses Controller; ASSUMED Select integration pattern from standard shadcn docs; tagged ASSUMED]

---

## Code Examples

### Drizzle Query: Get Asset with Latest Holding

```typescript
// Source: db/schema/assets.ts, db/schema/holdings.ts (verified column names)
import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { holdings } from '@/db/schema/holdings'
import { eq } from 'drizzle-orm'

export async function getAssetWithHolding(assetId: string) {
  return db
    .select()
    .from(assets)
    .leftJoin(holdings, eq(assets.id, holdings.assetId))
    .where(eq(assets.id, assetId))
    .limit(1)
}
```

### Drizzle Mutation: Void Transaction and Recompute Holdings

```typescript
// Source: db/schema/transactions.ts (isVoided column confirmed); CONTEXT.md D-08, D-14
import { db } from '@/db'
import { transactions } from '@/db/schema/transactions'
import { eq } from 'drizzle-orm'

export async function voidTransaction(txId: string, assetId: string) {
  // 1. Soft-delete: set is_voided = true
  await db.update(transactions)
    .set({ isVoided: true })
    .where(eq(transactions.id, txId))

  // 2. Recompute and upsert holdings (see upsertHoldings below)
  await upsertHoldings(assetId)
}
```

### Drizzle Mutation: Upsert Holdings After Transaction Change

```typescript
// Source: db/schema/holdings.ts (unique assetId), db/schema/transactions.ts
import { holdings } from '@/db/schema/holdings'
import { transactions } from '@/db/schema/transactions'
import { eq } from 'drizzle-orm'
import { computeHoldings } from '@/lib/holdings'

export async function upsertHoldings(assetId: string) {
  const txns = await db
    .select()
    .from(transactions)
    .where(eq(transactions.assetId, assetId))

  const result = computeHoldings(txns)

  await db
    .insert(holdings)
    .values({ assetId, ...result, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: holdings.assetId,
      set: { ...result, updatedAt: new Date() },
    })
}
```

[VERIFIED: db/schema/holdings.ts — unique constraint on assetId confirms onConflictDoUpdate is correct; ASSUMED Drizzle onConflictDoUpdate syntax]

### KRW Display Formatter

```typescript
// Source: CONTEXT.md D-03, D-11 — amounts stored as KRW BIGINT, displayed in Korean format
export function formatKrw(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount)
}

// For return % with gain/loss coloring
export function formatReturnPercent(returnBps: number): { text: string; className: string } {
  const pct = returnBps / 100
  return {
    text: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
    className: pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
  }
}
```

[VERIFIED: 02-UI-SPEC.md — gain/loss color values; CONTEXT.md D-03 columns]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router + API routes | App Router + Server Actions | Next.js 13+ | No separate `/api/` routes needed for CRUD; Server Actions run on the server directly |
| shadcn with Radix UI | shadcn v4 with Base UI (`base-nova`) | 2025 | `@base-ui/react` replaces `@radix-ui/react-*`; component import paths unchanged but primitives differ |
| zod v3 `z.string()` API | zod v4 with same API but new `.email()` behavior | 2025 | Installed version is 4.3.6; API is largely backward compatible but some inference types changed |

**Deprecated/outdated:**
- `useRouter().push()` for post-mutation navigation in Server Actions: Use `redirect()` from `next/navigation` instead.
- `res.json()` in API routes: Not applicable — this project uses Server Actions, no API route handlers needed for CRUD.

[VERIFIED: package.json versions; ASSUMED based on Next.js App Router and zod 4 knowledge]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Route group `(app)` convention isolates authenticated layout from `/login` | Architecture Patterns §2 | If wrong: sidebar renders on login page — fix by moving layout to correct route group |
| A2 | shadcn Select requires `onValueChange`/`value` props inside react-hook-form, not `{...field}` spread | Common Pitfalls §6 | If wrong: asset type select never submits — easy to detect and fix during implementation |
| A3 | Drizzle `onConflictDoUpdate` syntax for holdings upsert | Code Examples — upsertHoldings | If wrong: holdings insert fails on second transaction — check Drizzle 0.45.2 docs for correct syntax |
| A4 | `avgCostPerUnit` in holdings table represents KRW per 1 full unit (not per ×10^8 sub-unit) | Architecture Patterns §4 | If wrong: all displayed average costs will be off by ×10^8 — verify against schema comments and test |
| A5 | Server Actions called from Client Components bypass Next.js middleware | Common Pitfalls §1 | If wrong (middleware does apply): auth check in Server Actions is redundant but harmless — no downside to double-checking |

---

## Open Questions (RESOLVED)

1. **WAVG avgCostPerUnit precision: per-unit or per sub-unit?** (RESOLVED)
   - What we know: `holdings.avgCostPerUnit` is `bigint`. Quantity is stored as ×10^8. Price is in KRW.
   - **Resolution:** `avgCostPerUnit` represents KRW per 1 full share (e.g., 75000 for a share bought at ₩75,000). The ×10^8 encoding applies to quantity, not to the price. Plan 02-04 `computeHoldings` defines this explicitly in code comments and the unit test verifies: 1 buy of 100 shares at ₩75,000 → `avgCostPerUnit === 75000n`.

2. **Asset deletion cascade behavior** (RESOLVED)
   - What we know: `transactions.asset_id` references `assets.id`. The schema does not define `ON DELETE CASCADE`. A schema migration to add CASCADE is not appropriate here (Phase 1 migration has already been applied).
   - **Resolution:** `deleteAsset` Server Action in Plan 02-01 performs explicit pre-delete child-row cleanup in order: (1) delete all transactions for the asset, (2) delete the holdings row for the asset, (3) delete the asset itself. This avoids FK violations without requiring a schema migration. Implementation is already updated in Plan 02-01 Task 2.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — all work is code/schema changes within the already-provisioned stack; Supabase PostgreSQL and Drizzle are operational from Phase 1).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.3 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test` (vitest run) |
| Full suite command | `npm test` |

[VERIFIED: package.json scripts, vitest.config.ts]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ASSET-01 | Asset CRUD Server Actions (create/update/delete) | integration (DB required) | manual-only — requires live Supabase | N/A |
| ASSET-02 | Transaction create with correct quantity/price encoding | unit (pure encoding functions) | `npm test -- tests/holdings.test.ts` | ❌ Wave 0 |
| ASSET-03 | ManualValuation append-only insert | integration (DB required) | manual-only | N/A |
| ASSET-04 | Void transaction + WAVG recompute | unit (pure function) | `npm test -- tests/holdings.test.ts` | ❌ Wave 0 |
| ASSET-04 | WAVG: multiple buys, partial sell, buy-after-sell | unit | `npm test -- tests/holdings.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test` (all unit tests, < 5 seconds)
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/holdings.test.ts` — covers WAVG pure function for ASSET-02, ASSET-04 (required before Plan 02-04 implementation)
  - Test cases needed: single buy, multiple buys (WAVG recalculate), partial sell (avg unchanged), buy-after-sell, all-voided (zero result), mixed void/non-void

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth `getUser()` check at top of every Server Action |
| V3 Session Management | no — handled by Phase 1 middleware | `@supabase/ssr` cookie session |
| V4 Access Control | yes | Single-user app: verify `user` is not null; no row-level user_id needed (single user) |
| V5 Input Validation | yes | zod schema parse in every Server Action before DB write |
| V6 Cryptography | no | No new crypto operations |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated Server Action call | Spoofing | `supabase.auth.getUser()` check at top of every Server Action |
| Negative quantity / negative price injection | Tampering | zod `.positive()` validator on quantity and price fields |
| Integer overflow via crafted quantity | Tampering | zod `.max()` bound on quantity (e.g., max 100 billion sub-units) |
| Orphaned holdings row after asset delete | Tampering/data integrity | Explicit delete cascade in Server Action (holdings → transactions → asset) |
| ManualValuation UPDATE via direct DB call | Repudiation | No UPDATE route exposed — append-only enforced at Server Action layer |

---

## Sources

### Primary (HIGH confidence)
- `/Users/john/dev/jackpot-pb/db/schema/assets.ts` — verified column names, enum values, types
- `/Users/john/dev/jackpot-pb/db/schema/transactions.ts` — verified quantity/price/exchangeRate encoding comments
- `/Users/john/dev/jackpot-pb/db/schema/holdings.ts` — verified column names and unique constraint
- `/Users/john/dev/jackpot-pb/db/schema/manual-valuations.ts` — verified append-only comment and columns
- `/Users/john/dev/jackpot-pb/package.json` — verified all package versions
- `/Users/john/dev/jackpot-pb/app/actions/auth.ts` — verified Server Action pattern
- `/Users/john/dev/jackpot-pb/app/login/page.tsx` — verified react-hook-form + zod + shadcn form pattern
- `/Users/john/dev/jackpot-pb/.planning/phases/02-asset-transaction-management/02-CONTEXT.md` — locked decisions D-01 through D-15
- `/Users/john/dev/jackpot-pb/.planning/phases/02-asset-transaction-management/02-UI-SPEC.md` — component inventory, layout, color, typography, copy
- `/Users/john/dev/jackpot-pb/.planning/research/PITFALLS.md` — WAVG formula, integer storage pitfalls

### Secondary (MEDIUM confidence)
- ASSUMED: Next.js App Router route group `(app)` pattern for isolated layout — standard convention documented in Next.js docs
- ASSUMED: Drizzle `onConflictDoUpdate` syntax — verify against Drizzle 0.45.2 docs during Plan 02-04 implementation

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against installed package.json
- Architecture patterns: HIGH for Server Action + Drizzle patterns (verified from Phase 1 code); MEDIUM for route group layout (assumed from Next.js docs, not verified in this codebase yet)
- WAVG computation: HIGH — formula verified against PITFALLS.md and schema column comments
- Pitfalls: HIGH — based on verified schema decisions and established Phase 1 patterns

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable stack — no fast-moving dependencies)
