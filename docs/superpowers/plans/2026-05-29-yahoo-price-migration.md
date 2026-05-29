# Yahoo Finance 시세 마이그레이션 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** KIS API 및 실시간 시세 관련 코드를 전부 삭제하고, 국내/미국 주식·ETF 시세를 Yahoo Finance로 대체한다.

**Architecture:** KIS/Finnhub/BOK/WebSocket 인프라를 전량 제거하고 `lib/price/yahoo.ts`의 `fetchYahooQuote`를 모든 주식·ETF 시세의 단일 소스로 사용. 국내 주식 티커는 이미 DB에 `005930.KS` 형식으로 저장되어 있어 포맷 변환 불필요. 펀드(FunETF)와 Yahoo FX 환율 조회는 유지.

**Tech Stack:** Yahoo Finance v8 chart API (비공식, 인증 불필요), Drizzle ORM, Next.js Server Actions

---

### Task 1: KIS price 라이브러리 및 테스트 삭제

**Files:**
- Delete: `lib/price/kis.ts`
- Delete: `lib/price/kis-token.ts`
- Delete: `lib/price/kis-ticker.ts`
- Delete: `lib/price/kis-bulk.ts`
- Delete: `lib/price/kis-ws-approval.ts`
- Delete: `lib/price/bok-fx.ts`
- Delete: `lib/price/finnhub.ts`
- Delete: `lib/price/__tests__/kis.test.ts`
- Delete: `lib/price/__tests__/kis-token.test.ts`
- Delete: `lib/price/__tests__/kis-ticker.test.ts`
- Delete: `lib/price/__tests__/kis-bulk.test.ts`
- Delete: `lib/price/__tests__/kis-ws-approval.test.ts`
- Delete: `lib/price/__tests__/bok.test.ts`
- Delete: `lib/price/__tests__/finnhub.test.ts`

- [ ] **Step 1: 파일 삭제**

```bash
rm /Users/amiz/dev/jackpot-pb/lib/price/kis.ts \
   /Users/amiz/dev/jackpot-pb/lib/price/kis-token.ts \
   /Users/amiz/dev/jackpot-pb/lib/price/kis-ticker.ts \
   /Users/amiz/dev/jackpot-pb/lib/price/kis-bulk.ts \
   /Users/amiz/dev/jackpot-pb/lib/price/kis-ws-approval.ts \
   /Users/amiz/dev/jackpot-pb/lib/price/bok-fx.ts \
   /Users/amiz/dev/jackpot-pb/lib/price/finnhub.ts \
   /Users/amiz/dev/jackpot-pb/lib/price/__tests__/kis.test.ts \
   /Users/amiz/dev/jackpot-pb/lib/price/__tests__/kis-token.test.ts \
   /Users/amiz/dev/jackpot-pb/lib/price/__tests__/kis-ticker.test.ts \
   /Users/amiz/dev/jackpot-pb/lib/price/__tests__/kis-bulk.test.ts \
   /Users/amiz/dev/jackpot-pb/lib/price/__tests__/kis-ws-approval.test.ts \
   /Users/amiz/dev/jackpot-pb/lib/price/__tests__/bok.test.ts \
   /Users/amiz/dev/jackpot-pb/lib/price/__tests__/finnhub.test.ts
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: KIS/BOK/Finnhub 가격 라이브러리 및 테스트 삭제"
```

---

### Task 2: WebSocket, market-flow, ohlc-collector, 부속 파일 삭제

**Files:**
- Delete: `lib/ws/` (디렉터리 전체)
- Delete: `lib/market-flow/` (디렉터리 전체)
- Delete: `lib/robo-advisor/ohlc-collector.ts`
- Delete: `app/actions/kis-ws.ts`
- Delete: `app/api/kis-ws-approval/` (디렉터리 전체)
- Delete: `app/api/cron/ohlc-daily/` (디렉터리 전체)
- Delete: `db/queries/kis-ws-approval.ts`
- Delete: `components/app/live-price.tsx`
- Delete: `components/app/market-flow-section.tsx`

