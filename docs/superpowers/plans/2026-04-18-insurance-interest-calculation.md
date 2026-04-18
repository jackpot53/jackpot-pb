# 저축성 보험 자동 이자 계산 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 저축성 보험(category='savings')에서 예적금처럼 이자를 자동 계산하여 평가금과 수익률 표시

**Architecture:** 
1. `lib/insurance.ts`에 순수 이자 계산 함수 구현 (lib/savings.ts 로직 재사용)
2. `db/queries/insurance.ts`에서 거래 내역 조회
3. `lib/portfolio.ts`의 `computeAssetPerformance`에 insurance 자동 계산 통합
4. `lib/server/load-performances.ts`에서 bulk 데이터 로딩

**Tech Stack:** TypeScript, Drizzle ORM, Vitest, existing savings calculation logic

---

## 파일 구조

| 파일 | 책임 | 변경 유형 |
|------|------|---------|
| `lib/insurance.ts` | Insurance 이자 계산 순수 함수 | 신규 생성 |
| `db/queries/insurance.ts` | Insurance 거래 내역 조회 | 신규 함수 추가 |
| `lib/portfolio.ts` | Asset 성과 계산 (insurance 통합) | 수정 |
| `lib/server/load-performances.ts` | 포트폴리오 성과 데이터 로딩 | 수정 |
| `lib/insurance.test.ts` | Insurance 계산 로직 테스트 | 신규 생성 |

---

## Task 1: Insurance 이자 계산 라이브러리 작성

**Files:**
- Create: `lib/insurance.ts`
- Test: `lib/insurance.test.ts`

### 1.1 InsuranceBuy 타입 및 CompoundType 확장

- [ ] **Step 1: insurance.ts 생성 및 기본 타입 정의**

```typescript
// lib/insurance.ts
export type CompoundType = 'simple' | 'monthly' | 'yearly'

/** 단일 보험료 납입건 */
export interface InsuranceBuy {
  transactionDate: string  // 'YYYY-MM-DD'
  amountKrw: number        // 납입액 (KRW)
}
```

- [ ] **Step 2: CompoundType을 export하도록 lib/savings.ts 수정**

```typescript
// lib/savings.ts의 기존 코드
export type CompoundType = 'simple' | 'monthly'

// 변경: 'yearly' 추가
export type CompoundType = 'simple' | 'monthly' | 'yearly'
```

참고: 기존 저장된 'simple' 및 'monthly' 데이터는 그대로 유지되며, insurance에서만 'yearly' 사용

- [ ] **Step 3: insurance.ts 파일 저장 확인**

Run: `ls -la lib/insurance.ts`
Expected: 파일 존재

---

### 1.2 일시납 이자 계산 함수 (computeAccruedInsuranceInterestKrw)

- [ ] **Step 1: 테스트 파일 작성 - 단리 계산**

```typescript
// lib/insurance.test.ts
import { describe, it, expect } from 'vitest'
import { computeAccruedInsuranceInterestKrw } from '@/lib/insurance'

describe('computeAccruedInsuranceInterestKrw', () => {
  it('단리: 원금 1,000,000원, 연이율 3.5%, 1년 경과 → 이자 35,000원', () => {
    const interest = computeAccruedInsuranceInterestKrw({
      principal: 1_000_000,
      annualRateBp: 35_000,  // 3.5%
      daysElapsed: 365,
      compoundType: 'simple',
    })
    expect(interest).toBe(35_000)
  })

  it('단리: 180일 경과 → 이자 17,500원', () => {
    const interest = computeAccruedInsuranceInterestKrw({
      principal: 1_000_000,
      annualRateBp: 35_000,
      daysElapsed: 180,
      compoundType: 'simple',
    })
    expect(interest).toBe(17_500)
  })

  it('음수 경과일수 → 이자 0원', () => {
    const interest = computeAccruedInsuranceInterestKrw({
      principal: 1_000_000,
      annualRateBp: 35_000,
      daysElapsed: 0,
      compoundType: 'simple',
    })
    expect(interest).toBe(0)
  })
})
```

Run: `npm test lib/insurance.test.ts`
Expected: FAIL (함수 미정의)

- [ ] **Step 2: 단리 계산 함수 구현**

