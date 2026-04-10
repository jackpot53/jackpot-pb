# jackpot-pb

## What This Is

개인 자산 관리 웹 앱. 주식/ETF, 예적금, 부동산, 암호화폐 등 다양한 상품의 보유 내역을 기록하고, 실시간 시세 API로 수익률을 자동 계산해 연간/월간 단위로 자산 성장을 추적한다. 싱글 유저 대상으로, 연말에 "올해 내 자산이 얼마나 늘었나"를 한 화면에서 확인하는 것이 핵심이다.

## Core Value

연말 결산 — 전체 자산의 연간 수익률과 상품별 성과를 한눈에 볼 수 있어야 한다.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 사용자 인증 (싱글 유저, 멀티 디바이스 접근을 위한 로그인)
- [ ] 자산 종목 등록 및 거래 내역 기록 (매수/매도별 수량·가격·날짜)
- [ ] 주식/ETF/암호화폐 실시간 시세 API 연동으로 현재 평가금액 및 수익률 자동 계산
- [ ] 부동산·예적금 수동 가치 업데이트
- [ ] 전체 자산 대시보드 (총 자산, 상품 유형별 배분 비중, 전체 수익률)
- [ ] 연간/월간 수익률 히스토리 차트
- [ ] 상품별 성과 비교 화면 (무엇이 잘 됐고 무엇이 별로였는지)
- [ ] 투자 목표 금액 설정 및 달성률 추적

### Out of Scope

- 소셜/공유 기능 — 개인 전용 앱
- 모바일 네이티브 앱 — 웹 브라우저로 충분
- 자동 증권사/은행 API 연동 (자동 거래 동기화) — 수동 입력 + 시세 API로 충분히 커버

## Context

- 목적: 연말 결산 시 전체 자산 성장률을 한 화면에서 파악
- 추적 자산: 주식/ETF (국내외), 암호화폐, 예·적금, 부동산
- 데이터 입력 방식:
  - 주식/코인: 거래별 기록 (언제 얼마에 몇 개 샀는지) + 실시간 시세 API로 현재 가치 계산
  - 부동산/예적금: 사용자가 직접 수동 업데이트
- 시간 단위: 연간, 월간, 전체 기간 수익률 모두 제공
- 플랫폼: 웹 브라우저 (PC 중심)
- 사용자: 본인 혼자, 단 여러 기기에서 접근하기 위해 로그인 필요
- Node.js v23.10.0 환경 (macOS)

## Constraints

- **플랫폼**: 웹 브라우저 — 모바일 네이티브 불필요
- **사용자 규모**: 싱글 유저 — 복잡한 멀티테넌시 불필요
- **데이터 입력**: 주식/코인 시세는 외부 API, 부동산/예적금은 수동 — 증권사 스크래핑 없음
- **Tech stack**: 미정 — 기획 단계에서 결정

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 거래별 기록 방식 채택 | 정확한 평단가 계산을 위해 단순 평단가 입력 대신 거래 내역 누적 | — Pending |
| 부동산/예적금 수동 업데이트 | 신뢰할 만한 공개 API 없음, 직접 입력으로 충분 | — Pending |
| 웹 브라우저 전용 | PC에서 주로 사용, 반응형 웹으로 멀티 디바이스 대응 가능 | — Pending |
| Supabase for auth + database | 인증과 DB를 Supabase(PostgreSQL)로 통합 — 별도 auth 라이브러리 불필요, 호스팅 DB | — Pending |

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
*Last updated: 2026-04-09 after Supabase auth + database decision*
