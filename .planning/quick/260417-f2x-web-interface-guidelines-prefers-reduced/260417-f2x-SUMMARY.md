---
phase: quick
plan: 260417-f2x
subsystem: ui-accessibility
tags: [accessibility, prefers-reduced-motion, aria, transition]
dependency_graph:
  requires: []
  provides: [accessibility-motion-safe, aria-labels]
  affects: [sidebar, new-asset-form, transactions-page-client, goal-list-client, globals]
tech_stack:
  added: []
  patterns: [useReducedMotion hook, prefers-reduced-motion media query]
key_files:
  created: []
  modified:
    - app/globals.css
    - components/app/sidebar.tsx
    - components/app/new-asset-form.tsx
    - components/app/transactions-page-client.tsx
    - components/app/goal-list-client.tsx
decisions:
  - "worktree 버전(committed)의 sidebar.tsx와 layout.tsx는 MiniSlotMachine/SVG 씬/footer 애니메이션이 없는 이전 버전 — 해당 컴포넌트별 reducedMotion 처리는 생략 (불필요)"
  - "pre-existing TS 오류(new-asset-form.tsx ASSET_TYPE_ACTIVE 타입 불일치)는 이 플랜 범위 외 — 변경 없음"
metrics:
  duration: ~15min
  completed_date: "2026-04-17"
  tasks_completed: 2
  files_modified: 5
---

# Phase quick Plan 260417-f2x: Web Interface Guidelines prefers-reduced-motion Summary

Web Interface Guidelines 위반 5개 영역 수정 — `transition-all` 제거, `aria-label` 추가, `role=switch`, `prefers-reduced-motion` 전역/컴포넌트 처리.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | globals.css 전역 prefers-reduced-motion, transition-all 제거, aria 속성 | a452400 | app/globals.css, components/app/sidebar.tsx, components/app/new-asset-form.tsx |
| 2 | pagination aria-label, goal 애니메이션 reducedMotion 처리 | ee741c6 | components/app/transactions-page-client.tsx, components/app/goal-list-client.tsx |

## Changes Made

### app/globals.css
- 파일 끝에 `@media (prefers-reduced-motion: reduce)` 전역 규칙 추가 — 모든 요소의 animation/transition을 0.01ms로 단축

### components/app/sidebar.tsx
- `transition-all duration-300` → `transition-[width,border] duration-300` (aside 태그)
- 토글 버튼: `title` 속성 → `aria-label` 속성

### components/app/new-asset-form.tsx
- `transition-all duration-150` → `transition-colors duration-150` (tileClass, pillClass, 자산유형 버튼, 금융회사/거래소 버튼 — 전체 replace_all)
- autoRenew 토글 버튼: `role="switch"` + `aria-checked={form.watch('autoRenew') ?? false}` 추가

### components/app/transactions-page-client.tsx
- ChevronLeft 버튼: `aria-label="이전 페이지"` 추가
- ChevronRight 버튼: `aria-label="다음 페이지"` 추가
- 인라인 @keyframes 애니메이션 없음 (worktree committed 버전)

### components/app/goal-list-client.tsx
- `useReducedMotion()` 훅 파일 상단에 추가 (useState + useEffect import 확장)
- `GoalListClient` 컴포넌트 상단에 `const reducedMotion = useReducedMotion()` 추가
- `goal-bounce`, `goal-fadein` (2개) 애니메이션 style prop을 `reducedMotion ? {} : { animation: ... }` 형태로 변경

### app/(app)/layout.tsx
- worktree committed 버전에 footer 인라인 애니메이션 없음 — 변경 불필요

## Deviations from Plan

### Context Mismatch (Auto-handled)

**1. sidebar.tsx — MiniSlotMachine/SVG 씬 없음**
- **Found during:** Task 1
- **Issue:** 플랜은 main repo의 unstaged 버전(MiniSlotMachine, SVG 자연인 씬 포함)을 기준으로 작성됨. worktree committed 버전은 이전 단순 버전
- **Fix:** 해당 컴포넌트별 reducedMotion 처리 생략 (대상 코드 자체가 없음). 전역 CSS 규칙(globals.css)이 해당 케이스를 커버
- **Impact:** 기능상 동일 — 전역 @media 규칙이 모든 CSS transition/animation에 적용됨

**2. layout.tsx — footer 애니메이션 없음**
- **Found during:** Task 2
- **Issue:** worktree 버전에 footer-scan/footer-dot @keyframes 없음
- **Fix:** layout.tsx 변경 생략

**3. transactions-page-client.tsx — hero 배너 애니메이션 없음**
- **Found during:** Task 2
- **Issue:** worktree 버전에 tx-* @keyframes 없음
- **Fix:** pagination aria-label만 적용

## Verification Results

```
transition-all grep → 0 results (sidebar.tsx, new-asset-form.tsx) ✓
aria-label on sidebar toggle button ✓
role="switch" on autoRenew button ✓
aria-label on pagination buttons ✓
prefers-reduced-motion in globals.css ✓
reducedMotion in goal-list-client.tsx ✓
TypeScript errors: pre-existing only (new-asset-form.tsx ASSET_TYPE_ACTIVE type mismatch — out of scope)
```

## Known Stubs

None.

## Threat Flags

None — pure client-side accessibility/CSS changes, no new network surface.

## Self-Check: PASSED

- a452400 exists: confirmed
- ee741c6 exists: confirmed
- app/globals.css modified: confirmed (prefers-reduced-motion block added)
- components/app/sidebar.tsx: transition-[width,border] + aria-label confirmed
- components/app/new-asset-form.tsx: transition-colors + role=switch confirmed
- components/app/transactions-page-client.tsx: aria-label on both pagination buttons confirmed
- components/app/goal-list-client.tsx: useReducedMotion hook + 3 reducedMotion-guarded styles confirmed
