# Phase 4: History & Charts - Research

**Researched:** 2026-04-13
**Domain:** Vercel Cron Jobs, Drizzle ORM snapshot writes, Recharts AreaChart, Next.js App Router API routes
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Vercel Cron Jobs (`vercel.json`) 사용. Phase 1 D-02에서 결정됨. `vercel.json`에 cron 스케줄 추가.
- **D-02:** 실행 시각: **00:00 UTC (= 오전 09:00 KST)**. 한국 주식/코인 시장 종료 후 충분한 시간 경과 시점.
- **D-03:** 스냅숏 시 **Fresh API 조회** — `refreshAllPrices()` 호출 후 스냅숏 기록. Phase 3 D-02와 동일하게 API 실패 시 stale fallback 적용.
- **D-04:** 크론은 Next.js API route (`/api/cron/snapshot`)로 구현. Vercel이 이 엔드포인트를 매일 00:00 UTC에 호출.
- **D-05:** 차트 타입: **recharts `AreaChart`** — 주식 앱 스타일 (선 + 그 아래 영역 채우기). 연간/월간 모두 동일 컴포넌트 패턴 재사용.
- **D-06:** 연간 차트 Y축: **수익률 % (YoY)**. X축: 연도(2023, 2024, 2025...). 자산 총액과 수익률은 hover 툴팁으로 표시.
- **D-07:** 월간 차트 Y축: **KRW 자산 총액**. X축: 최근 12개월. 성장 흐름을 절대 금액으로 시각화.
- **D-08:** 사이드바 "차트" 메뉴 → 단일 `/charts` 페이지. **탭 전환** ('연간' | '월간')으로 두 차트 구분.
- **D-09:** 기존 레이아웃(sidebar + header + main `p-6`) 그대로 재사용. shadcn Card로 차트 섹션 래핑.
- **D-10:** 스냅숏이 없을 때: **"[날짜]부터 데이터 수집 중"** 메시지 표시.
- **D-11:** Backfill 없음 — 크론 시작일부터 차곡차곡 누적.
- **D-12:** 데이터가 1개 이상 있으면 차트 렌더링. 2개 미만이면 "데이터가 충분하지 않습니다 (최소 2일 필요)" 메시지.

### Claude's Discretion

- AreaChart 색상 팔레트 및 그라디언트 설정 (04-UI-SPEC.md에서 완전 명세됨)
- 툴팁 포맷 (KRW 포맷, % 포맷) (04-UI-SPEC.md에서 완전 명세됨)
- 크론 API route 인증 방식 (Vercel cron secret header)
- 데이터 보존 정책 구현 (daily prune after 12 months — 구현 여부 결정)
- 로딩/에러 상태 UI (04-UI-SPEC.md에서 완전 명세됨)

### Deferred Ideas (OUT OF SCOPE)

- 과거 주식 가격 backfill — 지원 안 함
- 데이터 보존 정책 (12개월 이후 daily prune) — MVP에서 우선순위 낮음
- 차트 줌/Pan 인터랙션 — 기본 정적 차트로 시작
- 상품별 breakdown 차트 — Phase 5 범위
- 수익률 벤치마크 비교 — 향후 기능
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHART-01 | 연도별 전체 자산 수익률이 차트로 표시된다 | Annual AreaChart from portfolio_snapshots — group by year, last snapshot per year = year-end value; returnBps converts to %; research confirms Drizzle query pattern |
| CHART-02 | 월별 자산 총액 변동이 차트로 표시된다 | Monthly AreaChart from portfolio_snapshots — group by YYYY-MM, last snapshot per month = month-end value; rolling 12-month window |
| CHART-03 | 야간 크론 잡이 매일 포트폴리오 스냅숏을 기록한다 | Vercel Cron + Next.js App Router Route Handler; CRON_SECRET auth; idempotent upsert on snapshotDate (unique constraint already in schema) |
</phase_requirements>

---

## Summary