- [ ] **Step 1: 파일 삭제**

```bash
rm -rf /Users/amiz/dev/jackpot-pb/lib/ws \
       /Users/amiz/dev/jackpot-pb/lib/market-flow \
       /Users/amiz/dev/jackpot-pb/lib/robo-advisor/ohlc-collector.ts \
       /Users/amiz/dev/jackpot-pb/app/actions/kis-ws.ts \
       /Users/amiz/dev/jackpot-pb/app/api/kis-ws-approval \
       /Users/amiz/dev/jackpot-pb/app/api/cron/ohlc-daily \
       /Users/amiz/dev/jackpot-pb/db/queries/kis-ws-approval.ts \
       /Users/amiz/dev/jackpot-pb/components/app/live-price.tsx \
       /Users/amiz/dev/jackpot-pb/components/app/market-flow-section.tsx
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: KIS WebSocket, market-flow, ohlc-collector 삭제"
```

---

### Task 3: `lib/price/cache.ts` 재작성 (Yahoo 전용)

**Files:**
- Modify: `lib/price/cache.ts`

KIS/BOK/Finnhub 의존성을 제거하고 모든 시세 조회를 `fetchYahooQuote`로 교체한다. FX 환율도 `fetchYahooFxRate`로 단일화한다.

- [ ] **Step 1: `cache.ts` 전체 교체**

`lib/price/cache.ts` 내용을 아래로 교체:

```typescript
import { getPriceCacheByTicker, upsertPriceCache } from '@/db/queries/price-cache'
import { fetchYahooQuote, fetchYahooFxRate } from '@/lib/price/yahoo'
import { fetchFunetfNav } from '@/lib/price/funetf'

const PRICE_TTL_MS = 5 * 60 * 1000
const FX_TTL_MS = 60 * 60 * 1000

const KR_ASSET_TYPES = ['stock_kr', 'etf_kr']
const US_ASSET_TYPES = ['stock_us', 'etf_us']

function isStale(cachedAt: Date, ttlMs: number): boolean {
  return Date.now() - cachedAt.getTime() > ttlMs
}

export async function refreshPriceIfStale(ticker: string, assetType: string): Promise<void> {
  const cached = await getPriceCacheByTicker(ticker)
  if (cached && !isStale(cached.cachedAt, PRICE_TTL_MS)) return

  if (assetType === 'fund') {
    const result = await fetchFunetfNav(ticker)
    if (result === null || result.price <= 0) return
    const changeBps = result.changePercent !== null ? Math.round(result.changePercent * 100) : null
    await upsertPriceCache({ ticker, priceKrw: result.price, priceOriginal: result.price, currency: 'KRW', changeBps })
    return
  }

  if (KR_ASSET_TYPES.includes(assetType)) {
    const result = await fetchYahooQuote(ticker)
    if (result === null || result.price <= 0) return
    const priceKrw = Math.round(result.price)
    const changeBps = result.changePercent !== null ? Math.round(result.changePercent * 100) : null
    await upsertPriceCache({ ticker, priceKrw, priceOriginal: priceKrw, currency: 'KRW', changeBps })
    return
  }

  // US stocks/ETFs and crypto — price in USD, convert via FX
  const result = await fetchYahooQuote(ticker)
  if (result === null || result.price <= 0) return

  const fxCache = await getPriceCacheByTicker('USD_KRW')
  if (!fxCache || fxCache.priceKrw === 0) return
  const fxRate = fxCache.priceKrw / 10000

  const priceUsdCents = Math.round(result.price * 100)
  const priceKrw = Math.round(result.price * fxRate)
  const changeBps = result.changePercent !== null ? Math.round(result.changePercent * 100) : null
  await upsertPriceCache({ ticker, priceKrw, priceOriginal: priceUsdCents, currency: 'USD', changeBps })
}

export async function refreshFxIfStale(): Promise<void> {
  const cached = await getPriceCacheByTicker('USD_KRW')
  if (cached && !isStale(cached.cachedAt, FX_TTL_MS)) return

  const rateInt = await fetchYahooFxRate()
  if (rateInt === null) return

  await upsertPriceCache({
    ticker: 'USD_KRW',
    priceKrw: rateInt,
    priceOriginal: rateInt,
    currency: 'KRW',
  })
}

export { getPriceCacheByTicker as getPriceFromCache }
```

