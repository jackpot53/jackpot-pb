# Phase 5: Goals & Performance Comparison - Research

**Researched:** 2026-04-13
**Domain:** Next.js App Router (Server Components + Server Actions), Drizzle ORM, recharts ReferenceLine, shadcn dialog/tabs/progress
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01** Dialog-based CRUD — `/goals` list page with "목표 추가" button opening dialog for create/edit. Delete also via confirm dialog. Follow Phase 2 asset CRUD pattern (`asset-form`, `delete-asset-dialog`).

**D-02** Goal fields: name, targetAmountKrw (KRW bigint), targetDate (optional date), notes (optional). DB schema already defined in Phase 1.

**D-03** Dashboard (`/`) bottom section (below performance table): goal cards — name, target KRW, achievement %, progress bar. Achievement = currentPortfolioTotalKrw / targetAmountKrw × 100, computed at read time.

**D-04** When no goals exist, hide the entire section (no empty state message).

**D-05** `/goals` page top: single unified chart. Portfolio total KRW AreaChart with one horizontal `ReferenceLine y={targetAmountKrw}` per goal overlaid. X-axis = snapshot dates, Y-axis = KRW total.

**D-06** Goals with targetDate: vertical `ReferenceLine x={targetDate}` on X-axis.

**D-07** Reuse recharts pattern from Phase 4 AreaChart. Goals rendered via `ReferenceLine` + `Label` components.

**D-08** No snapshots state: display "아직 데이터가 없습니다. 크론 잡이 내일 첫 스냅숏을 기록합니다." message.

**D-09** New `/performance` page. Add "성과" nav item to sidebar NAV_ITEMS.

**D-10** Asset type filter tabs: 전체 | 주식 | 코인 | 예적금 | 부동산. Use shadcn Tabs (same pattern as Phase 4 /charts).

**D-11** Extend existing `PerformanceTable` component — pass filtered `rows` prop based on selected tab. Do NOT introduce TanStack Table.

**D-12** Default sort: returnPct descending. Column sort click retains existing behavior.

### Claude's Discretion

- Progress bar design (color, height, behavior when > 100%)
- `/performance` page empty state (no holdings)
- Goal achievement (> 100%) special display
- Goal dialog form validation messages

### Deferred Ideas (OUT OF SCOPE)

- Per-goal independent charts
- Goal achievement notifications/email
- Return benchmark comparison (vs KOSPI)
- TanStack Table introduction
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GOAL-01 | User can set a target asset amount and see current achievement % | D-01/D-02/D-03: Dialog CRUD pattern confirmed; achievement formula verified in codebase (`computePortfolio` returns totalValueKrw); shadcn Progress component needed (not yet installed) |
| GOAL-02 | Per-goal time-series progress chart | D-05/D-06/D-07: recharts `ReferenceLine` is built into already-installed recharts 3.8.x; `getAllSnapshots()` query exists and returns `totalValueKrw` per date; chart pattern directly cloneable from `annual-return-chart.tsx` |
| PERF-01 | All holdings on single screen ranked by return % | D-11/D-12: `PerformanceTable` already sorts by returnPct desc; only needs filtered `rows` prop passed from parent — no new sorting logic required |
| PERF-02 | Performance separated by asset type (stock/crypto/savings/real estate) | D-09/D-10: shadcn Tabs already installed (`components/ui/tabs.tsx`); asset type enum values confirmed in `portfolio.ts` (`stock_kr`, `stock_us`, `etf_kr`, `etf_us`, `crypto`, `savings`, `real_estate`) |
</phase_requirements>

---

## Summary

Phase 5 adds goals CRUD, a goals progress chart, and a performance comparison page to an already functional Next.js 16 + Drizzle + recharts + shadcn application. The implementation surface is largely additive — no schema migrations, no new libraries (with one exception), and no changes to existing computation logic.

The goals schema (`goals` table) was defined in Phase 1 and is live in the database. The `portfolioSnapshots` table populated by the Phase 4 cron job provides the time-series data for the goal progress chart. The `PerformanceTable` component, `getAllSnapshots()` query, recharts `ReferenceLine`, and all needed shadcn UI components (except `progress`) are already installed and pattern-verified.

