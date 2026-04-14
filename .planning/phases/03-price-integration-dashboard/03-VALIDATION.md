---
phase: 3
slug: price-integration-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | PRICE-01 | — | API keys server-side only | unit | `npx vitest run src/lib/price/` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | PRICE-01 | — | Finnhub returns price for US tickers | unit | `npx vitest run src/lib/price/finnhub` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | PRICE-02 | — | Stale fallback returned when API fails | unit | `npx vitest run src/lib/price/cache` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | PRICE-01 | — | BOK FX stat code returns USD/KRW rate | integration | `npx vitest run src/lib/price/bok` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | DASH-01 | — | LIVE assets use priceCache, MANUAL use manualValuations | unit | `npx vitest run src/lib/portfolio/` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | DASH-01 | — | Return % formula matches D-15/D-16 spec | unit | `npx vitest run src/lib/portfolio/compute` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 3 | DASH-02 | — | Dashboard renders total value and allocation pie | manual | — | — | ⬜ pending |
| 03-03-02 | 03 | 3 | DASH-03 | — | KRW and USD shown simultaneously | manual | — | — | ⬜ pending |
| 03-04-01 | 04 | 3 | DASH-04 | — | Per-asset table sortable by column | manual | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/price/__tests__/finnhub.test.ts` — stubs for PRICE-01 (Finnhub adapter)
- [ ] `src/lib/price/__tests__/cache.test.ts` — stubs for PRICE-02 (stale fallback)
- [ ] `src/lib/price/__tests__/bok.test.ts` — stubs for PRICE-01 (BOK FX integration)
- [ ] `src/lib/portfolio/__tests__/compute.test.ts` — stubs for DASH-01 (portfolio math)
- [ ] `vitest` install — if not already in package.json

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard renders allocation pie chart with correct data | DASH-02 | React chart rendering requires browser | Load dashboard, verify pie chart shows asset-type breakdown |
| KRW and USD values shown side-by-side | DASH-03 | Visual layout verification | Load dashboard, verify both currency columns visible |
| Per-asset table sorts by return % descending | DASH-04 | UI interaction | Click return % column header, verify sort order |
| Stale price indicator shown with timestamp | PRICE-02 | Requires simulated API failure | Force API failure in dev, verify stale badge appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
