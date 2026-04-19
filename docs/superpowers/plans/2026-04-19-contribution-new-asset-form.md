# 출자금 신규 생성 폼 — 출자 일자 & 연도별 배당률 입력 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 출자금 신규 생성 시 출자 일자와 연도별 배당률을 한 번에 입력·저장할 수 있게 한다.

**Architecture:** `AssetFormValues`에 `contributionDividendRates` 배열 필드를 추가하고, `NewAssetForm`에서 `depositStartDate` 변경 시 연도 행을 자동 생성한다. `createAsset` 서버 액션에서 기존 `interestRatePct` 단일 저장 로직을 배열 저장으로 교체한다.

**Tech Stack:** Next.js 16 App Router, TypeScript 5, React Hook Form, Zod v4, Drizzle ORM

---

## 파일 변경 목록

| 파일 | 변경 유형 | 역할 |
|------|-----------|------|
| `app/actions/assets.ts` | Modify | `AssetFormValues` 스키마에 `contributionDividendRates` 추가, `createAsset` contribution 저장 로직 교체 |
| `components/app/new-asset-form.tsx` | Modify | 출자금 섹션에 연도별 배당률 UI 추가, `interestRatePct` 단일 입력 제거 |

---

### Task 1: `AssetFormValues` 스키마에 `contributionDividendRates` 배열 추가

**Files:**
- Modify: `app/actions/assets.ts`

현재 스키마 (`app/actions/assets.ts:20-56`):
```ts
const assetSchema = z.object({
  // ...
  interestRatePct: z.string().optional().nullable(),  // 출자금에서 이 필드를 대체
  // ...
})
```

- [ ] **Step 1: `assetSchema`에 `contributionDividendRates` 필드 추가**

`app/actions/assets.ts`의 `assetSchema` 객체 안, `interestRatePct` 라인 바로 아래에 추가:

```ts
contributionDividendRates: z.array(z.object({
  year: z.number().int(),
  ratePct: z.string(),
})).optional().nullable(),
```

`interestRatePct`는 그대로 유지 (savings 타입에서도 사용하므로 삭제하지 않음).

- [ ] **Step 2: `createAsset`의 contribution 배당률 저장 로직 교체**

`app/actions/assets.ts:68` `createAsset` 함수의 destructuring에 `contributionDividendRates` 추가:

```ts
export async function createAsset(data: AssetFormValues): Promise<AssetActionError | void> {
  const user = await requireUser()
  const parsed = assetSchema.safeParse(data)
  if (!parsed.success) return { error: '입력 값을 확인해주세요.' }
  const {
    ticker, notes, brokerageId, withdrawalBankId, owner,
    initialQuantity, initialPricePerUnit, initialTransactionDate, initialExchangeRate,
    initialSurrenderValue, insuranceType,
    insuranceCategory, paymentCycle, premiumPerCycleKrw, contractDate,
    paymentEndDate, coverageEndDate, sumInsuredKrw, expectedReturnRatePct,
    savingsKind, interestRatePct, depositStartDate, maturityDate,
    monthlyContributionKrw, compoundType, taxType, autoRenew,
    contributionDividendRates,  // ← 추가
    ...rest
  } = parsed.data
```

- [ ] **Step 3: `createAsset` contribution 블록의 배당률 저장 로직 교체**

`app/actions/assets.ts:122-131` 기존 코드:
```ts
    if (interestRatePct && !isNaN(parseFloat(interestRatePct))) {
      const rateBp = Math.round(parseFloat(interestRatePct) * 10000)
      const currentYear = new Date().getFullYear()
      await db.insert(contributionDividendRates).values({
        assetId: newAsset.id,
        userId: user.id,
        year: currentYear,
        rateBp,
      })
    }
```

위 블록을 아래로 교체 (변수명 충돌 주의: 스키마 필드 `contributionDividendRates`와 DB 테이블 import `contributionDividendRates`가 같다. destructuring 시 rename):

먼저 destructuring에서 rename:
```ts
contributionDividendRates: contributionDividendRatesInput,  // ← rename
```

그리고 저장 로직:
```ts
    if (contributionDividendRatesInput && contributionDividendRatesInput.length > 0) {
      const validRates = contributionDividendRatesInput.filter(
        r => r.ratePct.trim() !== '' && !isNaN(parseFloat(r.ratePct))
      )
      if (validRates.length > 0) {
        await db.insert(contributionDividendRates).values(
          validRates.map(r => ({
            assetId: newAsset.id,
            userId: user.id,
            year: r.year,
            rateBp: Math.round(parseFloat(r.ratePct) * 10000),
          }))
        )
      }
    }
```

- [ ] **Step 4: TypeScript 컴파일 확인**

```bash
cd /Users/amiz/dev/jackpot-pb && npx tsc --noEmit 2>&1 | head -30
```

오류 없으면 통과. `contributionDividendRates` 관련 타입 오류가 나오면 rename이 올바른지 확인.

- [ ] **Step 5: 커밋**

```bash
git add app/actions/assets.ts
git commit -m "feat(actions): contributionDividendRates 배열로 출자금 배당률 일괄 저장"
```

---

### Task 2: `NewAssetForm` — 연도별 배당률 UI 추가

**Files:**
- Modify: `components/app/new-asset-form.tsx`

현재 contribution 섹션 위치: `new-asset-form.tsx:1491-1534`

현재 UI:
- 출자금액 (`initialPricePerUnit`) + 배당률 (`interestRatePct`) — 2열 grid
- 출자일자 (`depositStartDate`)

