---
phase: 01-foundation
plan: 04
subsystem: auth
tags: [supabase, drizzle, rls, multi-user, migration, postgresql]
key-decisions:
  - "userId 컬럼은 Drizzle 스키마에서 FK 없이 uuid만 선언 — auth.users FK는 SQL 마이그레이션에서 추가 (Drizzle 외부 스키마)"
  - "DATABASE_URL superuser 연결은 RLS 우회 — 앱 레이어 userId 필터가 1차 방어, RLS는 Dashboard/PostgREST 심층 방어"
  - "CRON_TARGET_USER_ID 미설정 시 cron이 500 반환 — fail-closed 안전 패턴"
  - "holdings.onConflictDoUpdate에서 userId는 업데이트 대상 제외 — 자산 소유자는 변경 불가"
dependency-graph:
  requires: [01-01, 01-02, 01-03]
  provides: [multi-user-data-isolation, rls-defense, cron-user-targeting]
  affects: [all-subsequent-phases]
tech-stack:
  added: []
  patterns: [userId-filter-on-all-queries, requireUser-pattern, CRON_TARGET_USER_ID]
key-files:
  created:
    - db/migrations/0005_add_user_id.sql
  modified:
    - db/schema/assets.ts
    - db/schema/transactions.ts
    - db/schema/manual-valuations.ts
    - db/schema/holdings.ts
    - db/schema/goals.ts
    - db/schema/portfolio-snapshots.ts
    - lib/holdings.ts
    - lib/snapshot/writer.ts
    - lib/server/load-performances.ts
    - db/queries/assets-with-holdings.ts
    - db/queries/assets.ts
    - db/queries/goals.ts
    - db/queries/portfolio-snapshots.ts
    - db/queries/transactions.ts
    - db/queries/manual-valuations.ts
    - app/actions/assets.ts
    - app/actions/transactions.ts
    - app/actions/manual-valuations.ts
    - app/actions/goals.ts
    - app/actions/snapshot.ts
    - app/api/cron/snapshot/route.ts
    - app/(app)/page.tsx
    - app/(app)/assets/page.tsx
    - app/(app)/assets/[id]/page.tsx
    - app/(app)/assets/[id]/edit/page.tsx
    - app/(app)/charts/page.tsx
    - app/(app)/goals/page.tsx
    - app/(app)/transactions/page.tsx
    - .env.local.example
    - tests/snapshot-writer.test.ts
metrics:
  completed_date: "2026-04-14"
  tasks: 3
  files_modified: 29
---

# Phase 01 Plan 04: 멀티 유저 아키텍처 Summary

**Completed:** 2026-04-14
**Tasks:** 3/3

## What was built

6개 사용자 데이터 테이블에 `user_id UUID NOT NULL` 컬럼을 추가하는 Drizzle 스키마 업데이트와 Supabase SQL 마이그레이션 파일을 작성하고, 모든 데이터 쿼리/액션/Server Component에서 인증된 userId로 필터링하는 멀티 유저 아키텍처를 구현했다.

## Key changes

- **Migration:** `db/migrations/0005_add_user_id.sql` — nullable 추가→백필→NOT NULL→FK→(user_id, snapshot_date) 복합 UNIQUE→인덱스→RLS 정책 순서로 실행하는 Supabase SQL Editor 수동 실행용 마이그레이션 파일
- **Schema:** 6개 테이블(`assets`, `transactions`, `manual_valuations`, `holdings`, `goals`, `portfolio_snapshots`)에 `userId: uuid('user_id').notNull()` 컬럼 추가. `portfolio_snapshots`에서 `snapshotDate.unique()` 제거 (복합 UNIQUE로 대체)
- **Queries:** `getAssetsWithHoldings(userId)`, `getAssets(userId)`, `getAssetById(id, userId)`, `listGoals(userId)`, `getAllSnapshots(userId)`, `getAllTransactionsWithAsset(userId)`, `getValuationsByAsset(assetId, userId)` — 모든 사용자 데이터 쿼리에 userId 필터 추가
- **Lib:** `upsertHoldings(assetId, userId)` 시그니처 변경 및 INSERT에 userId 포함. `SnapshotParams`에 `userId` 필드 추가. `loadPerformances(userId)` 시그니처 변경
- **Actions:** 모든 Server Action INSERT에 `userId: user.id` 추가, UPDATE/DELETE where에 `and(eq(id, id), eq(userId, user.id))` 필터 추가
- **Cron:** `CRON_TARGET_USER_ID` env var 미설정 시 500 반환, `getAssetsWithHoldings(targetUserId)` + `writePortfolioSnapshot({ userId: targetUserId })` 적용
- **Server Components:** 6개 page.tsx에서 `supabase.auth.getUser()`로 userId 추출 후 모든 쿼리 함수에 전달
- **Env:** `.env.local.example`에 `CRON_TARGET_USER_ID` 문서화

