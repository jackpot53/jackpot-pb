# 저축성 보험 자동 이자 계산 설계

**날짜**: 2026-04-18  
**목표**: 저축성 보험(insurance, category='savings')에서 예적금처럼 이자를 자동 계산하여 평가금과 수익률 표시

---

## 1. 개요

### 현재 상태
- Insurance assets는 원가 기준으로만 수익률 계산 (currentValueKrw = totalCostKrw)
- Savings assets는 `computeCurrentSavingsValueKrw`로 자동 이자 계산

### 목표 상태
- Insurance (category='savings')도 Savings와 동일하게 이자 자동 계산
- 정기납입형(monthly/quarterly/yearly)과 일시납형(lump_sum) 모두 지원
- 복리 방식 선택 가능: 단리(simple) / 월복리(monthly) / 연복리(yearly)

---

## 2. 데이터 구조

### Insurance Details (이미 존재)
```typescript
// db/schema/insurance-details.ts
- expectedReturnRateBp: integer  // 연이자율 bp×100 (e.g. 3.5% = 35000)
- paymentCycle: varchar          // 'monthly' | 'quarterly' | 'yearly' | 'lump_sum'
- premiumPerCycleKrw: bigint     // 주기당 납입액 (KRW)
- paymentStartDate: date         // 납입 시작일
- paymentEndDate: date           // 납입 만료일
- compoundType: varchar          // 'simple' | 'monthly' | 'yearly'
- category: varchar              // 'protection' | 'savings'
```

### Insurance Buys (거래 내역)
```typescript
// lib/insurance.ts - 새로 정의
export interface InsuranceBuy {
  transactionDate: string  // 'YYYY-MM-DD'
  amountKrw: number        // 납입액 (transactions.pricePerUnit)
}
```

거래 내역은 기존 `transactions` 테이블에서 추출:
- assetId로 필터링
- type='buy' (sell은 제외)
- isVoided=false

---

## 3. 계산 로직

### 3.1 일시납 (paymentCycle='lump_sum')

각 납입건(`transactionDate`)부터 현재까지 경과일수 기준으로 이자 계산:

**단리**:
```
이자 = 원금 × 연이율 × (경과일수 / 365)
```

**월복리**:
```
월이율 = 연이율 / 12
경과월수 = 경과일수 / 30.4167
이자 = 원금 × ((1 + 월이율)^경과월수 - 1)
```

**연복리**:
```
경과년수 = 경과일수 / 365
이자 = 원금 × ((1 + 연이율)^경과년수 - 1)
```

**현재 평가액**:
```
평가액 = Σ(각 납입건의 원금 + 이자)
```

### 3.2 정기납입 (paymentCycle='monthly'/'quarterly'/'yearly')

`paymentStartDate`부터 현재까지 납입 주기별로 **가상 납입 내역 생성**:

예) monthlyContribution=1,000,000, paymentStartDate='2024-01-15'일 때:
```
2024-01-15: 1,000,000
2024-02-15: 1,000,000
2024-03-15: 1,000,000
... (현재까지)
```

각 납입건에 대해 일시납 방식으로 이자 계산 후 합산.

**단리 근사**:
```
이자 ≈ 월납입액 × 월이율 × m(m+1)/2
(m = 경과 납입 회차)
```

**월복리 기하급수**:
```
이자 = 월납입액 × (1+r) × ((1+r)^m - 1) / r - (원금)
(r = 월이율, m = 경과 회차)
```

### 3.3 세금 처리

보험은 비과세 처리 (tax_free):
```typescript
// tax rate = 0
netInterest = grossInterest  // 세금 공제 없음
```

---

## 4. 구현 범위

### 4.1 신규 파일

**`lib/insurance.ts`**
```typescript
export interface InsuranceBuy { ... }
export function computeCurrentInsuranceValueKrw(params: {
  buys: InsuranceBuy[]
  expectedReturnRateBp: number | null
  paymentStartDate: string | null
  paymentEndDate: string | null
  compoundType: CompoundType
  paymentCycle: 'monthly' | 'quarterly' | 'yearly' | 'lump_sum'
  premiumPerCycleKrw: number | null
  asOf?: Date
}): number
export function generateVirtualInsurancePayments(...): InsuranceBuy[]
```

