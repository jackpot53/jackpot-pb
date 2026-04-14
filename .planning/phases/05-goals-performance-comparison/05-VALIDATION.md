---
phase: 5
slug: goals-performance-comparison
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

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
| 05-01-01 | 01 | 0 | GOAL-01 | — | N/A | unit | `npx vitest run tests/goals` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | GOAL-01 | — | Goal owned by authenticated user only | unit | `npx vitest run tests/goals` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | GOAL-01 | — | achievement % correct | unit | `npx vitest run tests/goals/achievement` | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 2 | GOAL-01 | — | N/A | e2e-manual | See manual verifications | — | ⬜ pending |
| 05-02-01 | 02 | 1 | GOAL-02 | — | N/A | unit | `npx vitest run tests/goals/chart` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 2 | GOAL-02 | — | N/A | e2e-manual | See manual verifications | — | ⬜ pending |
| 05-03-01 | 03 | 1 | PERF-01 | — | N/A | unit | `npx vitest run tests/performance` | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 1 | PERF-02 | — | N/A | unit | `npx vitest run tests/performance` | ❌ W0 | ⬜ pending |
| 05-03-03 | 03 | 2 | PERF-01 | — | N/A | e2e-manual | See manual verifications | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/goals/goal-crud.test.ts` — stubs for GOAL-01 (create/edit/delete, achievement %)
- [ ] `tests/goals/goal-chart.test.ts` — stubs for GOAL-02 (progress chart data shape)
- [ ] `tests/performance/performance-table.test.ts` — stubs for PERF-01, PERF-02 (sort, filter)
- [ ] `npx shadcn add progress` — install missing Progress component
- [ ] Verify `sonner` toast or choose inline error display strategy

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Goal creation dialog opens, submits, closes without redirect | GOAL-01 | UI interaction flow | Open /goals, click Add Goal, fill form, submit — dialog should close and list updates |
| Goal progress chart renders with correct target line | GOAL-02 | Visual rendering | Navigate to /goals/{id}, verify chart shows portfolio value vs target amount line |
| Performance table sorts by return % descending by default | PERF-01 | Visual/interaction | Navigate to /performance, verify assets ordered highest to lowest return % |
| Asset type filter shows only matching holdings | PERF-02 | UI filter interaction | Click each tab (Stocks/Crypto/Savings/Real Estate), verify filtered results |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
