# 보험 자산 차트 설계 (현재값 + 미래값)

**날짜**: 2026-04-18  
**목표**: 저축성 보험 자산에 선 그래프 차트를 추가하여 현재까지의 누적액과 paymentEndDate까지의 예상 미래값을 시각화

---

## 1. 개요

### 현재 상태
- 보험 자산도 AssetPerformance에 currentValueKrw와 returnPct이 계산됨
- 하지만 차트 시각화는 미지원 (AssetLineChart에서 insurance 타입 미처리)
- 예적금(savings)은 `line-projected` 차트로 현재값과 미래값을 표시

### 목표 상태
- 보험 자산도 예적금과 동일한 방식으로 차트 표시
- 현재까지의 누적액을 실선으로, 미래 예상액을 점선으로 표시
- paymentEndDate까지만 계산 (그 이후는 표시 안 함)
- 정기납입형의 경우 paymentEndDate까지 계속 납입된다고 가정

---

## 2. 데이터 구조

### 기존 Insurance Data
```typescript
// lib/insurance.ts (이미 존재)
- computeCurrentInsuranceValueKrw() // 현재값 계산
- computeAccruedInsuranceInterestKrw() // 이자 계산

// db/queries/insurance.ts (이미 존재)
- getInsuranceDetails() // 계약 메타
- getInsuranceBuys() // 거래 내역
```

### 신규 차트 데이터
```typescript
// lib/insurance-curve.ts (신규)
export interface InsuranceProjectionPoint {
  date: string     // 'YYYY-MM-DD'
  valueKrw: number // 누적액 (원금 + 이자)
}

export function computeInsuranceProjectionCurveKrw(params: {
  buys: InsuranceBuy[]
  expectedReturnRateBp: number | null
  paymentStartDate: string | null
  paymentEndDate: string | null
  compoundType: CompoundType
  paymentCycle: 'monthly' | 'quarterly' | 'yearly' | 'lump_sum'
  premiumPerCycleKrw: number | null
  asOf?: Date
}): InsuranceProjectionPoint[]
```

---

## 3. 계산 로직

### 3.1 곡선 데이터 생성

**시간 범위:**
- **시작**: 첫 납입일 (가장 빠른 거래 또는 paymentStartDate)
- **종료**: paymentEndDate (없으면 현재일)
- **간격**: 7일 단위 (또는 일일, 성능에 따라 조정)

**각 시점에서의 누적액:**
```
누적액 = Σ(각 납입건의 현재값)
  where 각 납입건 = 원금 + 그 날까지의 이자
```

**예시 (월납입, 이율 3.5%, 단리):**
```
2024-01-15: 1M (첫 납입)
2024-02-15: 2M + 이자 (2개월)
2024-03-15: 3M + 이자 (3개월)
...
paymentEndDate: 최종 누적액
```

### 3.2 현재값과 미래값 분리

- **현재값 (오늘까지)**: 실제 거래 기반 + 누적 이자
- **미래값 (현재 ~ paymentEndDate)**: 예상 납입 + 누적 이자
- **경계**: 오늘 (today reference line)

---

## 4. 구현 범위

### 4.1 신규 파일

**`lib/insurance-curve.ts`**
```typescript
// savings-curve.ts의 패턴을 따름
export function computeInsuranceProjectionCurveKrw(...): InsuranceProjectionPoint[]
```

### 4.2 수정 대상

**`lib/portfolio/portfolio.ts`**
- AssetPerformance 인터페이스: `insuranceChartData?: InsuranceProjectionPoint[]` 추가
- computeAssetPerformance(): insurance 자산도 chartData 계산

**`lib/server/load-performances.ts`**
- loadPerformances(): insurance 곡선 데이터 로드 추가

**`components/app/asset-line-chart.tsx`**
- insurance 타입 감지 및 `line-projected` 차트 사용 (기존 savings 로직과 동일)

### 4.3 변경 없음

- AssetPageClient: 이미 insurance 타입 지원 (chartKind 결정만)
- OverviewTab: insurance 메타 표시 (이미 완성)

---

## 5. UI/UX

### 차트 표시 방식

**AssetLineChart (line-projected 타입)**
- **실선**: 현재까지의 누적액 (오늘까지)
- **점선** (strokeDasharray: "4 3"): 미래 예상액 (현재 ~ paymentEndDate)
- **참조선**: 오늘 (dashed, 수직)
- **Y축**: KRW 포맷 (₩10,000,000)
- **X축**: 날짜 (M/D 또는 연월)

**색상**: 보험의 기존 색상 유지 (emerald/teal)

### 차트 호출 타이밍

- 보험 자산 상세 페이지에서만 표시 (AssetPageClient)
- 대시보드에서는 표시 안 함 (portfolio overview는 종합 차트만)

---

## 6. 테스트 전략

### 6.1 단위 테스트
- computeInsuranceProjectionCurveKrw:
  - 일시납 (현재값만)
  - 정기납입형 (미래 납입 포함)
  - paymentEndDate 이후 데이터 제외 확인
  - 복리 방식별 (simple/monthly/yearly)

### 6.2 통합 테스트
- AssetLineChart: insurance 데이터 렌더링
- 차트 데이터 포인트 정확성 검증

### 6.3 UI 검증
- Dev 서버: 보험 자산 상세 페이지에서 차트 시각 확인
- 점선/실선 경계 (오늘)가 정확한지 확인

---

## 7. 주요 설계 결정

### 7.1 Savings와 동일한 곡선 패턴
- 예적금의 `savings-curve.ts` 패턴을 따름
- 개발자가 이해하기 쉽고, UI 로직 재사용 가능

### 7.2 비과세 처리
- 보험은 세금을 고려하지 않음 (현재 이자 계산과 동일)
- 향후 세금 옵션은 별도 기능으로 추가 가능

### 7.3 PaymentEndDate 기준
- 납입이 끝나는 시점을 명확히 표시
- 그 이후의 이자는 별도 계산 가능하지만 차트에서는 미표시

---

## 8. 구현 순서

1. `lib/insurance-curve.ts` 작성 (곡선 계산)
2. `lib/portfolio.ts` 수정 (AssetPerformance에 chartData 추가)
3. `lib/server/load-performances.ts` 수정 (곡선 데이터 로드)
4. `components/app/asset-line-chart.tsx` 확인 (insurance 호환성)
5. 단위 테스트 작성
6. UI 검증 (dev 서버)
