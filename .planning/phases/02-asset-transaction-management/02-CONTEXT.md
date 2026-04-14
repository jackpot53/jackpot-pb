# Phase 2: Asset & Transaction Management - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

사용자가 모든 자산과 거래 내역을 입력·관리할 수 있게 한다 — 포트폴리오 수학의 데이터 기반 완성. 자산 CRUD, 거래 내역 기록, 수동 자산 가치 업데이트, 가중평균단가(WAVG) 계산이 포함된다. 실시간 시세 API 연동, 대시보드, 차트는 별도 페이즈 범위.

</domain>

<decisions>
## Implementation Decisions

### 앱 네비게이션 구조
- **D-01:** 좌측 고정 사이드바. 그룹명 "투자 관리", 메뉴: 대시보드 / 자산 / 거래내역 / 차트 / 목표. Phase 2부터 전체 레이아웃 구조 확립 — Phase 3-5도 동일 레이아웃 재사용.
- **D-02:** 상단 헤더에 사용자 정보 + 로그아웃 버튼 배치.

### 자산 목록 레이아웃
- **D-03:** 데이터 테이블 형태. 표시 컬럼: 종목명, 유형(asset_type), 평단가, 현재가(Phase 2에서는 수동 입력값 표시), 수익%. Phase 2에서는 현재가/수익률은 manual 자산만 의미 있고, live 자산은 Phase 3에서 채워짐.
- **D-04:** 테이블 하단에 "+ 자산 추가" 버튼.
- **D-05:** 자산 유형별 필터 또는 그룹화는 Claude 재량 (단순하게 시작).

### 거래 입력 UX
- **D-06:** 자산 상세 페이지 내 탭 구조. 탭: 개요(Overview) | 거래내역(Transactions). 거래내역 탭에 "+ 거래 추가" 버튼.
- **D-07:** 거래 추가/수정은 페이지 내 폼 또는 모달 — Claude 재량. 단, 거래 목록과 동시에 보일 것.
- **D-08:** 거래 무효화(void)는 "취소" 버튼으로, 실제 DELETE 아님. is_voided=true 처리.

### 수동 자산 가치 업데이트 UX
- **D-09:** 부동산·예적금 자산 상세 페이지에 "현재 가치 업데이트" 버튼. 클릭 시 새 ManualValuation INSERT (append-only). 과거 이력은 자산 상세 탭 또는 섹션에서 확인 가능.

### 수량·가격 입력 방식
- **D-10:** 수량 입력은 소수점 자유 입력 (사용자가 "100", "0.5", "0.00500000" 등 입력). 주식/ETF는 정수 검증, 암호화폐는 소수점 8자리까지 허용. 내부 저장 시 ×10^8 변환 자동 처리.
- **D-11:** 가격(단가)은 KRW 자산의 경우 원 단위 정수, USD 자산의 경우 달러 단위로 입력. 내부 저장은 모두 KRW BIGINT (원 단위).
- **D-12:** USD 자산 거래 시 환율은 사용자가 직접 입력 (예: 1350). 시스템이 USD 단가 × 환율 = KRW 저장. Phase 3에서 BOK API 자동 조회로 업그레이드 가능.
- **D-13:** 환율 입력 필드는 USD 자산 거래 폼에만 표시 (KRW 자산에는 숨김).

### 가중평균단가 계산
- **D-14:** Holdings 계산은 순수 함수(pure function)로 구현, 단위 테스트 필수. WAVG 계산 패턴: 누적 매수로 평단가 갱신, 매도 시 평단가 불변(수익 실현 처리).
- **D-15:** Holdings 집계 테이블은 Phase 1 스키마에 이미 정의됨 — Phase 2에서 쓰기 로직 구현.

### Claude's Discretion
- 자산 유형별 아이콘 또는 색상 태그
- 거래 폼 필드 순서 및 레이아웃 세부사항
- 빈 상태 (자산 없음, 거래 없음) 화면 디자인
- 로딩/에러 상태 처리
- 테이블 정렬 기능 구현 여부

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 요구사항
- `.planning/REQUIREMENTS.md` §Asset Management — ASSET-01, ASSET-02, ASSET-03, ASSET-04 수락 기준
- `.planning/ROADMAP.md` §Phase 2 — 성공 기준 4개 (자산 CRUD, 거래 기록, 수동 가치 업데이트, WAVG 계산)

### 데이터 스키마 (Phase 1에서 정의 완료)
- `db/schema/assets.ts` — assets 테이블: id, name, ticker, asset_type enum, price_type enum, currency enum, notes
- `db/schema/transactions.ts` — transactions 테이블: quantity (×10^8), price_per_unit (KRW BIGINT), exchange_rate_at_time (×10000), is_voided
- `db/schema/manual-valuations.ts` — manual_valuations 테이블: append-only, value_krw, valued_at
- `db/schema/holdings.ts` — holdings 테이블: Phase 2에서 쓰기 로직 구현

### 아키텍처 결정 (Phase 1 컨텍스트)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-03(Drizzle ORM), D-04(BIGINT 금액), D-05(is_voided), D-06(append-only ManualValuation)
- `.planning/research/PITFALLS.md` — 금액 정수 저장, append-only 패턴, WAVG 계산 주의사항

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/card.tsx` — shadcn Card 컴포넌트 (자산 상세 페이지 레이아웃에 활용 가능)
- `components/ui/button.tsx`, `input.tsx`, `form.tsx`, `label.tsx` — 거래/자산 입력 폼에 재사용
- `utils/supabase/server.ts`, `client.ts` — Supabase 클라이언트 팩토리 (Server Actions에서 사용)
- `app/actions/auth.ts` — Server Action 패턴 레퍼런스 (자산/거래 CRUD Server Actions 동일 패턴 사용)

### Established Patterns
- Next.js App Router + Server Actions (Pages Router 아님, client-side fetch 최소화)
- Drizzle ORM으로 모든 DB 쿼리 (Supabase SDK는 Auth 전용)
- `db/schema/` 디렉토리에 테이블별 파일 분리 (assets.ts, transactions.ts 등)
- 금액은 항상 BIGINT KRW 원 단위 저장, UI 표시 시 포맷 변환

### Integration Points
- `app/login/` → 인증 완료 후 리다이렉트 대상이 Phase 2의 메인 페이지 (대시보드 또는 자산 목록)
- `middleware.ts` → 미인증 사용자 보호 (Phase 2 신규 라우트도 자동 적용)
- `db/schema/holdings.ts` → Phase 2에서 WAVG 계산 결과 쓰기 (Phase 3 대시보드의 입력값)

</code_context>

<specifics>
## Specific Ideas

- 자산 목록: 테이블 형태, 컬럼(종목명/유형/평단가/현재가/수익%) — Phase 3에서 현재가/수익률 채워짐
- 거래 입력: 자산 상세 페이지 내 탭 구조 (개요 | 거래내역), 거래 추가 버튼은 탭 내에 위치
- USD 거래: 달러 단가 + 환율 입력 필드 → KRW 자동 계산 표시 (저장 전 미리보기)
- 수량: 소수점 입력 → 내부 10^8 배율 변환 (사용자에게 투명하게)

</specifics>

<deferred>
## Deferred Ideas

- 환율 자동 조회 (BOK API) — Phase 3 범위 (Price Integration)
- 자산 목록 정렬·필터 고급 기능 — Phase 5 성과 비교 화면에서 구현
- CSV 일괄 거래 가져오기 — v2 요구사항 (ADV-V2-01)

</deferred>

---

*Phase: 02-asset-transaction-management*
*Context gathered: 2026-04-10*
