---
status: passed
phase: 05-goals-performance-comparison
source: 05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md
started: 2026-04-13T00:00:00Z
updated: 2026-04-14T00:00:00Z
---

## Tests

### 1. 목표 생성
expected: /goals 페이지에서 "새 목표 추가" 버튼을 클릭하면 Dialog가 열린다. 목표명, 목표 금액(KRW), 목표 날짜(선택), 메모(선택)를 입력하고 "목표 추가"를 클릭하면 Dialog가 닫히고 목표 목록에 새 항목이 나타난다.
result: PASS

### 2. 목표 수정
expected: 목표 목록에서 연필 아이콘을 클릭하면 기존 값이 채워진 Dialog가 열린다. 값을 수정하고 "변경 저장"을 클릭하면 Dialog가 닫히고 목록에 수정된 값이 반영된다.
result: PASS
notes: 수정 저장 후 "목표 추가" 버튼이 loading 상태로 남는 버그 발견 및 수정 (GoalDialog key prop 추가)

### 3. 목표 삭제
expected: 목표 목록에서 휴지통 아이콘을 클릭하면 목표명이 표시된 확인 Dialog가 열린다. 확인하면 Dialog가 닫히고 해당 목표가 목록에서 사라진다.
result: PASS

### 4. 대시보드 목표 섹션 — 목표 있을 때
expected: 목표가 1개 이상 존재할 때 대시보드(/) 하단에 각 목표의 이름, 목표 금액, 달성률(%), Progress bar가 표시된다. 달성률 >= 100%이면 레이블이 초록색(text-emerald-600)으로 표시된다.
result: PASS

### 5. 대시보드 목표 섹션 — 목표 없을 때
expected: 목표가 하나도 없을 때 대시보드에 목표 섹션이 전혀 표시되지 않는다 (빈 상태 메시지 없음).
result: PASS

### 6. 목표 진행 차트
expected: /goals 페이지 상단에 포트폴리오 KRW 추이 AreaChart가 표시된다. 각 목표의 targetAmountKrw에 수평 점선(ReferenceLine), targetDate가 있는 목표에 수직 점선이 표시된다. 스냅샷이 없으면 한국어 빈 상태 메시지가 표시된다.
result: PASS

### 7. 성과 페이지 사이드바 네비게이션
expected: 사이드바에 "성과" 항목이 있고 클릭하면 /performance 페이지로 이동한다.
result: PASS

### 8. 성과 페이지 탭 필터링
expected: /performance 페이지에서 전체/주식/코인/예적금/부동산 탭을 클릭하면 해당 자산 유형의 보유 종목만 PerformanceTable에 표시된다. 빈 탭은 기존 빈 상태 UI를 보여준다.
result: PASS

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Bugs Found & Fixed

1. **GoalDialog loading state stuck** — 목표 수정 후 "목표 추가" 버튼이 isPending=true 상태로 남는 문제.
   Fix: `GoalListClient`에서 `GoalDialog`에 `key={dialogMode ?? 'closed'}` 추가 → 모드 변경 시 컴포넌트 리마운트로 상태 초기화

2. **전체 탭 네비게이션 응답 없음** — `loading.tsx` 부재로 이전 페이지가 계속 표시됨.
   Fix: `app/(app)/loading.tsx` 추가

3. **모든 페이지 20~30초 hang** — pgbouncer Transaction Mode (port 6543)와 postgres-js의 Prepared Statements 충돌.
   Fix: `db/index.ts`에 `prepare: false` 추가

4. **/goals 페이지 전체 블로킹** — `getAllSnapshots()`가 목록 렌더를 차단.
   Fix: `GoalChart`를 `<Suspense>`로 분리해 목록과 차트를 독립 로딩

## Gaps

[none]