## Commits

| Hash | Description |
|------|-------------|
| b5bd973 | feat(01-04): 마이그레이션 SQL + 6개 스키마에 userId 컬럼 추가 |
| 438e858 | feat(01-04): 데이터 계층 userId 파라미터 추가 — lib + db/queries |
| 5072264 | feat(01-04): 앱 레이어 userId 적용 — Server Actions + Cron + Server Components |

## Post-execution manual step required

⚠️ 마이그레이션 SQL은 Supabase Dashboard → SQL Editor에서 수동 실행 필요:
1. `db/migrations/0005_add_user_id.sql` 파일 열기
2. `<ADMIN_USER_UUID>` 를 Supabase Dashboard → Authentication → Users의 실제 UUID로 교체
3. SQL Editor에서 전체 SQL 실행
4. `.env.local`과 Vercel 환경변수에 `CRON_TARGET_USER_ID=<your-uuid>` 추가

## Verification

- [x] `npx tsc --noEmit` — Plan 04로 인한 새 에러 0건 (기존 에러들은 pre-existing)
- [x] Migration SQL 파일 생성 및 구조 검증 완료
- [x] 6개 스키마 파일 모두 userId 컬럼 포함
- [x] `upsertHoldings` 모든 호출에 userId 인수 포함
- [x] `writePortfolioSnapshot` 호출에 userId 포함

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] db/queries/transactions.ts SELECT에 userId 누락**
- **Found during:** Task 3 TypeScript 검증
- **Issue:** `getAllTransactionsWithAsset`의 SELECT에 `userId` 컬럼을 명시하지 않아 `Transaction` extends 타입과 불일치 발생
- **Fix:** SELECT 목록에 `userId: transactions.userId` 추가
- **Files modified:** `db/queries/transactions.ts`
- **Commit:** 5072264

**2. [Rule 2 - Missing Critical Functionality] app/actions/snapshot.ts userId 누락**
- **Found during:** Task 3 TypeScript 검증
- **Issue:** `takeSnapshot` 액션이 `loadPerformances()`와 `writePortfolioSnapshot()`을 userId 없이 호출
- **Fix:** `loadPerformances(user.id)`, `writePortfolioSnapshot({ ..., userId: user.id })` 적용
- **Files modified:** `app/actions/snapshot.ts`
- **Commit:** 5072264

**3. [Rule 2 - Missing Critical Functionality] tests/snapshot-writer.test.ts userId 누락**
- **Found during:** Task 3 TypeScript 검증
- **Issue:** 테스트 픽스처가 `userId` 없이 `SnapshotParams`를 생성해 타입 에러 발생
- **Fix:** 테스트에 `userId: 'test-user-id'` 추가
- **Files modified:** `tests/snapshot-writer.test.ts`
- **Commit:** 5072264

## Known Stubs

없음 — 모든 구현이 실제 데이터로 연결됨.

## Threat Flags

없음 — 이번 Plan이 새로운 네트워크 엔드포인트나 신뢰 경계를 추가하지 않음.

## Self-Check: PASSED
