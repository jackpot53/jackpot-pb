# 단리/복리 Badge 디자인

## 개요

assets 페이지의 예적금과 보험상품 카드에서 이율 옆에 단리/복리를 구분하는 badge를 표시합니다.

## 요구사항

- **예적금**: savings_details.compoundType 기반으로 "단리" / "복리" badge 표시
- **보험상품**: insurance_details에 compoundType 필드 추가, 사용자가 선택 가능
- **배지 위치**: 이율 표시 바로 옆 (독립적인 badge)
- **배지 색상**: 
  - 단리: 파란색 (#3b82f6)
  - 복리: 초록색 (#10b981)
- **배지 스타일**: Minimal (xs 크기, "단리" / "복리" 텍스트만 표시)

## 데이터 모델 변경

### 1. insurance_details 스키마 수정

`db/schema/insurance-details.ts`에 `compoundType` 컬럼 추가:

```typescript
// 'simple'(단리) | 'monthly'(월복리) | 'yearly'(연복리)
compoundType: varchar('compound_type', { length: 10 }).notNull().default('simple'),
```

**마이그레이션 필요:**
- 기존 보험상품: 모두 'simple'으로 초기화
- 새로 추가되는 보험상품: 사용자 선택

### 2. AssetPerformance 타입 확장

`lib/portfolio.ts`의 AssetPerformance 타입에 compoundType 추가:

```typescript
compoundType?: string; // 'simple' | 'monthly' | 'yearly'
```

### 3. Query 수정

assets 조회 쿼리에서 savingsDetails와 insuranceDetails 함께 로드하여 compoundType 포함.

## UI 변경

### AssetCard 컴포넌트 수정

`components/app/assets-page-client.tsx`의 AssetCard 함수에서 이율 표시 부분 수정:

**예적금 (기존 432-433줄):**

Before:
```tsx
{isSavings && asset.interestRateBp != null && asset.interestRateBp > 0 && (
  <><span className="text-border/60">|</span><span className="tabular-nums font-medium text-emerald-400">연 {(asset.interestRateBp / 10000).toFixed(2)}%</span></>
)}
```

After:
```tsx
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

**보험상품 (새로 추가):**

expectedReturnRateBp가 있을 때 표시:
```tsx
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

### 보험상품 입력 폼

`app/(app)/assets/new/page.tsx` 또는 보험상품 편집 폼에서 compoundType 드롭다운 추가:

```tsx
<select name="compoundType" defaultValue="simple">
  <option value="simple">단리</option>
  <option value="monthly">월복리</option>
  <option value="yearly">연복리</option>
</select>
```

## 구현 순서

1. insurance_details 스키마에 compoundType 컬럼 추가
2. 마이그레이션 작성 및 적용
3. Query에서 compoundType 로드하도록 수정
4. AssetPerformance 타입 수정
5. AssetCard에서 예적금 badge 추가
6. AssetCard에서 보험상품 이율 + badge 추가
7. 보험상품 입력 폼에 compoundType 드롭다운 추가
8. UI 테스트

## 에러 처리

- compoundType이 null/undefined인 경우: badge 미표시 (기존 이율만 표시)
- 새 데이터: 기본값은 'simple'
- 마이그레이션: 기존 데이터는 모두 'simple'으로 초기화
