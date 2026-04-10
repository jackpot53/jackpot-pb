---
phase: 01-foundation
plan: "03"
subsystem: auth
tags: [supabase, next.js, middleware, server-actions, react-hook-form, zod, shadcn]

# Dependency graph
requires:
  - phase: 01-01
    provides: Next.js 15 app scaffold with shadcn/ui, Tailwind, project structure
  - phase: 01-02
    provides: Drizzle schema and Supabase DB connection (env vars already configured)
provides:
  - Cookie-based Supabase Auth session management (browser + server client factories)
  - Next.js middleware protecting all non-static routes via updateSession/getUser()
  - Login page at /login with Korean UI, react-hook-form + Zod, error states
  - signIn / signOut Server Actions
  - Authenticated placeholder at / with logout button
affects: [all future phases — every protected route depends on middleware auth]

# Tech tracking
tech-stack:
  added: [@supabase/ssr, react-hook-form, @hookform/resolvers, zod (already present)]
  patterns:
    - Supabase SSR auth pattern — separate browser/server client factories
    - getUser() in middleware (not getSession()) for server-side token re-validation
    - Server Actions for auth mutations (signIn, signOut) — no API routes needed
    - Client Component login form + Server Component placeholder page

key-files:
  created:
    - utils/supabase/client.ts
    - utils/supabase/server.ts
    - utils/supabase/middleware.ts
    - app/login/actions.ts
    - app/actions/auth.ts
    - app/login/page.tsx
  modified:
    - middleware.ts
    - app/page.tsx

key-decisions:
  - "Used getUser() not getSession() in middleware — getUser() re-validates token against Supabase Auth server on every request; getSession() only reads local cookie and would accept revoked sessions"
  - "Suspense boundary required around LoginForm to use useSearchParams() in Next.js App Router — page.tsx wraps LoginForm in <Suspense>"
  - "signIn/signOut implemented as Server Actions (not API route handlers) — consistent with Next.js 15 App Router patterns, no extra round-trip"
  - "Error message 이메일 또는 비밀번호가 올바르지 않습니다. does not distinguish wrong email from wrong password — prevents user enumeration (T-1-I-01)"

patterns-established:
  - "Pattern: Supabase browser client — createBrowserClient from @supabase/ssr, used in Client Components"
  - "Pattern: Supabase server client — createServerClient from @supabase/ssr with cookie store, used in Server Components / Server Actions"
  - "Pattern: Auth redirect — middleware appends ?redirect={pathname} so login can restore original destination"

requirements-completed: [AUTH-01, AUTH-02]

# Metrics
duration: ~25min
completed: 2026-04-09
---

# Phase 01 Plan 03: Auth Implementation Summary

**Supabase cookie-based auth with Next.js 15 middleware using getUser() for secure server-side token validation, Korean login form (shadcn Card + react-hook-form + Zod), and Server Actions for sign-in/sign-out**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-09T16:39:00Z
- **Completed:** 2026-04-09T16:42:00Z (browser verification approved)
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify)
- **Files modified:** 8

## Accomplishments

- Supabase SSR client factories (browser + server) with correct cookie propagation
- Root Next.js middleware protecting all non-static routes — unauthenticated requests redirect to /login with ?redirect= param
- Full login page matching UI spec: Korean copy, shadcn Card, react-hook-form + Zod, loading state, auth/network error messages, accessibility attributes
- Server Actions for signIn (signInWithPassword) and signOut
- Authenticated placeholder at / with 로그아웃 button
- All 4 middleware unit tests pass; build succeeds; all 6 browser scenarios verified

## Task Commits

Each task was committed atomically:

1. **Task 1: Supabase client factories, middleware, and Server Actions** - `90ca914` (feat)
2. **Task 2: Login page UI and authenticated placeholder** - `f0d2a6d` (feat)
3. **Task 3: Browser verification** - approved by user (checkpoint:human-verify — no code changes)

