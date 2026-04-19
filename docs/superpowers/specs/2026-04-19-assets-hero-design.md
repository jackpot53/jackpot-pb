# Assets Hero Banner — Design Spec
**Date:** 2026-04-19

## Overview

`AssetsHero` 컴포넌트를 추가한다. 기존 히어로 배너들(TodayHero, InsightsHero, RoboAdvisorHero)과 동일한 패턴을 따르되, 에메랄드/초록 계열 포인트 컬러를 사용한 장식용 헤더다.

## Component

- **파일**: `components/app/assets-hero.tsx`
- **타입**: 서버 컴포넌트 (props 없음)
- **크기**: `minHeight: 188px` (기존 히어로 동일)

## Visual Design

### 배경
- 다크 그라디언트: `#020c0a → #051510 → #071a12` (에메랄드 틴트 다크)
- 도트 그리드 패턴 (TodayHero와 동일, 에메랄드 투명도)
- 좌측 라디얼 글로우: `rgba(16,185,129, .08)`

### 우측 SVG 그래픽
- 우상향 라인 차트 (InsightsHero 구조 동일)
- 선 색상: `rgba(52,211,153,0.7)` (에메랄드)
- 면적 fill: 에메랄드 → 투명 그라디언트
- 글로우 필터 적용
- 최고점 도트 펄스 애니메이션

### 장식 요소
- 우하단 대형 반투명 `%` 문자 (InsightsHero의 연도 숫자와 동일 역할)
  - 색상: `#34d399`, 투명도 `0.06`

## Animations

| 이름 | 대상 | 패턴 |
|------|------|------|
| `ah-line` | 라인 차트 드로우 | `stroke-dashoffset` 520→0 |
| `ah-area` | 면적 fill 페이드인 | opacity 0→1 |
| `ah-dot` | 최고점 도트 펄스 | r + opacity 반복 |
| `ah-glow` | 도트 주변 글로우 | scale + opacity 반복 |

## Content

```
[● 내 포트폴리오]          ← 에메랄드 도트 배지

보유 자산                  ← h1, Sunflower 폰트, text-4xl
자산을 등록하고             ← p, white/35
실시간 수익률을 추적합니다
```

## Integration

`app/(app)/assets/page.tsx`에서 기존 `PageHeader`를 `AssetsHero`로 교체.
"자산 추가" 버튼은 `AssetsHero` 아래 별도 행으로 이동하거나, PageHeader를 히어로 아래에 유지하는 방식 중 선택.

**결정**: `AssetsHero`를 `PageHeader` 위에 추가하는 방식으로 병치. PageHeader는 액션 버튼("자산 추가") 역할로만 유지.

## Constraints

- `'use client'` 불필요 — 애니메이션은 CSS만 사용
- 기존 히어로와 동일하게 `<style>` 태그로 keyframe 정의 (animation prefix: `ah-`)
- Sunflower 폰트는 이미 전역 로드되어 있음
