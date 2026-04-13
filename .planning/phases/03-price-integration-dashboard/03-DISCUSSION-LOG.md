# Phase 3: Price Integration & Dashboard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-13
**Phase:** 03-price-integration-dashboard
**Mode:** discuss (interactive + Claude recommendations)

## Gray Areas Identified

| Area | Discussed | Resolution |
|------|-----------|------------|
| Price refresh strategy | User | On-demand + 5-min TTL |
| Korean stock (KRX) API coverage | Claude recommendation | Finnhub attempt + stale fallback |
| Chart library | Claude recommendation | recharts |
| Dashboard layout | Claude recommendation | 3-section: stat cards / pie+breakdown / table |

## User Decisions

### Price refresh strategy
- **Q:** When should stock/crypto prices refresh?
- **A:** On-demand with TTL cache (user selected)
- **Q:** What TTL before fetching fresh prices?
- **A:** 5 minutes (user selected)

## Claude Recommendations (user delegated)

### Korean stock (KRX) API coverage
- **Recommendation:** Finnhub attempt + stale fallback if no data returned. No additional KRX API added in Phase 3. Research agent to verify actual free-tier KRX coverage.
- **Reason:** Avoids premature API proliferation; stale fallback is already required by PRICE-02 anyway.

### Chart library
- **Recommendation:** recharts
- **Reason:** Most mature React chart library with TypeScript support; covers Phase 3 pie chart and Phase 4 line charts without switching libraries.

### Dashboard layout
- **Recommendation:** 3-section structure — stat cards row (top) / pie chart + breakdown (middle) / per-asset table (bottom)
- **Reason:** Progressive detail — most important numbers first, allocation context second, detailed drill-down last. Matches existing shadcn Card + Table patterns.

### Exchange rate (BOK FX)
- **Recommendation:** BOK OpenAPI, cached in priceCache as 'USD_KRW' with 1-hour TTL
- **Reason:** Phase 2 explicitly deferred BOK FX to Phase 3; this closes that deferred item.

## No Corrections Applied

User delegated remaining areas — no corrections needed.
