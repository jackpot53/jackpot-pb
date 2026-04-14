---
phase: 2
slug: asset-transaction-management
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-10
audited: 2026-04-13
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.3 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-02-01 | 02 | 0 | ASSET-02, ASSET-04 | — | N/A | unit | `npm test -- tests/holdings.test.ts` | ✅ exists | ✅ green |
| 02-01-xx | 01 | 1 | ASSET-01 | T-02-01 | auth check first, zod parse | integration | manual-only | N/A | ✅ manual UAT |
| 02-02-xx | 02 | 1 | ASSET-02 | T-02-01 | auth check first, zod parse | integration | manual-only | N/A | ✅ manual UAT |
| 02-04-xx | 04 | 2 | ASSET-03 | T-02-01 | auth check first, zod parse | integration | manual-only | N/A | ✅ manual UAT |
| 02-04-xx | 04 | 1 | ASSET-04 | — | WAVG unit tested | unit | `npm test -- tests/holdings.test.ts` | ✅ exists | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/holdings.test.ts` — WAVG pure function unit tests covering ASSET-02 and ASSET-04
  - Test cases: single buy, multiple buys (WAVG recalculate), partial sell (avg cost unchanged), buy-after-sell, all-voided (zero result), mixed void/non-void
  - **Status: 8/8 passing** (verified 2026-04-13)

*All other phase behaviors require a live Supabase connection and are manual-only.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Asset CRUD (create/edit/delete) | ASSET-01 | Requires live Supabase DB | Create asset via UI, verify in DB; edit fields; delete and confirm cascade |
| Transaction ledger | ASSET-02 | Requires live Supabase DB | Create buy/sell transactions; verify void/edit; confirm per-asset list |
| Manual valuation append-only | ASSET-03 | Requires live Supabase DB | Update real estate/savings value; confirm history preserved (no overwrites) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified 2026-04-13

---

## Validation Audit 2026-04-13

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 2 (Wave 0 tests already exist and pass) |
| Escalated | 0 |
| Manual-only | 3 (require live Supabase — covered by UAT) |