```typescript
// lib/insurance.ts에 추가
export function computeAccruedInsuranceInterestKrw({
  principal,
  annualRateBp,
  daysElapsed,
  compoundType,
}: {
  principal: number
  annualRateBp: number
  daysElapsed: number
  compoundType: CompoundType
}): number {
  if (daysElapsed <= 0 || principal <= 0 || annualRateBp <= 0) return 0

  const annualRate = annualRateBp / 1_000_000

  if (compoundType === 'simple') {
    return Math.floor(principal * annualRate * (daysElapsed / 365))
  } else {
    // 복리는 다음 스텝
    return 0
  }
}
```

Run: `npm test lib/insurance.test.ts`
Expected: PASS (단리 관련 테스트)

- [ ] **Step 3: 테스트 파일에 월복리 테스트 추가**

```typescript
// lib/insurance.test.ts에 추가
describe('computeAccruedInsuranceInterestKrw', () => {
  // 기존 테스트...

  it('월복리: 원금 1,000,000원, 연이율 3.5%, 12개월 경과 → 약 35,614원', () => {
    const interest = computeAccruedInsuranceInterestKrw({
      principal: 1_000_000,
      annualRateBp: 35_000,  // 3.5%
      daysElapsed: 365,
      compoundType: 'monthly',
    })
    // 월복리: 1,000,000 × (1 + 0.035/12)^12 - 1,000,000 ≈ 35,614
    expect(interest).toBeGreaterThanOrEqual(35_600)
    expect(interest).toBeLessThanOrEqual(35_700)
  })

  it('월복리: 180일(약 6개월) 경과 → 약 17,430원', () => {
    const interest = computeAccruedInsuranceInterestKrw({
      principal: 1_000_000,
      annualRateBp: 35_000,
      daysElapsed: 180,
      compoundType: 'monthly',
    })
    expect(interest).toBeGreaterThanOrEqual(17_400)
    expect(interest).toBeLessThanOrEqual(17_500)
  })
})
```

Run: `npm test lib/insurance.test.ts`
Expected: FAIL (월복리 미구현)

- [ ] **Step 4: 월복리/연복리 구현**

```typescript
// lib/insurance.ts의 computeAccruedInsuranceInterestKrw 수정
export function computeAccruedInsuranceInterestKrw({
  principal,
  annualRateBp,
  daysElapsed,
  compoundType,
}: {
  principal: number
  annualRateBp: number
  daysElapsed: number
  compoundType: CompoundType
}): number {
  if (daysElapsed <= 0 || principal <= 0 || annualRateBp <= 0) return 0

  const annualRate = annualRateBp / 1_000_000

  if (compoundType === 'simple') {
    return Math.floor(principal * annualRate * (daysElapsed / 365))
  } else if (compoundType === 'monthly') {
    const monthlyRate = annualRate / 12
    const months = daysElapsed / (365 / 12)
    return Math.floor(principal * (Math.pow(1 + monthlyRate, months) - 1))
  } else {
    // compoundType === 'yearly'
    const yearlyRate = annualRate
    const years = daysElapsed / 365
    return Math.floor(principal * (Math.pow(1 + yearlyRate, years) - 1))
  }
}
```

Run: `npm test lib/insurance.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/insurance.ts lib/insurance.test.ts lib/savings.ts
git commit -m "feat: 보험 이자 계산 함수 구현 (단리/월복리/연복리)"
```

---

### 1.3 가상 보험료 납입 생성 함수 (generateVirtualInsurancePayments)

- [ ] **Step 1: 테스트 작성**

