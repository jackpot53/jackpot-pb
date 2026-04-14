---
status: complete
phase: 02-asset-transaction-management
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md]
started: "2026-04-10T06:05:00.000Z"
updated: "2026-04-10T06:30:00.000Z"
---

## Current Test

[testing complete]

## Tests

### 1. App Shell Navigation
expected: Navigate to /assets (or any /(app)/* route). A fixed left sidebar should be visible with 5 nav items: 대시보드, 자산, 거래내역, 차트, 목표. The currently active route is highlighted. The top header shows your Supabase user email and a 로그아웃 button.
result: pass

### 2. Asset List Page
expected: /assets shows a data table with columns 종목명, 유형, 평단가, 현재가, 수익%. All numeric columns show — (em dash) for now. Each row has a Pencil icon (edit) and Trash2 icon (delete). Empty state shows "등록된 자산이 없습니다" if no assets exist. A "+ 자산 추가" button is in the top-right area.
result: pass

### 3. Create Asset
expected: Click "+ 자산 추가" → navigates to /assets/new. Form has fields: 종목명, 자산 유형 (dropdown with 7 types), 통화 (KRW/USD), 시세 유형 (live/manual), 티커 (appears only when 시세 유형 = live), 메모. Submit → redirected back to /assets and the new asset appears in the table with a colored type badge.
result: pass

### 4. Asset Type Badge Colors
expected: Each asset type shows a distinct colored badge in the table. For example: stock_kr = blue, stock_us = indigo, etf_kr = sky, etf_us = violet, crypto = orange, savings = green, real_estate = yellow (exact shades per UI-SPEC). The badge is visible in the 유형 column on the asset list.
result: pass

### 5. Edit Asset
expected: Click the Pencil icon on any asset row → navigates to /assets/[id]/edit. The form is pre-filled with the asset's current values. Change 종목명 → save → redirected to /assets, the updated name is shown in the table.
result: pass

### 6. Delete Asset
expected: Click the Trash2 icon on any asset → a confirmation Dialog appears. Dialog body reads exactly: "자산을 삭제하면 모든 거래 내역도 함께 삭제됩니다. 계속하시겠습니까?" Clicking confirm removes the asset from the list.
result: pass

### 7. Asset Detail Page Tabs
expected: Click an asset name in the list → /assets/[id]. The page shows the asset name and a colored type badge. Below that, two tabs: 개요 and 거래내역. Both tabs are clickable and switch content areas.
result: pass

### 8. Add Transaction (Buy)
expected: On the 거래내역 tab, click "+ 거래 추가" (or similar button). A form appears inline with fields: 거래 유형 (buy/sell), 날짜, 수량, 단가, 수수료. For USD assets an additional 환율 field appears. Submit → the transaction appears in the tab's list with date, type, quantity, and price.
result: pass

### 9. Void Transaction
expected: On a transaction row, click the Ban icon (void). A dialog appears with: "이 거래를 취소 처리하면 평단가 계산에서 제외됩니다. 계속하시겠습니까?" Confirm → the row is still visible but styled with opacity-50 and line-through text. The Pencil and Ban icons are hidden on the voided row.
result: pass

### 10. Overview Tab — Live Asset
expected: Navigate to the 개요 tab on a live asset (stock/ETF/crypto). The tab shows an asset metadata grid (종목명, 유형, 통화, 시세 유형, 티커, 메모). There is NO "현재 가치 업데이트" button or valuation history section for live assets.
result: pass

### 11. Overview Tab — Manual Valuation (Savings/Real Estate)
expected: Navigate to the 개요 tab on a manual asset (savings or real_estate). The tab shows the metadata grid AND a "현재 가치 업데이트" button. Clicking it reveals a form with 평가금액 and 평가일 fields. Submit → a new entry appears in the valuation history table below, sorted newest-first. Submitting again adds another row (append-only — no edit/delete on existing rows).
result: pass

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