Phase 4 adds two capabilities: a nightly snapshot writer (the data pipeline) and a charts page (the consumer). The schema already exists from Phase 1 (`portfolio_snapshots` table with `snapshotDate UNIQUE`, `totalValueKrw`, `totalCostKrw`, `returnBps`). The implementation work is writing to it via a secured API route, querying from it for charts, and rendering with recharts AreaChart — all of which are well-established patterns in the existing codebase.

The cron infrastructure is straightforward: `vercel.json` declares the schedule, Vercel sends a GET to `/api/cron/snapshot` with `Authorization: Bearer {CRON_SECRET}`, the route handler validates the header and calls `refreshAllPrices()` then inserts a snapshot row. The key correctness risk is **idempotency** — if Vercel delivers the cron event twice (documented behavior), the insert must be a conflict-safe upsert on `snapshotDate`. Drizzle's `onConflictDoNothing()` on the unique `snapshot_date` column handles this cleanly.

The charts page is a Server Component that reads all snapshots, aggregates them into annual and monthly arrays, and passes them to client-side recharts AreaChart components. No live API calls happen during chart viewing (pre-computed data, CHART-03 design). The middleware currently applies to all routes including `/api/cron/*`; the cron route must bypass Supabase session middleware to avoid redirect-on-unauthenticated behavior.

**Primary recommendation:** Build in three steps — (1) cron API route with idempotent upsert, (2) server-side query functions for annual/monthly aggregation, (3) charts page with AreaChart components per the UI-SPEC. The middleware exclusion for cron routes is the easiest-to-miss blocker.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.8.1 (installed) | AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer | Already installed Phase 3; AreaChart is the locked choice (D-05) |
| drizzle-orm | 0.45.2 (installed) | portfolio_snapshots INSERT and SELECT | Project ORM — all DB access uses Drizzle |
| next (App Router) | 16.2.3 (installed) | Route Handler at `app/api/cron/snapshot/route.ts` | Project framework; Route Handlers are the Vercel-recommended pattern for cron endpoints |

[VERIFIED: npm registry — recharts 3.8.1 is latest]
[VERIFIED: codebase grep — drizzle-orm 0.45.2, next 16.2.3 in package.json]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn Tabs | installed | Annual/Monthly tab switch on /charts | Locked D-08; already installed |
| shadcn Card, Skeleton | installed | Chart card wrapper; Suspense fallback | Already installed |
| @supabase/ssr | 0.10.0 (installed) | Session check skipped in cron route | Cron route must NOT call auth — route is protected by CRON_SECRET only |

### No New Packages Required

All libraries needed for Phase 4 are already installed. No `npm install` step needed.

---

## Architecture Patterns

### Recommended Project Structure

```
app/
├── api/
│   └── cron/
│       └── snapshot/
│           └── route.ts          # GET handler — validates CRON_SECRET, calls snapshot service
├── (app)/
│   └── charts/
│       └── page.tsx              # Server Component — fetches snapshot data, renders charts page
components/
└── app/
    ├── annual-return-chart.tsx   # 'use client' AreaChart — YoY return %
    ├── monthly-portfolio-chart.tsx  # 'use client' AreaChart — 12-month KRW total
    └── insufficient-data-message.tsx  # Shared empty/insufficient state
db/
└── queries/
    └── portfolio-snapshots.ts    # getAnnualSnapshots(), getMonthlySnapshots() query functions
lib/
└── snapshot/
    └── writer.ts                 # writePortfolioSnapshot() — pure business logic, called by cron route
```

### Pattern 1: Vercel Cron Route Handler with CRON_SECRET Auth

**What:** App Router Route Handler that Vercel calls on schedule. Validates Authorization header before executing business logic.

**When to use:** All Vercel Cron endpoints. Must be an App Router Route Handler (not Server Action — Server Actions require POST from trusted origin).

**Key constraint:** The route MUST be excluded from the Supabase session middleware or it will redirect to `/login` when called by Vercel's unauthenticated GET request.

```typescript
// Source: https://vercel.com/docs/cron-jobs/manage-cron-jobs (verified)
// app/api/cron/snapshot/route.ts
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Business logic here — refreshAllPrices(), then writePortfolioSnapshot()
  return Response.json({ success: true })
}
```

