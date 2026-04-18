# 보험 자산 차트 구현 (현재값 + 미래값)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 저축성 보험 자산에 선 그래프 차트를 추가하여 현재까지의 누적액(실선)과 paymentEndDate까지의 예상 미래값(점선)을 시각화한다.

**Architecture:** 예적금의 `savings-curve.ts` 패턴을 따라 `insurance-curve.ts`를 신규 작성. 보험 계약의 메타데이터와 거래 내역을 기반으로 주간 단위의 투영 곡선을 생성하고, `AssetPerformance`에 chartData를 추가한 후 기존 `asset-line-chart` 컴포넌트의 `line-projected` 차트로 렌더링한다.

**Tech Stack:** TypeScript, Recharts (line-projected), Drizzle ORM (데이터 조회), React Hook Form (기존 폼 처리)

---

## Task 1: 보험 곡선 데이터 생성 (`lib/insurance-curve.ts`)

**Files:**
- Create: `lib/insurance-curve.ts`
- Reference: `lib/savings-curve.ts` (패턴)
- Reference: `lib/insurance.ts` (이자 계산)
- Test: `lib/__tests__/insurance-curve.test.ts` (신규)

### Step 1: `lib/insurance-curve.ts` 작성

`savings-curve.ts`를 참고하여 보험 곡선 생성 함수를 작성한다.

```typescript
import { computeCurrentInsuranceValueKrw, type InsuranceBuy, type CompoundType } from '@/lib/insurance'

export interface InsuranceProjectionPoint {
  date: string     // 'YYYY-MM-DD'
  value: number    // KRW, 누적액
  projected: boolean
}

/**
 * 보험 평가금 시계열 생성.
 * 첫 납입일 ~ paymentEndDate(없으면 today)를 주간 단위로 샘플링한다.
 * - today 이하: projected=false (실선)
 * - today 초과: projected=true (점선)
 */
export function buildInsuranceCurvePoints({
  buys,
  expectedReturnRateBp,
  paymentStartDate,
  paymentEndDate,
  compoundType,
  paymentCycle,
  premiumPerCycleKrw,
  today = new Date(),
}: {
  buys: InsuranceBuy[]
  expectedReturnRateBp: number | null
  paymentStartDate: string | null
  paymentEndDate: string | null
  compoundType: CompoundType
  paymentCycle: 'monthly' | 'quarterly' | 'yearly' | 'lump_sum'
  premiumPerCycleKrw: number | null
  today?: Date
}): InsuranceProjectionPoint[] {
  // 이율 없으면 빈 배열 반환
  if (!expectedReturnRateBp || expectedReturnRateBp <= 0) return []

  // 시작일: 가장 빠른 납입일 또는 paymentStartDate
  const startStr =
    buys.length > 0
      ? buys.reduce((min, b) => (b.transactionDate < min ? b.transactionDate : min), buys[0].transactionDate)
      : paymentStartDate

  if (!startStr) return []

  const todayStr = toDateStr(today)
  const endStr = paymentEndDate ?? todayStr

  // 샘플 날짜: start ~ end (주 단위)
  const sampleDates = weekSamples(startStr, endStr)

  const points: InsuranceProjectionPoint[] = sampleDates.map(dateStr => {
    const asOf = parseLocalDate(dateStr)

    // 정기납입 유형: 가상 납입 내역 생성 (예적금과 동일)
    const effectiveBuys =
      paymentCycle !== 'lump_sum' &&
      paymentStartDate &&
      premiumPerCycleKrw &&
      premiumPerCycleKrw > 0
        ? generateVirtualRecurringBuysForInsurance({
            paymentStartDate,
            premiumPerCycleKrw,
            paymentCycle,
            asOf,
          })
        : buys

    const value = computeCurrentInsuranceValueKrw({
      buys: effectiveBuys,
      expectedReturnRateBp,
      paymentStartDate,
      paymentEndDate,
      compoundType,
      paymentCycle,
      premiumPerCycleKrw,
      asOf,
    })

    return {
      date: dateStr,
      value,
      projected: dateStr > todayStr,
    }
  })

  return points
}

// ─── helpers ────────────────────────────────────────────────────────────────

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** startStr ~ endStr (inclusive) 의 주별 샘플 날짜 배열 */
function weekSamples(startStr: string, endStr: string): string[] {
  const dates: string[] = []
  let current = parseLocalDate(startStr)
  const end = parseLocalDate(endStr)

  while (current <= end) {
    dates.push(toDateStr(current))
    current.setDate(current.getDate() + 7)
  }

  // 종료일이 마지막 샘플과 다르면 추가
  if (dates.length === 0 || dates[dates.length - 1] !== endStr) {
    dates.push(endStr)
  }

  return dates
}

/**
 * 정기납입 보험: paymentStartDate부터 asOf까지의 예상 납입건 생성
 */
function generateVirtualRecurringBuysForInsurance({
  paymentStartDate,
  premiumPerCycleKrw,
  paymentCycle,
  asOf,
}: {
  paymentStartDate: string
  premiumPerCycleKrw: number
  paymentCycle: 'monthly' | 'quarterly' | 'yearly' | 'lump_sum'
  asOf: Date
}): InsuranceBuy[] {
  const buys: InsuranceBuy[] = []
  let current = parseLocalDate(paymentStartDate)
  const cutoff = asOf

  const cycleMonths = {
    monthly: 1,
    quarterly: 3,
    yearly: 12,
    lump_sum: 0,
  }[paymentCycle]

  if (cycleMonths === 0) return []

  while (current <= cutoff) {
    buys.push({
      transactionDate: toDateStr(current),
      amountKrw: premiumPerCycleKrw,
    })
    current.setMonth(current.getMonth() + cycleMonths)
  }

  return buys
}
```