변경 후 UI:
- 출자금액 (`initialPricePerUnit`) + 출자일자 (`depositStartDate`) — 2열 grid
- 연도별 배당률 섹션 (출자일자 입력 후 자동 생성)

- [ ] **Step 1: `NewAssetForm` 컴포넌트에 배당률 state 추가**

`new-asset-form.tsx`의 `NewAssetForm` 함수 컴포넌트 상단 (기존 state 선언들 아래)에 추가:

```ts
// 출자금 연도별 배당률 state: { [year]: ratePct }
const [dividendRateMap, setDividendRateMap] = useState<Record<number, string>>({})
```

- [ ] **Step 2: 출자일자로부터 연도 목록을 계산하는 헬퍼 추가**

컴포넌트 외부 (파일 상단, schema 아래쪽)에 순수 함수 추가:

```ts
function getDividendYears(depositDateStr: string | null | undefined): number[] {
  if (!depositDateStr) return []
  const depositYear = new Date(depositDateStr).getFullYear()
  if (isNaN(depositYear)) return []
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = depositYear + 1; y <= currentYear; y++) {
    years.push(y)
  }
  return years
}
```

- [ ] **Step 3: contribution 섹션 UI 교체**

`new-asset-form.tsx:1491-1534`의 `assetType === 'contribution'` 분기 전체를 아래로 교체:

```tsx
) : assetType === 'contribution' ? (
  <div className="flex flex-col gap-3">
    <div className="grid grid-cols-2 gap-3">
      <FormField control={form.control} name="initialPricePerUnit"
        render={({ field }) => (
          <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
            <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Banknote className="h-3.5 w-3.5 shrink-0" />출자금액 (₩)
            </FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ''} inputMode="numeric" placeholder="예: 1000000" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField control={form.control} name="depositStartDate"
        render={({ field }) => (
          <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
            <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />출자일자
            </FormLabel>
            <FormControl>
              <Input type="date" {...field} value={field.value ?? ''}
                onChange={e => {
                  field.onChange(e)
                  // 날짜 변경 시 연도 목록 재계산, 없어진 연도의 값은 제거
                  const newYears = new Set(getDividendYears(e.target.value))
                  setDividendRateMap(prev => {
                    const next: Record<number, string> = {}
                    newYears.forEach(y => { if (prev[y] !== undefined) next[y] = prev[y] })
                    return next
                  })
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>

    {/* 연도별 배당률 */}
    <div className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <TrendingUp className="h-3.5 w-3.5 shrink-0" />연도별 배당률
        <span className="ml-auto text-xs font-normal text-muted-foreground">선택</span>
      </p>
      {(() => {
        const depositDate = form.watch('depositStartDate')
        const years = getDividendYears(depositDate)
        if (years.length === 0) {
          return (
            <p className="text-xs text-muted-foreground text-center py-2">
              출자일자를 입력하면 연도 행이 자동 생성됩니다
            </p>
          )
        }
        return (
          <div className="flex flex-col gap-2">
            {years.map(year => (
              <div key={year} className="flex items-center gap-3">
                <span className="text-sm font-medium w-14 shrink-0">{year}년</span>
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={dividendRateMap[year] ?? ''}
                    onChange={e => setDividendRateMap(prev => ({ ...prev, [year]: e.target.value }))}
                    placeholder="예: 3.5"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  </div>
```

- [ ] **Step 4: 폼 제출 시 `dividendRateMap`을 `contributionDividendRates` 배열로 변환하여 전달**

`NewAssetForm`의 `handleSubmit` 함수를 찾아 contribution 처리 추가.

현재 `handleSubmit` 패턴 (컴포넌트 내 `onSubmit` 호출 부분):
```ts
async function handleSubmit(values: z.infer<typeof assetSchema>) {
  // ...
  const result = await onSubmit(values)
```

`onSubmit` 호출 직전에 contribution 배당률 배열 주입:

```ts
async function handleSubmit(values: z.infer<typeof assetSchema>) {
  // ...
  const submitValues = { ...values } as AssetFormValues
  if (values.assetType === 'contribution') {
    submitValues.contributionDividendRates = Object.entries(dividendRateMap)
      .map(([year, ratePct]) => ({ year: parseInt(year, 10), ratePct }))
      .filter(r => r.ratePct.trim() !== '')
  }
  const result = await onSubmit(submitValues)
```

- [ ] **Step 5: TypeScript 컴파일 확인**

```bash
cd /Users/amiz/dev/jackpot-pb && npx tsc --noEmit 2>&1 | head -30
```

오류 없으면 통과.

- [ ] **Step 6: 커밋**

```bash
git add components/app/new-asset-form.tsx
git commit -m "feat(ui): 출자금 신규 생성 폼에 연도별 배당률 입력 UI 추가"
```

---

## 수동 검증 체크리스트

Task 2 완료 후 `npm run dev`로 개발 서버 실행 후 확인:

1. `/assets/new` 접속 → 출자금 타입 선택
2. 조합 선택 → 종목명 자동 세팅 확인
3. 출자일자 미입력 상태: "출자일자를 입력하면 연도 행이 자동 생성됩니다" 표시 확인
4. 출자일자 `2021-03-15` 입력 → 2022~2026년 행 5개 생성 확인
5. 출자일자 `2020-01-01`으로 변경 → 2021~2026년 행 6개로 재계산, 기존 입력값 유지 확인
6. 몇 개 연도에 배당률 입력 후 저장 → `/assets` 리다이렉트 확인
7. 저장된 자산 편집 페이지 (`/assets/[id]/edit`) 접속 → 배당 이력에 입력한 연도만 표시 확인
8. 배당률 미입력 연도는 저장되지 않았는지 확인
