# 계정 유형별 차트 추가 (Charts Page)

## Goal

`charts` 페이지 "자산 배분" 도넛 차트 아래에 "계정 유형별 배분" 도넛 차트를 추가한다. 사용자는 자산이 어느 계정 (ISA, IRP, 연금저축 등)에 얼마나 들어 있는지 한눈에 파악할 수 있다.

## Scope

### 포함 대상 계정 유형 (상위 8종만)

| key | 라벨 |
|---|---|
| `isa` | ISA |
| `irp` | IRP |
| `pension` | 연금저축 |
| `dc` | DC |
| `brokerage` | 위탁 |
| `spot` | 현물 |
| `cma` | CMA |
| `insurance` | 보험 |

### 제외

- `accountType === null` 자산 (부동산, 출자금 등) — 차트에 포함하지 않음
- 기관형 account_type (`bank_*`, `fund_*`, `upbit`, `ins_*` 등) — 이번 스펙에서 제외
- 해당 계정 유형에 속하는 자산이 0개 → 섹션 전체 숨김 (자산 배분 차트와 동일 패턴)

## Design

### 1. 데이터 집계 (서버 컴포넌트)

`app/(app)/charts/page.tsx`의 `ChartsPageContent` 내부에서 기존 `performances` 배열을 한 번 더 그룹핑. 추가 DB 쿼리 없음.

집계 로직은 기존 자산 배분과 동일 패턴:
- `ACCOUNT_TYPE_ORDER` 상수로 순서 고정
- 각 계정 유형별 `currentValueKrw || totalCostKrw` 합계
- 전체 대비 퍼센트 계산
- 금액 > 0 인 항목만 포함 후 퍼센트 내림차순 정렬

전체 합계(`totalValue`)는 자산 배분 차트와 분리: 계정 유형별 합계(`accountTotalValue`)는 8종 계정에 속하는 자산만으로 다시 계산. 퍼센트 분모가 서로 다르므로 주의.

### 2. 컴포넌트 리팩터

현 `PortfolioRadialChart`는 `ASSET_TYPE_LABELS` / `ASSET_TYPE_COLORS` / 중앙 라벨 ("총 자산", "N개 자산군")을 내부 하드코딩하고 있어 재사용 불가.

**리팩터 방향:** props로 label map, color map, 중앙 라벨(title/subtitle)을 받도록 일반화.

```tsx
interface PortfolioRadialChartProps {
  allocations: AllocationItem[]
  totalValueKrw: number
  labels: Record<string, string>
  colors: Record<string, string>
  centerTitle?: string    // default "총 자산"
  centerSubtitle?: string // default "자산군"
}
```

자산 배분 차트는 기존과 동일하게 작동 (기본값으로), 계정 차트는 새 map을 주입해 재사용.

### 3. 색상 팔레트 (보라 → 연두 그라데이션)

자산 차트의 다색 팔레트와 시각적으로 구분되도록 계정 차트는 보라/핑크/연두 계열로 통일.

| key | color | tailwind |
|---|---|---|
| `isa` | `#8b5cf6` | violet-500 |
| `irp` | `#a855f7` | purple-500 |
| `pension` | `#d946ef` | fuchsia-500 |
| `dc` | `#ec4899` | pink-500 |
| `brokerage` | `#84cc16` | lime-500 |
| `spot` | `#22c55e` | green-500 |
| `cma` | `#10b981` | emerald-500 |
| `insurance` | `#14b8a6` | teal-500 |

### 4. 섹션 헤더 & 레이아웃

자산 배분 카드 바로 아래에 동일한 카드 구조로 추가:

```tsx
<h2>
  <Wallet className="h-4 w-4 text-violet-500" />계정 유형별
</h2>
<Card>
  <CardContent>
    <PortfolioRadialChart
      allocations={accountAllocations}
      totalValueKrw={accountTotalValue}
      labels={ACCOUNT_TYPE_LABELS}
      colors={ACCOUNT_TYPE_COLORS}
      centerSubtitle="계정"
    />
  </CardContent>
</Card>
```

아이콘: `Wallet` (lucide-react).

### 5. 상수 배치

`ACCOUNT_TYPE_LABELS`, `ACCOUNT_TYPE_COLORS`, `ACCOUNT_TYPE_ORDER`는 `app/(app)/charts/page.tsx` 내부에 배치. 다른 곳에서 재사용 예정 없음 (assets 페이지는 이미 자체 라벨 맵을 사용 중이고 값이 다를 수 있음).

## Edge Cases

- 포함 대상 계정 유형 자산이 0개 → 섹션 숨김
- 자산 배분 차트만 존재할 수도 있음 (이전과 동일하게 표시)
- 기존 자산 배분 차트는 렌더링/동작 변화 없음 (리팩터된 컴포넌트가 기본값으로 동일하게 동작해야 함)

## Non-goals

- 기관형 account_type (은행/증권사/거래소/보험사) 차트
- 계정 유형 내부 드릴다운 (ISA 안의 종목 목록 등)
- null accountType 자산의 "기타" 버킷
- 시계열 차트