## Files Created/Modified

- `utils/supabase/client.ts` — Browser Supabase client factory using createBrowserClient
- `utils/supabase/server.ts` — Server Supabase client factory using createServerClient with async cookie store
- `utils/supabase/middleware.ts` — updateSession helper: refreshes tokens, redirects unauthenticated requests, uses getUser() (not getSession())
- `middleware.ts` — Root Next.js middleware delegating to updateSession; matcher excludes _next/static, _next/image, and image assets
- `app/login/actions.ts` — signIn Server Action calling supabase.auth.signInWithPassword
- `app/actions/auth.ts` — signOut Server Action calling supabase.auth.signOut then redirecting to /login
- `app/login/page.tsx` — Full-page login form (Client Component): shadcn Card, react-hook-form + Zod, Korean copy per UI spec, Suspense boundary for useSearchParams
- `app/page.tsx` — Authenticated placeholder (Server Component) with 로그아웃 form action

## Decisions Made

- **getUser() over getSession():** Middleware calls `supabase.auth.getUser()` which re-validates the JWT against Supabase Auth servers on every request. `getSession()` only reads the local cookie and would accept tokens that have been revoked server-side. This is the security-correct approach per Supabase SSR documentation.
- **Suspense boundary for useSearchParams:** Next.js App Router requires any component using `useSearchParams()` to be wrapped in a Suspense boundary at the page level. LoginForm was extracted as a separate component and wrapped in `<Suspense>` in the page export to satisfy this constraint. This was not in the original plan but was required by the framework.
- **Server Actions over API routes:** signIn and signOut are implemented as Server Actions rather than Route Handlers, keeping auth mutations co-located with their UI and avoiding an extra HTTP round-trip pattern.
- **Korean error messages per UI spec:** Auth error copy matches UI spec exactly — error messages do not distinguish wrong email from wrong password, preventing user enumeration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added Suspense boundary for useSearchParams in App Router**
- **Found during:** Task 2 (Login page UI)
- **Issue:** Next.js App Router throws a build error if a Client Component calls `useSearchParams()` without a Suspense boundary wrapping it at the page level. The plan's interface code used `useSearchParams()` directly in the default export without a Suspense wrapper.
- **Fix:** Extracted the login form into a `LoginForm` Client Component; the page default export wraps `<LoginForm>` in `<Suspense fallback={null}>`. This satisfies Next.js requirements without affecting the rendered UI.
- **Files modified:** `app/login/page.tsx`
- **Verification:** Build passed (`npm run build` exits 0)
- **Committed in:** f0d2a6d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** Required fix for build to succeed — no scope creep, no behavioral change.

## Issues Encountered

None beyond the Suspense boundary deviation above.

## User Setup Required

None — Supabase project credentials were configured in Plan 01-01. No additional setup required.

## Verification Results

**Unit tests (vitest):** 5/5 pass (4 middleware tests + 1 schema test)
**Build:** `npm run build` exits 0, no TypeScript errors
**Browser (all 6 scenarios approved by user):**
1. Unauthenticated redirect — / → /login?redirect=%2F
2. Login with valid credentials — redirected to /, session persists on refresh
3. Redirect param preserved — /some-path → /login?redirect=%2Fsome-path → back to /some-path after login
4. Logout — 로그아웃 invalidates session, subsequent visit to / redirects to /login
5. Wrong credentials — inline error 이메일 또는 비밀번호가 올바르지 않습니다. shown below password field
6. Loading state — spinner + 로그인 중... shown during form submission, button disabled

## Next Phase Readiness

- AUTH-01 and AUTH-02 are fully implemented and browser-verified
- All protected routes are gated by middleware — future phases can build routes knowing unauthenticated access is blocked
- Supabase server client factory is available for use in any Server Component or Server Action via `@/utils/supabase/server`
- No blockers for Phase 2

---
*Phase: 01-foundation*
*Completed: 2026-04-09*
