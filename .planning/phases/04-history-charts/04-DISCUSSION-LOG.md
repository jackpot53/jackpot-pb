# Phase 4: History & Charts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-13
**Phase:** 04-history-charts
**Mode:** discuss
**Areas discussed:** 크론 실행 전략, 차트 시각 디자인, 차트 페이지 구조, 초기 설치 경험 & backfill

## Gray Areas Presented

| Area | Description |
|------|-------------|
| 크론 실행 전략 | 실행 시각, 가격 조회 방식 (fresh vs. cache) |
| 차트 시각 디자인 | 차트 타입, Y축 단위 |
| 차트 페이지 구조 | 단일 스크롤 vs. 탭 전환 |
| 초기 설치 경험 | 빈 상태 처리, backfill 전략 |

## Decisions Made

### 크론 실행 전략
| Question | Answer |
|----------|--------|
| 가격 조회 방식 | Fresh API 조회 (refreshAllPrices() 후 스냅숏) |
| 실행 시각 | 00:00 UTC (= 09:00 KST) |

### 차트 시각 디자인
| Question | Answer |
|----------|--------|
| 차트 타입 | recharts AreaChart (주식 앱 스타일 — "주식에 나오는 차트 형태로") |
| 연간 Y축 | 수익률 % (YoY) |
| 월간 Y축 | KRW 자산 총액 |

### 차트 페이지 구조
| Question | Answer |
|----------|--------|
| 배치 방식 | 탭 전환 ('연간' \| '월간') |

### 초기 설치 경험
| Question | Answer |
|----------|--------|
| 빈 상태 처리 | "[날짜]부터 데이터 수집 중" 메시지 |
| Backfill | 없음 — 크론부터 차곡차곡 |

## Prior Decisions Applied (Not Re-discussed)
- Vercel Cron Jobs: Phase 1 D-02에서 결정됨 ✓
- recharts: Phase 3 D-06/D-07에서 결정 및 설치 완료 ✓
- portfolio_snapshots 스키마: Phase 1에서 정의 완료 ✓