- [ ] **Step 2: 파일이 기존 타입과 호환되는지 확인**

`lib/insurance.ts`의 `computeCurrentInsuranceValueKrw` 함수 시그니처와 비교하여 전달 인수 일치 확인. 특히:
- `buys: InsuranceBuy[]` ✓
- `expectedReturnRateBp: number`
- `paymentStartDate: string | null`
- `paymentEndDate: string | null`
- `compoundType: CompoundType`
- `paymentCycle: 'monthly' | 'quarterly' | 'yearly' | 'lump_sum'`
- `premiumPerCycleKrw: number | null`
- `asOf?: Date` 지원 확인

- [ ] **Step 3: 단위 테스트 작성**

`lib/__tests__/insurance-curve.test.ts` 생성:

```typescript
import { describe, it, expect } from 'vitest'
import { buildInsuranceCurvePoints, type InsuranceProjectionPoint } from '@/lib/insurance-curve'

describe('buildInsuranceCurvePoints', () => {
  it('should return empty array when expectedReturnRateBp is null or 0', () => {
    const result = buildInsuranceCurvePoints({
      buys: [],
      expectedReturnRateBp: null,
      paymentStartDate: '2024-01-15',
      paymentEndDate: '2025-01-15',
      compoundType: 'simple',
      paymentCycle: 'monthly',
      premiumPerCycleKrw: 100000,
    })
    expect(result).toEqual([])
  })

  it('should return empty array when no startDate available', () => {
    const result = buildInsuranceCurvePoints({
      buys: [],
      expectedReturnRateBp: 35000,
      paymentStartDate: null,
      paymentEndDate: '2025-01-15',
      compoundType: 'simple',
      paymentCycle: 'lump_sum',
      premiumPerCycleKrw: null,
    })
    expect(result).toEqual([])
  })

  it('should generate weekly samples from start to end', () => {
    const today = new Date('2024-06-15')
    const result = buildInsuranceCurvePoints({
      buys: [
        { transactionDate: '2024-01-15', amountKrw: 1000000 },
      ],
      expectedReturnRateBp: 35000, // 3.5%
      paymentStartDate: '2024-01-15',
      paymentEndDate: '2024-03-15',
      compoundType: 'simple',
      paymentCycle: 'lump_sum',
      premiumPerCycleKrw: null,
      today,
    })

    expect(result.length).toBeGreaterThanOrEqual(2) // start, end, + weeks between
    expect(result[0].date).toBe('2024-01-15')
    expect(result[result.length - 1].date).toBe('2024-03-15')
  })

  it('should mark dates before/equal today as projected=false, after as projected=true', () => {
    const today = new Date('2024-06-15')
    const result = buildInsuranceCurvePoints({
      buys: [
        { transactionDate: '2024-01-15', amountKrw: 1000000 },
      ],
      expectedReturnRateBp: 35000,
      paymentStartDate: '2024-01-15',
      paymentEndDate: '2024-12-31',
      compoundType: 'simple',
      paymentCycle: 'lump_sum',
      premiumPerCycleKrw: null,
      today,
    })

    const pastPoint = result.find(p => p.date < '2024-06-15')
    expect(pastPoint?.projected).toBe(false)

    const futurePoint = result.find(p => p.date > '2024-06-15')
    expect(futurePoint?.projected).toBe(true)
  })

  it('should handle recurring monthly payments', () => {
    const today = new Date('2024-06-15')
    const result = buildInsuranceCurvePoints({
      buys: [
        { transactionDate: '2024-01-15', amountKrw: 100000 },
      ],
      expectedReturnRateBp: 35000,
      paymentStartDate: '2024-01-15',
      paymentEndDate: '2024-06-15',
      compoundType: 'simple',
      paymentCycle: 'monthly',
      premiumPerCycleKrw: 100000,
      today,
    })

    expect(result.length).toBeGreaterThan(0)
    expect(result[result.length - 1].value).toBeGreaterThan(result[0].value)
  })
})
```

