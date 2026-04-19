# 출자금 신규 생성 폼 — 출자 일자 & 연도별 배당률 입력

## 배경

출자금(`contribution`) 자산을 새로 등록할 때 출자 일자와 연도별 배당률을 한 번에 입력하고 싶다. 현재는 편집 페이지(`/assets/[id]/edit`)에서만 배당 이력을 관리할 수 있고, 신규 생성 폼에서는 배당률 입력 UI가 없다.

## 요구사항

- 신규 생성 폼에서 출자금 타입 선택 시 출자 일자와 연도별 배당률 입력 섹션을 표시
- 출자 일자 입력 시 `depositYear + 1`부터 현재 연도까지 배당률 행 자동 생성
- 출자 일자 변경 시 연도 목록 재계산, 동일 연도의 기존 입력값은 보존
- 배당률 입력은 선택 사항 — 미입력 연도는 저장 시 스킵
- 자산 생성과 배당률 저장이 원자적으로 처리됨 (createAsset 액션 내)

## 스키마 변경

### `AssetFormValues` (`app/actions/assets.ts`)

```ts
contributionDividendRates: z.array(z.object({
  year: z.number().int(),
  ratePct: z.string(),
})).optional().nullable()
```

기존 `interestRatePct` 단일 저장 로직 제거, 배열 전체로 대체.

## UI 구조 (`NewAssetForm`)

출자금 타입 선택 시 "초기 매수 내역" 섹션 레이블을 "초기 출자 내역"으로 변경하고 아래 필드를 표시:

**초기 출자 내역 섹션**
- 출자 일자 (`depositStartDate`) — date input
- 출자 금액 (`initialPricePerUnit`) — amount input (KRW)

**연도별 배당률 섹션** (출자 일자 입력 후 표시)
- `depositYear + 1`부터 현재 연도까지 각 연도별 배당률 입력 행
- 출자 일자 미입력 시: "출자 일자를 입력하면 연도 행이 자동 생성됩니다" 안내 문구
- 출자 일자 변경 시 연도 목록 재계산, 기존 입력값 유지

## 데이터 흐름

1. 사용자가 폼 제출 → `createAsset(data)` 호출
2. `createAsset`에서 `contributionDividendRates` 배열 순회
3. `ratePct`가 유효한 숫자이고 비어있지 않은 항목만 `contributionDividendRates` 테이블에 INSERT
4. 기존 `interestRatePct` 기반 단일 저장 로직 제거

## 영향 범위

- `app/actions/assets.ts` — 스키마, `createAsset` contribution 처리 로직
- `components/app/new-asset-form.tsx` — 출자금 타입 시 UI 분기
- `components/app/asset-form.tsx` (편집용) — 변경 없음
- `app/(app)/assets/new/page.tsx` — 변경 없음
