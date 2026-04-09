---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.3 |
| **Config file** | `vitest.config.ts` — does not exist yet (Wave 0 installs) |
| **Quick run command** | `npx vitest run tests/middleware.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/middleware.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-02-01 | 01-02 | 1 | — | — | Schema exports all 7 tables | smoke | `npx vitest run tests/schema.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-01 | 01-03 | 2 | AUTH-01 | T-1-01 / — | Email/password login returns session | manual | Manual — requires Supabase network | ❌ N/A | ⬜ pending |
| 1-03-02 | 01-03 | 2 | AUTH-01 | T-1-02 / — | Session persists across navigation | manual | Manual — open browser, navigate, refresh | N/A | ⬜ pending |
| 1-03-03 | 01-03 | 2 | AUTH-02 | T-1-03 / — | Logout invalidates session | manual | Manual — requires Supabase network | ❌ N/A | ⬜ pending |
| 1-03-04 | 01-03 | 2 | AUTH-02 | T-1-04 / — | Unauthenticated → redirects to /login | unit | `npx vitest run tests/middleware.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-05 | 01-03 | 2 | AUTH-02 | T-1-05 / — | Redirect preserves ?redirect= param | unit | `npx vitest run tests/middleware.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — framework config with jsdom environment
- [ ] `tests/middleware.test.ts` — covers middleware redirect logic (REQ AUTH-01, AUTH-02); mock `getUser()` responses
- [ ] `tests/schema.test.ts` — smoke test that Drizzle schema exports all 7 table definitions without error

*(No existing test infrastructure — full Wave 0 setup required)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email/password login succeeds and returns authenticated session | AUTH-01 | Requires live Supabase network connection | Open browser, submit valid credentials, verify redirect to app |
| Session persists across page navigations | AUTH-01 | Requires real browser cookie handling | Navigate between pages, refresh — user should remain logged in |
| Logout invalidates session and redirects to /login | AUTH-02 | Requires live Supabase network connection | Click logout, verify redirect and that protected routes block access |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
