---
phase: 02-asset-transaction-management
plan: "04"
subsystem: ui
tags: [next.js, drizzle, supabase, react-hook-form, zod, server-actions]

# Dependency graph
requires:
  - phase: 02-asset-transaction-management/02-01
    provides: Asset schema with priceType enum (live/manual), asset detail page skeleton
  - phase: 02-asset-transaction-management/02-03
    provides: Transactions tab wired on asset detail page; Tabs layout established
provides:
  - getValuationsByAsset Drizzle query helper (db/queries/manual-valuations.ts)
  - createManualValuation Server Action — INSERT-only, append-only per D-06/D-09
  - OverviewTab client component with conditional valuation section for manual assets
  - 개요 tab fully wired on asset detail page — replaces placeholder stub
affects:
  - phase-03 (portfolio valuation needs current manual asset values from manual_valuations table)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Append-only INSERT pattern: server action calls db.insert() only, never update/delete"
    - "Conditional UI sections by priceType: isManual = asset.priceType === 'manual'"
    - "useTransition for async server action calls in client forms (non-blocking)"
    - "form.setError('root', ...) for server-side error propagation to client form"

key-files:
  created:
    - db/queries/manual-valuations.ts
    - app/actions/manual-valuations.ts
    - components/app/overview-tab.tsx
  modified:
    - app/(app)/assets/[id]/page.tsx

key-decisions:
  - "ManualValuation is INSERT-only per D-06/D-09 — createManualValuation never calls db.update() or db.delete()"
  - "getValuationsByAsset fetched for all assets (not just manual) — Drizzle returns empty array for live assets, avoids conditional fetch logic in page"

patterns-established:
  - "requireUser() called as first operation in every Server Action (auth gate pattern)"
  - "ValuationFormValues schema duplicated in client component for form validation parity with server"

requirements-completed: [ASSET-01, ASSET-03]

# Metrics
duration: 12min
completed: 2026-04-10
---

# Phase 2 Plan 04: Manual Valuations Summary

**Append-only manual valuation workflow (savings/real_estate) wired into 개요 tab: INSERT-only Server Action, Drizzle query helper, and OverviewTab client component with conditional valuation history**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-10T03:00:00Z
- **Completed:** 2026-04-10T03:12:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `getValuationsByAsset` query helper returns all valuations for an asset sorted descending by valued_at/createdAt
- `createManualValuation` Server Action validates inputs with zod, converts USD→KRW via exchange rate, and calls `db.insert(manualValuations)` only — never update or delete (D-06/D-09)
- `OverviewTab` component conditionally renders valuation section for `priceType === 'manual'` assets; live assets see metadata only
- 개요 tab fully wired on asset detail page (stub `개요 준비 중...` replaced)
- All UI copy matches UI-SPEC copywriting contract exactly

## Task Commits

1. **Task 1: createManualValuation Server Action and getValuationsByAsset query helper** - `81c4437` (feat)
2. **Task 2: OverviewTab component and wire 개요 tab on asset detail page** - `a2a7a0c` (feat)

## Files Created/Modified

- `db/queries/manual-valuations.ts` — getValuationsByAsset Drizzle query helper
- `app/actions/manual-valuations.ts` — createManualValuation Server Action (INSERT-only)
- `components/app/overview-tab.tsx` — Client component with metadata grid + conditional valuation section
- `app/(app)/assets/[id]/page.tsx` — Wired OverviewTab; added getValuationsByAsset fetch; replaced stub

## Decisions Made

- `getValuationsByAsset` is fetched unconditionally for all assets rather than only for manual ones — simplifies page data fetching and Drizzle returns an empty array for live assets, so there is no wasted work in the common case.
- Schema duplication for valuation zod schema between client and server action is intentional — client-side form validation parity eliminates unnecessary round-trips for basic input errors.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Existing Supabase and DATABASE_URL environment variables are sufficient.

## Known Stubs

None — all data is fully wired. OverviewTab receives real ManualValuation rows from getValuationsByAsset.

## Threat Surface

No new network endpoints or auth paths introduced beyond those in the threat model. createManualValuation is a Server Action protected by requireUser() (T-02-04-S). All DB writes are parameterized INSERT via Drizzle (T-02-04-T).

## Next Phase Readiness

- Manual valuation data is now available in `manual_valuations` table for Phase 3 portfolio valuation computation
- `getValuationsByAsset` can be reused by Phase 3 to fetch the latest valuation for current portfolio value
- No blockers

---
*Phase: 02-asset-transaction-management*
*Completed: 2026-04-10*
