# 단리/복리 Badge 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 예적금과 보험상품 카드에서 이율 옆에 단리/복리를 구분하는 badge를 표시한다.

**Architecture:** 
- Database: insurance_details에 compoundType 필드 추가, 마이그레이션 작성
- Types: AssetPerformance 타입에 compoundType 추가
- Queries: assets/insurance 쿼리에서 compoundType 로드
- UI: AssetCard 컴포넌트에서 badge 렌더링

**Tech Stack:** Drizzle ORM, TypeScript, React, Tailwind CSS

---

## Task 1: insurance_details 스키마에 compoundType 필드 추가

**Files:**
- Modify: `db/schema/insurance-details.ts:30`

- [ ] **Step 1: insurance_details 스키마 수정**

[insurance-details.ts](db/schema/insurance-details.ts)에서 createdAt 전에 compoundType 필드 추가:

```typescript
// 'simple'(단리) | 'monthly'(월복리) | 'yearly'(연복리)
compoundType: varchar('compound_type', { length: 10 }).notNull().default('simple'),
```

최종 모습:
```typescript
export const insuranceDetails = pgTable('insurance_details', {
  assetId: uuid('asset_id').primaryKey().references(() => assets.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  category: varchar('category', { length: 20 }).notNull(),
  paymentCycle: varchar('payment_cycle', { length: 10 }).notNull().default('monthly'),
  premiumPerCycleKrw: bigint('premium_per_cycle_krw', { mode: 'number' }),
  contractDate: date('contract_date'),
  paymentStartDate: date('payment_start_date'),
  paymentEndDate: date('payment_end_date'),
  coverageEndDate: date('coverage_end_date'),
  sumInsuredKrw: bigint('sum_insured_krw', { mode: 'number' }),
  expectedReturnRateBp: integer('expected_return_rate_bp'),
  isPaidUp: boolean('is_paid_up').notNull().default(false),
  compoundType: varchar('compound_type', { length: 10 }).notNull().default('simple'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 2: Commit**

```bash
git add db/schema/insurance-details.ts
git commit -m "feat: insurance_details에 compoundType 필드 추가

- 'simple'(단리) | 'monthly'(월복리) | 'yearly'(연복리)
- 기본값: 'simple'"
```

---

## Task 2: Drizzle 마이그레이션 생성 및 적용

**Files:**
- Create: `drizzle/migrations/<timestamp>_add_insurance_compound_type.sql`

- [ ] **Step 1: 마이그레이션 파일 생성**

Drizzle 마이그레이션 생성 명령어 실행:

```bash
npx drizzle-kit generate --name add_insurance_compound_type
```

생성된 파일(`drizzle/migrations/<timestamp>_add_insurance_compound_type.sql`)이 다음과 같은 내용을 포함하는지 확인:

```sql
-- 기존 보험상품에 기본값 'simple'으로 컬럼 추가
ALTER TABLE insurance_details ADD COLUMN compound_type varchar(10) NOT NULL DEFAULT 'simple';
```

파일의 내용을 확인하고 필요시 수정.

- [ ] **Step 2: 마이그레이션 적용**

```bash
npx drizzle-kit migrate
```

Expected: 마이그레이션이 성공적으로 적용되고 데이터베이스 스키마 업데이트 완료

- [ ] **Step 3: Commit**

```bash
git add drizzle/migrations/
git commit -m "migration: insurance_details에 compound_type 컬럼 추가