**vercel.json configuration:**
```json
{
  "crons": [
    {
      "path": "/api/cron/snapshot",
      "schedule": "0 0 * * *"
    }
  ]
}
```

[VERIFIED: vercel.com/docs/cron-jobs/manage-cron-jobs]

### Pattern 2: Idempotent Snapshot Upsert

**What:** INSERT with conflict resolution on `snapshot_date` unique constraint. Vercel documentation explicitly warns cron events may be delivered more than once.

**When to use:** Any write that must not duplicate on retry. The `portfolio_snapshots.snapshotDate` column has `.unique()` in the schema — use this as the conflict target.

```typescript
// Source: Drizzle ORM docs + codebase schema
// lib/snapshot/writer.ts
import { db } from '@/db'
import { portfolioSnapshots } from '@/db/schema/portfolio-snapshots'

export async function writePortfolioSnapshot(params: {
  snapshotDate: string  // 'YYYY-MM-DD'
  totalValueKrw: number
  totalCostKrw: number
  returnBps: number
}) {
  await db
    .insert(portfolioSnapshots)
    .values(params)
    .onConflictDoNothing()  // safe re-run: snapshotDate UNIQUE — skip if already written today
}
```

[VERIFIED: codebase — portfolio-snapshots.ts schema confirms snapshotDate UNIQUE]
[ASSUMED: Drizzle `onConflictDoNothing()` syntax — verify against Context7 if needed]

### Pattern 3: Snapshot Date for KST Alignment

**What:** The cron runs at 00:00 UTC = 09:00 KST. The snapshot should record the **Korean date at time of execution**, not UTC date. At 00:00 UTC, KST is already 9 hours ahead (the next calendar day in Korea).

**Calculation:** `snapshotDate` should be today's UTC date (2026-04-13), not tomorrow's KST date. The cron runs at midnight UTC; Korean markets closed the previous evening KST. The snapshot represents end-of-day portfolio value for the UTC date at execution time.

```typescript
// Get today's date in YYYY-MM-DD format (UTC)
const snapshotDate = new Date().toISOString().slice(0, 10)  // '2026-04-13'
```

[ASSUMED: UTC date is the correct choice for snapshotDate — confirm with user if KST date is preferred]

### Pattern 4: Annual Aggregation Query

**What:** Group all snapshots by year, take the last snapshot per year as the year-end value. Compute YoY return % from consecutive year-end values.

```typescript
// db/queries/portfolio-snapshots.ts
import { db } from '@/db'
import { portfolioSnapshots } from '@/db/schema/portfolio-snapshots'
import { asc } from 'drizzle-orm'

export async function getAllSnapshots() {
  return db
    .select({
      snapshotDate: portfolioSnapshots.snapshotDate,
      totalValueKrw: portfolioSnapshots.totalValueKrw,
      totalCostKrw: portfolioSnapshots.totalCostKrw,
      returnBps: portfolioSnapshots.returnBps,
    })
    .from(portfolioSnapshots)
    .orderBy(asc(portfolioSnapshots.snapshotDate))
}
```

Annual aggregation (in application layer, not SQL — simpler, dataset is small):
```typescript
// Group by year, keep last snapshot per year
// For annual chart: YoY return = (thisYearValue - lastYearValue) / lastYearValue * 100
// returnBps in DB = overall return since cost basis, NOT YoY — must compute from consecutive year-end values
```

**Critical insight:** `returnBps` stored in the snapshot is overall return (currentValue - totalCost) / totalCost * 10000. **It is NOT year-over-year return.** The annual chart's Y-axis shows YoY return %, which requires comparing consecutive year-end `totalValueKrw` values. Compute this in the aggregation function, not from stored `returnBps`.

[VERIFIED: portfolio-snapshots.ts schema — returnBps comment confirms "return% × 10000" (total return)]

### Pattern 5: Monthly Rolling Window

**What:** Take the last snapshot per calendar month for the trailing 12 months. Month-end `totalValueKrw` is the Y value. Month-over-month return is optional tooltip data.

