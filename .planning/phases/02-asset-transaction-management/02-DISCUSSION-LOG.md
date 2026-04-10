# Phase 2: Asset & Transaction Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-10
**Phase:** 02-asset-transaction-management
**Mode:** discuss
**Areas discussed:** 앱 네비게이션 구조, 자산 목록 레이아웃, 거래 입력 UX, 수량·가격 입력 방식

## Gray Areas Presented

| Area | Description |
|------|-------------|
| 앱 네비게이션 구조 | Phase 2부터 다중 화면 생김 — 사이드바 vs 탑 네비 결정 필요 |
| 자산 목록 레이아웃 | 테이블 vs 카드 그리드 — 정보 밀도와 시각적 표현 방식 |
| 거래 입력 UX | 자산 상세 탭 내 vs 모달 vs 전용 페이지 |
| 수량·가격 입력 방식 | 소수점 수량, KRW/USD 가격, 환율 직접 입력 UX |

## Decisions Made

### 앱 네비게이션 구조
- **Chosen:** 좌측 고정 사이드바 (그룹명: 투자 관리, 메뉴: 대시보드/자산/거래내역/차트/목표)
- **Reason:** PC 전용 앱에 최적, 메뉴 항목 항상 노출, Phase 3-5 동일 레이아웃 재사용

### 자산 목록 레이아웃
- **Chosen:** 데이터 테이블 (종목, 유형, 평단가, 현재가, 수익%)
- **Reason:** 정보 밀도 높고 많은 자산 한 눈에 파악, PC 사용 패턴에 최적

### 거래 입력 UX
- **Chosen:** 자산 상세 페이지 내 탭 (개요 | 거래내역 탭, + 거래 추가 버튼)
- **Reason:** 자산과 거래가 자연스럽게 연결, 잘못된 자산에 입력하는 실수 없음

### 환율 입력 방식
- **Chosen:** 사용자 직접 입력 (USD 단가 + 환율 필드)
- **Reason:** 구현 단순, Phase 3에서 BOK API 자동화로 업그레이드 가능

### 수량 입력 형식
- **Chosen:** 소수점 자유 입력 (주식: 정수, 코인: 소수점 8자리)
- **Reason:** 직관적, 내부 ×10^8 변환은 자동 처리

## No Corrections — All Choices Made by User
