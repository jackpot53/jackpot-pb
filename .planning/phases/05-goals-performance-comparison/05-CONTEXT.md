# Phase 5: Goals & Performance Comparison - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

투자 목표 금액을 설정하고 포트폴리오 스냅숏 데이터로 달성률을 추적한다. 목표별 시간 경과 진행 차트, 전체 자산 수익률 비교 화면(자산 유형 필터 포함)을 제공한다. 자산 등록, 시세 연동, 일반 차트는 이전 Phase 범위.

</domain>

<decisions>
## Implementation Decisions

### 목표 CRUD UI
- **D-01:** 다이얼로그 기반 CRUD — `/goals` 목록 페이지에서 "목표 추가" 버튼 → 다이얼로그로 생성/수정. 삭제도 confirm 다이얼로그. Phase 2 자산 CRUD 패턴(`asset-form`, `delete-asset-dialog`)과 일관성 유지.
- **D-02:** 목표 필드: 이름(name), 목표 금액(targetAmountKrw, KRW), 목표일(targetDate, 선택), 메모(notes, 선택). DB 스키마 그대로 사용 (Phase 1에서 이미 정의됨).

### 대시보드 목표 통합
- **D-03:** 대시보드(`/`) 하단(종목별 성과 테이블 아래)에 "목표" 섹션 추가. 목표별 카드 행 — 이름, 목표 금액(KRW), 현재 달성률(%), 프로그레스 바. 달성률 = 현재 포트폴리오 총액 / 목표 금액 × 100 (읽기 시 계산).
- **D-04:** 목표가 없으면 해당 섹션 자체를 숨김 (빈 상태 메시지 없이).

### 목표 진행 차트
- **D-05:** `/goals` 페이지 상단에 단일 통합 차트. 포트폴리오 총액(KRW) AreaChart 위에 목표별 수평 점선(`ReferenceLine`) 오버레이. X축 날짜(스냅숏 기준), Y축 KRW 자산 총액.
- **D-06:** 목표일(targetDate)이 있는 목표는 X축 해당 날짜에 수직 점선(reference line) 표시.
- **D-07:** recharts 기존 패턴(Phase 4 AreaChart) 재사용. 목표 데이터는 `ReferenceLine` + `Label` 컴포넌트로 표현.
- **D-08:** 스냅숏이 없을 때: "아직 데이터가 없습니다. 크론 잡이 내일 첫 스냅숏을 기록합니다." 메시지 표시.

### 성과 비교 화면
- **D-09:** 별도 `/performance` 페이지 신설. 사이드바에 "성과" 메뉴 추가 (기존 NAV_ITEMS에 추가).
- **D-10:** 자산 유형 필터 탭 — 전체 | 주식 | 코인 | 예적금 | 부동산. shadcn Tabs 컴포넌트 사용 (Phase 4 /charts 패턴과 동일).
- **D-11:** 기존 `PerformanceTable` 컴포넌트 확장 — 선택된 탭에 따라 필터링된 rows를 props로 전달. TanStack Table 미도입 (추가 의존성 불필요 — 기존 shadcn Table로 충분).
- **D-12:** 기본 정렬: 수익률 내림차순. 컬럼 정렬 클릭 유지 (기존 동작).

### Claude's Discretion
- 대시보드 목표 섹션의 프로그레스 바 디자인 (색상, 높이, 100% 초과 시 처리)
- `/performance` 페이지 empty state (보유 종목 없을 때)
- 목표 달성(100% 초과) 시 특별 표시 여부
- 목표 다이얼로그 폼 유효성 검사 메시지

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 요구사항
- `.planning/REQUIREMENTS.md` §Goals — GOAL-01, GOAL-02 수락 기준
- `.planning/REQUIREMENTS.md` §Performance Comparison — PERF-01, PERF-02 수락 기준
- `.planning/ROADMAP.md` §Phase 5 — 성공 기준 4개

### 데이터 스키마
- `db/schema/goals.ts` — goals 테이블: id, name, targetAmountKrw, targetDate(nullable), notes, createdAt, updatedAt
- `db/schema/portfolio-snapshots.ts` — portfolio_snapshots: snapshotDate, totalValueKrw, totalCostKrw, returnBps (목표 진행 차트 데이터 소스)

