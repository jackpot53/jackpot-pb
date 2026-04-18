# 부동산 자동 평가 (국토부 실거래가 연동) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 부동산 자산 등록 시 법정동코드·단지명을 저장하고, 매일 cron이 국토부 실거래가 API에서 해당 월 valuation이 없을 때만 ㎡당 평균 거래가를 가져와 `manual_valuations`에 자동 저장한다.

**Architecture:** `real_estate_details` 테이블에 법정동코드·단지명 저장 → `lib/price/molit.ts` fetcher가 최근 3~6개월 거래 중 동일 단지·면적 ±5㎡ 내 거래 평균 산출 → cron Step 1c에서 월 1회(해당 월 valuation 없을 때만) `manual_valuations`에 ㎡당 단가 upsert → 기존 `computeAssetPerformance`의 D-16 규칙(`qty × unit_price`)이 그대로 평가금액 계산. 수동 입력은 기존 UI 그대로 유지(최신 row가 우선).

**Tech Stack:** Drizzle ORM (Postgres), Next.js App Router, Zod, data.go.kr 국토부 실거래가 API (`apis.data.go.kr`)

---

## 사전 지식 (읽어야 하는 것들)

- `db/schema/savings-details.ts` — 확장 테이블 패턴 (assetId PK + FK cascade)
- `lib/price/funetf.ts` — fetcher 패턴 (null 반환, 10초 timeout)
- `app/actions/manual-valuations.ts` line 54-77 — same-day upsert 패턴
- `app/api/cron/snapshot/route.ts` — Step 1b 패턴 (펀드 NAV 저장)
- `app/actions/assets.ts` line 96-210 — savings/insurance_details INSERT 패턴
- `lib/portfolio/portfolio.ts` line 166-185 — D-16 규칙 (real_estate는 unit price × qty)

## 부동산 데이터 모델 요약

```
holdings.totalQuantity = areaM2 × 1e8   (예: 84.99㎡ → 8499000000)
manual_valuations.valueKrw = ㎡당 단가  (예: 23,500,000원/㎡)
currentValueKrw = (totalQuantity / 1e8) × latestManualValuationKrw
              = 84.99 × 23,500,000 = 1,997,265,000원
```

따라서 fetcher는 총 거래금액 ÷ 거래 면적 = **㎡당 단가**를 반환하면 된다.

---

## 파일 구조

| 파일 | 액션 | 역할 |
|------|------|------|
| `db/schema/real-estate-details.ts` | 신규 | 법정동코드·단지명 저장 |
| `db/migrations/0030_real_estate_details.sql` | 신규 | DB 마이그레이션 |
| `db/queries/real-estate-details.ts` | 신규 | CRUD (getByAssetId, upsert) |
| `lib/price/molit.ts` | 신규 | 국토부 실거래가 API fetcher |
| `app/api/cron/snapshot/route.ts` | 수정 | Step 1c: real estate 월별 갱신 추가 |
| `app/actions/assets.ts` | 수정 | assetSchema + createAsset real_estate_details INSERT |
| `components/app/new-asset-form.tsx` | 수정 | 부동산 step 3에 법정동·단지명 입력 추가 |

---

## Task 1: real_estate_details 스키마 + 마이그레이션

**Files:**
- Create: `db/schema/real-estate-details.ts`
- Create: `db/migrations/0030_real_estate_details.sql`

- [ ] **Step 1: 스키마 파일 작성**

```typescript
// db/schema/real-estate-details.ts
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'
import { assets } from './assets'

/**
 * 부동산 전용 메타데이터 (1:1 FK on assets.id)
 * 국토부 실거래가 API 조회에 필요한 법정동코드·단지명 저장.
 */
export const realEstateDetails = pgTable('real_estate_details', {
  assetId: uuid('asset_id').primaryKey().references(() => assets.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  // 법정동코드 앞 5자리 (예: "11650" = 서초구). 국토부 API LAWD_CD 파라미터.
  lawdCd: varchar('lawd_cd', { length: 5 }).notNull(),
  // API 응답의 "아파트" 필드와 매칭할 단지명 (예: "반포자이")
  complexName: varchar('complex_name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type RealEstateDetailsRow = typeof realEstateDetails.$inferSelect
export type RealEstateDetailsInsert = typeof realEstateDetails.$inferInsert
```

