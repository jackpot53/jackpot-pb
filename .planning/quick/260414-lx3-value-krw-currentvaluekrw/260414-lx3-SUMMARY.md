---
phase: quick-260414-lx3
plan: "01"
subsystem: portfolio-valuation
tags: [fund, valuation, nav-per-unit, migration]
dependency_graph:
  requires: []
  provides: [fund-nav-per-unit-semantics]
  affects: [lib/portfolio/portfolio.ts, components/app/overview-tab.tsx]
tech_stack:
  added: []
  patterns: [append-only-valuation, qty-times-unit-price]
key_files:
  created:
    - db/migrations/0003_fund_valuation_nav_per_unit.sql
  modified:
    - lib/portfolio/portfolio.ts
    - components/app/overview-tab.tsx
decisions:
  - "fund manual_valuations.value_krw 의미 변경: 총 평가금액 → 기준가(NAV per unit)"
  - "기존 레코드는 D-06 append-only 원칙에 따라 UPDATE 없이 역산 신규 레코드 INSERT"
metrics:
  duration: ~15m
  completed_date: "2026-04-14"
  tasks_completed: 3
  files_changed: 3
---

# Quick Task 260414-lx3: Fund value_krw → currentValueKrw (기준가 기반) Summary

**One-liner:** 펀드 manual_valuations.value_krw 의미를 총값에서 기준가(NAV per unit)로 변경하고, computeAssetPerformance와 OverviewTab 표시를 qty × 기준가 구조로 수정했다.

## What Was Done

펀드 자산의 valuation 저장 단위를 총 평가금액에서 기준가(NAV per unit)로 변경하는 작업이다. 수량이 변해도 기준가 레코드를 재사용할 수 있으며, 계산 구조가 도메인 원칙(수량 × 단가)에 맞게 통일된다.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | portfolio.ts fund 분기 기준가 기반으로 수정 | 3313e8c | lib/portfolio/portfolio.ts |
| 2 | FundValuationForm 저장 로직 + OverviewTab 표시 수정 | 9436601 | components/app/overview-tab.tsx |
| 3 | 기존 fund valuation 단가 역산 마이그레이션 SQL | b5e7989 | db/migrations/0003_fund_valuation_nav_per_unit.sql |

## Changes Detail

### lib/portfolio/portfolio.ts
- `isFund` / `isOtherManual` 분기 추가 — fund와 non-fund manual 처리 분리
- fund: `currentValueKrw = Math.round((totalQuantity/1e8) × latestManualValuationKrw)`
- fund: `currentPriceKrw = latestManualValuationKrw` (직접, 역산 불필요)
- `fundUnitPrice` 역산 블록 완전 제거
- 주석 D-16 업데이트

### components/app/overview-tab.tsx
- `FundValuationForm.handleSubmit`: `totalValueKrw` 곱셈 제거, `Math.round(price).toString()` 직접 저장
- `OverviewTab`: `isFundAsset` 변수 추가, `displayValueKrw = qty × 기준가` 계산
- 보유 현황 "현재 평가금액" → `displayValueKrw` 사용
- 가치 이력 테이블 헤더: 펀드는 "기준가 (₩/좌)", 기타는 "평가금액 (₩)"
- `evalProfitKrw` / `returnRate` 계산에 `displayValueKrw` 사용

### db/migrations/0003_fund_valuation_nav_per_unit.sql
- 기존 fund manual_valuations 레코드(총값)에서 단가 역산 신규 레코드 INSERT
- D-06 append-only 원칙 준수 — 기존 레코드 UPDATE/DELETE 없음
- `holdings.total_quantity = 0` 제외로 divide-by-zero 방지 (T-lx3-02 mitigated)
- 수동 실행 필요: `psql $DATABASE_URL -f db/migrations/0003_fund_valuation_nav_per_unit.sql`

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. Migration SQL is a data patch (no schema DDL).

## Known Stubs

None.

## Self-Check: PASSED

- [x] `lib/portfolio/portfolio.ts` — modified, committed 3313e8c
- [x] `components/app/overview-tab.tsx` — modified, committed 9436601
- [x] `db/migrations/0003_fund_valuation_nav_per_unit.sql` — created, committed b5e7989
- [x] TypeScript errors in modified files: 0 (pre-existing errors in unrelated files only)