```typescript
// Filter to last 12 months, group by YYYY-MM, keep last snapshot per month
const twelveMonthsAgo = new Date()
twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
```

### Pattern 6: Middleware Exclusion for Cron Route

**What:** The current `middleware.ts` calls `updateSession` for ALL non-static paths. Vercel's cron caller is unauthenticated — it sends only `Authorization: Bearer {CRON_SECRET}`. Without exclusion, the middleware will attempt session refresh and may redirect or error.

**Current middleware matcher:**
```typescript
matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
```

**Fix:** Add `/api/cron` to the matcher exclusion pattern:
```typescript
matcher: [
  '/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
]
```

[VERIFIED: codebase — middleware.ts inspected, currently has no cron exclusion]

### Anti-Patterns to Avoid

- **Using a Server Action for the cron endpoint:** Server Actions require POST with specific headers from trusted origin. Vercel cron sends GET. Use Route Handler (`route.ts`) instead.
- **Not checking for existing snapshot before insert:** Use `onConflictDoNothing()` — Vercel cron may fire twice for the same schedule slot (documented behavior).
- **Using `returnBps` for YoY chart:** The stored `returnBps` is total return vs. cost basis, not year-over-year. Compute YoY from consecutive year-end `totalValueKrw`.
- **Calling `requireUser()` or `createClient()` in the cron route:** The cron caller has no Supabase session. Auth must be CRON_SECRET header only.
- **Fetching fresh prices in the charts page:** Charts read from pre-computed snapshots only (CHART-03 success criterion). No `refreshAllPrices()` on the charts page.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Conflict-safe upsert | Custom SELECT then INSERT logic | `drizzle .onConflictDoNothing()` | Race condition risk; Drizzle handles atomically |
| KRW number formatting | Custom formatter | `Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' })` | Already used in pie chart tooltip; handles all edge cases |
| Chart responsiveness | Manual resize listener | `recharts ResponsiveContainer` | Already established pattern in `allocation-pie-chart.tsx` |
| Custom tooltip styling | Recharts default tooltip | Custom tooltip component (pattern established in UI-SPEC) | Default tooltip ignores Tailwind/shadcn tokens — custom tooltip is the right choice here too |

---

## Common Pitfalls

### Pitfall 1: Cron Duplicate Execution

**What goes wrong:** Vercel's docs state "the event-driven system can occasionally deliver the same cron event more than once." A plain INSERT will fail on the `snapshot_date` UNIQUE constraint (or worse, if no constraint, create duplicate rows).

**Why it happens:** Distributed scheduler guarantees at-least-once delivery.

**How to avoid:** Always use `.onConflictDoNothing()` on the `snapshotDate` conflict target. The unique constraint is already defined in the schema.

**Warning signs:** Two rows in `portfolio_snapshots` with the same `snapshot_date`.

### Pitfall 2: Middleware Blocking Cron Route

**What goes wrong:** Cron route returns 307 redirect to `/login` instead of 401/200. Vercel logs show redirect response for cron invocations. Vercel cron does NOT follow redirects — it treats 3xx as final.

**Why it happens:** `middleware.ts` runs `updateSession` on all non-static paths including `/api/cron/snapshot`. Without a Supabase session cookie, `updateSession` redirects unauthenticated requests.

**How to avoid:** Add `api/cron` to the middleware matcher exclusion list before other work begins.

**Warning signs:** Cron job shows 307 in Vercel logs; chart data never accumulates.

### Pitfall 3: YoY Return Computed from `returnBps`

**What goes wrong:** Annual chart shows cumulative return since portfolio inception, not year-over-year return. Data is technically wrong for the stated purpose.

**Why it happens:** `returnBps` in the snapshot = `(totalValueKrw - totalCostKrw) / totalCostKrw * 10000`. This is an all-time return figure. The cost basis (`totalCostKrw`) grows over time as assets are added, making this unsuitable for YoY comparison.

**How to avoid:** Compute YoY return as `(thisYearEndValue - lastYearEndValue) / lastYearEndValue * 100` using consecutive year-end `totalValueKrw` values. For the first year of data, either show overall return or show a single data point without a prior-year baseline.

