# Responsive Design Spec

**Date:** 2026-04-17  
**Scope:** 전체 앱 반응형 지원 (PC + 모바일)  
**Approach:** 기존 레이아웃 구조 유지, 점진적 수정

---

## Goals

- 모바일(< 640px), 태블릿(640~1023px), 데스크톱(≥ 1024px) 모두에서 정상 사용 가능
- 기존 슬롯머신 애니메이션, 씬 애니메이션 등 커스텀 UI 요소 유지
- Tailwind 기본 브레이크포인트 사용: `sm` = 640px, `lg` = 1024px

---

## Breakpoints

| Name | Range | Layout |
|------|-------|--------|
| mobile | < 640px | 사이드바 드로어, 1열 그리드 |
| tablet | 640px – 1023px | 사이드바 드로어, 2열 그리드 |
| desktop | ≥ 1024px | 기존 사이드바 (collapse/expand), 다열 그리드 |

---

## Section 1: Layout & Sidebar

### `app/(app)/layout.tsx`
- `w-[1280px] mx-auto` → `w-full max-w-[1280px] mx-auto px-4`
- 사이드바가 모바일에서 오버레이로 올라오도록 구조 수정
- `overflow-hidden` 유지

### `components/app/sidebar.tsx`
- `lg` 미만: `fixed inset-y-0 left-0 z-50` 드로어 모드, 기본 hidden
- `lg` 이상: 기존 collapsed(`w-14`) / expanded(`w-60`) 동작 유지
- 드로어 열릴 때 배경 오버레이(`bg-black/50`) 추가, 클릭 시 닫힘
- 드로어 열기/닫기 상태: `isMobileOpen` boolean (헤더와 공유 필요 → context 또는 prop drilling)

### `components/app/header.tsx`
- 좌측에 햄버거 버튼 추가 (`lg:hidden`)
- 클릭 시 사이드바 드로어 `isMobileOpen` toggle

**상태 공유 방법:** layout.tsx에서 `isMobileOpen` 상태 관리, sidebar와 header에 props로 전달

---

## Section 2: Page-level Content

### Dashboard (`app/(app)/page.tsx`)
- 통계 카드: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- 자산 배분 + 목표: `grid-cols-1 lg:grid-cols-2`
- 차트 섹션: `grid-cols-1 lg:grid-cols-2`

### Assets (`app/(app)/assets/page.tsx`)
- 카드 그리드: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- 필터/검색 바: 모바일에서 세로 스택 (`flex-col sm:flex-row`)

### Transactions (`app/(app)/transactions/page.tsx`)
- 테이블 일부 컬럼: 모바일 숨김 (`hidden sm:table-cell`)
- 필터: 모바일에서 접기/펼치기 토글

### Charts (`app/(app)/charts/page.tsx`)
- 차트 그리드: `grid-cols-1 lg:grid-cols-2`
- 각 차트 최소 높이: `min-h-[200px]`

### Goals (`app/(app)/goals/page.tsx`)
- 목표 카드: `grid-cols-1 sm:grid-cols-2`

### Skeleton loaders (`loading.tsx` files)
- 각 페이지 로딩 스켈레톤에 동일 그리드 브레이크포인트 적용

---

## Section 3: Header & Details

### `components/app/header.tsx`
- 모바일: `[햄버거] [로고/타이틀] [유저 아이콘]`
- 태블릿+: TickerBand 표시 (`hidden sm:block`)
- 데스크톱: 현재와 동일 (이메일 표시 등)

### Login page (`app/login/page.tsx`)
- 카드 컨테이너: `w-full max-w-sm mx-auto px-4`

### Asset detail / form pages
- 폼 컨테이너: `w-full max-w-2xl mx-auto px-4`
- 캔들스틱 차트 높이: `h-48 sm:h-64 lg:h-80`

---

## Out of Scope

- 모바일 전용 기능 추가 (터치 제스처, 스와이프 등)
- PWA / 오프라인 지원
- 증권사 스크래핑 등 데이터 입력 방식 변경
