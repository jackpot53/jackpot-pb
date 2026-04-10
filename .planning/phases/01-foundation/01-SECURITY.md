---
phase: 01
slug: foundation
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-10
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| env vars → runtime | Secrets in .env.local must never be committed or exposed to browser | SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL |
| NEXT_PUBLIC_ prefix | Values prefixed NEXT_PUBLIC_ are bundled into client JS — only non-secret values allowed | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY |
| DATABASE_URL → Supabase | Direct PostgreSQL connection — credentials in .env.local, never in source code | PostgreSQL credentials |
| Drizzle client → Server only | db/index.ts must never be imported in Client Components | DATABASE_URL would be exposed |
| Browser → /login Server Action | Login credentials cross from untrusted browser to server | email, password |
| Middleware → Supabase Auth | getUser() validates session token against Supabase servers on every request | JWT token |
| Session cookie → Browser | httpOnly cookies managed by @supabase/ssr — not accessible to JavaScript | session token |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-1-S-01a | Spoofing | SUPABASE_SERVICE_ROLE_KEY | mitigate | Never use NEXT_PUBLIC_ prefix; excluded from git via .env* gitignore rule | closed |
| T-1-I-01 | Information Disclosure | .env.local | mitigate | .gitignore line 34: `.env*` covers .env.local; .env.local.example committed with placeholder values only | closed |
| T-1-I-02 | Information Disclosure | vercel.json | accept | No secrets in vercel.json; empty crons array placeholder | closed |
| T-1-I-03 | Information Disclosure | db/index.ts | mitigate | Server-only file; Next.js build boundary enforces no client import; no 'use client' component imports it | closed |
| T-1-T-01 | Tampering | Transaction records | mitigate | D-05 is_voided: `isVoided: boolean('is_voided').notNull().default(false)` in transactions schema | closed |
| T-1-T-02 | Tampering | ManualValuation records | mitigate | D-06 append-only: no updatedAt column; file comment documents INSERT-only intent | closed |
| T-1-D-01 | Denial of Service | db/index.ts postgres() | accept | Single-user app; Supabase connection pool (max:1) provides natural throttling | closed |
| T-1-S-01b | Spoofing | Session validation | mitigate | middleware.ts calls getUser() (not getSession()) — server-side token validation on every request | closed |
| T-1-S-02 | Spoofing | Login form | mitigate | signInWithPassword against Supabase bcrypt hashes; built-in Supabase rate limiting | closed |
| T-1-T-01b | Tampering | Session cookie | mitigate | @supabase/ssr propagates httpOnly + Secure options in setAll callbacks | closed |
| T-1-R-01 | Repudiation | Authentication events | accept | Single-user app; Supabase Auth dashboard logs login events for v1 | closed |
| T-1-I-01b | Information Disclosure | Login error messages | accept | Undifferentiated Korean error — does not reveal whether email or password was wrong | closed |
| T-1-I-02b | Information Disclosure | NEXT_PUBLIC_ env vars | accept | Anon key + URL are intentionally public per Supabase design; service role key is server-only | closed |
| T-1-D-01b | Denial of Service | Login form brute force | mitigate | Supabase Auth built-in rate limiting on signInWithPassword | closed |
| T-1-E-01 | Elevation of Privilege | Unauthenticated route access | mitigate | Middleware matcher covers all non-static routes; updateSession redirects unauthenticated to /login | closed |
| T-1-E-02 | Elevation of Privilege | Session fixation | mitigate | Supabase refresh token rotation; getUser() re-validates JWT on every request | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-1-I-02 | vercel.json contains only empty crons array — no secrets | gsd-security-auditor | 2026-04-10 |
| AR-02 | T-1-D-01 | Single-user app; DB-layer rate limiting unnecessary | gsd-security-auditor | 2026-04-10 |
| AR-03 | T-1-R-01 | Single-user app; Supabase dashboard audit trail sufficient for v1 | gsd-security-auditor | 2026-04-10 |
| AR-04 | T-1-I-01b | Error message proxies Supabase error string internally but UI hardcodes undifferentiated Korean message | gsd-security-auditor | 2026-04-10 |
| AR-05 | T-1-I-02b | NEXT_PUBLIC_ vars (URL, anon key) are designed for public exposure by Supabase; RLS enforces access control | gsd-security-auditor | 2026-04-10 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-10 | 16 | 16 | 0 | gsd-security-auditor |

---

## Notes

**T-1-I-03 — `import 'server-only'` not added (informational):** `db/index.ts` does not include an explicit `import 'server-only'` guard. The plan declared this as a fallback measure ("Add guard if issues arise"). Primary mitigation — Next.js build-time enforcement — is in place. At ASVS Level 1 this is CLOSED; a future phase may add the explicit guard as defense-in-depth.

**T-1-S-01a — .gitignore pattern:** `.env*` (line 34) covers `.env.local` and all other env files.

**Open redirect guard (informational, non-registered):** `app/login/actions.ts` implements `safeRedirectPath()` rejecting paths that don't start with `/` or start with `//`. This is a positive security addition beyond the plan that closes an open redirect vector in the `?redirect=` flow.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-10
