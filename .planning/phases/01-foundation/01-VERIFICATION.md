---
phase: 01-foundation
verified: 2026-04-14T21:55:00Z
status: gaps_found
score: 5/6 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 4/4 automated + 3 human pending
  gaps_closed:
    - "멀티 유저 아키텍처 전체 미구현 (Plan 04 이전 상태)"
  gaps_remaining:
    - "tests/cron-snapshot.test.ts — CRON_TARGET_USER_ID 미설정 시 200 기대, 실제 500 반환"
  regressions:
    - "cron-snapshot 테스트가 Plan 04 CRON_TARGET_USER_ID 추가로 인해 깨짐"
gaps:
  - truth: "모든 SELECT 쿼리는 인증된 user_id로 필터링된다"
    status: partial
    reason: "getTransactionsByAsset(assetId)와 getHoldingByAssetId(assetId)가 userId 파라미터 없이 assetId만으로 조회한다. 호출 지점에서 getAssetById(id, user.id)로 ownership을 먼저 검증하므로 실질적 데이터 노출은 없으나, 쿼리 레이어 자체의 격리가 불완전하다."
    artifacts:
      - path: "db/queries/transactions.ts"
        issue: "getTransactionsByAsset(assetId) — userId 필터 없음"
      - path: "db/queries/holdings.ts"
        issue: "getHoldingByAssetId(assetId) — userId 필터 없음"
    missing:
      - "getTransactionsByAsset(assetId, userId) 시그니처로 변경 후 호출부 동기화"
      - "getHoldingByAssetId(assetId, userId) 시그니처로 변경 후 호출부 동기화"
  - truth: "테스트 스위트가 Plan 04 변경 포함 전체 통과한다"
    status: failed
    reason: "tests/cron-snapshot.test.ts의 'returns 200 when Authorization header is correct' 케이스가 실패. Plan 04에서 CRON_TARGET_USER_ID 체크 로직을 route.ts에 추가했으나 테스트의 beforeEach에서 해당 env var를 설정하지 않아 500 반환."
    artifacts:
      - path: "tests/cron-snapshot.test.ts"
        issue: "beforeEach에서 CRON_TARGET_USER_ID 미설정 — 49/50 통과, 1 실패"
    missing:
      - "beforeEach의 process.env에 CRON_TARGET_USER_ID: 'test-user-uuid' 추가"
human_verification:
  - test: "Supabase Migration 0005_add_user_id.sql 수동 실행 확인"
    expected: "6개 테이블(assets, transactions, manual_valuations, holdings, goals, portfolio_snapshots)에 user_id 컬럼 존재, RLS 활성화됨"
    why_human: "DB 마이그레이션은 agent가 실행할 수 없음 — Supabase SQL Editor에서 수동 실행 필요. ADMIN_USER_UUID를 실제 UUID로 교체 후 실행."
  - test: "로그인/세션 지속 확인 (AUTH-01)"
    expected: "이메일/비밀번호 로그인 후 브라우저 새로고침 및 새 탭에서도 세션 유지"
    why_human: "라이브 Supabase Auth 연결 및 브라우저 필요"
  - test: "로그아웃 및 미인증 리다이렉트 확인 (AUTH-02)"
    expected: "로그아웃 후 /login 리다이렉트, 미인증 상태에서 / 접근 시 /login?redirect=%2F 리다이렉트"
    why_human: "라이브 Supabase Auth 세션 관리 및 브라우저 필요"
---

# Phase 01: Foundation Verification Report (Re-verification — Post Multi-User)

**Phase Goal:** A deployed, authenticated app with the correct data schema that enforces all financial data constraints from day one
**Verified:** 2026-04-14T21:55:00Z
**Status:** gaps_found
**Re-verification:** Yes — Post Plan 04 (Multi-User Architecture)

---

## Goal Achievement

### Observable Truths