The single missing piece is the shadcn `progress` component, which must be installed with `npx shadcn add progress` before Wave 1 (dashboard goals section). Everything else is extension of existing patterns, not net-new invention.

**Primary recommendation:** Install shadcn `progress` in Wave 0 (setup), then implement three sequential plans: goal CRUD (05-01), goal progress chart (05-02), and performance page (05-03), following the asset dialog and charts page patterns exactly.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.2.3 | Server Components, Server Actions, route groups | Project foundation — `(app)/` group in use |
| Drizzle ORM | 0.45.2 | DB queries and inserts | Project standard — all queries use Drizzle |
| Zod | 4.3.6 | Form schema validation | Used in all existing Server Actions |
| react-hook-form | 7.72.1 | Controlled form state | Used with `@hookform/resolvers` in `asset-form.tsx` |
| recharts | 3.8.x | Charts including `ReferenceLine` | Already installed; `ReferenceLine` is built-in |
| shadcn (base-nova) | v4 | UI components | Project standard; `components.json` confirmed |

### New Install Required

| Library | Version | Purpose | Install Command |
|---------|---------|---------|----------------|
| shadcn `progress` | latest from registry | Goal achievement progress bar | `npx shadcn add progress` |

[VERIFIED: codebase grep] — `ls /Users/john/dev/jackpot-pb/components/ui/progress*` returned "no matches found". The component is absent and must be installed.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn Progress | Custom `<div>` with width% | shadcn Progress handles accessibility (role="progressbar", aria-valuenow) automatically |
| recharts ReferenceLine | Custom SVG annotation | ReferenceLine is built into recharts — no extra code needed |
| Server Action + revalidatePath | SWR/React Query mutation | Server Actions are the project's established pattern — no client state management needed |

**Installation (Wave 0):**
```bash
npx shadcn add progress
```

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
app/
├── (app)/
│   ├── goals/
│   │   └── page.tsx                 # Server Component — goals list + progress chart
│   └── performance/
│       └── page.tsx                 # Server Component — tabs + PerformanceTable
├── actions/
│   └── goals.ts                     # Server Actions: createGoal, updateGoal, deleteGoal
components/
└── app/
    ├── goal-dialog.tsx              # Controlled Dialog — create/edit (client component)
    ├── delete-goal-dialog.tsx       # Confirm Dialog — delete (client component)
    ├── goal-progress-chart.tsx      # AreaChart + ReferenceLine per goal (client component)
    └── dashboard-goals-section.tsx  # Goal cards with Progress bar (server-passable)
db/
└── queries/
    └── goals.ts                     # listGoals, getGoalById
```

### Pattern 1: Server Action with Zod + revalidatePath (Goal CRUD)

Directly mirrors `app/actions/assets.ts`. Key observations from that file:

- `'use server'` directive at top of file
- `requireUser()` calls `supabase.auth.getUser()` and redirects to `/login` if unauthenticated
- Zod schema defined inside the action file; `safeParse` returns `{ error: string }` on failure
- On success: `revalidatePath('/goals')` then close dialog (no `redirect()` — dialog stays on page)
- `deleteGoal` does a simple `db.delete(goals).where(eq(goals.id, id))` — no child rows to cascade

[VERIFIED: codebase read] — `app/actions/assets.ts` lines 32–87.

```typescript
// Source: app/actions/assets.ts (pattern)
'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { goals } from '@/db/schema/goals'
import { eq } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

