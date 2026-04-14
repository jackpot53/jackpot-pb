# Milestones

## v1.0 연말 결산 MVP (Shipped: 2026-04-14)

**Phases completed:** 5 phases, 17 plans, 29 tasks

**Key accomplishments:**

- Next.js 16 App Router scaffolded with Supabase Auth + Drizzle ORM stack, shadcn/ui base-nova initialized, and Wave 0 TDD test infrastructure in place
- 7-table Drizzle ORM schema with BIGINT money types, is_voided soft-delete, append-only manual valuations, and generated SQL migration file for Supabase PostgreSQL
- Supabase cookie-based auth with Next.js 15 middleware using getUser() for secure server-side token validation, Korean login form (shadcn Card + react-hook-form + Zod), and Server Actions for sign-in/sign-out
- One-liner:
- One-liner:
- One-liner:
- Append-only manual valuation workflow (savings/real_estate) wired into 개요 tab: INSERT-only Server Action, Drizzle query helper, and OverviewTab client component with conditional valuation history
- 1. [Rule 3 - Blocking] bok-fx.ts created in Task 2 instead of Task 3
- `lib/portfolio/portfolio.ts`
- `components/app/dashboard-stat-card.tsx`
- `components/app/performance-table.tsx`
- One-liner:
- One-liner:
- recharts AreaChart UI layer with Server Component data fetch, tab navigation (연간/월간), custom Korean tooltips, and InsufficientDataMessage fallback for <2 snapshots.
- 1. [Rule 1 - Bug] Fixed zodResolver TypeScript type errors in GoalDialog
- Recharts AreaChart on /goals showing portfolio KRW over time with horizontal ReferenceLine per goal target and vertical ReferenceLine per goal deadline
- One-liner:

---