### 4.2 수정 대상

**`db/queries/insurance.ts`**
- 신규: `getInsuranceBuys(assetIds: string[]): Promise<Map<assetId, InsuranceBuy[]>>`
  - transactions 테이블에서 insurance 거래 추출

**`lib/portfolio.ts`**
- `computeAssetPerformance(params)`:
  - insurance buys 파라미터 추가
  - `assetType === 'insurance' && insuranceDetails?.category === 'savings'` 조건에서:
    - `computeCurrentInsuranceValueKrw` 호출
    - `currentValueKrw`, `returnPct`, `compoundType` 계산

**`lib/server/load-performances.ts`**
- `loadPerformances(userId)`:
  - insurance buys bulk 조회 추가
  - `computeAssetPerformance`에 `insuranceBuys` 전달

### 4.3 변경 없음

- `AssetPerformance` 인터페이스: `insuranceDetails`, `compoundType` 필드 이미 존재 ✓
- UI 컴포넌트: 기존 insurance 카드 (badge와 currentValueKrw 자동 렌더링)

---

## 5. 주요 설계 결정

### 5.1 Savings 로직 재사용
- `lib/savings.ts`의 `computeAccruedInterestKrw`, `generateVirtualRecurringBuys` 등을 직접 호출
- 불필요한 코드 중복 제거, 검증된 이자 계산 공식 재사용
- 두 상품의 동작 일치성 보장

### 5.2 CompoundType 확장
- 기존: `'simple' | 'monthly'`
- 신규: `'simple' | 'monthly' | 'yearly'` (보험의 연복리 지원)
- `lib/savings.ts`의 CompoundType을 확장 또는 별도 정의

### 5.3 거래 내역 의존성
- 정기납입형도 실제 거래(`transactions`)가 있으면 가상 납입 생성 안 함
- Savings와 동일한 우선순위: 실제 거래 > 가상 납입

---

## 6. 테스트 전략

### 6.1 단위 테스트 (`lib/insurance.ts`)
- `computeCurrentInsuranceValueKrw`:
  - 일시납 (단리, 월복리, 연복리)
  - 정기납입 (월납, 분기납, 연납)
  - 만료일 이후 계산 (paymentEndDate 기준)
- `generateVirtualInsurancePayments`: 납입 주기별 가상 생성 검증

### 6.2 통합 테스트 (`portfolio.ts`)
- `computeAssetPerformance`:
  - insurance (category='savings') 자동 계산
  - insurance (category='protection') 기존 동작 유지
  - returnPct 계산 검증

### 6.3 쿼리 테스트 (`db/queries/insurance.ts`)
- `getInsuranceBuys`: 거래 필터링 정확성

---

## 7. 위험 요소 & 완화 전략

| 위험 | 완화 전략 |
|------|---------|
| CompoundType 확장 시 기존 'monthly' 데이터 호환성 | 신규 'yearly' 대신 'annual'로 명칭, 마이그레이션 스크립트 준비 |
| 정기납입 가상 생성 시 paymentEndDate 무시 가능성 | paymentEndDate 존재 여부 검증, 이후 기간 납입 제외 |
| 세금 미처리 (tax_free 취급) | 기존 insurance 스키마에 taxType 필드 없으므로 합리적 가정 |

---

## 8. UI/UX (기존 유지)

Insurance 카드는 기존 렌더링 로직 유지:
- `currentValueKrw` 자동 표시 (이제 원금 + 이자)
- `returnPct` 자동 표시 (이제 이자 기반)
- `compoundType` badge ('단리' / '월복리' / '연복리')
- `insuranceDetails.category` 필터링으로 저축성만 이자 계산 적용

---

## 9. 구현 순서

1. `lib/insurance.ts` 작성 (계산 로직)
2. `db/queries/insurance.ts` 수정 (buys 조회)
3. `lib/portfolio.ts` 수정 (통합)
4. `lib/server/load-performances.ts` 수정 (데이터 로딩)
5. 단위 테스트 작성
6. 통합 테스트 작성
7. UI 렌더링 검증 (dev 실행)