```typescript
// lib/insurance.test.ts에 추가
describe('generateVirtualInsurancePayments', () => {
  it('월납입, 2024-01-15 시작, 월 1,000,000원 → 2024-01-15, 2024-02-15, ... 생성', () => {
    const asOf = new Date('2024-03-15')
    const payments = generateVirtualInsurancePayments({
      paymentStartDate: '2024-01-15',
      paymentCycle: 'monthly',
      premiumPerCycleKrw: 1_000_000,
      asOf,
    })
    expect(payments).toEqual([
      { transactionDate: '2024-01-15', amountKrw: 1_000_000 },
      { transactionDate: '2024-02-15', amountKrw: 1_000_000 },
      { transactionDate: '2024-03-15', amountKrw: 1_000_000 },
    ])
  })

  it('분기납입 → 3개월 간격 생성', () => {
    const asOf = new Date('2024-09-15')
    const payments = generateVirtualInsurancePayments({
      paymentStartDate: '2024-01-15',
      paymentCycle: 'quarterly',
      premiumPerCycleKrw: 3_000_000,
      asOf,
    })
    expect(payments.length).toBe(3)  // Jan, Apr, Jul
    expect(payments[0].transactionDate).toBe('2024-01-15')
    expect(payments[1].transactionDate).toBe('2024-04-15')
    expect(payments[2].transactionDate).toBe('2024-07-15')
  })

  it('연납입 → 1년 간격 생성', () => {
    const asOf = new Date('2025-06-15')
    const payments = generateVirtualInsurancePayments({
      paymentStartDate: '2024-01-15',
      paymentCycle: 'yearly',
      premiumPerCycleKrw: 12_000_000,
      asOf,
    })
    expect(payments.length).toBe(2)  // 2024, 2025
    expect(payments[0].transactionDate).toBe('2024-01-15')
    expect(payments[1].transactionDate).toBe('2025-01-15')
  })

  it('paymentEndDate 이후 납입은 제외', () => {
    const asOf = new Date('2024-12-15')
    const payments = generateVirtualInsurancePayments({
      paymentStartDate: '2024-01-15',
      paymentCycle: 'monthly',
      premiumPerCycleKrw: 1_000_000,
      paymentEndDate: '2024-06-15',  // 6월까지만
      asOf,
    })
    expect(payments.length).toBe(6)  // Jan ~ Jun
  })
})
```

Run: `npm test lib/insurance.test.ts`
Expected: FAIL

- [ ] **Step 2: 함수 구현**

```typescript
// lib/insurance.ts에 추가
export function generateVirtualInsurancePayments({
  paymentStartDate,
  paymentCycle,
  premiumPerCycleKrw,
  paymentEndDate = null,
  asOf = new Date(),
}: {
  paymentStartDate: string  // 'YYYY-MM-DD'
  paymentCycle: 'monthly' | 'quarterly' | 'yearly' | 'lump_sum'
  premiumPerCycleKrw: number
  paymentEndDate?: string | null
  asOf?: Date
}): InsuranceBuy[] {
  if (paymentCycle === 'lump_sum' || premiumPerCycleKrw <= 0) return []

  const [sy, sm, sd] = paymentStartDate.split('-').map(Number)
  const todayLocal = new Date(asOf)
  todayLocal.setHours(0, 0, 0, 0)

  const maxDate = paymentEndDate
    ? new Date(paymentEndDate)
    : todayLocal
  maxDate.setHours(0, 0, 0, 0)

  if (new Date(sy, sm - 1, sd) > todayLocal) return []

  const payments: InsuranceBuy[] = []
  const interval = paymentCycle === 'monthly' ? 1 : paymentCycle === 'quarterly' ? 3 : 12
  let year = sy
  let month = sm - 1  // 0-indexed

  while (true) {
    const lastDay = new Date(year, month + 1, 0).getDate()
    const day = Math.min(sd, lastDay)
    const cur = new Date(year, month, day)
    if (cur > todayLocal || cur > maxDate) break

    const mm = String(month + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    payments.push({
      transactionDate: `${year}-${mm}-${dd}`,
      amountKrw: premiumPerCycleKrw,
    })

    month += interval
    while (month > 11) {
      month -= 12
      year++
    }
  }

  return payments
}
```

Run: `npm test lib/insurance.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/insurance.ts lib/insurance.test.ts
git commit -m "feat: 가상 보험료 납입 생성 함수 (월/분기/연납)"
```

---

### 1.4 현재 보험료 평가액 계산 함수 (computeCurrentInsuranceValueKrw)

- [ ] **Step 1: 테스트 작성**