#### Plan 01-04 Must-Haves (신규 검증)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 사용자 A가 등록한 자산은 사용자 B에게 노출되지 않는다 | ✓ VERIFIED | 모든 주요 쿼리(getAssets, getAssetById, getAssetsWithHoldings, getAllSnapshots, listGoals, getAllTransactionsWithAsset, getValuationsByAsset)에 userId 필터 적용됨 |
| 2 | 신규 자산/거래/목표 INSERT에는 authenticated user_id가 저장된다 | ✓ VERIFIED | assets.ts: `userId: user.id`, transactions.ts: `userId: user.id`, manual-valuations.ts: `userId: user.id`, goals.ts: `userId: user.id` — requireUser() 패턴 통일 |
| 3 | 모든 SELECT 쿼리는 인증된 user_id로 필터링된다 | ⚠️ PARTIAL | `getTransactionsByAsset`(assetId만), `getHoldingByAssetId`(assetId만) — userId 필터 누락. 호출 지점에서 ownership 검증은 있으나 쿼리 레이어 격리 불완전 |
| 4 | 크론 잡이 CRON_TARGET_USER_ID 대상 사용자의 스냅샷만 기록한다 | ✓ VERIFIED | route.ts: `if (!targetUserId) return 500`, `getAssetsWithHoldings(targetUserId)`, `writePortfolioSnapshot({ userId: targetUserId })` |
| 5 | 기존 데이터가 손실되지 않는다 (백필 마이그레이션) | ✓ VERIFIED | 0005_add_user_id.sql: nullable 추가 → UPDATE 백필 → NOT NULL 순서로 실행 |
| 6 | 6개 테이블에 RLS가 활성화되어 있다 (심층 방어) | ✓ VERIFIED (SQL 파일 기준) | 0005_add_user_id.sql에 6개 테이블 ENABLE ROW LEVEL SECURITY + auth.uid() 기반 CRUD 정책 정의됨. 실제 적용은 수동 실행 필요 |

**Plan 04 Score:** 5/6 truths verified (1 partial)

#### ROADMAP Phase 1 Success Criteria (기존 검증 유지)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 이메일/비밀번호 로그인 및 세션 유지 | ? HUMAN | Plan 03에서 사용자 승인됨. 코드: signIn Server Action, Supabase SSR 쿠키 세션 |
| 2 | 어느 페이지에서든 로그아웃 가능 | ? HUMAN | signOut Server Action → supabase.auth.signOut() 구현됨 |
| 3 | 모든 DB 테이블 BIGINT 금액, is_voided 포함 | ? HUMAN | 스키마 정확하나 Migration 실제 적용 여부 미확인 |
| 4 | 미인증 요청 /login으로 리다이렉트 | ✓ VERIFIED | middleware.ts + updateSession() 유닛 테스트 4/4 통과 |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 전체 테스트 스위트 | `npx vitest run tests/` | 49/50 통과, 1 실패 | ✗ FAIL |
| cron-snapshot 200 반환 (CRON_TARGET_USER_ID 설정 시) | cron-snapshot.test.ts | 500 반환 (env var 미설정) | ✗ FAIL |
| 미인증 리다이렉트 | middleware.test.ts | 4/4 통과 | ✓ PASS |
| TypeScript 컴파일 (Plan 04 신규 에러) | `npx tsc --noEmit` | 11개 에러 — 모두 pre-existing (Plan 04 이전 12개, 이후 11개로 감소) | ✓ PASS |

---

### Required Artifacts

