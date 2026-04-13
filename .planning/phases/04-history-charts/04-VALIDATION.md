---
phase: 4
slug: history-charts
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (to be installed in Wave 0) |
| **Config file** | none — Wave 0 installs vitest |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` for the specific module changed
- **After every plan wave:** Run `npx vitest run` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | CHART-03 | T-04-01 | Cron route returns 401 without valid CRON_SECRET | unit | `npx vitest run tests/cron-snapshot.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 0 | CHART-03 | — | Duplicate snapshot on same date is a no-op | unit | `npx vitest run tests/snapshot-writer.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | CHART-03 | — | Cron route returns 200 with valid CRON_SECRET | unit | `npx vitest run tests/cron-snapshot.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | CHART-01 | — | Annual aggregation computes correct YoY % | unit | `npx vitest run tests/snapshot-aggregation.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | CHART-02 | — | Monthly aggregation returns last-per-month for trailing 12 months | unit | `npx vitest run tests/snapshot-aggregation.test.ts` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | CHART-01 | — | Charts page renders InsufficientDataMessage when < 2 snapshots | manual | manual render check | N/A | ⬜ pending |
| 04-03-02 | 03 | 2 | CHART-02 | — | Charts page renders with snapshot data (no API calls) | manual | manual render check | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/cron-snapshot.test.ts` — stubs for CHART-03 (auth 401, auth 200)
- [ ] `tests/snapshot-writer.test.ts` — stubs for CHART-03 idempotency
- [ ] `tests/snapshot-aggregation.test.ts` — stubs for CHART-01 and CHART-02 aggregation logic
- [ ] `npm install --save-dev vitest @vitejs/plugin-react` — install vitest (no test framework yet detected)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Charts page renders annual AreaChart with gradient and correct labels | CHART-01 | Visual rendering requires browser | Navigate to /charts, select 연간 tab, verify AreaChart renders with year labels and return % values |
| Charts page renders monthly AreaChart with KRW values | CHART-02 | Visual rendering requires browser | Navigate to /charts, select 월간 tab, verify AreaChart renders with month labels (25.04 format) and KRW compact values |
| "데이터 수집 중" message shown when no snapshots exist | CHART-01/02 | Requires empty DB state | Clear portfolio_snapshots table, navigate to /charts, verify message shown |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