```typescript
// lib/insurance.test.ts에 추가
describe('computeCurrentInsuranceValueKrw', () => {
  it('일시납, 단리, 1년 경과 → 원금 + 이자', () => {
    const value = computeCurrentInsuranceValueKrw({
      buys: [{ transactionDate: '2023-04-18', amountKrw: 1_000_000 }],
      expectedReturnRateBp: 35_000,  // 3.5%
      paymentStartDate: null,
      paymentEndDate: null,
      compoundType: 'simple',
      paymentCycle: 'lump_sum',
      premiumPerCycleKrw: null,
      asOf: new Date('2024-04-18'),
    })
    // 1,000,000 + 35,000 = 1,035,000
    expect(value).toBe(1_035_000)
  })

  it('정기납입(월), 단리, 3개월 → 원금 3,000,000 + 누적 이자', () => {
    const value = computeCurrentInsuranceValueKrw({
      buys: [],  // 가상 생성
      expectedReturnRateBp: 35_000,
      paymentStartDate: '2024-01-15',
      paymentEndDate: null,
      compoundType: 'simple',
      paymentCycle: 'monthly',
      premiumPerCycleKrw: 1_000_000,
      asOf: new Date('2024-04-15'),
    })
    // 1월: 1M × 3.5% × 90/365 ≈ 8,630
    // 2월: 1M × 3.5% × 60/365 ≈ 5,753
    // 3월: 1M × 3.5% × 30/365 ≈ 2,877
    // 합: 3,000,000 + 17,260 ≈ 3,017,260
    expect(value).toBeGreaterThan(3_010_000)
    expect(value).toBeLessThan(3_020_000)
  })

  it('no buys + no paymentStartDate → 0', () => {
    const value = computeCurrentInsuranceValueKrw({
      buys: [],
      expectedReturnRateBp: 35_000,
      paymentStartDate: null,
      paymentEndDate: null,
      compoundType: 'simple',
      paymentCycle: 'lump_sum',
      premiumPerCycleKrw: null,
    })
    expect(value).toBe(0)
  })
})
```

Run: `npm test lib/insurance.test.ts`
Expected: FAIL

- [ ] **Step 2: 함수 구현**

```typescript
// lib/insurance.ts에 추가
export function computeCurrentInsuranceValueKrw({
  buys,
  expectedReturnRateBp,
  paymentStartDate,
  paymentEndDate,
  compoundType,
  paymentCycle,
  premiumPerCycleKrw,
  asOf = new Date(),
}: {
  buys: InsuranceBuy[]
  expectedReturnRateBp: number | null
  paymentStartDate: string | null
  paymentEndDate: string | null
  compoundType: CompoundType
  paymentCycle: 'monthly' | 'quarterly' | 'yearly' | 'lump_sum'
  premiumPerCycleKrw: number | null
  asOf?: Date
}): number {
  // 예상수익률이 없으면 원금만 반환
  if (!expectedReturnRateBp || expectedReturnRateBp <= 0) {
    return buys.reduce((sum, b) => sum + b.amountKrw, 0)
  }

  // 정기납입: 가상 납입 생성
  const effectiveBuys = (() => {
    if (
      paymentCycle !== 'lump_sum' &&
      paymentStartDate &&
      premiumPerCycleKrw &&
      premiumPerCycleKrw > 0
    ) {
      return generateVirtualInsurancePayments({
        paymentStartDate,
        paymentCycle,
        premiumPerCycleKrw,
        paymentEndDate,
        asOf,
      })
    }
    return buys
  })()

  if (effectiveBuys.length === 0) return 0

  // 각 납입건별 이자 계산
  let totalValue = 0
  for (const buy of effectiveBuys) {
    const buyDate = new Date(buy.transactionDate)
    buyDate.setHours(0, 0, 0, 0)
    const endDate = new Date(asOf)
    endDate.setHours(0, 0, 0, 0)

    if (buyDate > endDate) continue

    const days = Math.floor((endDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24))
    const interest = computeAccruedInsuranceInterestKrw({
      principal: buy.amountKrw,
      annualRateBp: expectedReturnRateBp,
      daysElapsed: days,
      compoundType,
    })
    totalValue += buy.amountKrw + interest
  }

  return totalValue
}
```

Run: `npm test lib/insurance.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/insurance.ts lib/insurance.test.ts
git commit -m "feat: 현재 보험료 평가액 계산 함수"
```

---

## Task 2: Insurance 거래 내역 조회 함수 추가

**Files:**
- Modify: `db/queries/insurance.ts`

- [ ] **Step 1: getInsuranceBuys 함수 구현**

먼저 기존 insurance.ts 파일을 확인:

```typescript
// db/queries/insurance.ts 현재 코드 확인
```

그 다음 getInsuranceBuys 함수 추가:

```typescript
// db/queries/insurance.ts에 추가
import { and, inArray, eq } from 'drizzle-orm'
import { transactions } from '@/db/schema/transactions'
import type { InsuranceBuy } from '@/lib/insurance'

export async function getInsuranceBuys(
  assetIds: string[]
): Promise<Map<string, InsuranceBuy[]>> {
  if (assetIds.length === 0) return new Map()

  const rows = await db
    .select({
      assetId: transactions.assetId,
      transactionDate: transactions.transactionDate,
      amountKrw: transactions.pricePerUnit,
    })
    .from(transactions)
    .where(
      and(
        inArray(transactions.assetId, assetIds),
        eq(transactions.type, 'buy'),
        eq(transactions.isVoided, false)
      )
    )
    .orderBy(transactions.transactionDate)

  const map = new Map<string, InsuranceBuy[]>()
  for (const row of rows) {
    const key = row.assetId
    if (!map.has(key)) {
      map.set(key, [])
    }
    map.get(key)!.push({
      transactionDate: row.transactionDate.toISOString().split('T')[0],
      amountKrw: row.amountKrw,
    })
  }
  return map
}
```

Run: `npm run build`
Expected: Build successful (타입 에러 없음)

- [ ] **Step 2: Commit**

```bash
git add db/queries/insurance.ts
git commit -m "feat: 보험 거래 내역 조회 함수 추가"
```

---

## Task 3: Portfolio 성과 계산에 Insurance 통합

**Files:**
- Modify: `lib/portfolio.ts`

- [ ] **Step 1: 먼저 기존 portfolio.ts 읽기**

현재 computeAssetPerformance 함수의 구조 파악

- [ ] **Step 2: insurance 자동 계산 로직 추가**

```typescript
// lib/portfolio.ts에서 import 추가
import { computeCurrentInsuranceValueKrw, type InsuranceBuy } from '@/lib/insurance'

// computeAssetPerformance 함수의 params에 추가:
export function computeAssetPerformance(params: {
  holding: AssetHoldingInput
  currentPriceKrw: number
  currentPriceUsd?: number | null
  currentFxRate?: number | null
  isStale: boolean
  cachedAt: Date | null
  latestManualValuationKrw: number | null
  dailyChangeBps?: number | null
  savingsDetails?: SavingsDetails | null
  savingsBuys?: SavingsBuy[]
  insuranceDetails?: InsuranceDetailsRow | null
  insuranceBuys?: InsuranceBuy[]  // 신규 추가
}): AssetPerformance {
  const { 
    holding, 
    currentPriceKrw, 
    currentPriceUsd = null, 
    currentFxRate = null, 
    isStale, 
    cachedAt, 
    latestManualValuationKrw, 
    dailyChangeBps = null, 
    savingsDetails = null, 
    savingsBuys = [], 
    insuranceDetails = null,
    insuranceBuys = []  // 신규 기본값
  } = params
```

- [ ] **Step 3: insurance 자동 계산 조건 및 로직 추가**

기존 savings 자동 계산 로직 (line ~120) 바로 앞에 insurance 자동 계산 추가:

```typescript
  // 보험 자동계산: 이자율 기반으로 경과일수 × 이자를 각 납입건별 합산.
  const isInsuranceAuto =
    holding.assetType === 'insurance' &&
    insuranceDetails != null &&
    insuranceDetails.category === 'savings' &&
    insuranceDetails.expectedReturnRateBp != null &&
    insuranceDetails.expectedReturnRateBp > 0

  if (isInsuranceAuto && insuranceDetails) {
    const autoValue = computeCurrentInsuranceValueKrw({
      buys: insuranceBuys,
      expectedReturnRateBp: insuranceDetails.expectedReturnRateBp!,
      paymentStartDate: insuranceDetails.paymentStartDate
        ? insuranceDetails.paymentStartDate.toISOString().split('T')[0]
        : null,
      paymentEndDate: insuranceDetails.paymentEndDate
        ? insuranceDetails.paymentEndDate.toISOString().split('T')[0]
        : null,
      compoundType: insuranceDetails.compoundType as CompoundType,
      paymentCycle: insuranceDetails.paymentCycle as 'monthly' | 'quarterly' | 'yearly' | 'lump_sum',
      premiumPerCycleKrw: insuranceDetails.premiumPerCycleKrw ?? null,
    })
    const currentValueKrw = latestManualValuationKrw ?? autoValue
    const returnPct =
      holding.totalCostKrw > 0
        ? ((currentValueKrw - holding.totalCostKrw) / holding.totalCostKrw) * 100
        : 0
    return {
      ...holding,
      currentPriceKrw: currentValueKrw,
      currentPriceUsd: null,
      currentValueKrw,
      returnPct,
      stockReturnPct: null,
      fxReturnPct: null,
      currentFxRate: null,
      isStale: false,
      cachedAt: null,
      dailyChangeBps: null,
      missingValuation: false,
      initialTransactionDate: null,
      maturityDate: null,
      interestRateBp: null,
      monthlyContributionKrw: null,
      insuranceDetails,
      compoundType: insuranceDetails.compoundType as CompoundType,
    }
  }

  // 기존 savings 자동계산 로직 (line ~120):
  const isSavingsAuto = ...
```