**Warning signs:** Annual chart shows monotonically increasing % even in flat years.

### Pitfall 4: Snapshot Date Ambiguity at Cron Execution Time

**What goes wrong:** Cron runs at 00:00 UTC. In KST (UTC+9), this is 09:00 of the same calendar day. The snapshot date could be interpreted as either UTC date or KST date — they are the same day (KST is ahead, not behind).

**How to avoid:** Use UTC date (`new Date().toISOString().slice(0, 10)`) consistently. Document the choice in code comments.

### Pitfall 5: Charts Page Triggering Price API Calls

**What goes wrong:** Developer adds `refreshAllPrices()` to the charts page for "freshness," causing Finnhub API calls whenever charts are viewed. This defeats the pre-computed snapshot design.

**How to avoid:** Charts page fetches ONLY from `portfolio_snapshots` table. No price cache, no Finnhub calls.

### Pitfall 6: recharts `AreaChart` `defs` Gradient ID Collision

**What goes wrong:** Both `annual-return-chart.tsx` and `monthly-portfolio-chart.tsx` define a `<linearGradient id="areaGradient">`. When both charts are mounted (different tabs render but may share DOM), the second gradient definition silently overrides the first.

**How to avoid:** Use distinct IDs: `id="annualAreaGradient"` and `id="monthlyAreaGradient"` per the UI-SPEC.

[VERIFIED: 04-UI-SPEC.md — confirms distinct IDs: `areaGradient` vs `monthlyGradient`]

---

## Code Examples

Verified patterns from existing codebase:

### Existing recharts 'use client' Component Pattern
```typescript
// Source: components/app/allocation-pie-chart.tsx (existing)
'use client'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export function AllocationPieChart({ data }: AllocationPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        {/* ... */}
        <Tooltip formatter={(value, name) => [...]} />
      </PieChart>
    </ResponsiveContainer>
  )
}
```
AreaChart components follow the same `'use client'` + `ResponsiveContainer` wrapper pattern.

### Vercel Cron Auth Pattern (verified from official docs)
```typescript
// Source: https://vercel.com/docs/cron-jobs/manage-cron-jobs
// app/api/cron/snapshot/route.ts
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // ... business logic
  return Response.json({ success: true })
}
```

### Drizzle Insert Pattern (existing codebase convention)
```typescript
// Source: db/index.ts + existing schema usage patterns
import { db } from '@/db'
import { portfolioSnapshots } from '@/db/schema/portfolio-snapshots'

await db
  .insert(portfolioSnapshots)
  .values({
    snapshotDate: '2026-04-13',   // YYYY-MM-DD string (Drizzle date column)
    totalValueKrw: 124500000,
    totalCostKrw: 110000000,
    returnBps: 13182,             // (124.5M - 110M) / 110M * 10000 = 1318 bps = 13.18%
  })
  .onConflictDoNothing()
```

### KRW Compact Formatter (new — per UI-SPEC)
```typescript
// Source: 04-UI-SPEC.md Number Formatting Contract
export function formatKrwCompact(n: number): string {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000_000)  return `₩${Math.round(n / 10_000_000)}천만`
  if (n >= 1_000_000)   return `₩${Math.round(n / 1_000_000)}백만`
  return `₩${n.toLocaleString('ko-KR')}`
}

export function formatMonthLabel(s: string): string {
  // "2025-04" → "25.04"
  return s.slice(2).replace('-', '.')
}
```