- [ ] **Step 2: `cache.test.ts` 업데이트**

`lib/price/__tests__/cache.test.ts` 를 읽고 KIS/BOK/Finnhub mock을 Yahoo mock으로 교체. 테스트 구조는 유지하되 import 경로와 mock 대상만 바꾼다:
- `fetchKisQuote` → `fetchYahooQuote`
- `fetchBokFxRate` → `fetchYahooFxRate`
- `fetchFinnhubQuote` 관련 테스트 케이스 삭제

- [ ] **Step 3: 테스트 실행 확인**

```bash
cd /Users/amiz/dev/jackpot-pb && npx vitest run lib/price/__tests__/cache.test.ts
```

Expected: 실패 없이 통과 (KIS 관련 케이스 제거 후)

- [ ] **Step 4: Commit**

```bash
git add lib/price/cache.ts lib/price/__tests__/cache.test.ts
git commit -m "refactor(price): cache.ts KIS/BOK/Finnhub → Yahoo 단일화"
```

---

### Task 4: `lib/price/sparkline.ts` 단순화 (Yahoo 전용)

**Files:**
- Modify: `lib/price/sparkline.ts`

KIS 라우팅 로직을 제거하고 모든 자산에 `fetchSparklineData`(Yahoo) 만 사용한다.

- [ ] **Step 1: `sparkline.ts` 교체**

`lib/price/sparkline.ts` 내용을 아래로 교체:

```typescript
export interface OhlcPoint {
  date: string  // 'YYYY-MM-DD'
  open: number
  high: number
  low: number
  close: number
}

export async function fetchSparklineData(
  ticker: string,
  interval = '1d',
  range = '1mo',
): Promise<OhlcPoint[] | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3_000),
    })
    if (!res.ok) return null

    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null

    const quote = result.indicators?.quote?.[0]
    const timestamps: (number | null)[] = result.timestamp ?? []
    if (!quote) return null

    const opens: (number | null)[] = quote.open ?? []
    const highs: (number | null)[] = quote.high ?? []
    const lows: (number | null)[] = quote.low ?? []
    const closes: (number | null)[] = quote.close ?? []

    const points: OhlcPoint[] = []
    const len = Math.min(timestamps.length, opens.length, highs.length, lows.length, closes.length)
    for (let i = 0; i < len; i++) {
      const o = opens[i], h = highs[i], l = lows[i], c = closes[i], ts = timestamps[i]
      if (
        typeof o === 'number' && o > 0 &&
        typeof h === 'number' && h > 0 &&
        typeof l === 'number' && l > 0 &&
        typeof c === 'number' && c > 0 &&
        typeof ts === 'number'
      ) {
        const d = new Date(ts * 1000)
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        points.push({ date, open: o, high: h, low: l, close: c })
      }
    }

    return points.length >= 2 ? points : null
  } catch {
    return null
  }
}

export async function fetchSparklinesForTickers(
  tickers: string[],
  interval = '1d',
  range = '1mo',
): Promise<Map<string, OhlcPoint[]>> {
  const results = await Promise.allSettled(
    tickers.map(async (ticker) => ({
      ticker,
      data: await fetchSparklineData(ticker, interval, range),
    }))
  )

  const map = new Map<string, OhlcPoint[]>()
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.data) {
      map.set(result.value.ticker, result.value.data)
    }
  }
  return map
}
```