기존 보험상품은 'simple'(단리)으로 초기화"
```

---

## Task 3: AssetPerformance 타입 수정

**Files:**
- Modify: `lib/portfolio.ts:*`

- [ ] **Step 1: AssetPerformance 타입에 compoundType 추가**

[portfolio.ts](lib/portfolio.ts)에서 AssetPerformance 인터페이스를 찾아서 compoundType 필드 추가:

```typescript
export interface AssetPerformance {
  // ... 기존 필드들 ...
  compoundType?: string; // 'simple' | 'monthly' | 'yearly'
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/portfolio.ts
git commit -m "feat: AssetPerformance 타입에 compoundType 추가"
```

---

## Task 4: assets 조회 쿼리 수정 (savingsDetails & insuranceDetails)

**Files:**
- Modify: `db/queries/assets.ts:*`

- [ ] **Step 1: assets 쿼리 구조 파악**

[db/queries/assets.ts](db/queries/assets.ts)를 열어서 현재 assets 조회 쿼리가 savingsDetails와 insuranceDetails를 로드하는 방식 파악.

- [ ] **Step 2: savingsDetails에서 compoundType 포함 확인**

쿼리 결과에 `savingsDetails.compoundType`이 포함되는지 확인. 이미 포함되어 있으면 그대로 진행.

- [ ] **Step 3: insuranceDetails에서 compoundType 포함 확인**

쿼리 결과에 `insuranceDetails.compoundType`이 포함되는지 확인. 없으면 select 부분에 추가:

```typescript
// 기존 select에 이 필드 추가
insuranceDetails.compoundType,
```

- [ ] **Step 4: Commit (변경이 있는 경우)**

```bash
git add db/queries/assets.ts
git commit -m "feat: assets 쿼리에서 compoundType 로드

- savingsDetails.compoundType
- insuranceDetails.compoundType"
```

---

## Task 5: AssetCard 컴포넌트 - 예적금 badge 추가

**Files:**
- Modify: `components/app/assets-page-client.tsx:431-433`

- [ ] **Step 1: 예적금 이율 표시 부분 찾기**

[assets-page-client.tsx](components/app/assets-page-client.tsx)에서 Line 431-433 부분 확인:

```typescript
{isSavings && asset.interestRateBp != null && asset.interestRateBp > 0 && (
  <><span className="text-border/60">|</span><span className="tabular-nums font-medium text-emerald-400">연 {(asset.interestRateBp / 10000).toFixed(2)}%</span></>
)}
```

- [ ] **Step 2: 예적금 badge 코드로 수정**

위의 코드를 다음과 같이 수정:

```typescript
{isSavings && asset.interestRateBp != null && asset.interestRateBp > 0 && (
  <><span className="text-border/60">|</span><span className="tabular-nums font-medium text-emerald-400">연 {(asset.interestRateBp / 10000).toFixed(2)}%</span>
  {asset.compoundType && (
    <span className="ml-1 text-xs px-1.5 py-0.5 rounded-md font-medium text-white" style={{
      backgroundColor: asset.compoundType === 'simple' ? '#3b82f6' : '#10b981'
    }}>
      {asset.compoundType === 'simple' ? '단리' : '복리'}
    </span>
  )}
  </>
)}
```

- [ ] **Step 3: UI 테스트 (브라우저에서 확인)**

- 예적금 카드를 찾아서 이율 옆에 파란색(단리) 또는 초록색(복리) badge가 표시되는지 확인
- compoundType이 없는 경우 badge가 표시되지 않는지 확인

- [ ] **Step 4: Commit**

```bash
git add components/app/assets-page-client.tsx
git commit -m "feat: 예적금 카드에 단리/복리 badge 추가

- 단리: 파란색(#3b82f6)
- 복리: 초록색(#10b981)"
```

---

## Task 6: AssetCard 컴포넌트 - 보험상품 이율 & badge 추가

**Files:**
- Modify: `components/app/assets-page-client.tsx:*` (새로운 섹션 추가)

- [ ] **Step 1: 보험상품 이율 표시 위치 파악**

[assets-page-client.tsx](components/app/assets-page-client.tsx)에서 nameBlock 객체 내 보험상품 관련 조건을 찾기. 현재 보험상품에 이율이 표시되지 않는 부분 확인.

- [ ] **Step 2: 보험상품 이율 + badge 코드 추가**

예적금 이율 표시 부분 (위의 Task 5에서 수정한 부분) 바로 뒤에 다음 코드 추가:

```typescript
{isInsurance && asset.expectedReturnRateBp != null && asset.expectedReturnRateBp > 0 && (
  <><span className="text-border/60">|</span><span className="tabular-nums font-medium text-emerald-400">연 {(asset.expectedReturnRateBp / 10000).toFixed(2)}%</span>
  {asset.compoundType && (
    <span className="ml-1 text-xs px-1.5 py-0.5 rounded-md font-medium text-white" style={{
      backgroundColor: asset.compoundType === 'simple' ? '#3b82f6' : '#10b981'
    }}>
      {asset.compoundType === 'simple' ? '단리' : '복리'}
    </span>
  )}
  </>
)}
```

- [ ] **Step 3: isInsurance 변수 확인**

AssetCard 함수의 상단에서 `const isInsurance = asset.assetType === 'insurance'` 같은 변수가 정의되어 있는지 확인. 없으면 추가:

```typescript
const isInsurance = asset.assetType === 'insurance'
```

- [ ] **Step 4: UI 테스트 (브라우저에서 확인)**

- expectedReturnRateBp가 있는 보험상품을 찾아서 이율과 badge가 표시되는지 확인
- expectedReturnRateBp가 없는 보험상품은 이율이 표시되지 않는지 확인

- [ ] **Step 5: Commit**

```bash
git add components/app/assets-page-client.tsx
git commit -m "feat: 보험상품 카드에 이율 및 단리/복리 badge 추가

expectedReturnRateBp가 있을 때만 표시"
```

---

## Task 7: 보험상품 입력 폼에 compoundType 드롭다운 추가

**Files:**
- Modify: `app/(app)/assets/new/page.tsx:*` (또는 보험상품 폼 컴포넌트)

- [ ] **Step 1: 보험상품 입력 폼 파일 찾기**

`app/(app)/assets/new/page.tsx` 또는 관련 폼 컴포넌트를 열어서 보험상품(insurance) 입력 섹션 찾기.

- [ ] **Step 2: compoundType 드롭다운 추가 위치 결정**

expectedReturnRateBp 입력 필드 바로 뒤에 compoundType 드롭다운 추가할 위치 결정.

- [ ] **Step 3: compoundType 드롭다운 코드 추가**

```typescript
<div>
  <label htmlFor="compoundType" className="block text-sm font-medium">
    이자 계산 방식
  </label>
  <select
    id="compoundType"
    name="compoundType"
    defaultValue="simple"
    className="w-full px-3 py-2 border border-border rounded-md"
  >
    <option value="simple">단리</option>
    <option value="monthly">월복리</option>
    <option value="yearly">연복리</option>
  </select>
</div>
```

(실제 폼 스타일링은 기존 폼 구조에 맞게 조정)

- [ ] **Step 4: 폼 서버 액션/API 수정 (필요시)**

보험상품 저장 시 compoundType이 포함되도록 서버 액션 또는 API 엔드포인트 수정. `insuranceDetails` 테이블에 compoundType을 함께 저장하도록 확인.

- [ ] **Step 5: UI 테스트 (브라우저에서 확인)**

- 보험상품 추가 폼에서 "이자 계산 방식" 드롭다운이 표시되는지 확인
- 각 옵션(단리, 월복리, 연복리)을 선택해서 저장 후 제대로 저장되는지 확인

- [ ] **Step 6: Commit**

```bash
git add app/(app)/assets/new/page.tsx
git commit -m "feat: 보험상품 입력 폼에 compoundType 드롭다운 추가

기본값은 '단리'로 설정"
```

---

## Task 8: 전체 UI 통합 테스트

**Files:**
- Test: assets 페이지 전체

- [ ] **Step 1: 개발 서버 시작**

```bash
npm run dev
```

- [ ] **Step 2: assets 페이지 방문**

브라우저에서 `/assets` 페이지 방문.

- [ ] **Step 3: 예적금 카드 검증**

- 예적금 카드 확인: 이율 옆에 단리/복리 badge 표시 여부
- 다양한 compoundType 값('simple', 'monthly') 확인
- compoundType이 없는 경우 badge 미표시 확인

- [ ] **Step 4: 보험상품 카드 검증**

- 보험상품 카드 확인: expectedReturnRateBp가 있을 때만 이율 + badge 표시
- 단리/복리 badge 색상 확인 (파란색/초록색)
- compoundType이 없거나 expectedReturnRateBp가 없는 경우 미표시 확인

- [ ] **Step 5: 보험상품 추가 폼 검증**

- 보험상품 추가 폼에서 "이자 계산 방식" 드롭다운 확인
- 각 옵션 선택 후 저장 및 카드에서 badge 표시 확인

- [ ] **Step 6: 엣지 케이스 검증**

- interestRateBp = 0인 예적금: badge 표시 안 함
- expectedReturnRateBp = null인 보험상품: 이율 및 badge 표시 안 함
- compoundType = 'simple', 'monthly', 'yearly' 각각 확인

- [ ] **Step 7: Final Commit**

```bash
git add -A
git commit -m "test: 단리/복리 badge UI 통합 테스트 완료

- 예적금 카드: 단리/복리 badge 표시
- 보험상품 카드: 이율 + badge 표시
- 입력 폼: compoundType 선택 가능
- 엣지 케이스 처리 확인"
```

---

## Summary

전체 구현 순서:
1. Schema: insurance_details에 compoundType 필드 추가
2. Migration: Drizzle 마이그레이션 생성 및 적용
3. Types: AssetPerformance에 compoundType 추가
4. Queries: assets 쿼리에서 compoundType 로드
5. UI: AssetCard에서 예적금 badge 추가
6. UI: AssetCard에서 보험상품 이율 + badge 추가
7. UI: 보험상품 입력 폼에 compoundType 드롭다운 추가
8. Testing: 전체 UI 통합 테스트