### 재사용 컴포넌트 & 패턴
- `components/app/performance-table.tsx` — 기존 PerformanceTable (shadcn Table 기반, 정렬 기능 포함) — 확장 대상
- `app/(app)/charts/page.tsx` — 탭 패턴 레퍼런스 (shadcn Tabs + Suspense 구조)
- `components/app/annual-return-chart.tsx` — recharts AreaChart 패턴 레퍼런스
- `components/app/sidebar.tsx` — NAV_ITEMS 배열 — "성과" 메뉴 추가 필요

### 이전 Phase 컨텍스트
- `.planning/phases/04-history-charts/04-CONTEXT.md` — D-05(recharts AreaChart), D-08(탭 구조), D-09(레이아웃 패턴)
- `.planning/phases/03-price-integration-dashboard/03-CONTEXT.md` — D-10(대시보드 레이아웃), D-15/D-16(포트폴리오 수학)
- `.planning/phases/02-asset-transaction-management/02-CONTEXT.md` — 다이얼로그 CRUD 패턴

### 포트폴리오 수학 (달성률 계산)
- `lib/portfolio.ts` — `computePortfolio()`, `formatKrw()` — 현재 총 자산 계산에 재사용
- `app/(app)/page.tsx` — 대시보드: 현재 portfolio 계산 흐름 레퍼런스

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/app/performance-table.tsx` — 수익률 정렬 완비된 테이블, props에 `rows` 배열 필터링으로 바로 확장 가능
- `components/ui/tabs.tsx` — shadcn Tabs (Phase 4 /charts에서 사용됨)
- `components/ui/dialog.tsx` — 목표 CRUD 다이얼로그에 재사용
- `components/ui/form.tsx` — react-hook-form 연동 폼 (Phase 1에서 수동 생성됨)
- `components/ui/card.tsx`, `components/ui/progress` — 목표 카드 UI
- `lib/portfolio.ts` — 포트폴리오 계산 순수 함수들 (달성률 계산에 재사용)
- recharts `ReferenceLine`, `Label` — 목표 수평선 표시 (recharts에 내장됨, 별도 설치 불필요)

### Established Patterns
- Next.js App Router + Server Actions
- 다이얼로그 CRUD: Server Action → revalidatePath (`app/actions/assets.ts` 패턴)
- shadcn Tabs + Suspense로 탭 별 데이터 로딩 분리
- BIGINT KRW 저장, UI 표시 시 `formatKrw()` 사용
- `app/(app)/` 그룹 라우트 (인증 자동 적용)

### Integration Points
- `app/(app)/page.tsx` (Dashboard) → 목표 섹션 컴포넌트 추가 (Server Component에서 goals 쿼리 추가)
- `components/app/sidebar.tsx` → NAV_ITEMS에 `{ label: '성과', href: '/performance' }` 추가
- `app/(app)/goals/` → 신규 라우트 (목록 + 다이얼로그 CRUD + 진행 차트)
- `app/(app)/performance/` → 신규 라우트 (탭 필터 + PerformanceTable 확장)
- `app/actions/goals.ts` → 신규 Server Actions (createGoal, updateGoal, deleteGoal)
- `db/queries/goals.ts` → 신규 DB 쿼리 (listGoals, getGoalById)

</code_context>

<specifics>
## Specific Ideas

- 목표 진행 차트: recharts `<ReferenceLine y={goalAmount} stroke="..." strokeDasharray="3 3" label={goalName} />` 패턴
- 대시보드 목표 섹션: shadcn Card 안에 목표별 행, 각 행에 이름 + `formatKrw(targetAmount)` + `{pct}%` + 프로그레스 바
- `/performance` 탭 필터: "전체", "주식" (stock_kr + stock_us + etf_kr + etf_us), "코인" (crypto), "예적금" (savings), "부동산" (real_estate)
- 달성률 계산: `Math.round((currentTotalKrw / targetAmountKrw) * 100)` — 100% 초과 가능 (목표 달성)

</specifics>

<deferred>
## Deferred Ideas

- 목표별 독립 차트 (목표가 많을 때 별도 뷰) — 현재는 통합 차트로 시작
- 목표 달성 알림/이메일 — 개인 앱 특성상 불필요
- 수익률 벤치마크 비교 (코스피 대비) — Phase 4에서도 deferred됨
- TanStack Table 도입 — 기존 shadcn Table로 충분, 추가 의존성 도입 보류

</deferred>

---

*Phase: 05-goals-performance-comparison*
*Context gathered: 2026-04-13*