- [ ] **Step 2: `fetchSparklinesForTickers` 호출부 시그니처 확인**

`assetTypes` 파라미터를 제거했으므로 호출부를 확인:

```bash
grep -rn "fetchSparklinesForTickers" /Users/amiz/dev/jackpot-pb --include="*.ts" --include="*.tsx" | grep -v ".next"
```

호출부에서 `assetTypes` 인수를 넘기고 있으면 제거한다.

- [ ] **Step 3: Commit**

```bash
git add lib/price/sparkline.ts
git commit -m "refactor(price): sparkline.ts KIS 라우팅 제거, Yahoo 단일화"
```

---

### Task 5: `app/actions/prices.ts` 재작성 (Yahoo 전용)

**Files:**
- Modify: `app/actions/prices.ts`

`runKisBatched`, `fetchKisQuote`를 제거하고 `Promise.allSettled` + `fetchYahooQuote` 로 교체한다.

- [ ] **Step 1: `prices.ts` 전체 교체**

`app/actions/prices.ts` 내용을 아래로 교체:

```typescript
'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { db } from '@/db'
import { assets } from '@/db/schema/assets'
import { priceCache } from '@/db/schema/price-cache'
import { and, eq, isNotNull, or, sql } from 'drizzle-orm'
import { getPriceCacheByTickers, upsertPriceCache } from '@/db/queries/price-cache'
import { refreshFxIfStale } from '@/lib/price/cache'
import { fetchFunetfNav } from '@/lib/price/funetf'
import { fetchYahooQuote } from '@/lib/price/yahoo'
import { timed } from '@/lib/perf'

const PRICE_TTL_MS = 5 * 60 * 1000
const KR_ASSET_TYPES = ['stock_kr', 'etf_kr']
const DEDUP_MS = 150_000
const CONCURRENCY = 10

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let idx = 0
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++
      results[i] = await tasks[i]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}

export async function refreshAllPricesInternal(): Promise<void> {
  return timed('refreshAllPricesInternal', async () => {
    const [{ maxCachedAt }] = await db
      .select({ maxCachedAt: sql<Date | null>`MAX(${priceCache.cachedAt})` })
      .from(priceCache)

    if (maxCachedAt && Date.now() - new Date(maxCachedAt).getTime() < DEDUP_MS) return

    await refreshFxIfStale()

    const liveAssets = await db
      .select({ ticker: assets.ticker, assetType: assets.assetType })
      .from(assets)
      .where(and(
        isNotNull(assets.ticker),
        or(eq(assets.priceType, 'live'), eq(assets.assetType, 'fund'))
      ))

    const tickers = liveAssets.filter((a) => a.ticker).map((a) => a.ticker!)
    if (tickers.length === 0) return

    const cacheMap = await getPriceCacheByTickers([...tickers, 'USD_KRW'])
    const now = Date.now()

    const staleAssets = liveAssets.filter((a) => {
      if (!a.ticker) return false
      const cached = cacheMap.get(a.ticker)
      return !cached || now - cached.cachedAt.getTime() > PRICE_TTL_MS
    }) as { ticker: string; assetType: string }[]

    if (staleAssets.length === 0) return

    const fxCache = cacheMap.get('USD_KRW')
    const fxRate = fxCache ? fxCache.priceKrw / 10000 : null

    await timed(`  fetch ${staleAssets.length} stale tickers`, () =>
      withConcurrency(
        staleAssets.map(({ ticker, assetType }) => async () => {
          try {
            if (assetType === 'fund') {
              const result = await fetchFunetfNav(ticker)
              if (!result || result.price <= 0) return
              const changeBps = result.changePercent !== null ? Math.round(result.changePercent * 100) : null
              await upsertPriceCache({ ticker, priceKrw: result.price, priceOriginal: result.price, currency: 'KRW', changeBps })
            } else if (KR_ASSET_TYPES.includes(assetType)) {
              const result = await fetchYahooQuote(ticker)
              if (!result || result.price <= 0) return
              const priceKrw = Math.round(result.price)
              const changeBps = result.changePercent !== null ? Math.round(result.changePercent * 100) : null
              await upsertPriceCache({ ticker, priceKrw, priceOriginal: priceKrw, currency: 'KRW', changeBps })
            } else {
              // US stocks/ETFs and crypto
              const result = await fetchYahooQuote(ticker)
              if (!result || result.price <= 0) return
              if (!fxRate) return
              const priceUsdCents = Math.round(result.price * 100)
              const priceKrw = Math.round(result.price * fxRate)
              const changeBps = result.changePercent !== null ? Math.round(result.changePercent * 100) : null
              await upsertPriceCache({ ticker, priceKrw, priceOriginal: priceUsdCents, currency: 'USD', changeBps })
            }
          } catch {
            // stale fallback: skip on error, existing cache preserved
          }
        }),
        CONCURRENCY,
      )
    )
  })
}

export async function refreshAllPrices(): Promise<void> {
  await requireUser()
  await refreshAllPricesInternal()
}
```