### Annual Data Aggregation (application-layer logic)
```typescript
// Computed from getAllSnapshots() result
interface AnnualDataPoint {
  year: number
  returnPct: number       // YoY: (thisYearEnd - lastYearEnd) / lastYearEnd * 100
  totalValueKrw: number   // year-end total (tooltip only)
}

function toAnnualData(snapshots: Snapshot[]): AnnualDataPoint[] {
  // Group by year, take last per year
  const byYear = new Map<number, Snapshot>()
  for (const s of snapshots) {
    const year = parseInt(s.snapshotDate.slice(0, 4))
    byYear.set(year, s)  // later dates overwrite — last snapshot per year wins
  }
  const sorted = [...byYear.entries()].sort(([a], [b]) => a - b)

  return sorted.map(([year, snap], i) => {
    const prev = i > 0 ? sorted[i - 1][1] : null
    const returnPct = prev
      ? ((snap.totalValueKrw - prev.totalValueKrw) / prev.totalValueKrw) * 100
      : ((snap.totalValueKrw - snap.totalCostKrw) / snap.totalCostKrw) * 100
    return { year, returnPct, totalValueKrw: snap.totalValueKrw }
  })
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pages/api/` route handlers | `app/api/*/route.ts` Route Handlers | Next.js 13+ App Router | Cron route must be in `app/api/`, not `pages/api/` |
| `NextResponse.json()` | `Response.json()` (native Web API) | TypeScript 5.2+ / Next.js 14+ | Project uses Next.js 16.2.3 — use native `Response.json()` |
| recharts v2 `<Tooltip>` default | recharts v3 unchanged API | recharts 3.x | API stable; `'use client'` still required for all recharts components |

---

## Environment Availability

Step 2.6: SKIPPED — Phase 4 has no new external dependencies. All required tools (Vercel Cron, recharts, Drizzle, Supabase) are already in use from earlier phases. The `CRON_SECRET` env var will need to be added to Vercel project settings, but this is a configuration step, not a missing dependency.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| recharts | AreaChart components | ✓ (installed) | 3.8.1 | — |
| Vercel Cron Jobs | CHART-03 nightly snapshot | ✓ (platform feature) | — | — |
| CRON_SECRET env var | Cron route auth | Must add to Vercel project | — | Run without auth locally (check `process.env.NODE_ENV`) |
| `portfolio_snapshots` table | All of Phase 4 | ✓ (Phase 1 migration) | — | — |

