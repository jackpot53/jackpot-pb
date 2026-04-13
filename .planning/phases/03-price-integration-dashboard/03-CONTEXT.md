# Phase 3: Price Integration & Dashboard - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

실시간 시세 API(Finnhub, CoinGecko, BOK FX)를 holdings 수학에 연결하고, 전체 포트폴리오를 한 화면에서 볼 수 있는 대시보드 페이지를 구현한다. 총 자산, 수익률, 자산 유형별 배분 파이 차트, 종목별 성과 테이블, KRW/USD 이중 통화 표시가 포함된다. 연간/월간 차트, 목표, 성과 비교는 별도 페이즈 범위.

</domain>

<decisions>
## Implementation Decisions

### 시세 갱신 전략
- **D-01:** On-demand fetch + TTL 캐시 방식. 사용자가 대시보드 로드 시 가격 조회. `priceCache.cachedAt` 기준 5분 이내면 캐시 사용, 초과 시 API 호출 후 캐시 갱신.
- **D-02:** API 장애 또는 응답 없음 시 마지막 캐시 값과 `cachedAt` 타임스탬프를 표시 (stale fallback). 0 또는 에러 표시 금지.
- **D-03:** 백그라운드 크론 없음 — Phase 3에서는 요청 시 fetch만. Phase 4 크론 잡 도입 시 재검토.

### Korean Stock (KRX) API 커버리지
- **D-04:** Finnhub으로 `stock_kr`, `etf_kr` 티커 조회 시도. 응답 데이터가 없거나 null이면 stale fallback (마지막 priceCache 값). 별도 KRX API 추가하지 않음.
- **D-05:** 연구 단계에서 Finnhub 무료 티어의 KRX 커버리지 실제 확인 필수 (STATE.md 플래그). 커버리지 불충분 시 `stock_kr`/`etf_kr` 자산은 stale indicator와 함께 표시.

### 차트 라이브러리
- **D-06:** **recharts** 사용. React 생태계 가장 성숙한 차트 라이브러리, TypeScript 지원, pie + line + bar 모두 커버. Phase 4 라인 차트도 동일 라이브러리 재사용.
- **D-07:** `npm install recharts` — Phase 3에서 설치. Phase 4에서 별도 설치 불필요.

### 환율 소스 (KRW/USD 이중 통화)
- **D-08:** BOK(한국은행) OpenAPI로 USD/KRW 환율 자동 조회. Phase 2에서 수동 입력으로 임시 처리했던 것을 Phase 3에서 자동화.
- **D-09:** BOK FX 환율도 priceCache 방식으로 캐시 (ticker: 'USD_KRW', TTL 1시간). 조회 실패 시 마지막 캐시 환율 사용.

### 대시보드 레이아웃
- **D-10:** 3단 구조:
  - 상단: stat cards 행 — 총 자산(KRW), 총 자산(USD), 전체 수익률(%), 평가손익(KRW)
  - 중단: 좌측 — 자산 유형별 배분 pie chart (recharts PieChart), 우측 — 유형별 합계 breakdown 리스트
  - 하단: 종목별 성과 테이블 (정렬 가능)
- **D-11:** 기존 레이아웃(sidebar + header + main `p-6`) 그대로 재사용. shadcn Card로 각 섹션 래핑.

### 종목별 성과 테이블 (per-asset list)
- **D-12:** 기존 shadcn Table 컴포넌트 재사용. 컬럼: 종목명 | 유형 | 수량 | 평단가 | 현재가 | 평가금액(KRW) | 수익률(%). 
- **D-13:** 정렬: 수익률 내림차순 기본. 헤더 클릭으로 컬럼별 정렬 전환.
- **D-14:** MANUAL 자산(savings, real_estate)은 "현재가" 컬럼에 최신 ManualValuation 값 표시. 시세 갱신 아이콘 없음.

### 포트폴리오 수학 (계산 로직)
- **D-15:** 종목별 계산: `currentValue = (holdings.totalQuantity / 1e8) × (priceCache.priceKrw)`. 수익률 = `(currentValue - holdings.totalCostKrw) / holdings.totalCostKrw × 100`.
- **D-16:** 전체 포트폴리오 합계: 모든 자산의 `currentValue` 합산. LIVE 자산은 priceCache 사용, MANUAL 자산은 최신 ManualValuation 값.
- **D-17:** USD 표시: `currentValueKrw / exchangeRate` (BOK에서 조회한 환율). 환율 정수 저장 방식: Phase 1 D-04에 따라 ×10000 (소수점 4자리 보존).

