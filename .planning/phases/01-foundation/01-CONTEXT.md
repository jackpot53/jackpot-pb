# Phase 1: Foundation - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

인증된 앱과 올바른 데이터 스키마를 갖춘 배포 가능한 기반을 구축한다. Next.js 16 스캐폴드, Supabase Auth (이메일/비밀번호), Drizzle ORM으로 PostgreSQL 스키마 정의, Vercel 배포 설정이 포함된다. 자산 CRUD, 시세 API, 차트 등은 별도 페이즈 범위다.

</domain>

<decisions>
## Implementation Decisions

### 배포 대상
- **D-01:** Vercel에 배포. Next.js App Router에 최적화, 자동 배포 CI 내장.
- **D-02:** Phase 4 야간 크론 잡은 Vercel Cron Jobs (`vercel.json` 설정)로 구현한다.

### ORM 및 데이터 접근
- **D-03:** Drizzle ORM + Supabase PostgreSQL. Supabase SDK는 Auth에만 사용하고, DB 쿼리는 Drizzle을 통해 타입 안전하게 처리한다.
- **D-04:** 금액은 모두 BIGINT (KRW 원 단위, 소수점 없음). 부동소수점 오류 방지를 위해 정수 저장 강제.
- **D-05:** 거래(Transaction) 테이블에 `is_voided` 불리언 컬럼 추가 — 삭제 대신 무효화(append-only 원장 패턴).
- **D-06:** ManualValuation은 append-only (수정 금지, 삽입만 허용) — 과거 이력 보존을 위해.

### 로그인 UI
- **D-07:** 전체 페이지 `/login` 라우트. 화면 중앙에 shadcn Card 컴포넌트로 이메일/비밀번호 폼 표시.
- **D-08:** 미인증 요청은 모두 `/login`으로 리다이렉트. 로그인 후 원래 요청 페이지로 복귀.

### 로컬 개발 환경
- **D-09:** 클라우드 Supabase 프로젝트 직접 사용. 로컬 Supabase CLI 없음.
- **D-10:** `.env.local`에 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (Drizzle용 직접 PostgreSQL 연결) 관리.

### Claude's Discretion
- shadcn/ui 컴포넌트 테마 선택 (기본 테마로 시작)
- ESLint/Prettier 설정 세부사항
- Drizzle 스키마 파일 구조 (`db/schema/` 디렉토리 권장)
- 로딩 스켈레톤 및 에러 상태 디자인

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 요구사항
- `.planning/REQUIREMENTS.md` §Authentication — AUTH-01, AUTH-02 수락 기준
- `.planning/ROADMAP.md` §Phase 1 — 성공 기준 4개 (로그인 지속, 로그아웃, DB 테이블, 미인증 리다이렉트)

### 아키텍처 결정
- `.planning/research/ARCHITECTURE.md` — 핵심 데이터 모델 (Asset, Transaction, ManualValuation, Holdings, PriceCache, PortfolioSnapshot, Goal)
- `.planning/research/PITFALLS.md` — 금액 정수 저장, append-only 패턴, holdings 집계 테이블 필요성
- `.planning/research/STACK.md` — 스택 버전 (Next.js 16.2.3, Drizzle ORM 0.45.2, Tailwind v4.2.2, shadcn CLI 4.2.0)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 현재 코드베이스에 재사용 가능한 컴포넌트 없음 (그린필드 프로젝트)

### Established Patterns
- Next.js App Router 패턴 사용 (Pages Router 아님)
- `@supabase/ssr` 패키지로 서버사이드 세션 처리 (쿠키 기반)
- Drizzle은 `db/` 디렉토리에 위치 (스키마, 마이그레이션, 클라이언트)

### Integration Points
- Supabase Auth ↔ Drizzle ORM: Auth는 Supabase SDK로, DB 쿼리는 Drizzle로 분리
- Vercel 환경변수 ↔ `.env.local` 동기화 필요

</code_context>

<specifics>
## Specific Ideas

- DB 스키마에 모든 테이블을 Phase 1에 한 번에 정의한다 (Asset, Transaction, ManualValuation, Holdings, PriceCache, PortfolioSnapshot, Goal) — 나중에 마이그레이션 비용 최소화
- 금액 관련 컬럼: `amount_krw BIGINT NOT NULL`, `exchange_rate_at_time BIGINT` (소수점 4자리 × 10000 정수 저장)
- 트랜잭션에 `currency VARCHAR(3)` 컬럼 — 한국 주식은 'KRW', 미국 주식은 'USD'

</specifics>

<deferred>
## Deferred Ideas

- 비밀번호 재설정 이메일 — v2 요구사항 (AUTH-V2-01)
- OAuth 로그인 — v2 요구사항 (AUTH-V2-02)
- Supabase Row Level Security (RLS) — 싱글 유저라 서버사이드 검증으로 충분, 복잡도 불필요

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-09*
