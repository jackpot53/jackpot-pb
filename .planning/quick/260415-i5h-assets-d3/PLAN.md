# Quick Task: assets 페이지 우측 차트 D3 캔들스틱 교체

**ID:** 260415-i5h-assets-d3
**Files touched:** `lib/price/sparkline.ts`, `components/app/candlestick-chart.tsx` (new), `components/app/asset-group-chart.tsx`, `app/(app)/assets/page.tsx`, `components/app/assets-page-client.tsx`

---

## Task 1 — OhlcPoint 타입 및 fetchOhlcForTickers 추가 (`lib/price/sparkline.ts`)

**Changes:**

1. 파일 상단에 `OhlcPoint` 인터페이스 추가 (export):
   ```ts
   export interface OhlcPoint {
     date: string   // 'YYYY-MM-DD'
     open: number
     high: number
     low: number
     close: number
   }
   ```

2. `fetchOhlcData(ticker: string): Promise<OhlcPoint[] | null>` 추가:
   - 동일한 Yahoo Finance 엔드포인트 사용: `v8/finance/chart/${ticker}?interval=1d&range=1mo`
   - `result[0].timestamp[]` → `new Date(ts * 1000).toISOString().slice(0, 10)` 으로 date 변환
   - `indicators.quote[0]` 에서 `open`, `high`, `low`, `close` 배열 추출
   - 인덱스별로 zip 하여 OhlcPoint[] 생성, `open/high/low/close` 중 하나라도 null이면 skip
   - 결과가 2개 미만이면 null 반환
   - fetch 설정은 기존 sparkline과 동일: `revalidate: 3600`, `User-Agent`, `timeout: 5000`

3. `fetchOhlcForTickers(tickers: string[]): Promise<Map<string, OhlcPoint[]>>` 추가:
   - `fetchSparklinesForTickers` 패턴 그대로 복사하되 `fetchOhlcData` 호출
   - 실패한 ticker는 map에서 omit

4. 기존 `fetchSparklineData` / `fetchSparklinesForTickers` 는 변경하지 않음.

**Acceptance:** `fetchOhlcForTickers(['005930.KS'])` 호출 시 `Map<'005930.KS', OhlcPoint[]>` 반환, 각 point에 date/o/h/l/c 있음. TypeScript 컴파일 에러 없음.

---

## Task 2 — CandlestickChart 컴포넌트 생성 (`components/app/candlestick-chart.tsx`)

**Props interface:**
```ts
export interface CandlestickPoint {
  date: string    // 'YYYY-MM-DD' or any string (used as key)
  label?: string  // x축 표시 레이블 (없으면 date에서 파생)
  open: number
  high: number
  low: number
  close: number
}

interface CandlestickChartProps {
  data: CandlestickPoint[]
  formatPrice?: (v: number) => string
}
```

**Implementation (D3 v7, 'use client'):**

- `useRef<SVGSVGElement>` + `useEffect` + `ResizeObserver`로 svg 크기 감지 (`w-full h-full` 패턴)
- margin: `{ top: 10, right: 8, bottom: 24, left: 56 }`
- **x축:** `d3.scaleBand()` — domain = 인덱스 배열(`data.map((_, i) => i)`), range = `[0, innerWidth]`, padding = 0.2
- **y축:** `d3.scaleLinear()` — domain = `[d3.min(data, d => d.low) * 0.999, d3.max(data, d => d.high) * 1.001]`, range = `[innerHeight, 0]`
- **Grid:** 수평선 4-5개, stroke `#f0f0f0`, strokeDasharray `3 3`
- **Y축 레이블:** 오른쪽 정렬, `width: 52`, tick fontSize 10, fill `#9ca3af`, formatter = `formatPrice` prop (기본값 `formatAxisKrw` — 아래 참고)
- **X축 레이블:** bottom, tick fontSize 10, fill `#9ca3af`, 표시값 = `d.label ?? d.date.slice(5)` (MM-DD), `interval: "preserveStartEnd"` 방식으로 첫·끝·n번째마다만 표시 (데이터 길이에 따라 약 5-6개)
- **캔들 렌더:**
  - Wick: `line`, x = band center, y1 = `y(d.high)`, y2 = `y(d.low)`, stroke = up/down color, strokeWidth 1
  - Body: `rect`, x = `x(i)`, width = `x.bandwidth()`, y = `y(Math.max(d.open, d.close))`, height = `Math.max(1, Math.abs(y(d.open) - y(d.close)))`, fill = color
  - Up (close >= open): fill `#ef4444`, Down: fill `#3b82f6`