- [ ] **Step 4: 테스트 실행 (실패 확인)**

```bash
npm run test -- lib/__tests__/insurance-curve.test.ts
```

Expected: FAIL (함수 미정의)

- [ ] **Step 5: 커밋**

```bash
git add lib/insurance-curve.ts lib/__tests__/insurance-curve.test.ts
git commit -m "feat: add insurance projection curve calculation"
```

---

## Task 2: `AssetPerformance` 인터페이스에 chartData 필드 추가

**Files:**
- Modify: `lib/portfolio/portfolio.ts:29-57` (AssetPerformance 인터페이스)

- [ ] **Step 1: AssetPerformance에 chartData 필드 추가**

`lib/portfolio/portfolio.ts`의 `AssetPerformance` 인터페이스에 다음 필드를 추가한다 (line ~54 이후, `compoundType` 다음):

```typescript
export interface AssetPerformance extends AssetHoldingInput {
  // ... 기존 필드들 ...
  /** savings 전용: 복리 계산 방식 'simple' | 'monthly', 없으면 null */
  compoundType: CompoundType | null
  /** savings/insurance 차트 데이터 (오늘 기준 실/미래 분리), 없으면 undefined */
  chartData?: Array<{ date: string; value: number; projected: boolean }>
}
```

- [ ] **Step 2: 커밋**

```bash
git add lib/portfolio/portfolio.ts
git commit -m "feat: add chartData field to AssetPerformance for insurance/savings charts"
```

---

## Task 3: `computeAssetPerformance` 함수에 보험 차트 데이터 계산 추가

**Files:**
- Modify: `lib/portfolio/portfolio.ts:80-200` (computeAssetPerformance 함수)

- [ ] **Step 1: 함수 상단에 insurance-curve import 추가**

`lib/portfolio/portfolio.ts` 상단 import 섹션에:

```typescript
import { buildInsuranceCurvePoints } from '@/lib/insurance-curve'
```

- [ ] **Step 2: computeAssetPerformance 함수 본문 확장 (savings 차트 로직 참고)**

`computeAssetPerformance` 함수 내부에서 보험 자산의 chartData를 계산하는 로직을 추가한다. 기존 savings 처리 근처 (~line 80-150)에 다음을 추가:

```typescript
// insurance 차트 데이터 생성 (savings와 유사)
let insuranceChartData: Array<{ date: string; value: number; projected: boolean }> | undefined = undefined

if (holding.assetType === 'insurance' && insuranceDetails && insuranceBuys) {
  const formatDate = (date: Date | string | null): string | null => {
    if (!date) return null
    if (typeof date === 'string') return date
    return date.toISOString().split('T')[0]
  }

  const curvePoints = buildInsuranceCurvePoints({
    buys: insuranceBuys,
    expectedReturnRateBp: insuranceDetails.expectedReturnRateBp ?? null,
    paymentStartDate: formatDate(insuranceDetails.paymentStartDate),
    paymentEndDate: formatDate(insuranceDetails.paymentEndDate),
    compoundType: insuranceDetails.compoundType as CompoundType,
    paymentCycle: insuranceDetails.paymentCycle as 'monthly' | 'quarterly' | 'yearly' | 'lump_sum',
    premiumPerCycleKrw: insuranceDetails.premiumPerCycleKrw ?? null,
  })

  if (curvePoints.length > 0) {
    insuranceChartData = curvePoints.map(p => ({
      date: p.date,
      value: p.value,
      projected: p.projected,
    }))
  }
}
```

이 코드는 `return { ... }` 앞에 추가되어야 한다. (`isInsuranceAuto` 로직 이후 좋음)

- [ ] **Step 3: return 객체에 chartData 필드 추가**

함수의 최종 return 문에 `chartData` 필드를 추가한다:

```typescript
return {
  // ... 기존 필드들 ...
  chartData: insuranceChartData,
  // ... 또는 savings의 경우 ...
}
```

savings의 경우 기존에 chartData를 추가했는지 확인. 없으면 동일하게 추가.

- [ ] **Step 4: 타입 검사 실행**

```bash
npm run type-check
```

Expected: PASS (새 필드가 제대로 반영됨)

- [ ] **Step 5: 커밋**

```bash
git add lib/portfolio/portfolio.ts
git commit -m "feat: compute insurance chart data in AssetPerformance"
```

---

## Task 4: `loadPerformances`에서 보험 곡선 데이터 로드

**Files:**
- Modify: `lib/server/load-performances.ts` (차트 데이터 로드 시점 확인)

- [ ] **Step 1: 기존 insurance 데이터 로드 흐름 확인**

`lib/server/load-performances.ts` 라인 39-48: insurance details+buys가 이미 로드되고 있음. computeAssetPerformance 호출 시 전달되는지 확인.

현재 코드 (라인 ~77-110):
```typescript
computeAssetPerformance({
  holding: { ...asset, ... },
  currentPriceKrw,
  // ...
  insuranceDetails: insuranceDetailsMap.get(asset.assetId) ?? null,
  insuranceBuys: insuranceBuysMap.get(asset.assetId) ?? [],
})
```

이미 전달되고 있다면 추가 작업 불필요. 확인 후 진행.

- [ ] **Step 2: 차트 데이터가 computeAssetPerformance에서 계산되는지 검증**

computeAssetPerformance 함수에서:
- insuranceChartData가 계산되고
- return 객체에 포함되는지 확인

이미 Task 3에서 처리되었으므로 추가 작업 없음.

- [ ] **Step 3: 커밋 (변경 없음 또는 타입 수정)**

변경사항이 없다면 건너뜀. 타입 수정이 필요하면:

```bash
git add lib/server/load-performances.ts
git commit -m "chore: align loadPerformances with insurance chartData"
```

---

## Task 5: `AssetPageClient` (또는 asset-page 컴포넌트)에서 차트 렌더링

**Files:**
- Modify: `components/app/asset-page-client.tsx` (또는 관련 파일) - insurance 차트 렌더링 로직 확인
- Reference: `components/app/asset-line-chart.tsx` (이미 `line-projected` 지원)

- [ ] **Step 1: 보험 자산 차트 렌더링 조건 확인**