#### Plan 04 신규 아티팩트

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `db/migrations/0005_add_user_id.sql` | nullable→백필→NOT NULL→FK→복합UNIQUE→인덱스→RLS | ✓ VERIFIED | 전체 구조 확인됨. `<ADMIN_USER_UUID>` placeholder는 수동 치환 후 실행 |
| `db/schema/assets.ts` | userId 컬럼 포함 | ✓ VERIFIED | `userId: uuid('user_id').notNull()` |
| `db/schema/transactions.ts` | userId 컬럼 포함 | ✓ VERIFIED | `userId: uuid('user_id').notNull()` |
| `db/schema/manual-valuations.ts` | userId 컬럼 포함 | ✓ VERIFIED | `userId: uuid('user_id').notNull()` |
| `db/schema/holdings.ts` | userId 컬럼 포함 | ✓ VERIFIED | `userId: uuid('user_id').notNull()` |
| `db/schema/goals.ts` | userId 컬럼 포함 | ✓ VERIFIED | `userId: uuid('user_id').notNull()` |
| `db/schema/portfolio-snapshots.ts` | userId 포함, snapshotDate 단독 unique 제거 | ✓ VERIFIED | userId 추가, `.unique()` 제거됨. 복합 UNIQUE는 SQL에서 추가 |
| `db/schema/price-cache.ts` | 변경 없음 (userId 불필요) | ✓ VERIFIED | userId 없음 — 공유 캐시로 설계 |
| `lib/holdings.ts` | upsertHoldings(assetId, userId) | ✓ VERIFIED | 시그니처 변경됨, INSERT에 userId 포함, onConflictDoUpdate에서 userId 제외 |
| `lib/snapshot/writer.ts` | SnapshotParams에 userId 포함 | ✓ VERIFIED | `userId: string` 필드 추가, INSERT에 params 전체 전달 |
| `app/actions/assets.ts` | requireUser() + userId INSERT/UPDATE/DELETE | ✓ VERIFIED | createAsset: `userId: user.id`, updateAsset: `and(eq(assets.id, id), eq(assets.userId, user.id))` |
| `app/actions/transactions.ts` | requireUser() + userId INSERT/DELETE | ✓ VERIFIED | createTransaction: `userId: user.id`, ownership 검증 포함 |
| `app/actions/manual-valuations.ts` | requireUser() + userId INSERT | ✓ VERIFIED | `userId: user.id` 포함 |
| `app/actions/goals.ts` | requireUser() + userId INSERT/UPDATE/DELETE | ✓ VERIFIED | 모든 mutating action에 userId 필터 적용 |
| `app/api/cron/snapshot/route.ts` | CRON_TARGET_USER_ID 미설정 시 500 | ✓ VERIFIED | `if (!targetUserId) return Response.json({ ok: false, error: '...' }, { status: 500 })` |
| `.env.local.example` | CRON_TARGET_USER_ID 문서화 | ✓ VERIFIED | 설명과 함께 `CRON_TARGET_USER_ID=your-admin-user-uuid-here` |

#### Server Components (userId 추출 검증)

