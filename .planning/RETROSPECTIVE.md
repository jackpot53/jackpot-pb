# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.0 — 연말 결산 MVP

**Shipped:** 2026-04-14
**Phases:** 5 | **Plans:** 17 | **Timeline:** 2026-04-08 → 2026-04-14 (6일)
**Code:** 6,638 LOC TypeScript | **Tests:** 75+ passing | **Commits:** 162

### What Was Built

- **인증 + 스키마**: Next.js 16 + Supabase Auth + Drizzle ORM 스캐폴드. BIGINT 금액 타입, is_voided, append-only ManualValuation 등 재무 데이터 제약을 Day 1에 확정
- **자산 + 거래 CRUD**: 가중평균단가 순수 함수 TDD, 종목 등록/수정/삭제, 매수/매도 거래 기록, 수동 평가액 이력
- **가격 연동 + 대시보드**: Finnhub(주식/ETF) + BOK ECOS(환율) 어댑터, 5분 TTL + 스테일 폴백 캐시, 4개 스탯 카드 + recharts 도넛 차트
- **히스토리 차트**: 야간 크론 스냅샷 인프라, 연간/월간 AreaChart, InsufficientDataMessage 폴백
- **목표 + 성과**: 목표 CRUD + 달성률 Progress bar, 목표 진행 차트(ReferenceLine), 성과 비교 페이지 + 자산 유형별 탭 필터

### What Worked

- **Day-1 스키마 결정**: 금액 정수 저장, PortfolioSnapshot 테이블 미리 정의 등 재무 모델 제약을 Phase 1에서 확정한 것이 이후 리팩터를 완전히 방지
- **TDD 순수 함수**: portfolio math, holdings 계산, 탭 필터 로직 등 비즈니스 로직을 순수 함수로 분리하고 단위 테스트 먼저 작성한 패턴이 일관성 있게 유지됨
- **Server Component + Client Island 패턴**: 데이터 페칭은 Server Component, 인터랙션은 Client island로 분리하는 패턴이 명확하고 유지보수하기 좋음
- **`loadPerformances()` 공유 헬퍼**: 코드 리뷰에서 발견해 추출 — 중복 제거와 성과 페이지 단순화 동시 달성

### What Was Inefficient

- **pgbouncer 설정 누락**: `prepare: false` 미설정으로 UAT 중 20~30초 hang 발생. DB 연결 설정은 스택 결정 시점에 문서화해야 했음
- **loading.tsx 미구현**: 모든 라우트에 loading.tsx를 Phase 2 또는 3에서 추가했어야 함. UAT 직전까지 누락되어 탐색 UX가 좋지 않았음
- **GoalDialog key prop 누락**: useTransition isPending이 Dialog 리마운트 없이 유지되는 패턴은 예측 가능한 버그였으나 UAT 전까지 발견 안 됨

### Patterns Established

- `prepare: false` + `max: 5` + `idle_timeout: 60` — Supabase pgbouncer Transaction Mode 표준 설정
- DB 클라이언트 전역 싱글톤 (`global.__dbClient`) — dev HMR 연결 재생성 방지
- Suspense 스트리밍 — 무거운 쿼리(스냅샷 등)는 Suspense로 분리해 즉시 렌더링 가능한 부분부터 표시
- `key={dialogMode}` 패턴 — 모드 전환 시 Dialog 컴포넌트 리마운트로 상태 초기화

### Key Lessons

1. **pgbouncer Transaction Mode는 `prepare: false` 필수** — Supabase 풀러 포트 6543 사용 시 반드시 설정. 미설정 시 hang으로 진단하기 매우 어려움
2. **loading.tsx는 라우트 생성 시 함께** — 나중에 추가하면 UX 이슈가 UAT까지 숨겨짐
3. **금액 타입은 스키마 Day 1 결정** — 나중에 바꾸는 것이 매우 고통스러움. "일단 float으로 하고 나중에 바꾸자"는 생각은 위험
4. **Dialog 컴포넌트의 isPending 상태는 open/close만으로 초기화되지 않음** — 항상 마운트 상태로 유지되는 Dialog는 모드 변경 시 key prop으로 리마운트 필요

### Cost Observations

- Sessions: 여러 세션에 걸쳐 진행
- Notable: Supabase pgbouncer 이슈가 UAT에서야 발견됨 — 스택 설정 검증을 Phase 1 완료 직후 수행했으면 더 일찍 발견 가능

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Process Change |
|-----------|--------|-------|--------------------|
| v1.0 | 5 | 17 | 초기 구축 — 패턴 확립 |

### Recurring Issues

- Supabase 연결 설정 검증 → 스택 확정 직후 수행 필요

### Cumulative Decisions

- pgbouncer Transaction Mode: `prepare: false` 필수 (v1.0)
- DB 금액 정수 저장 확정 (v1.0)
- Server Component + Client Island 아키텍처 (v1.0)