보험 자산이 asset detail 페이지에서 차트를 표시하는 곳을 찾는다. 일반적으로 `AssetPageClient` 또는 유사 컴포넌트에서:

```typescript
const chartKind = asset.assetType === 'insurance' ? 'line-projected' : 'line-nav'
const chartData = asset.chartData ? asset.chartData.map(p => ({ ...p })) : []
```

이미 구현되어 있는지 확인. insurance 타입을 처리하고 있는지 검토.

- [ ] **Step 2: chartData 전달 확인**

AssetLineChart 컴포넌트를 호출할 때:

```typescript
<AssetLineChart
  data={chartData}
  kind={chartKind}
  positive={asset.returnPct >= 0}
/>
```

chartData가 제대로 전달되고 있는지 확인.

- [ ] **Step 3: 기존 asset-line-chart 컴포넌트 호환성 검증**

`components/app/asset-line-chart.tsx`의 `line-projected` 로직이:
- `projected: boolean` 필드를 읽는지 확인
- 실선/점선 분리가 정확한지 확인

현재 코드 (라인 49):
```typescript
const solidData = data.map(d => ({ ...d, solidValue: d.projected ? null : d.value, projectedValue: d.projected ? d.value : null }))
```

✓ 이미 `projected` 필드를 사용하고 있음.

- [ ] **Step 4: 타입 검사**

```bash
npm run type-check
```

Expected: PASS

- [ ] **Step 5: 커밋 (변경 없음 또는 조정)**

변경사항 없으면 건너뜀. 수정이 필요하면 커밋.

---

## Task 6: 단위 테스트 실행 및 검증

**Files:**
- Test: `lib/__tests__/insurance-curve.test.ts` (Task 1에서 작성)

- [ ] **Step 1: 전체 테스트 실행**

```bash
npm run test
```

Expected: 모든 테스트 통과, 특히 `insurance-curve.test.ts` 통과

- [ ] **Step 2: 타입 검사**

```bash
npm run type-check
```

Expected: PASS, 새 필드 타입 일치

- [ ] **Step 3: 린트 검사**

```bash
npm run lint
```

Expected: PASS, 코드 스타일 준수

- [ ] **Step 4: 커밋**

```bash
git add .
git commit -m "test: insurance chart calculation tests pass"
```

---

## Task 7: Dev 서버 UI 검증

**Files:**
- Manual: 보험 자산 상세 페이지에서 차트 시각 확인

- [ ] **Step 1: Dev 서버 시작**

```bash
npm run dev
```

Expected: 서버 시작, `http://localhost:3000` 접근 가능

- [ ] **Step 2: 보험 자산 상세 페이지 네비게이션**

대시보드 → 특정 보험 자산 클릭 → 상세 페이지 진입

- [ ] **Step 3: 차트 렌더링 확인**

다음을 시각적으로 검증:
- [ ] 차트가 로드되었는가? (데이터 수집 중 메시지 없음)
- [ ] 실선과 점선 경계가 "오늘"에서 정확한가?
- [ ] Y축이 KRW 포맷(₩10,000,000)으로 표시되는가?
- [ ] X축 날짜가 정상 표시되는가?
- [ ] 마우스 호버 시 툴팁에 누적액과 날짜가 표시되는가?

- [ ] **Step 4: 엣지 케이스 검증**

다음 보험 자산들을 확인:
- [ ] 일시납형 (paymentEndDate 없음 또는 현재 이전): 모두 실선인가?
- [ ] 정기납입형 (paymentEndDate 미래): 점선이 포함되는가?
- [ ] 이율이 0% 또는 없는 보험: 차트 미표시 또는 평탄선인가?

- [ ] **Step 5: 회귀 테스트 (다른 자산 타입)**

savings, stock 등 다른 자산 타입의 차트가 여전히 정상 작동하는지 확인:
- [ ] Savings 차트 정상?
- [ ] Stock 네비게이션 정상?

- [ ] **Step 6: 커밋**

```bash
git add . # 수정사항이 있다면
git commit -m "feat: insurance chart UI rendering verified"
```