- [ ] **Step 2: prices 테스트 업데이트**

`app/actions/__tests__/prices.test.ts` 를 읽고 KIS mock을 Yahoo mock으로 교체:
- `vi.mock('@/lib/price/kis', ...)` → `vi.mock('@/lib/price/yahoo', ...)`
- `fetchKisQuote` 관련 assertion을 `fetchYahooQuote` assertion으로 교체

- [ ] **Step 3: 테스트 실행 확인**

```bash
cd /Users/amiz/dev/jackpot-pb && npx vitest run app/actions/__tests__/prices.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add app/actions/prices.ts app/actions/__tests__/prices.test.ts
git commit -m "refactor(prices): KIS → Yahoo Finance로 시세 조회 교체"
```

---

### Task 6: `vercel.json` — ohlc-daily 크론 제거

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: ohlc-daily 엔트리 제거**

`vercel.json` 을 아래로 교체:

```json
{
  "crons": [
    {
      "path": "/api/cron/snapshot",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/backtest-weekly",
      "schedule": "0 0 * * 0"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "chore: vercel.json ohlc-daily 크론 스케줄 제거"
```

---

### Task 7: `app/(app)/layout.tsx` — KisWsProvider 제거

**Files:**
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: KisWsProvider import 및 래핑 제거**

`app/(app)/layout.tsx` 의 내용을 아래로 교체:

```typescript
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { Sidebar } from '@/components/app/sidebar'
import { Header } from '@/components/app/header'
import { BackgroundCanvas } from '@/components/app/background-canvas'
import { MobileSidebarProvider } from '@/components/app/mobile-sidebar-context'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <MobileSidebarProvider>
      <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto px-4 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6 main-bg">
          <BackgroundCanvas />
          <div className="w-full max-w-[1280px] mx-auto">
            {children}
          </div>
          <footer className="w-full max-w-[1280px] mx-auto mt-16 pb-8">
            <div className="h-px bg-border mb-6" />
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-sm font-black tracking-[0.35em] uppercase select-none brand-shimmer">
                JACKPOT
              </span>
              <p className="text-xs tracking-widest text-muted-foreground font-medium">
                부의 미래를 설계하다
              </p>
            </div>
          </footer>
        </main>
      </div>
      </div>
    </MobileSidebarProvider>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/layout.tsx
git commit -m "chore: layout.tsx KisWsProvider 제거"
```

---

### Task 8: `components/app/asset-candle-chart.tsx` — liveTick 제거

**Files:**
- Modify: `components/app/asset-candle-chart.tsx`

`useKisLivePrice` hook과 liveTick overlay를 제거한다. 캔들차트는 DB 캐시 데이터만 표시한다.

- [ ] **Step 1: import 및 liveTick 제거**