| Component | getUser() 호출 | userId 전달 | Status |
|-----------|---------------|------------|--------|
| `app/(app)/page.tsx` | ✓ | loadPerformances(user.id), listGoals(user.id) | ✓ VERIFIED |
| `app/(app)/assets/page.tsx` | ✓ | loadPerformances(user.id) | ✓ VERIFIED |
| `app/(app)/assets/[id]/page.tsx` | ✓ | getAssetById(id, user.id), getValuationsByAsset(id, user.id) | ✓ VERIFIED |
| `app/(app)/charts/page.tsx` | ✓ | ChartsPageContent에 userId={user.id} 전달 | ✓ VERIFIED |
| `app/(app)/goals/page.tsx` | ✓ | listGoals(user.id), GoalCharts에 userId={user.id} | ✓ VERIFIED |
| `app/(app)/transactions/page.tsx` | ✓ | getAllTransactionsWithAsset(user.id), getAssets(user.id) | ✓ VERIFIED |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/actions/assets.ts` | `db/schema/assets.ts` | requireUser() → userId: user.id INSERT | ✓ WIRED | userId: user.id 직접 확인 |
| `db/queries/assets-with-holdings.ts` | `db/schema/assets.ts` | getAssetsWithHoldings(userId) → where(eq(assets.userId, userId)) | ✓ WIRED | line 50: `.where(eq(assets.userId, userId))` |
| `app/api/cron/snapshot/route.ts` | `lib/snapshot/writer.ts` | CRON_TARGET_USER_ID → writePortfolioSnapshot({ userId }) | ✓ WIRED | line 111: `writePortfolioSnapshot({ ..., userId: targetUserId })` |
| `app/api/cron/snapshot/route.ts` | env var CRON_TARGET_USER_ID | fail-closed 500 | ✓ WIRED | line 45-48: if (!targetUserId) return 500 |
| `db/queries/transactions.ts` | `db/schema/transactions.ts` | getTransactionsByAsset(assetId) — userId 없음 | ⚠️ PARTIAL | userId 필터 미적용 — 호출부에서 asset ownership은 검증됨 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-01 | 01-03-PLAN.md | 이메일/비밀번호 로그인, 다른 기기 세션 유지 | ? HUMAN | 코드 구현됨, 라이브 브라우저 확인 필요 |
| AUTH-02 | 01-03-PLAN.md | 로그아웃, 미인증 리다이렉트 | ✓ VERIFIED (automated) + ? HUMAN (live) | 미들웨어 테스트 통과, 라이브 확인 필요 |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `tests/cron-snapshot.test.ts` | 39 | `process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'testSecret' }` — CRON_TARGET_USER_ID 미포함 | 🛑 Blocker | 테스트 1개 실패. Plan 04 CRON_TARGET_USER_ID 추가 후 테스트 동기화 누락 |
| `db/queries/transactions.ts` | 14 | `getTransactionsByAsset(assetId)` — userId 파라미터 없음 | ⚠️ Warning | 쿼리 레이어 격리 불완전. 호출부 ownership 검증으로 완화됨 |
| `db/queries/holdings.ts` | 7 | `getHoldingByAssetId(assetId)` — userId 파라미터 없음 | ⚠️ Warning | 동상. 호출부에서 getAssetById(id, user.id)가 먼저 실행됨 |

---

### Human Verification Required

#### 1. Supabase Migration 0005_add_user_id.sql 실행

**Test:** `db/migrations/0005_add_user_id.sql` 파일에서 `<ADMIN_USER_UUID>` 를 Supabase Dashboard → Authentication → Users의 실제 UUID로 교체한 뒤, SQL Editor에서 전체 실행.
**Expected:** 6개 테이블에 user_id 컬럼 생성, RLS 활성화, (user_id, snapshot_date) 복합 UNIQUE 반영
**Why human:** agent가 Supabase DB에 직접 연결하여 DDL을 실행할 수 없음

#### 2. 로그인 및 세션 지속 (AUTH-01)

**Test:** `npm run dev` 실행 후 http://localhost:3000 접속, 이메일/비밀번호 입력 후 로그인. 새로고침 및 새 탭에서 세션 유지 확인.
**Expected:** 로그인 후 대시보드 표시, 새로고침 후도 인증 유지
**Why human:** 라이브 Supabase Auth 연결 필요

#### 3. 로그아웃 및 미인증 리다이렉트 (AUTH-02)

**Test:** 로그인 상태에서 로그아웃 클릭, 이후 / 직접 접속 시도.
**Expected:** 로그아웃 → /login 리다이렉트. / 접속 시 /login?redirect=%2F 리다이렉트.
**Why human:** 라이브 Supabase Auth 세션 관리 필요

---

### Gaps Summary

Plan 04 구현은 전반적으로 정확하고 완성도가 높습니다. 2개 실질적 갭이 발견되었습니다:

**갭 1 (Blocker): cron-snapshot 테스트 실패**
`tests/cron-snapshot.test.ts`가 `CRON_TARGET_USER_ID` 환경변수를 테스트에서 설정하지 않아 Plan 04 이후 테스트가 실패합니다. 수정은 단순합니다: `beforeEach`에서 `CRON_TARGET_USER_ID: 'test-user-uuid'` 추가.

**갭 2 (Warning): 쿼리 레이어 부분적 격리 누락**
`getTransactionsByAsset(assetId)`와 `getHoldingByAssetId(assetId)` 두 쿼리 함수가 userId 없이 assetId만으로 동작합니다. 호출 지점에서 `getAssetById(id, user.id)`로 ownership을 먼저 검증하므로 실질적 데이터 노출은 없으나, Plan 04 목표인 "모든 SELECT 쿼리에 userId 필터"를 완전히 달성하지 못합니다.

---

_Verified: 2026-04-14T21:55:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Post Plan 04 Multi-User Architecture_