### Claude's Discretion
- stat card 정확한 스타일링 및 색상 (수익 → 녹색, 손실 → 적색 등)
- Pie chart 색상 팔레트
- 로딩 skeleton 디자인
- 에러/빈 상태 UI
- 가격 갱신 중 표시 방식 (spinner vs. 기존 값 유지)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 요구사항
- `.planning/REQUIREMENTS.md` §Price Integration — PRICE-01, PRICE-02 수락 기준
- `.planning/REQUIREMENTS.md` §Dashboard — DASH-01, DASH-02, DASH-03, DASH-04 수락 기준
- `.planning/ROADMAP.md` §Phase 3 — 성공 기준 5개 (Finnhub/CoinGecko/BOK 연동, stale fallback, 대시보드, 종목별 리스트, KRW/USD 이중 표시)

### 데이터 스키마 (Phase 1에서 정의 완료)
- `db/schema/price-cache.ts` — price_cache 테이블: ticker, priceKrw, priceOriginal, currency, cachedAt
- `db/schema/holdings.ts` — holdings 테이블: totalQuantity (×10^8), avgCostPerUnit, totalCostKrw
- `db/schema/assets.ts` — asset_type enum (stock_kr, stock_us, etf_kr, etf_us, crypto, savings, real_estate), price_type enum (live, manual)
- `db/schema/manual-valuations.ts` — append-only, value_krw, valued_at (MANUAL 자산 현재 가치 소스)

### Phase 2 컨텍스트 (레이아웃·패턴 결정)
- `.planning/phases/02-asset-transaction-management/02-CONTEXT.md` — D-01(사이드바 레이아웃), D-03(자산 테이블 컬럼), D-14(WAVG 계산), D-15(holdings 집계 테이블)
- `lib/holdings.ts` — computeHoldings, upsertHoldings 순수 함수 레퍼런스 (Phase 3 계산 패턴 참고)

### 아키텍처 결정
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-04(BIGINT 금액), D-03(Drizzle ORM only)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/card.tsx` — stat cards, 섹션 래핑에 사용
- `components/ui/table.tsx` — 종목별 성과 테이블 (D-12)
- `components/ui/badge.tsx` — 자산 유형 배지 (asset-type-badge.tsx 패턴 재사용)
- `components/app/sidebar.tsx`, `header.tsx` — 레이아웃 이미 구축 완료, 수정 불필요
- `lib/holdings.ts` — computeHoldings 순수 함수 (WAVG 계산 패턴 참고)
- `app/actions/` — Server Action 패턴 (assets.ts, transactions.ts) — price fetch도 동일 패턴

### Established Patterns
- Next.js App Router + Server Actions (client-side fetch 최소화)
- Drizzle ORM으로 모든 DB 쿼리 (Supabase SDK는 Auth 전용)
- 금액은 항상 BIGINT KRW 원 단위 저장, UI 표시 시 포맷 변환
- `app/(app)/` 그룹 라우트로 인증된 페이지 구성

### Integration Points
- `db/schema/price-cache.ts` → Phase 3 API 어댑터가 읽기/쓰기
- `db/schema/holdings.ts` → Phase 3 포트폴리오 수학의 cost basis 소스
- `db/schema/manual-valuations.ts` → MANUAL 자산(savings, real_estate) 현재 가치 소스
- `app/(app)/page.tsx` → 현재 placeholder — Phase 3에서 대시보드 페이지로 교체
- `middleware.ts` → 신규 API 라우트도 자동 보호 적용됨

</code_context>

<specifics>
## Specific Ideas

- 대시보드 상단 stat cards: 총 자산(KRW), 총 자산(USD), 전체 수익률(%), 평가손익(KRW) — 4개 카드
- Pie chart는 recharts `PieChart` + `Tooltip` + `Legend` 조합
- stale 가격 표시 시 타임스탬프 옆에 "⚠ 업데이트 실패" 또는 회색 "오래된 가격" 뱃지
- 종목별 테이블 정렬: 수익률 내림차순 기본, 헤더 클릭으로 전환
- BOK FX API: 한국은행 경제통계시스템 OpenAPI (기준환율 조회) — `USD_KRW` 키로 priceCache 저장

</specifics>

<deferred>
## Deferred Ideas

- recharts 라인 차트 — Phase 4 (Charts & History) 범위
- 가격 자동 갱신 백그라운드 크론 — Phase 4 크론 잡 도입 시 재검토
- KRX 전용 API (KIS Developers, KRX OpenAPI) — Finnhub 커버리지 확인 후 필요 시 Phase 추가
- 암호화폐 실시간 시세 CoinGecko — v2 요구사항 (PRICE-V2-01) → Phase 3 ROADMAP에는 포함되어 있으나 requirements는 v2 태그. 연구 단계에서 v1 범위 여부 확인.

</deferred>

---

*Phase: 03-price-integration-dashboard*
*Context gathered: 2026-04-13*