`asset-candle-chart.tsx` 에서:

1. `import { useKisLivePrice } from '@/lib/ws/kis-ws-context'` 줄 삭제
2. `const liveTick = useKisLivePrice(ticker, assetType ?? null)` 줄 삭제
3. `chartData` useMemo를 liveTick 없이 단순화:

기존:
```typescript
const chartData = useMemo<OhlcPoint[]>(() => {
  if (!liveTick || baseData.length === 0 || period !== '일봉') return baseData
  const last = baseData[baseData.length - 1]
  return [...baseData.slice(0, -1), {
    ...last,
    close: liveTick.price,
    high: Math.max(last.high, liveTick.price),
    low: Math.min(last.low, liveTick.price),
  }]
}, [baseData, liveTick, period])
```

교체 후:
```typescript
const chartData = baseData
```

(useMemo 자체를 제거하고 `baseData`를 직접 사용)

- [ ] **Step 2: `chartData` 참조가 있는 부분 확인**

파일 내 `chartData`가 사용되는 모든 곳이 `baseData`로 자연스럽게 교체되었는지 확인:

```bash
grep -n "chartData\|liveTick" /Users/amiz/dev/jackpot-pb/components/app/asset-candle-chart.tsx
```

Expected: 아무 결과도 없어야 함

- [ ] **Step 3: Commit**

```bash
git add components/app/asset-candle-chart.tsx
git commit -m "chore: asset-candle-chart.tsx KIS 실시간 tick overlay 제거"
```

---

### Task 9: `components/app/assets-page-client.tsx` — 실시간 UI 제거

**Files:**
- Modify: `components/app/assets-page-client.tsx`

`LivePrice`, `useLivePerformance`, `useLivePerformances`, `useKisWsEnabled` 제거. `live` 변수를 `asset`으로 직접 교체.

- [ ] **Step 1: import 정리**

4번 줄 lucide import에서 `Wifi`, `WifiOff` 제거:

```typescript
import { Layers, LayoutGrid, TrendingUp, TrendingDown, BarChart2, Bitcoin, Building2, PiggyBank, BookOpen, ChevronDown, HelpCircle, ShieldCheck, Gem, CreditCard, RefreshCw, Wallet } from 'lucide-react'
```

29~31번 줄의 아래 import 3줄 삭제:
```typescript
import { LivePrice } from '@/components/app/live-price'
import { useLivePerformance, useLivePerformances } from '@/lib/ws/live-performance'
import { useKisWsEnabled } from '@/lib/ws/kis-ws-context'
```

- [ ] **Step 2: `AssetCard` 함수에서 live 관련 코드 제거**

`AssetCard` 함수 내:

삭제 대상 4줄:
```typescript
const wsEnabled = useKisWsEnabled()
const isLiveEligible = wsEnabled && !!asset.ticker && LIVE_ASSET_TYPES.has(asset.assetType)
const [liveEnabled, setLiveEnabled] = useState(false)
const live = useLivePerformance(asset, isLiveEligible && liveEnabled)
const isLiveActive = isLiveEligible && liveEnabled && live !== asset
```

그리고 파일 내 `live.` 참조를 모두 `asset.` 으로 교체:
```bash
# 확인용
grep -n "\blive\." /Users/amiz/dev/jackpot-pb/components/app/assets-page-client.tsx
```

- [ ] **Step 3: `<LivePrice>` 컴포넌트를 인라인 렌더링으로 교체**

기존 `<LivePrice ... />` 블록:
```tsx
<LivePrice
  ticker={asset.ticker}
  assetType={asset.assetType}
  fallbackPriceKrw={asset.currentPriceKrw}
  fallbackPriceUsd={asset.currentPriceUsd}
  fallbackChangePct={dailyChangePct}
  changeClassName="ml-1"
  enabled={liveEnabled}
/>
```

