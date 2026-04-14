# Phase 4: History & Charts - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

매일 자동으로 포트폴리오 스냅숏을 기록하고, 연간/월간 자산 성장 차트를 제공한다. 연말 결산의 핵심 기능 — "올해 내 자산이 얼마나 늘었나"를 시각적으로 확인. 목표 추적, 상품별 성과 비교는 Phase 5 범위.

</domain>

<decisions>
## Implementation Decisions

### 크론 잡 구현
- **D-01:** Vercel Cron Jobs (`vercel.json`) 사용. Phase 1 D-02에서 결정됨. `vercel.json`에 cron 스케줄 추가.
- **D-02:** 실행 시각: **00:00 UTC (= 오전 09:00 KST)**. 한국 주식/코인 시장 종료 후 충분한 시간 경과 시점.
- **D-03:** 스냅숏 시 **Fresh API 조회** — `refreshAllPrices()` 호출 후 스냅숏 기록. Phase 3 D-02와 동일하게 API 실패 시 stale fallback 적용.
- **D-04:** 크론은 Next.js API route (`/api/cron/snapshot`)로 구현. Vercel이 이 엔드포인트를 매일 00:00 UTC에 호출.

### 차트 시각 디자인
- **D-05:** 차트 타입: **recharts `AreaChart`** — 주식 앱 스타일 (선 + 그 아래 영역 채우기). 연간/월간 모두 동일 컴포넌트 패턴 재사용.
- **D-06:** 연간 차트 Y축: **수익률 % (YoY)**. X축: 연도(2023, 2024, 2025...). 자산 총액과 수익률은 hover 툴팁으로 표시.
- **D-07:** 월간 차트 Y축: **KRW 자산 총액**. X축: 최근 12개월. 성장 흐름을 절대 금액으로 시각화.

### 차트 페이지 구조
- **D-08:** 사이드바 "차트" 메뉴 → 단일 `/charts` 페이지. **탭 전환** ('연간' | '월간')으로 두 차트 구분.
- **D-09:** 기존 레이아웃(sidebar + header + main `p-6`) 그대로 재사용. shadcn Card로 차트 섹션 래핑.

### 초기 설치 경험 & 빈 상태
- **D-10:** 스냅숏이 없을 때: **"[날짜]부터 데이터 수집 중"** 메시지 표시. 크론이 첫 스냅숏을 기록한 날짜를 기준으로 표시.
- **D-11:** Backfill 없음 — 크론 시작일부터 차곡차곡 누적. 과거 주식 가격 backfill 지원 안 함.
- **D-12:** 데이터가 1개 이상 있으면 차트 렌더링. 2개 미만이면 "데이터가 충분하지 않습니다 (최소 2일 필요)" 메시지.

### Claude's Discretion
- AreaChart 색상 팔레트 및 그라디언트 설정
- 툴팁 포맷 (KRW 포맷, % 포맷)
- 크론 API route 인증 방식 (Vercel cron secret header)
- 데이터 보존 정책 구현 (ROADMAP에서 daily prune after 12 months — 구현 여부 결정)
- 로딩/에러 상태 UI

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 요구사항
- `.planning/REQUIREMENTS.md` §Charts & History — CHART-01, CHART-02, CHART-03 수락 기준
- `.planning/ROADMAP.md` §Phase 4 — 성공 기준 4개 (야간 크론, 연간 차트, 월간 차트, 사전 계산된 스냅숏)

### 데이터 스키마 (Phase 1에서 정의 완료)
- `db/schema/portfolio-snapshots.ts` — portfolio_snapshots 테이블: snapshotDate (date, unique), totalValueKrw (bigint), totalCostKrw (bigint), returnBps (bigint ×10000)

### Phase 3 컨텍스트 (패턴 재사용)
- `.planning/phases/03-price-integration-dashboard/03-CONTEXT.md` — D-01(on-demand fetch), D-02(stale fallback), D-06/D-07(recharts 선택 및 설치 완료)
- `app/actions/prices.ts` — `refreshAllPrices()` — 크론 잡이 호출할 함수
- `lib/price/cache.ts` — `refreshPriceIfStale`, `refreshFxIfStale` — 가격 캐시 로직

### Phase 1 결정사항
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-02(Vercel Cron Jobs), D-04(BIGINT 금액)

### 아키텍처
- `.planning/research/ARCHITECTURE.md` — PortfolioSnapshot 데이터 모델
- `vercel.json` — 크론 설정 파일 (현재 `"crons": []`, Phase 4에서 채워야 함)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/app/allocation-pie-chart.tsx` — recharts 컴포넌트 패턴 레퍼런스 (AreaChart도 동일 방식)
- `components/ui/card.tsx` — 차트 섹션 래핑
- `app/actions/prices.ts` — `refreshAllPrices()` — 크론이 호출할 함수 그대로 재사용
- `lib/portfolio.ts` — `computePortfolio()`, `formatKrw()`, `formatReturn()` — 스냅숏 계산 및 표시에 재사용 가능
- `components/app/sidebar.tsx` — "차트" 메뉴 항목 이미 포함됨 (수정 불필요)

### Established Patterns
- Next.js App Router + Server Actions (API route는 크론 전용)
- Drizzle ORM으로 모든 DB 쿼리
- BIGINT 금액 저장 (returnBps = return% × 10000)
- `app/(app)/` 그룹 라우트로 인증된 페이지

### Integration Points
- `vercel.json` → 크론 스케줄 추가 필요 (`{"path": "/api/cron/snapshot", "schedule": "0 0 * * *"}`)
- `db/schema/portfolio-snapshots.ts` → 크론이 매일 1행 INSERT
- `app/(app)/page.tsx` (Dashboard) → 차트 페이지는 별도 `/charts` 라우트
- `middleware.ts` → `/api/cron/*` 경로는 Vercel cron secret으로 인증 (미들웨어 제외 필요)

</code_context>

<specifics>
## Specific Ideas

- 차트 스타일: 주식 앱 느낌 — recharts AreaChart, 선 위에 그라디언트 영역 채우기
- 연간 탭: X축 연도(2023, 2024...), Y축 수익률%, hover 시 해당 연도 자산 총액(KRW) + 수익률% 툴팁
- 월간 탭: X축 최근 12개월, Y축 KRW 총액, hover 시 해당 월 수익률% 툴팁
- 빈 상태 메시지 예: "2026년 4월 14일부터 데이터를 수집하고 있습니다. 내일 다시 확인해주세요."
- 크론 API route: `Authorization: Bearer {CRON_SECRET}` 헤더 검증 (Vercel 자동 주입)

</specifics>

<deferred>
## Deferred Ideas

- 과거 주식 가격 backfill — 지원 안 함 (크론부터 차곡차곡)
- 데이터 보존 정책 (12개월 이후 daily prune) — ROADMAP에 명시됐으나 MVP에서 우선순위 낮음, Claude 재량
- 차트 줌/Pan 인터랙션 — 기본 정적 차트로 시작
- 상품별 breakdown 차트 (자산 유형별 개별 추이) — Phase 5 성과 비교 범위
- 수익률 벤치마크 비교 (코스피 대비 등) — 향후 기능

</deferred>

---

*Phase: 04-history-charts*
*Context gathered: 2026-04-13*