- [ ] **Step 2: 마이그레이션 파일 작성**

```sql
-- db/migrations/0030_real_estate_details.sql
CREATE TABLE IF NOT EXISTS "real_estate_details" (
  "asset_id" uuid PRIMARY KEY NOT NULL REFERENCES "assets"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL,
  "lawd_cd" varchar(5) NOT NULL,
  "complex_name" varchar(100) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 3: 마이그레이션 실행 확인**

```bash
# 로컬 DB에 마이그레이션 적용 (drizzle-kit push 또는 직접 psql)
npx drizzle-kit push
# 또는: psql $DATABASE_URL -f db/migrations/0030_real_estate_details.sql
```

Expected: `real_estate_details` 테이블 생성됨.

- [ ] **Step 4: Commit**

```bash
git add db/schema/real-estate-details.ts db/migrations/0030_real_estate_details.sql
git commit -m "feat: add real_estate_details schema for MOLIT API integration"
```

---

## Task 2: real-estate-details 쿼리

**Files:**
- Create: `db/queries/real-estate-details.ts`

- [ ] **Step 1: 쿼리 파일 작성**

```typescript
// db/queries/real-estate-details.ts
import { db } from '@/db'
import { realEstateDetails } from '@/db/schema/real-estate-details'
import { eq, and } from 'drizzle-orm'