교체:
```tsx
<span className="text-foreground">
  {(asset.assetType === 'stock_us' || asset.assetType === 'etf_us') && asset.currentPriceUsd != null
    ? formatUsd(asset.currentPriceUsd)
    : formatKrw(asset.currentPriceKrw)}
</span>
{dailyChangePct !== null && (
  <span className={`tabular-nums font-bold ml-1 ${(dailyChangePct ?? 0) >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
    {(dailyChangePct ?? 0) >= 0 ? '+' : ''}{dailyChangePct.toFixed(2)}%
  </span>
)}
```

- [ ] **Step 4: Wifi 버튼 블록 제거**

`isLiveEligible &&` 조건으로 감싸진 Wifi/WifiOff 버튼 블록 전체 삭제:
```tsx
{isLiveEligible && (
  <button
    onClick={() => setLiveEnabled(v => !v)}
    ...
  >
    {isLiveActive
      ? <Wifi className="h-2.5 w-2.5 animate-pulse" />
      : <WifiOff className="h-2.5 w-2.5" />
    }
  </button>
)}
```

- [ ] **Step 5: `AssetGridCard` 내 live 제거**

`AssetGridCard` 함수 내:
```typescript
const live = useLivePerformance(asset)  // 삭제
```
`live.` 참조를 `asset.` 으로 교체.

- [ ] **Step 6: `AssetGroup` 내 useLivePerformances 제거**

`const liveAssets = useLivePerformances(assets, true)` 삭제하고,
`liveAssets` 참조를 모두 `assets` 로 교체.

- [ ] **Step 7: TypeScript 빌드 확인**

```bash
cd /Users/amiz/dev/jackpot-pb && npx tsc --noEmit 2>&1 | head -40
```

Expected: 오류 없음 (또는 이 파일과 무관한 기존 오류만 표시)

- [ ] **Step 8: Commit**

```bash
git add components/app/assets-page-client.tsx
git commit -m "chore: assets-page-client 실시간 WebSocket UI 제거"
```

---

### Task 10: `fetchSparklinesForTickers` 호출부 수정

Task 4에서 `assetTypes` 파라미터를 제거했으므로, 호출부를 실제로 수정한다.

**Files:**
- Modify: 호출부 파일들 (Task 4 Step 2에서 grep으로 확인한 파일들)

- [ ] **Step 1: 호출부 확인 및 수정**

```bash
grep -rn "fetchSparklinesForTickers" /Users/amiz/dev/jackpot-pb --include="*.ts" --include="*.tsx" | grep -v ".next"
```

각 호출부에서 `assetTypes` 인수를 제거한다 (4번째 파라미터).

- [ ] **Step 2: TypeScript 빌드 재확인**

```bash
cd /Users/amiz/dev/jackpot-pb && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: fetchSparklinesForTickers assetTypes 파라미터 제거"
```

---

### Task 11: 전체 빌드 및 최종 검증

- [ ] **Step 1: 전체 테스트 실행**

```bash
cd /Users/amiz/dev/jackpot-pb && npx vitest run 2>&1 | tail -30
```

KIS/BOK/Finnhub 관련 테스트가 모두 사라지고 나머지가 통과하는지 확인.

- [ ] **Step 2: Next.js 빌드 확인**

```bash
cd /Users/amiz/dev/jackpot-pb && npx next build 2>&1 | tail -30
```

Expected: 빌드 성공 (오류 없음)

- [ ] **Step 3: 남은 KIS 참조 확인**

```bash
grep -rn "kis\|KIS\|finnhub\|bok-fx\|bokFx\|BokFx" \
  /Users/amiz/dev/jackpot-pb/app \
  /Users/amiz/dev/jackpot-pb/lib \
  /Users/amiz/dev/jackpot-pb/components \
  --include="*.ts" --include="*.tsx" \
  | grep -v ".next" | grep -v "node_modules"
```

Expected: 결과 없음 (또는 주석/문자열 내 참조만)
