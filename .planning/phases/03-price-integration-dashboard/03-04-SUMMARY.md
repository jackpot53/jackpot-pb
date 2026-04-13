---
phase: "03"
plan: "04"
subsystem: performance-table
tags: [dashboard, performance-table, sortable, stale-badge, client-component, ui]
one_liner: "Sortable per-asset PerformanceTable client component wired into dashboard, replacing Row 3 placeholder"

dependency_graph:
  requires:
    - Plan 03-01: components/app/stale-price-badge.tsx → StalePriceBadge
    - Plan 03-02: lib/portfolio.ts → AssetPerformance, formatKrw, formatReturn, formatQty
    - Plan 03-03: components/app/asset-type-badge.tsx → AssetTypeBadge
    - Plan 03-03: app/(app)/page.tsx → dashboard page with performances: AssetPerformance[]
  provides:
    - components/app/performance-table.tsx → PerformanceTable (client component)
  affects:
    - app/(app)/page.tsx: Row 3 placeholder replaced with live PerformanceTable

tech_stack:
  added: []
  patterns:
    - React useState for client-side sort state (no server round-trips)
    - Next.js Server→Client Date serialization normalization (cachedAt: Date|string|null)
    - buttonVariants + Link instead of Button asChild (base-ui Button has no asChild support)

key_files:
  created:
    - components/app/performance-table.tsx
  modified:
    - app/(app)/page.tsx

decisions:
  - "buttonVariants({ variant: 'outline' }) applied to Link directly — base-ui Button does not support asChild prop (TypeScript error TS2322)"
  - "SerializedAssetPerformance type created: cachedAt accepts Date|string|null to handle Next.js Server→Client ISO string serialization"
  - "SortIcon rendered as nested function (not component) to avoid stale closure on sortKey/sortDir state"

metrics:
  duration_minutes: 8
  completed_date: "2026-04-13"
  tasks_completed: 2
  tasks_total: 3
  files_created: 1
  files_modified: 1
---

# Phase 03 Plan 04: Performance Table Summary

Sortable per-asset PerformanceTable client component wired into dashboard, replacing Row 3 placeholder.

## What Was Built

### Task 1: PerformanceTable client component

**`components/app/performance-table.tsx`** — `'use client'` component with:

- **Sort state:** `useState<SortKey>('returnPct')` + `useState<SortDir>('desc')` — default sort is return % descending per D-13.
- **Sortable columns:** `avgCostPerUnit`, `currentPriceKrw`, `currentValueKrw`, `returnPct`. Click toggles direction; switching columns resets to descending.
- **Sort indicator:** `ChevronDown`/`ChevronUp` from lucide-react rendered inline in active column header. Sort state label ("수익률 순", "평가금액 순", etc.) shown right-aligned at 14px muted text above the table.
- **7 columns:** 종목명 | 유형 | 수량 | 평단가(KRW) | 현재가 | 평가금액(KRW) | 수익률(%)
- **현재가 cell:** LIVE stale → value + `StalePriceBadge`; MANUAL → value only (no badge).
- **수익률 color coding:** `text-emerald-600` positive, `text-red-600` negative, `text-muted-foreground` zero.
- **수량:** monospace font, crypto up to 8 decimals, others integer.
- **Empty state:** "보유 종목이 없습니다" + body copy + `Link` styled with `buttonVariants({ variant: 'outline' })` → `/assets/new`.
- **Date serialization:** `SerializedAssetPerformance` type accepts `cachedAt: Date | string | null` to handle Next.js App Router Server→Client ISO string conversion.

### Task 2: Wire PerformanceTable into dashboard page

**`app/(app)/page.tsx`** — Row 3 placeholder (`<p>로딩 중...</p>`) replaced with:
```tsx
<PerformanceTable rows={performances} />
```

`performances: AssetPerformance[]` is already computed in the async Server Component body from Plan 03-03. No additional data fetching needed.

### Task 3: Human Verification Checkpoint (PENDING)

Awaiting human verification of sort behavior and visual correctness at http://localhost:3000/.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Button asChild prop not supported by base-ui Button**
- **Found during:** Task 1 (TypeScript compile)
- **Issue:** Plan code uses `<Button variant="outline" asChild><Link href="/assets/new">...</Link></Button>`. The `Button` component wraps `@base-ui/react/button` which has no `asChild` prop — TypeScript error TS2322.
- **Fix:** Changed to `<Link href="/assets/new" className={buttonVariants({ variant: 'outline' })}>자산 추가</Link>`. Visually identical.
- **Files modified:** `components/app/performance-table.tsx`
- **Commit:** 1ddba49

## Known Stubs

None — all functionality is implemented. Human checkpoint (Task 3) is pending user approval.

## Threat Flags

All trust boundaries from the plan's threat model are correctly addressed:
- **T-03-04-S** (Spoofing): Page is inside `app/(app)/layout.tsx` auth boundary — `requireUser()` protection inherited.
- **T-03-04-I** (Information Disclosure): `AssetPerformance[]` props contain only pre-computed portfolio data; no API keys, secrets, or cross-user data.
- **T-03-04-T** (Tampering): Client-side sort is cosmetic array reordering (useState) — no DB writes triggered.
- **T-03-04-D** (DoS): Single-user app; realistic holdings count under 100; no virtualization needed.

No new security surface introduced beyond the plan's threat model.

## Self-Check: PASSED

Files verified:
- components/app/performance-table.tsx: FOUND
- app/(app)/page.tsx: FOUND (PerformanceTable imported and rendered in Row 3)

Commits verified:
- 1ddba49: feat(03-04): PerformanceTable client component with sortable columns and stale badge — FOUND
- 925d89f: feat(03-04): wire PerformanceTable into dashboard page Row 3 — FOUND

TypeScript: `npx tsc --noEmit` exits clean.
Next.js build: passes without errors.