- **Hover tooltip:** svg 위에 absolute div, `mousemove` on SVG로 위치 계산, 내용: date, O/H/L/C 값 (formatPrice 사용), up/down 색상 적용. `mouseleave`로 숨김.
- **기본 formatPrice (`formatAxisKrw`):** 내부에 정의
  ```ts
  function formatAxisKrw(v: number): string {
    const abs = Math.abs(v)
    if (abs >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`
    if (abs >= 10_000) return `${(v / 10_000).toFixed(0)}만`
    return v.toLocaleString()
  }
  ```
  단, 월별/연간 탭에서 포트폴리오 총액을 표시할 때도 이 포맷을 사용하므로 sign prefix 없이 절대값 기준.

**Acceptance:** `<CandlestickChart data={ohlcPoints} />` 렌더 시 캔들 SVG 표시, hover 시 tooltip. 빈 data 배열이면 아무것도 렌더하지 않음 (null return). TypeScript 에러 없음.

---

## Task 3 — asset-group-chart.tsx 전면 교체

**기존 코드 교체 범위:** recharts AreaChart 전체를 CandlestickChart로 교체. `computeDailyProfit`, DailyTooltip, MonthlyTooltip, AnnualTooltip, recharts import 제거.

**Props 변경:**
```ts
interface AssetGroupChartProps {
  assets: AssetPerformance[]
  sparklines?: Record<string, number[]>   // 유지 (하위 호환, 사용 안 함)
  ohlcData?: Record<string, OhlcPoint[]>  // 추가
  monthlyData?: MonthlyDataPoint[]
  annualData?: AnnualDataPoint[]
}
```

**30일 탭:**
- `assets`에서 `priceType === 'live'` && `ticker` 있고 `ohlcData?.[ticker]`에 데이터 있는 것 필터
- `tickerOptions: { ticker, name, valueKrw }[]` — 자산 value 내림차순 정렬
- `selectedTicker` state — 초기값 = tickerOptions[0].ticker
- tickerOptions.length > 1 이면 select dropdown 표시 (Tailwind styled, 기본 HTML `<select>` 사용):
  ```tsx
  <select value={selectedTicker} onChange={e => setSelectedTicker(e.target.value)}
    className="text-xs border border-border rounded px-2 py-1 bg-background">
    {tickerOptions.map(t => <option key={t.ticker} value={t.ticker}>{t.name} ({t.ticker})</option>)}
  </select>
  ```
- OhlcPoint[] → CandlestickPoint[]: `date` 그대로, `label` = `date.slice(5)` (MM-DD)
- 빈 경우 (tickerOptions.length === 0): "시세 데이터 없음"

**월별 탭 (`monthlyData: MonthlyDataPoint[]`):**
- `MonthlyDataPoint: { label: string; totalValueKrw: number; returnPct?: number; profitKrw: number }`
- label 형식: `'YYYY-MM'`
- CandlestickPoint 변환:
  ```ts
  monthlyData.map((d, i) => {
    const prev = i > 0 ? monthlyData[i - 1].totalValueKrw : d.totalValueKrw
    const open = prev
    const close = d.totalValueKrw
    return {
      date: `${d.label}-01`,
      label: `${parseInt(d.label.slice(5), 10)}월`,
      open,
      close,
      high: Math.max(open, close),
      low: Math.min(open, close),
    }
  })
  ```
- `formatPrice` = 절대값 기준 억/만 formatter (formatAxisKrw)
- 데이터 < 2: "스냅샷 데이터 부족"

**연간 탭 (`annualData: AnnualDataPoint[]`):**
- `AnnualDataPoint: { year: number; returnPct: number; totalValueKrw: number; profitKrw: number }`
- CandlestickPoint 변환:
  ```ts
  annualData.map((d, i) => {
    const prev = i > 0 ? annualData[i - 1].totalValueKrw : d.totalValueKrw
    const open = prev
    const close = d.totalValueKrw
    return {
      date: `${d.year}-01-01`,
      label: String(d.year),
      open, close,
      high: Math.max(open, close),
      low: Math.min(open, close),
    }
  })
  ```
- 데이터 < 2: "스냅샷 데이터 부족"

**레이아웃 유지:** 탭 버튼 (`30일` / `월별` / `연간`) 및 `flex flex-col gap-3 h-full` 구조 그대로 유지.

**Import 정리:**
- recharts 전체 제거
- `import { CandlestickChart } from './candlestick-chart'` + `import type { OhlcPoint } from '@/lib/price/sparkline'` + `import type { CandlestickPoint } from './candlestick-chart'` 추가
- `formatKrw` 는 더 이상 사용하지 않으면 제거
- `formatAxisKrw` helper는 candlestick-chart.tsx 내부로 이동했으므로 이 파일에서는 제거

**Acceptance:** 각 탭에서 CandlestickChart 렌더됨. 30일 탭에서 live ticker가 여럿일 때 dropdown 전환 동작. TypeScript 에러 없음. recharts import 없음.

---

## Task 4 — 데이터 흐름 연결 (`app/(app)/assets/page.tsx` + `components/app/assets-page-client.tsx`)

### `app/(app)/assets/page.tsx`

1. import 추가: `import { fetchOhlcForTickers } from '@/lib/price/sparkline'`
2. `fetchSparklinesForTickers` 호출을 `Promise.all`로 묶거나, 기존 `sparklines` fetch 뒤에 병렬로 실행:
   ```ts
   const [sparklines, ohlcMap] = await Promise.all([
     fetchSparklinesForTickers(liveTickers),
     fetchOhlcForTickers(liveTickers),
   ])
   const sparklinesObj = Object.fromEntries(sparklines)
   const ohlcObj = Object.fromEntries(ohlcMap)
   ```
   (기존 `const sparklines = await fetchSparklinesForTickers(liveTickers)` 교체)
3. `AssetsPageClient`에 `ohlcData={ohlcObj}` prop 추가

### `components/app/assets-page-client.tsx`

1. import 추가: `import type { OhlcPoint } from '@/lib/price/sparkline'`
2. `AssetsPageClientProps` 인터페이스에 `ohlcData?: Record<string, OhlcPoint[]>` 추가
3. `AssetsPageClient` 함수 파라미터에 `ohlcData` 추가 (기본값 `{}`)
4. `CollapsibleChart` 컴포넌트 props에도 `ohlcData` 추가 및 `AssetGroupChart`에 전달
5. 인라인 `<AssetGroupChart>` 호출 두 곳 (all 탭 / type 탭) 모두에 `ohlcData={ohlcData}` 추가

   **변경이 필요한 위치 (line 번호 기준):**
   - line 290: `CollapsibleChart` 안의 `AssetGroupChart` — `ohlcData` prop 추가
   - line 459: all 탭의 `AssetGroupChart` — `ohlcData={ohlcData}` 추가
   - line 479: type 탭의 `AssetGroupChart` — `ohlcData={ohlcData}` 추가
   
   단, `CollapsibleChart`는 현재 `all`/`type` 탭 뷰에서 직접 사용되지 않고 정의만 되어 있음 — 함수 자체는 props 인터페이스만 업데이트하면 됨.

6. `sparklines` prop 및 `AssetGroupChart`로의 sparklines 전달은 유지 (mini sparkline card에서 여전히 사용)

**Acceptance:**
- `npm run build` 에러 없음
- `/assets` 페이지 로드 시 우측 차트 영역에 캔들스틱 표시
- 30일 탭: live ticker OHLC 데이터 기반 캔들 렌더 (live ticker 없으면 "시세 데이터 없음")
- 월별/연간 탭: totalValueKrw 기반 pseudo-OHLC 캔들 렌더
- 카드의 mini sparkline은 영향받지 않음

---

## Overall Acceptance

- `npm run build` 통과 (TypeScript 에러 없음)
- recharts import가 `asset-group-chart.tsx`에 남아 있지 않음
- 캔들스틱 up=빨강(#ef4444), down=파랑(#3b82f6) 적용 확인
- hover tooltip에 O/H/L/C 수치 표시
