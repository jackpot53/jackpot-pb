# Phase 5: Goals & Performance Comparison - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-13
**Phase:** 05-goals-performance-comparison
**Mode:** discuss
**Areas discussed:** 목표 CRUD 인터페이스, 대시보드 목표 통합, 목표 진행 차트 설계, 성과 비교 화면 위치 & 필터

## Decisions Made

### 목표 CRUD 인터페이스
- **Question:** 목표 생성/수정은 어떻게 할까요?
- **Answer:** 다이얼로그 방식 — 목록 페이지에서 다이얼로그로 생성/수정. 자산 CRUD 패턴과 일관성 유지.

### 대시보드 목표 통합
- **Question:** 대시보드에서 목표를 어떻게 표시할까요?
- **Answer:** 대시보드에 목표 섹션 추가 — 목표별 카드 행 (이름, 목표금액, 달성률%, 프로그레스 바). 목표 없으면 섹션 숨김.

### 목표 진행 차트 설계
- **Question:** 목표 진행 차트는 어떻게 구성할까요?
- **Answer:** 하나의 통합 차트 — AreaChart에 포트폴리오 총액 + 목표별 수평 점선(ReferenceLine). 목표일 있으면 수직 점선도 추가.

### 성과 비교 화면 위치 & 필터
- **Question:** 성과 비교 화면은 어디에, 어떻게 구성할까요?
- **Answer:** 별도 /performance 페이지 + 자산유형 필터 탭 (전체|주식|코인|예적금|부동산). 기존 PerformanceTable 확장, TanStack Table 미도입.

## No Corrections

All areas confirmed without revision.
