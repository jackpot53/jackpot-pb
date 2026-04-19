# 출자금 배당 이력 설계

**날짜:** 2026-04-19
**범위:** 출자금(contribution) 자산의 연도별 배당률 관리 및 자동 현재가 계산

---

## 배경

출자금(신협·새마을금고 등 상호금융 조합원 출자)은 다음 특성을 가진다:
- 원금(출자금)은 고정 — 탈퇴 시 반환
- 배당률은 매년 AGM에서 결정, 사용자가 직접 입력
- 배당 수익은 비과세
- 배당은 원금에 재투자되지 않음 (단리 성격)
- 현재 가치 = 원금 + 지금까지 받은 배당 합계

---

## 데이터 모델

### `contribution_details` 수정

기존 `dividend_rate_bp` 컬럼 제거. `deposit_date`만 유지.

```sql
-- 기존 0036_add_contribution_details.sql 수정
CREATE TABLE contribution_details (
  asset_id    uuid PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  deposit_date date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

### 신규: `contribution_dividend_rates`

```sql
-- 신규 마이그레이션
CREATE TABLE contribution_dividend_rates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id    uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  year        integer NOT NULL,
  rate_bp     integer NOT NULL,  -- bp×100, e.g. 3.5% → 35000
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, year)
);
```

### Drizzle 스키마

- `db/schema/contribution-details.ts`: `dividendRateBp` 컬럼 제거
- `db/schema/contribution-dividend-rates.ts`: 신규 파일

---

## 계산 로직

### 현재 가치 (`currentValueKrw`)

```
currentValueKrw = principal + Σ(principal × rate_bp / 1_000_000)
```

- `principal` = `totalCostKrw` (트랜잭션 기반 원금, 기존 구조)
- 합산 대상: `year ≤ 현재연도`이고 rate가 입력된 연도만
- 미입력 연도는 제외 (배당 미결정 상태)

### 수익률

```
returnPct = (currentValueKrw - principal) / principal × 100
```

### `manual_valuations` 비사용

contribution 타입에 대해 `latestManualValuationKrw`를 더 이상 사용하지 않음.
자동계산이 완전히 대체.

---

## 서버 데이터 로딩 (`load-performances.ts`)

1. contribution 자산 id 목록 추출
2. `contribution_dividend_rates`를 `inArray(assetId, ids)` 일괄 조회
3. `Map<assetId, ContributionDividendRateRow[]>` 형태로 변환
4. `computeAssetPerformance` 호출 시 `contributionDividendRates` 파라미터로 전달

---

## 포트폴리오 계산 (`portfolio.ts`)

`computeAssetPerformance` contribution 분기 수정:

```typescript
if (holding.assetType === 'contribution') {
  const currentYear = new Date().getFullYear()
  const principal = holding.totalCostKrw
  const cumulativeDividends = (contributionDividendRates ?? [])
    .filter(r => r.year <= currentYear)
    .reduce((sum, r) => sum + Math.round(principal * r.rateBp / 1_000_000), 0)
  const currentValueKrw = principal + cumulativeDividends
  const returnPct = principal > 0
    ? ((currentValueKrw - principal) / principal) * 100
    : 0
  return { ...holding, currentValueKrw, returnPct, interestRateBp: null, ... }
}
```

`AssetPerformance`에 `contributionDividendRates` 필드 추가 (UI 표시용).

---

## UI 변경

### 신규 자산 등록 — Step 4 (출자 정보)

| 필드 | 입력값 | 저장 위치 |
|------|--------|-----------|
| 출자금액 (₩) | 숫자 | 트랜잭션 (initialPricePerUnit) |
| 출자일자 | 날짜 | contribution_details.deposit_date |
| 올해 배당률 (%) | 숫자, 선택 | contribution_dividend_rates (year=현재연도) |

### 자산 편집 — `asset-form.tsx`

contribution 타입일 때 **배당 이력** 섹션 추가:

- 기존 입력된 연도별 배당률 목록 표시
- `[+ 연도 추가]` 버튼 → 연도 + 배당률 입력 후 upsert
- 각 행에 삭제 버튼
- 저장은 자산 편집 저장과 동일 액션으로 처리 (batch upsert)

---

## 액션 / API 변경

### `app/actions/assets.ts`

- `createAsset`: contribution 타입이고 배당률 입력 시 `contribution_dividend_rates` INSERT
- `updateAsset`: `contributionDividendRates` 배열 받아 upsert (같은 연도 덮어쓰기) + 삭제된 행 DELETE

### `db/queries/contribution.ts`

- `getContributionDividendRates(ids: string[]): Map<string, ContributionDividendRateRow[]>`
- `upsertContributionDividendRate(assetId, year, rateBp)`
- `deleteContributionDividendRate(assetId, year)`

---

## 범위 외 (이번 구현에서 제외)

- 연도별 배당 수익 차트 (별도 이슈)
- 배당 지급일 추적
- 출자 증좌 발행 추적