export async function getRealEstateDetailsByAsset(assetId: string, userId: string) {
  const rows = await db
    .select()
    .from(realEstateDetails)
    .where(and(eq(realEstateDetails.assetId, assetId), eq(realEstateDetails.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

export async function upsertRealEstateDetails(
  assetId: string,
  userId: string,
  lawdCd: string,
  complexName: string,
) {
  await db
    .insert(realEstateDetails)
    .values({ assetId, userId, lawdCd, complexName })
    .onConflictDoUpdate({
      target: realEstateDetails.assetId,
      set: { lawdCd, complexName, updatedAt: new Date() },
    })
}

export async function getAllRealEstateDetailsForUser(userId: string) {
  return db
    .select()
    .from(realEstateDetails)
    .where(eq(realEstateDetails.userId, userId))
}
```

- [ ] **Step 2: Commit**

```bash
git add db/queries/real-estate-details.ts
git commit -m "feat: add real_estate_details queries"
```

---

## Task 3: 국토부 실거래가 API Fetcher

**Files:**
- Create: `lib/price/molit.ts`

국토부 실거래가 API 스펙:
- 엔드포인트: `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev`
- 파라미터: `serviceKey` (환경변수 `MOLIT_API_KEY`), `LAWD_CD` (5자리), `DEAL_YMD` (YYYYMM), `pageNo=1`, `numOfRows=100`, `_type=json`
- 응답 `거래금액`: 쉼표 포함 문자열, **만원** 단위 (예: `"115,000"` → 1,150,000,000원)
- 응답 `전용면적`: 문자열 (예: `"84.99"`)
- 응답 `아파트`: 단지명 문자열

- [ ] **Step 1: fetcher 작성**

```typescript
// lib/price/molit.ts

const MOLIT_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev'

interface MolitItem {
  아파트: string
  전용면적: string
  거래금액: string
}

interface MolitResult {
  /** ㎡당 거래가 (KRW). manual_valuations.valueKrw로 저장하면 D-16 규칙이 총 가치 계산. */
  pricePerM2Krw: number
  txCount: number
}

/**
 * 국토부 실거래가 API에서 주어진 법정동코드·단지명의 최근 N개월 ㎡당 평균 거래가를 반환.
 * 거래 없으면 윈도우를 3→6개월로 확장. 그래도 없으면 null.
 *
 * @param lawdCd - 법정동코드 앞 5자리 (예: "11650")
 * @param complexName - 단지명 (예: "반포자이"). 공백 제거 후 포함 매칭.
 * @param areaM2 - 전용면적 ㎡ (예: 84.99). ±5㎡ 허용.
 */
export async function fetchMolitAptPrice(
  lawdCd: string,
  complexName: string,
  areaM2: number,
): Promise<MolitResult | null> {
  const apiKey = process.env.MOLIT_API_KEY
  if (!apiKey) return null

  const normalizedName = complexName.replace(/\s/g, '')

  for (const windowMonths of [3, 6]) {
    const items = await fetchWindow(apiKey, lawdCd, windowMonths)
    if (!items) continue

    const matched = items.filter((item) => {
      const itemName = item.아파트.replace(/\s/g, '')
      const itemArea = parseFloat(item.전용면적)
      return (
        itemName.includes(normalizedName) &&
        Math.abs(itemArea - areaM2) <= 5
      )
    })

    if (matched.length === 0) continue

    const totalKrw = matched.reduce((sum, item) => {
      const won = parseInt(item.거래금액.replace(/,/g, ''), 10) * 10000
      const area = parseFloat(item.전용면적)
      return sum + won / area
    }, 0)

    return {
      pricePerM2Krw: Math.round(totalKrw / matched.length),
      txCount: matched.length,
    }
  }

  return null
}

async function fetchWindow(
  apiKey: string,
  lawdCd: string,
  months: number,
): Promise<MolitItem[] | null> {
  const now = new Date()
  const allItems: MolitItem[] = []

  for (let i = 1; i <= months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const yyyymm = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`

    const url = new URL(MOLIT_URL)
    url.searchParams.set('serviceKey', apiKey)
    url.searchParams.set('LAWD_CD', lawdCd)
    url.searchParams.set('DEAL_YMD', yyyymm)
    url.searchParams.set('pageNo', '1')
    url.searchParams.set('numOfRows', '100')
    url.searchParams.set('_type', 'json')

    try {
      const res = await fetch(url.toString(), {
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) continue

      const json = await res.json()
      const body = json?.response?.body
      const rawItems = body?.items?.item
      if (!rawItems) continue

      const items: MolitItem[] = Array.isArray(rawItems) ? rawItems : [rawItems]
      allItems.push(...items)
    } catch {
      // 월별 실패는 무시하고 다음 달 시도
    }
  }

  return allItems.length > 0 ? allItems : null
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/price/molit.ts
git commit -m "feat: add MOLIT apt transaction price fetcher"
```

---

## Task 4: Cron 통합 — 월별 real estate 자동 valuation

**Files:**
- Modify: `app/api/cron/snapshot/route.ts`

cron 통합 전략:
- 매일 실행되는 cron에서, 이번 달 valuation(`valued_at >= 월 1일`)이 이미 있으면 skip
- 없으면 fetcher 호출 → `manual_valuations` INSERT (today 날짜)
- 사용자별로 처리 (userId 루프 안 또는 Step 1b 직후 global 처리)

- [ ] **Step 1: `app/api/cron/snapshot/route.ts` 상단 import 추가**

기존 import 블록 끝에 추가:

```typescript
import { db } from '@/db'  // 이미 있음
import { assets } from '@/db/schema/assets'  // 이미 있음
import { manualValuations } from '@/db/schema/manual-valuations'
import { realEstateDetails } from '@/db/schema/real-estate-details'
import { holdings } from '@/db/schema/holdings'
import { fetchMolitAptPrice } from '@/lib/price/molit'
import { and, eq, gte, sql } from 'drizzle-orm'  // and, gte, sql 추가 (eq, inArray 이미 있음)
```

- [ ] **Step 2: `refreshRealEstateValuations` 함수 추가**

`withConcurrency` 함수 정의 아래, `GET` export 위에 삽입:

```typescript
/**
 * 이번 달 valuation이 없는 real_estate 자산에 대해 MOLIT API를 호출하고
 * manual_valuations에 ㎡당 단가를 INSERT한다.
 * 거래 공백(null 반환)이면 기존 valuation 유지 (INSERT 스킵).
 */
async function refreshRealEstateValuations(): Promise<void> {
  // real_estate_details가 있는 자산만 대상
  const rows = await db
    .select({
      assetId: realEstateDetails.assetId,
      userId: realEstateDetails.userId,
      lawdCd: realEstateDetails.lawdCd,
      complexName: realEstateDetails.complexName,
      totalQuantity: holdings.totalQuantity,
    })
    .from(realEstateDetails)
    .innerJoin(holdings, eq(holdings.assetId, realEstateDetails.assetId))

  if (rows.length === 0) return

  const today = new Date().toISOString().slice(0, 10)
  const monthStart = today.slice(0, 7) + '-01'

  await Promise.all(rows.map(async (row) => {
    // 이번 달 valuation이 이미 있으면 skip
    const existing = await db
      .select({ id: manualValuations.id })
      .from(manualValuations)
      .where(
        and(
          eq(manualValuations.assetId, row.assetId),
          eq(manualValuations.userId, row.userId),
          gte(manualValuations.valuedAt, monthStart),
        )
      )
      .limit(1)

    if (existing[0]) return

    const areaM2 = (row.totalQuantity ?? 0) / 1e8
    if (areaM2 <= 0) return

    const result = await fetchMolitAptPrice(row.lawdCd, row.complexName, areaM2)
    if (!result) return

    await db.insert(manualValuations).values({
      assetId: row.assetId,
      userId: row.userId,
      valueKrw: result.pricePerM2Krw,
      currency: 'KRW',
      exchangeRateAtTime: null,
      valuedAt: today,
      notes: `MOLIT 자동: ${result.txCount}건 평균`,
    })
  }))
}
```

- [ ] **Step 3: GET handler에서 Step 1c 호출**

기존 Step 1b 블록(line 66-83) 바로 다음에 삽입:

```typescript
    // Step 1c: 부동산 월별 실거래가 자동 valuation
    try {
      await refreshRealEstateValuations()
    } catch (err) {
      console.error('[cron/snapshot] real estate valuation error:', err)
    }
```

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/snapshot/route.ts
git commit -m "feat: add MOLIT real estate auto-valuation in nightly cron"
```

---

## Task 5: 자산 등록 폼 — 부동산 법정동·단지명 입력

**Files:**
- Modify: `app/actions/assets.ts`
- Modify: `components/app/new-asset-form.tsx`

### 5a. assetSchema + createAsset 수정

- [ ] **Step 1: `app/actions/assets.ts` — import + schema 필드 추가**

파일 상단 import에 추가:
```typescript
import { realEstateDetails } from '@/db/schema/real-estate-details'
import { upsertRealEstateDetails } from '@/db/queries/real-estate-details'
```

`assetSchema` 내 savings 필드 목록 끝에 추가 (line 53 autoRenew 다음):
```typescript
  // Real estate-specific fields (부동산 자동 평가용)
  realEstateLawdCd: z.string().max(5).optional().nullable(),
  realEstateComplexName: z.string().max(100).optional().nullable(),
```

- [ ] **Step 2: `createAsset` 함수에 real_estate_details INSERT 추가**

기존 `if (rest.assetType === 'savings')` 블록(line 96) 다음, `if (rest.assetType === 'insurance')` 블록 사이에 삽입:

```typescript
  // Real estate: 법정동코드·단지명이 제공된 경우 real_estate_details 저장
  if (rest.assetType === 'real_estate') {
    const { realEstateLawdCd, realEstateComplexName } = parsed.data
    if (realEstateLawdCd && realEstateComplexName) {
      await upsertRealEstateDetails(
        newAsset.id,
        user.id,
        realEstateLawdCd,
        realEstateComplexName,
      )
    }
    revalidatePath('/assets')
    redirect('/assets')
  }
```

### 5b. new-asset-form.tsx 수정

- [ ] **Step 3: form schema에 부동산 필드 추가**

`new-asset-form.tsx`의 formSchema (Zod 스키마, `assetType` 등 정의된 곳) 에서 다른 optional 필드들과 함께 추가:
```typescript
  realEstateLawdCd: z.string().max(5).optional().nullable(),
  realEstateComplexName: z.string().max(100).optional().nullable(),
```

- [ ] **Step 4: form defaultValues에 null 추가**

`useForm` defaultValues 객체에 추가:
```typescript
  realEstateLawdCd: null,
  realEstateComplexName: null,
```

- [ ] **Step 5: step 3 부동산 전용 입력 UI 추가**

step 3 (종목 정보 입력)에서 `assetType === 'real_estate'`일 때 name/notes 아래에 추가.
기존에 부동산일 때 `name` 필드만 표시되는 부분을 찾아서 그 다음에 삽입:

```tsx
{assetType === 'real_estate' && (
  <div className="space-y-3">
    <FormField
      control={form.control}
      name="realEstateLawdCd"
      render={({ field }) => (
        <FormItem>
          <FormLabel>법정동코드 (5자리)</FormLabel>
          <FormControl>
            <Input
              placeholder="예: 11650 (서초구)"
              maxLength={5}
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          <p className="text-xs text-muted-foreground">
            시·군·구 단위 코드. 국가공간정보포털에서 검색 가능.
          </p>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="realEstateComplexName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>단지명</FormLabel>
          <FormControl>
            <Input
              placeholder="예: 반포자이"
              maxLength={100}
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          <p className="text-xs text-muted-foreground">
            국토부 실거래가 데이터의 단지명과 일치해야 자동 시세가 작동합니다.
          </p>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
)}
```

- [ ] **Step 6: step 4 quantity 힌트 텍스트 업데이트**

step 4 (초기 매수)에서 `assetType === 'real_estate'`일 때 quantity 레이블을 "전용면적(㎡)"으로 표시.
기존 `initialQuantity` 필드 렌더링 부분에 조건 추가:

```tsx
// initialQuantity FormLabel 부분
<FormLabel>{assetType === 'real_estate' ? '전용면적 (㎡)' : '수량'}</FormLabel>
// placeholder도 분기
placeholder={assetType === 'real_estate' ? '예: 84.99' : '예: 10'}
```

- [ ] **Step 7: Commit**

```bash
git add app/actions/assets.ts components/app/new-asset-form.tsx
git commit -m "feat: add real estate MOLIT fields to asset form and createAsset action"
```

---

## Task 6: 환경변수 설정

- [ ] **Step 1: 로컬 `.env.local`에 추가**

```bash
MOLIT_API_KEY=your_api_key_here
```

- [ ] **Step 2: Vercel 환경변수 추가**

Vercel 대시보드 → Settings → Environment Variables:
- Key: `MOLIT_API_KEY`
- Value: 공공데이터포털에서 발급받은 인증키

- [ ] **Step 3: Commit**

```bash
# .env.local은 .gitignore에 있으므로 commit 불필요
# Vercel에만 추가
```

---

## 검증 방법

### 1. API 키 발급 후 수동 테스트

API 키 `TEST_KEY`, 서초구 법정동코드 `11650` 기준:

```bash
curl "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=TEST_KEY&LAWD_CD=11650&DEAL_YMD=202411&pageNo=1&numOfRows=5&_type=json"
```

Expected: JSON 응답, `response.body.items.item` 배열에 거래 내역.

### 2. Fetcher 단독 테스트

```typescript
// 임시 스크립트 또는 API route로 테스트
import { fetchMolitAptPrice } from '@/lib/price/molit'
const result = await fetchMolitAptPrice('11650', '반포자이', 84.99)
console.log(result) // { pricePerM2Krw: 23500000, txCount: 5 }
```

### 3. Cron 로컬 테스트

```bash
# CRON_SECRET 설정 후
curl -H "Authorization: Bearer your_cron_secret" http://localhost:3000/api/cron/snapshot
```

Expected: `manual_valuations`에 오늘 날짜로 `notes='MOLIT 자동: N건 평균'` 레코드 생성.

### 4. 포트폴리오 반영 확인

cron 실행 후 `/assets` 페이지에서 해당 부동산 자산의 평가금액이 `㎡당 단가 × 전용면적`으로 자동 계산되는지 확인.

---

## 알려진 한계

1. **거래 공백:** 단지·면적 ±5㎡ 내 최근 6개월 거래 0건이면 기존 valuation 유지. 신규 자산은 처음 한 달은 수동 입력 필요할 수 있음.
2. **단지명 매칭:** API 응답의 단지명이 사용자 입력과 다르면 매칭 실패. 예: "래미안퍼스티지" vs "래미안 퍼스티지" → 공백 제거 후 `includes` 매칭으로 해결.
3. **API 지연:** 국토부 실거래가는 신고 후 약 1~2개월 지연. 11월 거래는 12월~1월에 반영.
4. **data.go.kr 장애:** 현재 사이트 불안정. API 호출 실패 시 기존 valuation 유지 (try-catch로 graceful 처리됨).