const goalSchema = z.object({
  name: z.string().min(1, '목표 이름을 입력하세요').max(255),
  targetAmountKrw: z.coerce.number().int().min(1, '올바른 금액을 입력하세요 (1원 이상의 숫자)'),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식으로 입력하세요 (YYYY-MM-DD)').optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

export type GoalFormValues = z.infer<typeof goalSchema>
export type GoalActionError = { error: string }

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

export async function createGoal(data: GoalFormValues): Promise<GoalActionError | void> {
  await requireUser()
  const parsed = goalSchema.safeParse(data)
  if (!parsed.success) return { error: '입력 값을 확인해주세요.' }
  await db.insert(goals).values({ ...parsed.data })
  revalidatePath('/goals')
  revalidatePath('/')  // Dashboard goals section must refresh
}
```

### Pattern 2: Dialog-based CRUD (Goal Dialog)

Directly mirrors `delete-asset-dialog.tsx` (controlled Dialog with `useState(false)` + `useTransition`). The goal form dialog differs in that it wraps a react-hook-form inside the Dialog, following `asset-form.tsx` structure.

[VERIFIED: codebase read] — `components/app/delete-asset-dialog.tsx` full file.

Key implementation notes:
- `Dialog open={open} onOpenChange={setOpen}` — controlled open state, not DialogTrigger for the list page (trigger is a separate button outside the dialog)
- `useTransition` wraps the Server Action call for pending state + `isPending` spinner
- On Server Action returning `{ error }`: display error (toast); keep dialog open
- On Server Action returning `void`: close dialog (`setOpen(false)`)
- shadcn v4 (base-nova) uses `@base-ui/react` — `DialogTrigger` uses `render` prop pattern as seen in `delete-asset-dialog.tsx` line 31: `render={<Button ... />}`

### Pattern 3: recharts ReferenceLine for Goal Lines

[VERIFIED: codebase read] — `components/app/annual-return-chart.tsx` — existing AreaChart with `ResponsiveContainer`, `AreaChart`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Area`. `ReferenceLine` is part of recharts and is already used in other Phase 4 charts.

```typescript
// Source: recharts docs pattern (VERIFIED via existing codebase recharts usage)
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts'

// For each goal: horizontal target line
<ReferenceLine
  y={goal.targetAmountKrw}
  stroke="var(--primary)"
  strokeDasharray="4 4"
  strokeWidth={1.5}
>
  <Label value={goal.name} position="insideTopRight" fontSize={11} fill="var(--muted-foreground)" />
</ReferenceLine>

// For goals with targetDate: vertical deadline line
<ReferenceLine
  x={goal.targetDate}     // must match X-axis dataKey format (date string)
  stroke="var(--muted-foreground)"
  strokeDasharray="2 2"
  strokeWidth={1}
/>
```

**X-axis data key must match exactly** — `portfolioSnapshots.snapshotDate` is a `date` type returned as a string (e.g., `"2026-01-15"`). `targetDate` in goals schema is also a `date` stored as string. These must match for the vertical ReferenceLine to render at the correct position. [VERIFIED: codebase read — `db/schema/goals.ts` and `db/schema/portfolio-snapshots.ts`]

### Pattern 4: Tabs + PerformanceTable Composition (/performance page)

[VERIFIED: codebase read] — `app/(app)/charts/page.tsx` — tabs pattern. `app/(app)/page.tsx` — PerformanceTable used with a `rows` array.

The `/performance` page is a Server Component that:
1. Calls `getAssetsWithHoldings()` + price queries (same as dashboard)
2. Computes `performances: AssetPerformance[]` (same logic as `app/(app)/page.tsx`)
3. Passes full array to a client component that filters by tab selection

Asset type grouping for filter tabs [VERIFIED: codebase read — `lib/portfolio/portfolio.ts` AssetHoldingInput type]:
- "주식" tab: `['stock_kr', 'stock_us', 'etf_kr', 'etf_us']`
- "코인" tab: `['crypto']`
- "예적금" tab: `['savings']`
- "부동산" tab: `['real_estate']`

### Pattern 5: Dashboard Goals Section (Server Component data fetch)

The dashboard (`app/(app)/page.tsx`) is a Server Component. Adding the goals section means adding a `listGoals()` DB query alongside the existing asset/price queries. Achievement % = `Math.round((summary.totalValueKrw / goal.targetAmountKrw) * 100)`, using the already-computed `summary.totalValueKrw` from `computePortfolio()`.

[VERIFIED: codebase read] — `app/(app)/page.tsx` lines 68–71 confirm `summary.totalValueKrw` is available.

### Anti-Patterns to Avoid

- **`redirect()` inside goal dialog Server Actions:** Asset actions use `redirect()` after mutations because they navigate away. Goal dialog actions must NOT call `redirect()` — they should only `revalidatePath()` and return, leaving the dialog parent to close itself.
- **Passing `Date` objects across Server→Client boundary:** `portfolioSnapshots.snapshotDate` is a Drizzle `date` column. Return it as a string from the query; don't convert to `Date` object. See the existing `cachedAt` workaround in `performance-table.tsx` lines 31–33 as a cautionary example.
- **Rendering ReferenceLine outside AreaChart:** `ReferenceLine` must be a direct child of `AreaChart` (or `ComposedChart`), not nested inside `Area` or other wrappers.
- **BigInt overflow in achievement %:** `targetAmountKrw` is `bigint` in Postgres but Drizzle returns it as `number` with `mode: 'number'`. At portfolio scales (KRW billions), `number` is sufficient (max safe integer ~9 quadrillion KRW). [VERIFIED: codebase read — `db/schema/goals.ts` line 7 `mode: 'number'`]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Goal progress bar | `<div style={{width: pct + '%'}}>` | `shadcn Progress` | Handles aria-valuenow, role="progressbar", capped at 100 width built-in |
| Form validation messages | Custom validation state | `zod` schema + `FormMessage` | Already wired in all existing forms via `@hookform/resolvers/zod` |
| Dialog open/close state | External state management | `useState(false)` + `onOpenChange` | Established pattern in `delete-asset-dialog.tsx` |
| Asset type filtering | New filter function | Filter `AssetPerformance[]` by `assetType` field | `AssetPerformance.assetType` already exists on every row |
| Current portfolio total for achievement % | New DB query | Reuse `computePortfolio(performances, fxRate).totalValueKrw` | Already computed on dashboard; same function available in `lib/portfolio.ts` |

**Key insight:** Every non-trivial piece of logic needed for Phase 5 already exists in the codebase. This phase is composition and extension, not invention.

---

## Common Pitfalls

### Pitfall 1: revalidatePath scope for dashboard goals section

**What goes wrong:** After creating/updating/deleting a goal, the dashboard goals section shows stale data.

**Why it happens:** `revalidatePath('/goals')` only invalidates the goals page cache. The dashboard at `/` has its own cache.

**How to avoid:** Call `revalidatePath('/')` in addition to `revalidatePath('/goals')` in all goal Server Actions.

**Warning signs:** Goal count on dashboard doesn't update after add/delete.

### Pitfall 2: shadcn Progress component not installed

**What goes wrong:** Wave 1 (dashboard goals section) fails to compile because `components/ui/progress` doesn't exist.

**Why it happens:** `progress` is not in the current `components/ui/` directory. [VERIFIED: bash check — file not found]

**How to avoid:** Install in Wave 0 before any other implementation: `npx shadcn add progress`.

**Warning signs:** TypeScript error "Cannot find module '@/components/ui/progress'".

### Pitfall 3: ReferenceLine x-axis date format mismatch

**What goes wrong:** Vertical deadline ReferenceLine for goals with `targetDate` renders at wrong position or not at all.

**Why it happens:** The X-axis `dataKey` must use the exact same string format as the `x` prop on `ReferenceLine`. `snapshotDate` returns ISO date strings like `"2026-01-15"`. If `targetDate` from the goals query has a different format, the line won't match any tick.

**How to avoid:** Ensure the goals DB query returns `targetDate` as the raw date string from Drizzle (Drizzle `date` columns with no mode return strings). Pass directly to `ReferenceLine x={goal.targetDate}`. Do not convert to `Date` object.

**Warning signs:** Vertical line renders at X-axis position 0 or is invisible.

### Pitfall 4: Achievement % overflow on progress bar width

**What goes wrong:** Progress bar renders wider than its container when achievement exceeds 100%.

**Why it happens:** shadcn `Progress` accepts `value` 0–100. Passing 150 causes visual overflow.

**How to avoid:** `<Progress value={Math.min(achievementPct, 100)} />` — cap the bar at 100. Display the actual percentage in the label (which may exceed 100%). [VERIFIED: CONTEXT.md D-03 specifies this exact behavior]

### Pitfall 5: Goals page — no `goals/` route exists yet

**What goes wrong:** Sidebar already has `{ label: '목표', href: '/goals' }` in NAV_ITEMS. Without the route, clicking "목표" results in a 404.

**Why it happens:** The sidebar was pre-configured in Phase 1/2 with the goals nav item, but the route was not created.

**How to avoid:** Creating `app/(app)/goals/page.tsx` in Plan 05-01 is the fix. This is expected — not a regression.

**Warning signs:** None (known state); clicking "목표" in sidebar currently 404s. [VERIFIED: sidebar.tsx line 11 — '목표' href='/goals' exists]

---

## Code Examples

### Achievement % Calculation

```typescript
// Source: CONTEXT.md D-03 + lib/portfolio.ts computePortfolio (verified)
const achievementPct = Math.round((summary.totalValueKrw / goal.targetAmountKrw) * 100)
// Progress bar: cap at 100; label: show actual
// <Progress value={Math.min(achievementPct, 100)} className="w-24 h-2" />
// <span className={achievementPct >= 100 ? 'text-emerald-600' : ''}>{achievementPct}% 달성</span>
```

### Goal Progress Chart Data Shape

```typescript
// Source: db/queries/portfolio-snapshots.ts getAllSnapshots() (verified)
// Returns: { snapshotDate: string, totalValueKrw: number, totalCostKrw: number, returnBps: number }[]
// Chart dataKey: 'totalValueKrw' on Y-axis, 'snapshotDate' on X-axis
// Y-axis formatter: (v) => formatKrw(Number(v))  -- reuse formatKrw from lib/portfolio
```

### Asset Type Filter (performance page)

```typescript
// Source: lib/portfolio/portfolio.ts AssetHoldingInput.assetType (verified)
const STOCK_TYPES = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us'] as const
const TAB_FILTER: Record<string, string[]> = {
  all: [],  // empty = no filter
  stocks: ['stock_kr', 'stock_us', 'etf_kr', 'etf_us'],
  crypto: ['crypto'],
  savings: ['savings'],
  real_estate: ['real_estate'],
}
// Usage: activeTab === 'all' ? performances : performances.filter(r => TAB_FILTER[activeTab].includes(r.assetType))
```

### Sidebar NAV_ITEMS Extension

```typescript
// Source: components/app/sidebar.tsx (verified — current NAV_ITEMS)
// Current: [대시보드, 자산, 거래내역, 차트, 목표]
// Add:
{ label: '성과', href: '/performance' }
// Insert after '목표' entry
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| TanStack Table for sortable tables | shadcn Table with useState sort | D-11 locked: TanStack Table explicitly deferred. PerformanceTable already handles sorting internally. |
| Per-goal chart | Unified AreaChart + multiple ReferenceLine | D-05 locked: simpler, less DOM overhead for single-user app |

**Not applicable to this phase:**
- No new APIs or external integrations introduced
- No schema migrations (goals table already exists)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `npx shadcn add progress` installs a `progress.tsx` at `components/ui/progress.tsx` compatible with base-nova preset | Standard Stack | Component path mismatch would require manual import path fix; low severity |
| A2 | recharts `ReferenceLine` with string `x` prop matches `XAxis dataKey` string values for date positioning | Architecture Patterns (Pitfall 3) | Vertical deadline lines would not render at correct position; fallback: use index-based positioning |

---

## Open Questions

1. **Toast for Server Action errors**
   - What we know: UI-SPEC specifies "toast notification (non-blocking), bottom-right, auto-dismisses after 5 seconds, --destructive background for errors"
   - What's unclear: No toast component is currently installed (`components/ui/` has no `sonner.tsx` or `toast.tsx`). Phase 2/3/4 may have added one — not confirmed.
   - Recommendation: Plan 05-01 Wave 0 should check for existing toast infrastructure. If absent, install `sonner` (the shadcn-recommended toast library) with `npx shadcn add sonner`. If error feedback is acceptable as inline text (simpler), defer toast to a later phase.

2. **Performance page data fetching**
   - What we know: Dashboard already fetches prices and computes performances. Performance page needs the same data.
   - What's unclear: Whether to call `refreshAllPrices()` on the performance page load (as dashboard does) or rely on the cached prices. Calling it on every page load creates redundant Finnhub API calls.
   - Recommendation: Performance page should NOT call `refreshAllPrices()` — read from `priceCache` only. Dashboard is the canonical price refresh trigger.

---

## Environment Availability

Step 2.6: All dependencies are npm packages or built-in recharts features. No external services, CLIs, or runtimes beyond what's already confirmed installed.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| recharts `ReferenceLine` | Goal progress chart | ✓ | 3.8.x (built-in) | — |
| shadcn `progress` | Dashboard goals section | ✗ | — | Install: `npx shadcn add progress` |
| shadcn `dialog` | Goal CRUD dialogs | ✓ | installed | — |
| shadcn `tabs` | /performance filter | ✓ | installed | — |
| goals DB table | All goal features | ✓ | Drizzle schema defined in Phase 1 | — |
| portfolio_snapshots rows | Goal progress chart | ✓ (schema) | Data populated by Phase 4 cron | Static "no data" message if empty |

**Missing dependencies with no fallback:** None that block execution.

**Missing dependencies with fallback:**
- `shadcn progress` — must install before Wave 1; fallback is a `<div>`-based bar (not recommended — accessibility loss)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x + jsdom |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GOAL-01 | Achievement % math: `round((currentTotal / targetAmount) * 100)` | unit | `npx vitest run tests/goal-achievement.test.ts` | ❌ Wave 0 |
| GOAL-01 | Goal schema Drizzle export | unit (smoke) | `npx vitest run tests/schema.test.ts` | ✅ (already includes goals table) |
| GOAL-02 | Goal progress chart renders ReferenceLine for each goal | manual | n/a — visual verification | manual |
| PERF-01 | PerformanceTable rows sorted by returnPct desc by default | unit | `npx vitest run tests/performance-filter.test.ts` | ❌ Wave 0 |
| PERF-02 | Asset type filter logic maps tabs to correct type arrays | unit | `npx vitest run tests/performance-filter.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/goal-achievement.test.ts` — covers GOAL-01 achievement % calculation (pure function, easy to unit test)
- [ ] `tests/performance-filter.test.ts` — covers PERF-01 sort default, PERF-02 tab filter logic
- [ ] `npx shadcn add progress` — install missing UI component
- [ ] Verify toast infrastructure exists or install `sonner`: `ls components/ui/sonner.tsx 2>/dev/null || echo "MISSING"`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `requireUser()` pattern (Supabase auth, already in all Server Actions) |
| V3 Session Management | no | Handled by Supabase middleware (Phase 1) |
| V4 Access Control | yes | Single-user app — `requireUser()` is sufficient; no row-level ownership needed |
| V5 Input Validation | yes | Zod schema on all `GoalFormValues` inputs |
| V6 Cryptography | no | No new crypto requirements |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated goal mutation | Elevation of Privilege | `requireUser()` in all Server Actions — redirect to `/login` |
| Mass assignment via form | Tampering | Zod schema explicitly lists allowed fields; no spread of raw `FormData` |
| Negative/zero targetAmount | Tampering | Zod: `z.coerce.number().int().min(1)` |
| XSS via goal name in chart label | Tampering | recharts `Label value={goal.name}` renders as SVG text — not innerHTML, no XSS risk |

---

## Sources

### Primary (HIGH confidence)

- Codebase direct read — `db/schema/goals.ts` — goals table definition confirmed
- Codebase direct read — `db/schema/portfolio-snapshots.ts` — snapshot data shape confirmed
- Codebase direct read — `components/app/performance-table.tsx` — PerformanceTable props and sort behavior confirmed
- Codebase direct read — `components/app/annual-return-chart.tsx` — recharts AreaChart pattern confirmed
- Codebase direct read — `app/(app)/charts/page.tsx` — Tabs + Suspense pattern confirmed
- Codebase direct read — `app/actions/assets.ts` — Server Action pattern confirmed
- Codebase direct read — `components/app/delete-asset-dialog.tsx` — Dialog CRUD pattern confirmed
- Codebase direct read — `components/app/sidebar.tsx` — NAV_ITEMS current state confirmed
- Codebase direct read — `app/(app)/page.tsx` — dashboard structure and computePortfolio usage confirmed
- Bash verification — `ls components/ui/progress*` returned no matches — progress component absent

### Secondary (MEDIUM confidence)

- `05-CONTEXT.md` decisions D-01 through D-12 — user-locked implementation choices
- `05-UI-SPEC.md` — component inventory, interaction contracts, copywriting, layout contracts

### Tertiary (LOW confidence)

- None required — all critical claims verified from codebase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified from `package.json`; missing component verified via bash
- Architecture: HIGH — all patterns read directly from existing codebase files
- Pitfalls: HIGH — derived from verified code patterns and schema definitions
- Validation: HIGH — test infrastructure confirmed via `vitest.config.ts` and `tests/` directory

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable stack — Next.js, recharts, shadcn unlikely to break in 30 days)
