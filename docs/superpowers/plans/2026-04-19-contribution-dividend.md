# 출자금 배당 이력 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 출자금 자산에 연도별 배당률 이력 테이블을 추가하고, 현재 가치를 `원금 + Σ(원금 × 연도별 배당률)`로 자동 계산한다.

**Architecture:** 새 `contribution_dividend_rates(asset_id, year, rate_bp)` 테이블로 연도별 배당률 관리. `contribution_details`의 `dividend_rate_bp` 컬럼 제거. 포트폴리오 계산은 `computeAssetPerformance` contribution 분기에서 순수 함수로 처리.

**Tech Stack:** Drizzle ORM, Supabase Postgres, Next.js Server Actions, React (useTransition)

---

## 파일 맵

| 파일 | 변경 |
|------|------|
| `db/migrations/0036_add_contribution_details.sql` | 수정 — `dividend_rate_bp` 제거 |
| `db/migrations/0037_add_contribution_dividend_rates.sql` | 신규 |
| `db/schema/contribution-details.ts` | 수정 — `dividendRateBp` 제거 |
| `db/schema/contribution-dividend-rates.ts` | 신규 |
| `db/queries/contribution.ts` | 수정 — 배당 이력 쿼리 추가 |
| `lib/portfolio/portfolio.ts` | 수정 — 타입 + 계산 로직 |
| `lib/server/load-performances.ts` | 수정 — 배당 이력 조회로 교체 |
| `app/actions/assets.ts` | 수정 — createAsset/updateAsset contribution 분기 |
| `app/actions/contribution.ts` | 신규 — 배당률 upsert/delete actions |
| `app/(app)/assets/[id]/edit/page.tsx` | 수정 — 배당 이력 조회 + prop 전달 |
| `components/app/asset-form.tsx` | 수정 — 배당 이력 UI 섹션 |
| `tests/contribution/contribution-calc.test.ts` | 신규 — 계산 로직 단위 테스트 |

---

## Task 1: DB 스키마 + 마이그레이션

**Files:**
- Modify: `db/migrations/0036_add_contribution_details.sql`
- Create: `db/migrations/0037_add_contribution_dividend_rates.sql`
- Modify: `db/schema/contribution-details.ts`
- Create: `db/schema/contribution-dividend-rates.ts`

- [ ] **Step 1: `0036` 마이그레이션에서 `dividend_rate_bp` 제거**

`db/migrations/0036_add_contribution_details.sql` 전체를 아래로 교체:

```sql
CREATE TABLE "public"."contribution_details" (
  "asset_id" uuid PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
  "user_id" uuid NOT NULL,
  "deposit_date" date,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 2: `0037` 마이그레이션 생성**

`db/migrations/0037_add_contribution_dividend_rates.sql` 생성:

```sql
CREATE TABLE "public"."contribution_dividend_rates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "asset_id" uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  "user_id" uuid NOT NULL,
  "year" integer NOT NULL,
  "rate_bp" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("asset_id", "year")
);
```

- [ ] **Step 3: `contribution-details.ts` 스키마 수정**

`db/schema/contribution-details.ts` 전체 교체:

```typescript
import { pgTable, uuid, date, timestamp } from 'drizzle-orm/pg-core'
import { assets } from './assets'