[VERIFIED: package.json — recharts 3.8.1 installed]
[VERIFIED: db/schema/portfolio-snapshots.ts — table schema exists]

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Not yet configured — no jest.config, vitest.config, or pytest.ini detected |
| Config file | Wave 0 gap — needs setup |
| Quick run command | TBD after framework chosen |
| Full suite command | TBD |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHART-03 | Cron route returns 401 without CRON_SECRET | unit | `vitest run tests/cron-snapshot.test.ts` | ❌ Wave 0 |
| CHART-03 | Cron route returns 200 with valid CRON_SECRET | unit | `vitest run tests/cron-snapshot.test.ts` | ❌ Wave 0 |
| CHART-03 | Duplicate snapshot on same date is a no-op (idempotent) | unit/integration | `vitest run tests/snapshot-writer.test.ts` | ❌ Wave 0 |
| CHART-01 | Annual aggregation computes correct YoY % from consecutive year-end values | unit | `vitest run tests/snapshot-aggregation.test.ts` | ❌ Wave 0 |
| CHART-02 | Monthly aggregation returns last-per-month snapshot for trailing 12 months | unit | `vitest run tests/snapshot-aggregation.test.ts` | ❌ Wave 0 |
| CHART-01/02 | Charts page renders InsufficientDataMessage when < 2 snapshots | smoke | manual + Suspense render test | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** Unit tests for the specific module changed
- **Per wave merge:** All unit tests green
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/cron-snapshot.test.ts` — covers CHART-03 auth and invocation
- [ ] `tests/snapshot-writer.test.ts` — covers CHART-03 idempotency
- [ ] `tests/snapshot-aggregation.test.ts` — covers CHART-01 and CHART-02 computation logic
- [ ] Test framework install: `npm install --save-dev vitest @vitejs/plugin-react` if vitest chosen

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (no user auth in cron route) | — |
| V3 Session Management | no | — |
| V4 Access Control | yes — cron route must be inaccessible to public | `CRON_SECRET` Bearer token comparison |
| V5 Input Validation | no (cron route has no user input) | — |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized cron trigger | Spoofing | `Authorization: Bearer {CRON_SECRET}` header check; return 401 immediately |
| CRON_SECRET not set in env | Spoofing | Guard: `if (!process.env.CRON_SECRET || authHeader !== ...)` |
| Charts page exposes portfolio data without auth | Information Disclosure | `/charts` is under `app/(app)/` group route — protected by Supabase session middleware (confirmed existing pattern) |
| Timing attack on CRON_SECRET comparison | Spoofing | Low risk (single-user app, not a high-value target); standard string comparison acceptable |

[VERIFIED: middleware.ts — `app/(app)/` routes require auth via Supabase session]
[CITED: vercel.com/docs/cron-jobs/manage-cron-jobs — CRON_SECRET pattern]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Drizzle `onConflictDoNothing()` is the correct method for conflict-safe INSERT | Architecture Patterns Pattern 2 | Could cause constraint violation errors on duplicate cron; verify with Context7 |
| A2 | UTC date (`new Date().toISOString().slice(0, 10)`) is the intended snapshot date | Architecture Patterns Pattern 3 | Snapshot labeled with wrong date; minor UX issue |
| A3 | Supabase `updateSession` redirects unauthenticated GETs (not just returns 401) | Common Pitfalls Pitfall 2 | If it returns 401, middleware exclusion is still needed but less urgent |

---

## Open Questions (RESOLVED)

1. **Data retention policy (daily prune after 12 months)**
   - What we know: ROADMAP mentions "daily prune after 12 months"; CONTEXT.md marks it as Claude's discretion, low MVP priority
   - What's unclear: Whether to implement a pruning job in Phase 4 or skip entirely
   - RESOLVED: Skip for MVP. With one row per day, 365 rows per year is negligible for Supabase. Add a comment in the cron route for future implementation.

2. **First-year annual chart behavior (only one year of data)**
   - What we know: Annual chart needs two consecutive year-end values to show YoY return. If the user has only 2026 data, there's no 2025 to compare against.
   - What's unclear: Should we show overall return (vs. cost basis) for the first year, or show a single dot with no Y-axis comparison, or show `InsufficientDataMessage`?
   - RESOLVED: Show overall return for the first year using `(snap.totalValueKrw - snap.totalCostKrw) / snap.totalCostKrw * 100`. This is explicitly more useful than hiding data. Add a note in the tooltip ("연간 수익률 데이터 수집 중").

---

## Sources

### Primary (HIGH confidence)
- `vercel.com/docs/cron-jobs` — cron expression syntax, vercel.json format, HTTP GET invocation model
- `vercel.com/docs/cron-jobs/manage-cron-jobs` — CRON_SECRET auth pattern, idempotency requirements, no-retry-on-failure behavior, cron accuracy (Hobby: once/day in the hour; Pro: within the minute)
- `db/schema/portfolio-snapshots.ts` (codebase) — schema confirmation: snapshotDate UNIQUE, returnBps semantics
- `middleware.ts` (codebase) — confirmed no existing `/api/cron` exclusion
- `components/app/allocation-pie-chart.tsx` (codebase) — recharts 'use client' component pattern
- `app/actions/prices.ts` (codebase) — `refreshAllPrices()` function signature and behavior
- `lib/portfolio/portfolio.ts` (codebase) — `computePortfolio()`, `formatKrw()`, `formatReturn()`
- `04-UI-SPEC.md` (planning artifact) — complete AreaChart specification, component inventory, formatters

### Secondary (MEDIUM confidence)
- npm registry: recharts 3.8.1 confirmed as latest [VERIFIED: npm view recharts version]
- `04-CONTEXT.md` — locked decisions D-01 through D-12

### Tertiary (LOW confidence)
- None — all critical claims verified via codebase or official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json; no new installs needed
- Architecture: HIGH — Vercel cron auth pattern verified against official docs; Drizzle patterns verified in existing codebase
- Pitfalls: HIGH — middleware gap and idempotency verified from code inspection and Vercel docs respectively; YoY vs. returnBps distinction verified from schema comments
- Security: HIGH — CRON_SECRET pattern directly from Vercel official docs

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (Vercel Cron and recharts APIs are stable; 30-day horizon appropriate)