Run: `npm run build`
Expected: Build successful

- [ ] **Step 4: Commit**

```bash
git add lib/portfolio.ts
git commit -m "feat: 포트폴리오 성과 계산에 저축성 보험 자동 이자 통합"
```

---

## Task 4: 포트폴리오 성과 데이터 로딩 함수 수정

**Files:**
- Modify: `lib/server/load-performances.ts`

- [ ] **Step 1: getInsuranceBuys import 추가 및 호출**

```typescript
// lib/server/load-performances.ts에 import 추가
import { getInsuranceBuys } from '@/db/queries/insurance'

// loadPerformances 함수 내부 수정:
// 기존:
// const insuranceDetailsMap = await timed('  insurance details', () => getInsuranceDetails(insuranceIds))

// 변경:
const [insuranceDetailsMap, insuranceBuysMap] = await timed('  insurance details+buys', () => 
  Promise.all([
    getInsuranceDetails(insuranceIds),
    getInsuranceBuys(insuranceIds),
  ])
)
```

- [ ] **Step 2: computeAssetPerformance 호출 시 insuranceBuys 전달**

```typescript
// computeAssetPerformance 호출 부분 수정:
computeAssetPerformance({
  holding: {
    ...asset,
    totalQuantity: Number(asset.totalQuantity ?? 0),
    avgCostPerUnit: Number(asset.avgCostPerUnit ?? 0),
    avgCostPerUnitOriginal: asset.avgCostPerUnitOriginal != null ? Number(asset.avgCostPerUnitOriginal) : null,
    avgExchangeRateAtTime: asset.avgExchangeRateAtTime != null ? Number(asset.avgExchangeRateAtTime) : null,
    totalCostKrw: Number(asset.totalCostKrw ?? 0),
  },
  currentPriceKrw,
  currentPriceUsd,
  currentFxRate,
  isStale: stale,
  cachedAt,
  dailyChangeBps,
  latestManualValuationKrw: asset.latestManualValuationKrw !== null
    ? Number(asset.latestManualValuationKrw)
    : null,
  savingsDetails: savingsDetailsMap.get(asset.assetId) ?? null,
  savingsBuys: savingsBuysMap.get(asset.assetId) ?? [],
  insuranceDetails: insuranceDetailsMap.get(asset.assetId) ?? null,
  insuranceBuys: insuranceBuysMap.get(asset.assetId) ?? [],  // 신규 추가
})
```

Run: `npm run build`
Expected: Build successful

- [ ] **Step 3: Commit**

```bash
git add lib/server/load-performances.ts
git commit -m "feat: 포트폴리오 로딩에서 보험 거래 내역 조회"
```

---

## Task 5: 테스트 실행 및 UI 검증

- [ ] **Step 1: 단위 테스트 실행**

Run: `npm test lib/insurance.test.ts`
Expected: All tests PASS

- [ ] **Step 2: Build 최종 확인**

Run: `npm run build`
Expected: Build successful

- [ ] **Step 3: Dev 서버 시작**

Run: `npm run dev`
Expected: http://localhost:3000 접근 가능, 콘솔에 에러 없음

- [ ] **Step 4: 최종 Commit**

```bash
git add .
git commit -m "test: 저축성 보험 자동 이자 계산 완료"
```

---

## 구현 완료 체크리스트

- [ ] `lib/insurance.ts`: 이자 계산 함수 (단리/월복리/연복리)
- [ ] `lib/insurance.ts`: 가상 납입 생성 함수
- [ ] `lib/insurance.ts`: 현재 평가액 계산 함수
- [ ] `db/queries/insurance.ts`: getInsuranceBuys 함수
- [ ] `lib/portfolio.ts`: insurance 자동 계산 통합
- [ ] `lib/server/load-performances.ts`: insurance buys 조회
- [ ] 단위 테스트 (lib/insurance.test.ts) PASS
- [ ] Build successful
- [ ] Dev 서버 정상 동작
