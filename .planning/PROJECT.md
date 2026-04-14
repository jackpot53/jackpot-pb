# jackpot-pb

## What This Is

개인 자산 관리 웹 앱. 주식/ETF, 예적금, 부동산, 암호화폐 등 다양한 상품의 보유 내역을 기록하고, 실시간 시세 API로 수익률을 자동 계산해 연간/월간 단위로 자산 성장을 추적한다. 싱글 유저 대상으로, 연말에 "올해 내 자산이 얼마나 늘었나"를 한 화면에서 확인하는 것이 핵심이다.

v1.0에서: Next.js 16 + Supabase(Auth + PostgreSQL) + Drizzle ORM + shadcn/ui 스택으로 구축. Finnhub(주식/ETF) + BOK ECOS(환율) API 연동. 7개 테이블, 6,638 LOC TypeScript.

## Core Value

연말 결산 — 전체 자산의 연간 수익률과 상품별 성과를 한눈에 볼 수 있어야 한다.

*(v1.0 출하 후 검증: Core Value는 여전히 정확하다. 성과 비교 + 목표 달성률 + 연간/월간 차트가 모두 이 가치에 직결된다.)*

## Requirements

### Validated

- ✓ 사용자 인증 (싱글 유저, 멀티 디바이스 로그인) — v1.0
- ✓ 자산 종목 등록 및 거래 내역 기록 (매수/매도별 수량·가격·날짜) — v1.0
- ✓ 주식/ETF 실시간 시세 API 연동 (Finnhub) + 스테일 폴백 — v1.0
- ✓ 부동산·예적금 수동 가치 업데이트 (이력 보존) — v1.0
- ✓ 전체 자산 대시보드 (총 자산 KRW/USD, 배분 차트, 전체 수익률) — v1.0
- ✓ 연간/월간 수익률 히스토리 차트 (야간 스냅샷 크론 기반) — v1.0
- ✓ 상품별 성과 비교 화면 + 자산 유형별 필터 — v1.0
- ✓ 투자 목표 금액 설정 및 달성률 추적 — v1.0

### Active

*(다음 마일스톤 요구사항은 `/gsd-new-milestone`에서 정의)*

### Out of Scope

- 소셜/공유 기능 — 개인 전용 앱
- 모바일 네이티브 앱 — 웹 브라우저로 충분 (PWA 고려 가능)
- 자동 증권사/은행 API 연동 — 수동 입력 + 시세 API로 충분히 커버
- 암호화폐 실시간 시세 (CoinGecko) — v1.0에서 미구현, v1.1 후보

## Context

**현재 상태 (v1.0 출하 후):**
- 스택: Next.js 16 (App Router, Turbopack), Supabase (Auth + PostgreSQL), Drizzle ORM, shadcn/ui base-nova, Vitest, recharts
- 규모: 6,638 LOC TypeScript, 17 plans, 75+ 테스트 통과
- 배포: Vercel (예정) + Supabase Cloud (ap-northeast-2)
- DB 연결: pgbouncer Transaction Mode (port 6543) — `prepare: false` 필수
- 추적 자산: 주식/ETF (국내외), 암호화폐, 예·적금, 부동산
- 데이터 입력: 주식/코인 거래별 기록 + 실시간 시세, 부동산/예적금 수동 업데이트
- 사용자: 싱글 유저, 멀티 디바이스 지원 (Supabase 세션)

**알려진 기술 부채:**
- `requireUser()` 중복 — assets/transactions/manual-valuations 액션 파일에 각각 존재, 공유 유틸로 추출 필요
- 암호화폐 시세 미연동 — CoinGecko API 연동 없음, 코인 자산은 현재 가격 0으로 표시
- `/transactions` 페이지 — 현재 placeholder, 거래내역 조회 UI 미구현

## Constraints

- **플랫폼**: 웹 브라우저 — 모바일 네이티브 불필요
- **사용자 규모**: 싱글 유저 — 복잡한 멀티테넌시 불필요
- **데이터 입력**: 주식/코인 시세는 외부 API, 부동산/예적금은 수동 — 증권사 스크래핑 없음
- **Tech stack**: Next.js 16 + Supabase + Drizzle ORM (확정)
- **DB 연결**: pgbouncer Transaction Mode — prepare:false, max:5

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 거래별 기록 방식 채택 | 정확한 평단가 계산을 위해 단순 평단가 입력 대신 거래 내역 누적 | ✓ Good — 가중평균단가 정확히 작동 |
| 부동산/예적금 수동 업데이트 | 신뢰할 만한 공개 API 없음, 직접 입력으로 충분 | ✓ Good — append-only ManualValuation 이력 보존 |
| 웹 브라우저 전용 | PC에서 주로 사용, 반응형 웹으로 멀티 디바이스 대응 가능 | ✓ Good |
| Supabase for auth + database | 인증과 DB를 Supabase(PostgreSQL)로 통합 | ✓ Good — 단, pgbouncer Transaction Mode 설정 주의 필요 |
| 모든 금액을 정수로 저장 (KRW=원, USD=센트) | 부동소수점 오차 방지 | ✓ Good — 스키마 day-one 결정으로 리팩터 불필요 |
| PortfolioSnapshot 테이블 Phase 1에서 정의 | Phase 4 크론 잡을 위해 미리 스키마 확보 | ✓ Good |
| shadcn v4 base-nova 스타일 | 최신 shadcn CLI 기본값 | ✓ Good — form.tsx 수동 생성 필요했으나 문제 없음 |
| Dashboard가 가격 갱신 트리거 | 성과/목표 페이지에서 refreshAllPrices() 호출 제거 | ✓ Good — 불필요한 API 호출 방지 |
| loadPerformances() 공유 헬퍼 추출 | 대시보드와 성과 페이지 코드 중복 제거 | ✓ Good |
| pgbouncer Transaction Mode에서 prepare:false | Prepared Statements 충돌 → 20~30초 hang 방지 | ✓ Good — 필수 설정 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-14 after v1.0 milestone*
