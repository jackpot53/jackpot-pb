# Page Skeleton Loading Design

## Goal

모든 `(app)` 라우트에 페이지 진입 시 즉시 보이는 skeleton loading UI를 추가한다. 실제 콘텐츠 레이아웃과 동일한 형태로 shimmer 처리하여 사용자가 로딩 중임을 직관적으로 인지하게 한다.

## Approach: Hybrid (C)

- 각 페이지마다 `loading.tsx`를 추가 — 페이지 진입 시 전체 레이아웃 skeleton 즉시 표시
- 기존 Suspense 경계는 유지 — 느린 섹션에 대한 세분화된 로딩은 현행 그대로

## Scope

| 페이지 | 파일 | 현황 | 작업 |
|--------|------|------|------|
| 대시보드 | `app/(app)/loading.tsx` | spinner 있음 | skeleton으로 교체 |
| 자산 목록 | `app/(app)/assets/loading.tsx` | 없음 | 신규 생성 |
| 차트 | `app/(app)/charts/loading.tsx` | 없음 | 신규 생성 |
| 목표 | `app/(app)/goals/loading.tsx` | 없음 | 신규 생성 |
| 거래내역 | `app/(app)/transactions/loading.tsx` | 없음 | 신규 생성 |

`assets/[id]`, `assets/new`, `assets/[id]/edit`는 폼 페이지로 단순하여 제외.

## Skeleton Layout per Page

### 대시보드 (/)
- Hero 배너 skeleton (그라데이션 보존 + 내부 텍스트 shimmer)
- 통계 카드 4개 (라벨 + 값 + 서브텍스트)
- 2-column 하단: 파이차트 skeleton + 자산 목록 skeleton

### 자산 목록 (/assets)
- Hero 배너 skeleton (teal 그라데이션)
- 미니 통계 카드 3개
- 자산 테이블 행 4개 (타입 뱃지 + 이름/설명 + 금액)

### 차트 (/charts)
- Hero 배너 skeleton (slate-violet 그라데이션)
- 2×2 차트 카드 그리드 (제목 + 차트 영역 100px)

### 목표 (/goals)
- Hero 배너 skeleton (blue 그라데이션)
- 미니 통계 카드 3개
- 목표 항목 3개 (아이콘 + 이름 + 프로그레스 바)

### 거래내역 (/transactions)
- Hero 배너 skeleton (teal-blue 그라데이션)
- 필터 칩 3개
- 거래 행 4개 (원형 아이콘 + 이름/날짜 + 금액/타입)

## Implementation Rules

- `components/ui/skeleton.tsx`의 기존 `<Skeleton>` 컴포넌트 사용
- Hero 배너는 실제 그라데이션 배경을 유지하고 내부 텍스트만 shimmer 처리
- `animate-pulse`는 Tailwind 기본 클래스 사용
- 각 `loading.tsx`는 독립적인 파일, 공유 컴포넌트 추출 없음 (페이지별 레이아웃이 다름)