---

## Task 8: 통합 테스트 (선택사항)

**Files:**
- Test: `lib/__tests__/portfolio.integration.test.ts` (선택)

- [ ] **Step 1: computeAssetPerformance 통합 테스트 작성 (insurance 경로)**

```typescript
import { describe, it, expect } from 'vitest'
import { computeAssetPerformance } from '@/lib/portfolio/portfolio'
import type { InsuranceDetailsRow } from '@/db/schema/insurance-details'

describe('computeAssetPerformance with insurance', () => {
  const mockInsuranceDetails: InsuranceDetailsRow = {
    assetId: 'ins-001',
    category: 'savings',
    expectedReturnRateBp: 35000,
    paymentStartDate: new Date('2024-01-15'),
    paymentEndDate: new Date('2025-01-15'),
    compoundType: 'simple',
    paymentCycle: 'monthly',
    premiumPerCycleKrw: 100000,
  }

  it('should generate chartData for insurance asset', () => {
    const result = computeAssetPerformance({
      holding: {
        assetId: 'ins-001',
        assetType: 'insurance',
        // ... 기타 필드
      },
      currentPriceKrw: 1000000,
      isStale: false,
      cachedAt: new Date(),
      latestManualValuationKrw: null,
      insuranceDetails: mockInsuranceDetails,
      insuranceBuys: [
        { transactionDate: '2024-01-15', amountKrw: 100000 },
      ],
    })

    expect(result.chartData).toBeDefined()
    expect(result.chartData?.length).toBeGreaterThan(0)
    expect(result.chartData?.[0]).toHaveProperty('date')
    expect(result.chartData?.[0]).toHaveProperty('value')
    expect(result.chartData?.[0]).toHaveProperty('projected')
  })
})
```

- [ ] **Step 2: 테스트 실행**

```bash
npm run test -- lib/__tests__/portfolio.integration.test.ts
```

Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add lib/__tests__/portfolio.integration.test.ts
git commit -m "test: add integration tests for insurance chart computation"
```

---

## Spec Coverage Check

**Section 1 (개요):** ✓ Task 1, 5에서 처리 (보험도 예적금과 동일한 방식으로 차트 표시)

**Section 2 (데이터 구조):** ✓ Task 1에서 `InsuranceProjectionPoint` 정의, Task 2에서 AssetPerformance.chartData 추가

**Section 3 (계산 로직):**
- ✓ Task 1: 곡선 데이터 생성 (주 단위 샘플링, 주간 단위 간격)
- ✓ Task 1: 누적액 계산 (각 납입건의 현재값 합산)
- ✓ Task 2-3: 현재값과 미래값 분리 (projected boolean)

**Section 4 (구현 범위):**
- ✓ Task 1: `lib/insurance-curve.ts` 신규
- ✓ Task 2: AssetPerformance에 chartData 필드
- ✓ Task 3: computeAssetPerformance에서 insurance 곡선 계산
- ✓ Task 4: loadPerformances (기존 insurance 데이터 로드로 충분)
- ✓ Task 5: asset-line-chart (기존 line-projected 지원)

**Section 5 (UI/UX):** ✓ Task 5, 7에서 검증 (실선/점선 분리, 오늘 기준선, KRW 포맷)

**Section 6 (테스트):**
- ✓ Task 1, 6: 단위 테스트
- ✓ Task 8: 통합 테스트 (선택)
- ✓ Task 7: UI 검증

**Section 8 (구현 순서):** ✓ Task 1-7이 명시된 순서 따름

---

## Notes

- `savings-curve.ts`와 동일한 패턴으로 주간 샘플링 (대신 월간 샘플 아님)
- `paymentCycle`에 따라 가상 납입 생성 로직 포함 (monthly/quarterly/yearly)
- `asOf` 파라미터를 사용하여 테스트 및 과거 시점 계산 지원
- 보험이 "예외"가 아닌 "일반" 자산 타입으로 처리되므로 차트 거래 데이터 로드는 기존 메커니즘 활용