export const contributionDetails = pgTable('contribution_details', {
  assetId: uuid('asset_id').primaryKey().references(() => assets.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  depositDate: date('deposit_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ContributionDetailsRow = typeof contributionDetails.$inferSelect
```

- [ ] **Step 4: `contribution-dividend-rates.ts` 스키마 생성**

`db/schema/contribution-dividend-rates.ts` 생성:

```typescript
import { pgTable, uuid, integer, timestamp, unique } from 'drizzle-orm/pg-core'
import { assets } from './assets'

export const contributionDividendRates = pgTable('contribution_dividend_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  year: integer('year').notNull(),
  rateBp: integer('rate_bp').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique().on(table.assetId, table.year),
])

export type ContributionDividendRateRow = typeof contributionDividendRates.$inferSelect
```

- [ ] **Step 5: DB에 마이그레이션 적용**

기존에 `contribution_details` 테이블이 `dividend_rate_bp` 컬럼을 포함하여 생성되어 있다면 먼저 드롭 후 재생성:

```sql
-- Supabase SQL editor 또는 psql에서 실행
DROP TABLE IF EXISTS contribution_details CASCADE;
DROP TABLE IF EXISTS contribution_dividend_rates CASCADE;
```

그 다음 마이그레이션 실행:

```bash
npx drizzle-kit push
```

예상 출력: `contribution_details`, `contribution_dividend_rates` 테이블 생성 확인

- [ ] **Step 6: 커밋**

```bash
git add db/migrations/0036_add_contribution_details.sql \
        db/migrations/0037_add_contribution_dividend_rates.sql \
        db/schema/contribution-details.ts \
        db/schema/contribution-dividend-rates.ts
git commit -m "feat(db): contribution_dividend_rates 테이블 추가, dividend_rate_bp 제거"
```

---

## Task 2: 쿼리 함수 업데이트

**Files:**
- Modify: `db/queries/contribution.ts`

- [ ] **Step 1: `db/queries/contribution.ts` 전체 교체**

```typescript
import { db } from '@/db'
import { contributionDetails } from '@/db/schema/contribution-details'
import { contributionDividendRates } from '@/db/schema/contribution-dividend-rates'
import { inArray, eq, and } from 'drizzle-orm'
import type { ContributionDetailsRow } from '@/db/schema/contribution-details'
import type { ContributionDividendRateRow } from '@/db/schema/contribution-dividend-rates'

export async function getContributionDetails(ids: string[]): Promise<Map<string, ContributionDetailsRow>> {
  if (ids.length === 0) return new Map()
  const rows = await db.select().from(contributionDetails).where(inArray(contributionDetails.assetId, ids))
  return new Map(rows.map((r) => [r.assetId, r]))
}

export async function getContributionDividendRates(ids: string[]): Promise<Map<string, ContributionDividendRateRow[]>> {
  if (ids.length === 0) return new Map()
  const rows = await db.select().from(contributionDividendRates).where(inArray(contributionDividendRates.assetId, ids))
  const map = new Map<string, ContributionDividendRateRow[]>()
  for (const row of rows) {
    const existing = map.get(row.assetId) ?? []
    existing.push(row)
    map.set(row.assetId, existing)
  }
  return map
}

export async function upsertContributionDividendRate(
  assetId: string,
  userId: string,
  year: number,
  rateBp: number,
): Promise<void> {
  await db.insert(contributionDividendRates).values({ assetId, userId, year, rateBp })
    .onConflictDoUpdate({
      target: [contributionDividendRates.assetId, contributionDividendRates.year],
      set: { rateBp },
    })
}

export async function deleteContributionDividendRate(
  assetId: string,
  userId: string,
  year: number,
): Promise<void> {
  await db.delete(contributionDividendRates).where(
    and(
      eq(contributionDividendRates.assetId, assetId),
      eq(contributionDividendRates.userId, userId),
      eq(contributionDividendRates.year, year),
    )
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add db/queries/contribution.ts
git commit -m "feat(db): 출자금 배당률 이력 쿼리 함수 추가"
```

---

## Task 3: 포트폴리오 계산 로직 + 단위 테스트

**Files:**
- Create: `tests/contribution/contribution-calc.test.ts`
- Modify: `lib/portfolio/portfolio.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/contribution/contribution-calc.test.ts` 생성:

```typescript
import { describe, it, expect } from 'vitest'

// 순수 계산 함수 — portfolio.ts에서 추출 예정
function computeContributionValue(
  principal: number,
  dividendRates: Array<{ year: number; rateBp: number }>,
  currentYear: number,
): { currentValueKrw: number; returnPct: number } {
  const cumulativeDividends = dividendRates
    .filter(r => r.year <= currentYear)
    .reduce((sum, r) => sum + Math.round(principal * r.rateBp / 1_000_000), 0)
  const currentValueKrw = principal + cumulativeDividends
  const returnPct = principal > 0 ? ((currentValueKrw - principal) / principal) * 100 : 0
  return { currentValueKrw, returnPct }
}

describe('computeContributionValue', () => {
  it('원금만 있고 배당 이력 없으면 currentValueKrw = principal', () => {
    const result = computeContributionValue(1_000_000, [], 2026)
    expect(result.currentValueKrw).toBe(1_000_000)
    expect(result.returnPct).toBe(0)
  })

  it('단일 연도 3.5% 배당 적용', () => {
    // 1,000,000 × 3.5% = 35,000
    const result = computeContributionValue(
      1_000_000,
      [{ year: 2025, rateBp: 35_000 }],
      2026,
    )
    expect(result.currentValueKrw).toBe(1_035_000)
    expect(result.returnPct).toBeCloseTo(3.5, 5)
  })

  it('2개 연도 배당 누적', () => {
    // 1,000,000 × (3.0% + 3.5%) = 30,000 + 35,000 = 65,000
    const result = computeContributionValue(
      1_000_000,
      [
        { year: 2024, rateBp: 30_000 },
        { year: 2025, rateBp: 35_000 },
      ],
      2026,
    )
    expect(result.currentValueKrw).toBe(1_065_000)
  })

  it('미래 연도 배당은 포함하지 않음', () => {
    // 2027년 배당은 currentYear=2026 기준으로 제외
    const result = computeContributionValue(
      1_000_000,
      [
        { year: 2025, rateBp: 35_000 },
        { year: 2027, rateBp: 40_000 },
      ],
      2026,
    )
    expect(result.currentValueKrw).toBe(1_035_000)
  })

  it('원금 0이면 returnPct = 0 (나눗셈 안전)', () => {
    const result = computeContributionValue(0, [], 2026)
    expect(result.returnPct).toBe(0)
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run tests/contribution/contribution-calc.test.ts
```

예상: FAIL (함수 미정의)

- [ ] **Step 3: `lib/portfolio/portfolio.ts` 타입 수정**

`AssetPerformance` 인터페이스에 필드 추가. `import` 상단에 추가:

```typescript
import type { ContributionDividendRateRow } from '@/db/schema/contribution-dividend-rates'
```

`AssetPerformance` 인터페이스 마지막에 추가 (기존 `chartData?` 위):

```typescript
  /** 출자금 전용: 연도별 배당률 이력 */
  contributionDividendRates: ContributionDividendRateRow[] | null
```

- [ ] **Step 4: `computeAssetPerformance` contribution 분기 교체**

`lib/portfolio/portfolio.ts`의 기존 contribution 분기 (`if (holding.assetType === 'contribution') { ... }`) 전체 교체:

```typescript
  if (holding.assetType === 'contribution') {
    const currentYear = new Date().getFullYear()
    const principal = holding.totalCostKrw
    const rates = contributionDividendRates ?? []
    const cumulativeDividends = rates
      .filter(r => r.year <= currentYear)
      .reduce((sum, r) => sum + Math.round(principal * r.rateBp / 1_000_000), 0)
    const currentValueKrw = principal + cumulativeDividends
    const returnPct = principal > 0
      ? ((currentValueKrw - principal) / principal) * 100
      : 0
    return {
      ...holding,
      currentValueKrw,
      currentPriceKrw: 0,
      currentPriceUsd: null,
      currentFxRate: null,
      isStale: false,
      cachedAt: null,
      returnPct,
      stockReturnPct: null,
      fxReturnPct: null,
      dailyChangeBps: null,
      missingValuation: false,
      initialTransactionDate: null,
      maturityDate: null,
      interestRateBp: null,
      monthlyContributionKrw: null,
      insuranceDetails: null,
      compoundType: null,
      contributionDividendRates: rates,
    }
  }
```

- [ ] **Step 5: `computeAssetPerformance` 파라미터 수정**

`params` 타입에서 `contributionDetails` 파라미터를 `contributionDividendRates`로 교체:

기존:
```typescript
  contributionDetails?: ContributionDetailsRow | null
```

교체:
```typescript
  contributionDividendRates?: ContributionDividendRateRow[] | null
```

함수 destructuring에서도 교체:

기존:
```typescript
const { ..., contributionDetails = null } = params
```

교체:
```typescript
const { ..., contributionDividendRates = null } = params
```

- [ ] **Step 6: 모든 `AssetPerformance` 반환 위치에 `contributionDividendRates: null` 추가**

`portfolio.ts` 내에서 contribution 분기 외의 모든 `return { ... }` 블록에 `contributionDividendRates: null`을 추가해야 한다. 대상 분기:

1. savings 자동계산 분기 (`isInsuranceAuto`가 false인 savings 반환)
2. insurance 자동계산 분기 (`isInsuranceAuto` true 반환)
3. insurance 자동계산 분기의 `currentValueKrw = latestManualValuationKrw ?? autoValue` 이후 반환
4. 파일 맨 아래 기본 반환 (stock/etf/crypto 등)

각 반환 블록에 아래 한 줄 추가:

```typescript
      contributionDividendRates: null,
```

- [ ] **Step 7: 테스트 재실행 — 통과 확인**

```bash
npx vitest run tests/contribution/contribution-calc.test.ts
```

예상: PASS (5 tests)

- [ ] **Step 8: 커밋**

```bash
git add lib/portfolio/portfolio.ts tests/contribution/contribution-calc.test.ts
git commit -m "feat(portfolio): 출자금 배당 이력 기반 현재가 자동 계산"
```

---

## Task 4: 서버 로더 업데이트

**Files:**
- Modify: `lib/server/load-performances.ts`

- [ ] **Step 1: import 교체**

기존:
```typescript
import { getContributionDetails } from '@/db/queries/contribution'
```

교체:
```typescript
import { getContributionDividendRates } from '@/db/queries/contribution'
```

- [ ] **Step 2: contribution 조회 블록 교체**

기존:
```typescript
  const contributionDetailsMap = await timed('  contribution details', () =>
    getContributionDetails(contributionIds)
  )
```

교체:
```typescript
  const contributionDividendRatesMap = await timed('  contribution dividend rates', () =>
    getContributionDividendRates(contributionIds)
  )
```

- [ ] **Step 3: `computeAssetPerformance` 호출 수정**

기존:
```typescript
          contributionDetails: contributionDetailsMap.get(asset.assetId) ?? null,
```

교체:
```typescript
          contributionDividendRates: contributionDividendRatesMap.get(asset.assetId) ?? null,
```

- [ ] **Step 4: 커밋**

```bash
git add lib/server/load-performances.ts
git commit -m "feat(server): contribution 배당 이력 bulk 조회로 교체"
```

---

## Task 5: `createAsset` 액션 — 배당률 신규 테이블에 저장

**Files:**
- Modify: `app/actions/assets.ts`

- [ ] **Step 1: import 추가**

`app/actions/assets.ts` 상단 import에 추가:

```typescript
import { contributionDividendRates } from '@/db/schema/contribution-dividend-rates'
```

기존 `contributionDetails` import도 유지 (deposit_date 저장에 사용).

- [ ] **Step 2: `createAsset` contribution 분기 수정**

기존 contribution 분기에서 `dividendRateBp: rateBp` 부분을 제거하고 `contribution_dividend_rates` INSERT 추가:

기존:
```typescript
    const rateBp = interestRatePct && !isNaN(parseFloat(interestRatePct))
      ? Math.round(parseFloat(interestRatePct) * 10000)
      : null
    await db.insert(contributionDetails).values({
      assetId: newAsset.id,
      userId: user.id,
      dividendRateBp: rateBp,
      depositDate: normalizedDepositDate,
    })
```

교체:
```typescript
    await db.insert(contributionDetails).values({
      assetId: newAsset.id,
      userId: user.id,
      depositDate: normalizedDepositDate,
    })
    if (interestRatePct && !isNaN(parseFloat(interestRatePct))) {
      const rateBp = Math.round(parseFloat(interestRatePct) * 10000)
      const currentYear = new Date().getFullYear()
      await db.insert(contributionDividendRates).values({
        assetId: newAsset.id,
        userId: user.id,
        year: currentYear,
        rateBp,
      })
    }
```

- [ ] **Step 3: `updateAsset` contribution 분기 추가**

`updateAsset` 함수 끝 (`revalidatePath('/assets')` 바로 위) 에 추가:

```typescript
  // contribution_details upsert (deposit_date 갱신)
  if (rest.assetType === 'contribution') {
    const normalizedDepositDate = depositStartDate || null
    await db.insert(contributionDetails).values({
      assetId: id,
      userId: user.id,
      depositDate: normalizedDepositDate,
    }).onConflictDoUpdate({
      target: contributionDetails.assetId,
      set: {
        depositDate: normalizedDepositDate,
        updatedAt: new Date(),
      },
    })
  }
```

- [ ] **Step 4: 커밋**

```bash
git add app/actions/assets.ts
git commit -m "feat(actions): createAsset/updateAsset contribution 배당률 신규 테이블 저장"
```

---

## Task 6: 배당률 관리 서버 액션 (신규 파일)

**Files:**
- Create: `app/actions/contribution.ts`

- [ ] **Step 1: `app/actions/contribution.ts` 생성**

```typescript
'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { upsertContributionDividendRate, deleteContributionDividendRate } from '@/db/queries/contribution'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

const upsertSchema = z.object({
  assetId: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  ratePct: z.string().regex(/^\d+(\.\d+)?$/, '유효한 배당률을 입력해주세요.'),
})

export async function upsertDividendRate(
  assetId: string,
  year: number,
  ratePct: string,
): Promise<{ error: string } | void> {
  const user = await requireUser()
  const parsed = upsertSchema.safeParse({ assetId, year, ratePct })
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? '입력 오류' }
  const rateBp = Math.round(parseFloat(parsed.data.ratePct) * 10000)
  await upsertContributionDividendRate(assetId, user.id, year, rateBp)
  revalidatePath(`/assets/${assetId}`)
  revalidatePath('/assets')
}

export async function deleteDividendRate(
  assetId: string,
  year: number,
): Promise<void> {
  const user = await requireUser()
  await deleteContributionDividendRate(assetId, user.id, year)
  revalidatePath(`/assets/${assetId}`)
  revalidatePath('/assets')
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/actions/contribution.ts
git commit -m "feat(actions): 출자금 배당률 upsert/delete 서버 액션"
```

---

## Task 7: 편집 페이지 + `AssetForm` 배당 이력 UI

**Files:**
- Modify: `app/(app)/assets/[id]/edit/page.tsx`
- Modify: `components/app/asset-form.tsx`

- [ ] **Step 1: 편집 페이지에서 배당 이력 조회**

`app/(app)/assets/[id]/edit/page.tsx` 수정:

import 추가:
```typescript
import { getContributionDividendRates } from '@/db/queries/contribution'
import type { ContributionDividendRateRow } from '@/db/schema/contribution-dividend-rates'
```

`Promise.all` 확장:
```typescript
  const [asset, holding, dividendRatesMap] = await Promise.all([
    getAssetById(id, user.id),
    getHoldingByAssetId(id),
    getContributionDividendRates([id]),
  ])
  if (!asset) notFound()

  const contributionDividendRates: ContributionDividendRateRow[] =
    asset.assetType === 'contribution' ? (dividendRatesMap.get(id) ?? []) : []
```

`AssetForm` prop 추가:
```tsx
      <AssetForm
        defaultValues={{ ...asset, ...holdingDefaults }}
        onSubmit={updateAsset.bind(null, id)}
        submitLabel="자산 수정"
        showInitialTransaction
        transactionSectionLabel="매수 추가 (선택)"
        contributionDividendRates={contributionDividendRates}
        assetId={id}
      />
```

- [ ] **Step 2: `AssetForm` props 타입 확장**

`components/app/asset-form.tsx` 상단에 import 추가:

```typescript
import type { ContributionDividendRateRow } from '@/db/schema/contribution-dividend-rates'
import { upsertDividendRate, deleteDividendRate } from '@/app/actions/contribution'
```

`AssetForm` 컴포넌트 props 인터페이스에 추가 (기존 props 인터페이스 찾아서 추가):

```typescript
  contributionDividendRates?: ContributionDividendRateRow[]
  assetId?: string
```

- [ ] **Step 3: 배당 이력 UI 섹션 추가**

`AssetForm` 컴포넌트 내부, `assetType === 'contribution'` 조건으로 렌더링되는 섹션을 추가. 폼 제출 버튼 바로 위 또는 contribution 전용 필드 근처에 삽입.

`asset-form.tsx`에서 contribution 관련 필드가 있는 위치를 찾아 아래 섹션 삽입 (contribution 타입일 때만 렌더링):

```tsx
{assetType === 'contribution' && assetId && (
  <ContributionDividendSection
    assetId={assetId}
    rates={contributionDividendRates ?? []}
  />
)}
```

- [ ] **Step 4: `ContributionDividendSection` 컴포넌트 작성**

`components/app/asset-form.tsx` 파일 내 (또는 같은 파일 상단에 선언):

```tsx
// asset-form.tsx는 이미 'use client' 선언됨. 파일 상단 import에 추가:
// import { useState, useTransition } from 'react'
// import { Input } from '@/components/ui/input'

function ContributionDividendSection({
  assetId,
  rates: initialRates,
}: {
  assetId: string
  rates: ContributionDividendRateRow[]
}) {
  const [rates, setRates] = useState(initialRates)
  const [yearInput, setYearInput] = useState(String(new Date().getFullYear()))
  const [rateInput, setRateInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleAdd() {
    const year = parseInt(yearInput, 10)
    if (isNaN(year) || !rateInput) { setError('연도와 배당률을 입력해주세요.'); return }
    setError(null)
    startTransition(async () => {
      const result = await upsertDividendRate(assetId, year, rateInput)
      if (result?.error) { setError(result.error); return }
      setRates(prev => {
        const filtered = prev.filter(r => r.year !== year)
        return [...filtered, {
          id: '', assetId, userId: '', year,
          rateBp: Math.round(parseFloat(rateInput) * 10000),
          createdAt: new Date(),
        }].sort((a, b) => a.year - b.year)
      })
      setRateInput('')
    })
  }

  function handleDelete(year: number) {
    startTransition(async () => {
      await deleteDividendRate(assetId, year)
      setRates(prev => prev.filter(r => r.year !== year))
    })
  }

  return (
    <div className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground pb-2.5 border-b border-border">
        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-muted">
          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
        </span>
        배당 이력
      </p>

      {rates.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {[...rates].sort((a, b) => a.year - b.year).map(r => (
            <div key={r.year} className="flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border">
              <span className="text-sm font-medium">{r.year}년</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-green-400">{(r.rateBp / 10000).toFixed(2)}%</span>
                <button
                  type="button"
                  onClick={() => handleDelete(r.year)}
                  disabled={pending}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">배당 이력이 없습니다.</p>
      )}

      <div className="flex gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">연도</label>
          <Input
            type="number"
            value={yearInput}
            onChange={e => setYearInput(e.target.value)}
            className="w-20"
            placeholder="2025"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-muted-foreground">배당률 (%)</label>
          <Input
            type="number"
            step="0.01"
            value={rateInput}
            onChange={e => setRateInput(e.target.value)}
            placeholder="예: 3.5"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending}
          className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          추가
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
```

`TrendingUp` 아이콘이 asset-form.tsx에 import되어 있는지 확인. 없으면 상단 import에 추가.

- [ ] **Step 5: 커밋**

```bash
git add app/(app)/assets/[id]/edit/page.tsx components/app/asset-form.tsx
git commit -m "feat(ui): 출자금 편집 폼에 연도별 배당 이력 관리 UI 추가"
```

---

## Task 8: 최종 검증

- [ ] **Step 1: 전체 테스트 실행**

```bash
npx vitest run
```

예상: 모든 기존 테스트 + 신규 contribution 테스트 PASS

- [ ] **Step 2: TypeScript 타입 체크**

```bash
npx tsc --noEmit
```

예상: 에러 없음

- [ ] **Step 3: 개발 서버 실행 후 수동 검증**

```bash
npm run dev
```

검증 항목:
1. `/assets/new` → 출자금 선택 → Step 4에서 출자금액/출자일자/배당률 입력 → 저장
2. 포트폴리오 페이지에서 해당 자산의 현재가가 `원금 + (원금 × 배당률)`로 계산됨 확인
3. `/assets/[id]/edit` → 배당 이력 섹션에서 연도 추가/삭제 가능 확인
4. 배당률 여러 해 입력 후 현재가 누적 계산 확인

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "feat: 출자금 배당 이력 구현 완료"
```
