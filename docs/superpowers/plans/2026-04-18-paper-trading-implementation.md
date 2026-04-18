# 모의투자 백테스팅 페이지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 로보어드바이저 백테스트 데이터를 시각화하는 모의투자 페이지를 구현하고, 네비바에 메뉴 항목을 추가한다.

**Architecture:** 
- 서버 컴포넌트(page.tsx)에서 백테스트 데이터 조회
- 클라이언트 컴포넌트(paper-trading-client.tsx)에서 기간 선택 상태 관리
- 4개의 전문 시각화 컴포넌트(차트, 메트릭, 테이블, 히트맵)로 메트릭 표시

**Tech Stack:** Next.js 16, React 19, TypeScript, Recharts, Tailwind CSS, shadcn/ui

---

## 파일 구조

**생성:**
- `app/(app)/paper-trading/page.tsx` - 페이지 진입점 (서버 컴포넌트)
- `app/(app)/paper-trading/layout.tsx` - 페이지 레이아웃
- `components/app/paper-trading-client.tsx` - 기간 선택 및 데이터 전달 (클라이언트)
- `components/app/paper-trading-chart.tsx` - 누적 수익 라인 차트
- `components/app/paper-trading-metrics.tsx` - 핵심 메트릭 카드 (수익률, 샤프, MDD)
- `components/app/paper-trading-table.tsx` - 연도별 비교 테이블
- `components/app/paper-trading-heatmap.tsx` - 월별 리턴 히트맵

**수정:**
- `components/app/sidebar.tsx` - 네비바 메뉴 추가

---

### Task 1: 네비바에 모의투자 메뉴 추가

**Files:**
- Modify: `components/app/sidebar.tsx:8-29`

- [ ] **Step 1: TrendingUp 아이콘 import 추가**

sidebar.tsx의 lucide-react import에 `TrendingUp`을 추가합니다:

```typescript
import {
  Wallet,
  ArrowLeftRight,
  LineChart,
  Target,
  Sparkles,
  Bot,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  History,
  TrendingUp,
} from 'lucide-react'
```

- [ ] **Step 2: NAV_ITEMS 배열에 모의투자 항목 추가**

로보어드바이저 항목 다음에 모의투자 항목을 추가합니다 (26번 줄 다음):

```typescript
const NAV_ITEMS = [
  { label: '목표', href: '/goals', icon: Target, color: 'text-foreground/70', bg: 'bg-foreground/5', activeBg: 'bg-foreground/10', activeColor: 'text-foreground' },
  { label: '포트폴리오', href: '/assets', icon: Wallet, color: 'text-foreground/70', bg: 'bg-foreground/5', activeBg: 'bg-foreground/10', activeColor: 'text-foreground' },
  { label: '거래내역', href: '/transactions', icon: ArrowLeftRight, color: 'text-foreground/70', bg: 'bg-foreground/5', activeBg: 'bg-foreground/10', activeColor: 'text-foreground' },
  { label: '차트', href: '/charts', icon: LineChart, color: 'text-foreground/70', bg: 'bg-foreground/5', activeBg: 'bg-foreground/10', activeColor: 'text-foreground' },
  { label: '인사이트', href: '/insights', icon: Sparkles, color: 'text-foreground/70', bg: 'bg-foreground/5', activeBg: 'bg-foreground/10', activeColor: 'text-foreground' },
  { label: '로보어드바이저', href: '/robo-advisor', icon: Bot, color: 'text-foreground/70', bg: 'bg-foreground/5', activeBg: 'bg-foreground/10', activeColor: 'text-foreground' },
  { label: '모의투자', href: '/paper-trading', icon: TrendingUp, color: 'text-foreground/70', bg: 'bg-foreground/5', activeBg: 'bg-foreground/10', activeColor: 'text-foreground' },
  { label: '도움말', href: '/help', icon: HelpCircle, color: 'text-foreground/70', bg: 'bg-foreground/5', activeBg: 'bg-foreground/10', activeColor: 'text-foreground' },
  { label: '업데이트 내역', href: '/updates', icon: History, color: 'text-foreground/70', bg: 'bg-foreground/5', activeBg: 'bg-foreground/10', activeColor: 'text-foreground' },
]
```

- [ ] **Step 3: Commit**

```bash
git add components/app/sidebar.tsx
git commit -m "feat: add paper-trading menu to sidebar"
```

---

### Task 2: 페이지 구조 생성 (layout + page)

**Files:**
- Create: `app/(app)/paper-trading/page.tsx`
- Create: `app/(app)/paper-trading/layout.tsx`

- [ ] **Step 1: layout.tsx 생성**

```bash
mkdir -p "/Users/amiz/dev/jackpot-pb/app/(app)/paper-trading"
```

```typescript
// app/(app)/paper-trading/layout.tsx
export default function PaperTradingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
```

- [ ] **Step 2: page.tsx 생성 (서버 컴포넌트)**

```typescript
// app/(app)/paper-trading/page.tsx
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getAuthUser } from '@/utils/supabase/server'
import { Skeleton } from '@/components/ui/skeleton'
import { PaperTradingClient } from '@/components/app/paper-trading-client'

export const metadata = {
  title: '모의투자 백테스팅',
}

export default async function PaperTradingPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">모의투자 백테스팅</h1>
        <p className="text-sm text-muted-foreground mt-1">로보어드바이저 포트폴리오의 역사적 성과를 분석합니다</p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-10 w-96" />
            <Skeleton className="h-80 w-full rounded-lg" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          </div>
        }
      >
        <PaperTradingClient />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add 'app/(app)/paper-trading/'
git commit -m "feat: create paper-trading page structure"
```

---

### Task 3: 클라이언트 컴포넌트 생성 (기간 선택 및 상태 관리)

**Files:**
- Create: `components/app/paper-trading-client.tsx`

- [ ] **Step 1: paper-trading-client.tsx 생성**

```typescript
// components/app/paper-trading-client.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PaperTradingChart } from '@/components/app/paper-trading-chart'
import { PaperTradingMetrics } from '@/components/app/paper-trading-metrics'
import { PaperTradingTable } from '@/components/app/paper-trading-table'
import { PaperTradingHeatmap } from '@/components/app/paper-trading-heatmap'
import { Calendar } from 'lucide-react'

type PeriodType = '1y' | '3y' | '5y' | 'all' | 'custom'

interface DateRange {
  startDate: string
  endDate: string
}

const PERIOD_OPTIONS = [
  { label: '1년', value: '1y' },
  { label: '3년', value: '3y' },
  { label: '5년', value: '5y' },
  { label: '전체', value: 'all' },
]

const INITIAL_CAPITAL = 100_000_000

export function PaperTradingClient() {
  const [period, setPeriod] = useState<PeriodType>('1y')
  const [customRange, setCustomRange] = useState<DateRange | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const getDateRange = (): DateRange => {
    if (period === 'custom' && customRange) {
      return customRange
    }

    const endDate = new Date()
    const startDate = new Date()

    switch (period) {
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      case '3y':
        startDate.setFullYear(endDate.getFullYear() - 3)
        break
      case '5y':
        startDate.setFullYear(endDate.getFullYear() - 5)
        break
      case 'all':
        startDate.setFullYear(2000)
        break
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    }
  }

  const dateRange = getDateRange()

  return (
    <div className="space-y-6">
      {/* 제어판 */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              onClick={() => setPeriod(opt.value as PeriodType)}
              variant={period === opt.value ? 'default' : 'outline'}
              size="sm"
            >
              {opt.label}
            </Button>
          ))}
          <Button
            onClick={() => setShowDatePicker(!showDatePicker)}
            variant={period === 'custom' ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
          >
            <Calendar size={14} />
            날짜 선택
          </Button>
        </div>

        {showDatePicker && (
          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/60">시작일</label>
              <input
                type="date"
                value={customRange?.startDate || dateRange.startDate}
                onChange={(e) =>
                  setCustomRange((prev) => ({
                    startDate: e.target.value,
                    endDate: prev?.endDate || dateRange.endDate,
                  }))
                }
                className="px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded text-sm text-white"
              />
            </div>
            <span className="text-white/50">~</span>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/60">종료일</label>
              <input
                type="date"
                value={customRange?.endDate || dateRange.endDate}
                onChange={(e) =>
                  setCustomRange((prev) => ({
                    startDate: prev?.startDate || dateRange.startDate,
                    endDate: e.target.value,
                  }))
                }
                className="px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded text-sm text-white"
              />
            </div>
            <Button
              onClick={() => {
                setPeriod('custom')
                setShowDatePicker(false)
              }}
              size="sm"
            >
              적용
            </Button>
          </div>
        )}

        <div className="text-sm text-white/60">
          초기자금: ₩{INITIAL_CAPITAL.toLocaleString('ko-KR')} | 기간: {dateRange.startDate} ~ {dateRange.endDate}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <PaperTradingChart dateRange={dateRange} />
      <PaperTradingMetrics dateRange={dateRange} />
      <PaperTradingTable dateRange={dateRange} />
      <PaperTradingHeatmap dateRange={dateRange} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app/paper-trading-client.tsx
git commit -m "feat: add paper-trading client with date selection"
```

---

### Task 4: 누적 수익 차트 컴포넌트

**Files:**
- Create: `components/app/paper-trading-chart.tsx`

- [ ] **Step 1: paper-trading-chart.tsx 생성**

```typescript
// components/app/paper-trading-chart.tsx
'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'

interface DateRange {
  startDate: string
  endDate: string
}

interface ChartDataPoint {
  date: string
  [key: string]: string | number
}

export function PaperTradingChart({ dateRange }: { dateRange: DateRange }) {
  // 더미 데이터 (TODO: DB에서 실제 데이터 조회)
  const chartData: ChartDataPoint[] = [
    { date: '2024-01-01', 'Balanced': 100000000, 'Growth': 100000000, 'Conservative': 100000000 },
    { date: '2024-02-01', 'Balanced': 105000000, 'Growth': 110000000, 'Conservative': 102000000 },
    { date: '2024-03-01', 'Balanced': 103000000, 'Growth': 108000000, 'Conservative': 103500000 },
    { date: '2024-04-01', 'Balanced': 108000000, 'Growth': 115000000, 'Conservative': 105000000 },
    { date: '2024-05-01', 'Balanced': 107000000, 'Growth': 112000000, 'Conservative': 104200000 },
  ]

  const colors = ['#6366f1', '#ec4899', '#f59e0b']
  const robots = ['Balanced', 'Growth', 'Conservative']

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">누적 수익 추이</h2>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="date"
            stroke="rgba(255,255,255,0.5)"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.5)"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `₩${(value / 1000000).toFixed(0)}M`}
          />
          <Tooltip
            formatter={(value) => `₩${(value as number).toLocaleString('ko-KR')}`}
            labelStyle={{ color: '#000' }}
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '16px' }} />
          {robots.map((robot, idx) => (
            <Line
              key={robot}
              type="monotone"
              dataKey={robot}
              stroke={colors[idx]}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app/paper-trading-chart.tsx
git commit -m "feat: add paper-trading cumulative return chart"
```

---

### Task 5: 핵심 메트릭 카드

**Files:**
- Create: `components/app/paper-trading-metrics.tsx`

- [ ] **Step 1: paper-trading-metrics.tsx 생성**

```typescript
// components/app/paper-trading-metrics.tsx
'use client'

import { Card } from '@/components/ui/card'

interface DateRange {
  startDate: string
  endDate: string
}

interface Metrics {
  robot: string
  totalReturn: number
  sharpeRatio: number
  mdd: number
}

export function PaperTradingMetrics({ dateRange }: { dateRange: DateRange }) {
  // 더미 데이터 (TODO: DB에서 실제 계산값 조회)
  const metricsData: Metrics[] = [
    { robot: 'Balanced', totalReturn: 12.5, sharpeRatio: 1.2, mdd: -8.3 },
    { robot: 'Growth', totalReturn: 18.2, sharpeRatio: 1.0, mdd: -15.6 },
    { robot: 'Conservative', totalReturn: 6.8, sharpeRatio: 1.8, mdd: -3.2 },
  ]

  const avgMetrics = {
    totalReturn: metricsData.reduce((sum, m) => sum + m.totalReturn, 0) / metricsData.length,
    sharpeRatio: metricsData.reduce((sum, m) => sum + m.sharpeRatio, 0) / metricsData.length,
    mdd: metricsData.reduce((sum, m) => sum + m.mdd, 0) / metricsData.length,
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="p-4">
        <h3 className="text-sm font-medium text-white/60 mb-2">평균 수익률</h3>
        <p className="text-3xl font-bold">
          <span className={avgMetrics.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}>
            {avgMetrics.totalReturn >= 0 ? '+' : ''}{avgMetrics.totalReturn.toFixed(2)}%
          </span>
        </p>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-medium text-white/60 mb-2">평균 샤프 비율</h3>
        <p className="text-3xl font-bold text-blue-400">{avgMetrics.sharpeRatio.toFixed(2)}</p>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-medium text-white/60 mb-2">평균 MDD</h3>
        <p className="text-3xl font-bold text-red-400">{avgMetrics.mdd.toFixed(2)}%</p>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app/paper-trading-metrics.tsx
git commit -m "feat: add paper-trading metrics cards"
```

---

### Task 6: 연도별 비교 테이블

**Files:**
- Create: `components/app/paper-trading-table.tsx`

- [ ] **Step 1: paper-trading-table.tsx 생성**

```typescript
// components/app/paper-trading-table.tsx
'use client'

import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DateRange {
  startDate: string
  endDate: string
}

interface YearlyReturn {
  robot: string
  [year: number]: string | number
  average: number
}

export function PaperTradingTable({ dateRange }: { dateRange: DateRange }) {
  // 더미 데이터 (TODO: DB에서 실제 연도별 데이터 조회)
  const tableData: YearlyReturn[] = [
    { robot: 'Balanced', 2023: '8.5%', 2024: '12.5%', average: 10.5 },
    { robot: 'Growth', 2023: '15.2%', 2024: '18.2%', average: 16.7 },
    { robot: 'Conservative', 2023: '4.2%', 2024: '6.8%', average: 5.5 },
  ]

  const years = [2023, 2024]

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">연도별 수익률 비교</h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">전략</TableHead>
              {years.map((year) => (
                <TableHead key={year} className="text-right">
                  {year}년
                </TableHead>
              ))}
              <TableHead className="text-right font-semibold">평균</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row) => (
              <TableRow key={row.robot}>
                <TableCell className="font-medium">{row.robot}</TableCell>
                {years.map((year) => {
                  const value = row[year] as string
                  return (
                    <TableCell key={year} className="text-right">
                      <span className={value.startsWith('-') ? 'text-red-400' : 'text-green-400'}>
                        {value}
                      </span>
                    </TableCell>
                  )
                })}
                <TableCell className="text-right font-semibold">
                  <span className={row.average >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {row.average >= 0 ? '+' : ''}{row.average.toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app/paper-trading-table.tsx
git commit -m "feat: add paper-trading yearly comparison table"
```

---

### Task 7: 월별 리턴 히트맵

**Files:**
- Create: `components/app/paper-trading-heatmap.tsx`

- [ ] **Step 1: paper-trading-heatmap.tsx 생성**

```typescript
// components/app/paper-trading-heatmap.tsx
'use client'

import { Card } from '@/components/ui/card'

interface DateRange {
  startDate: string
  endDate: string
}

interface HeatmapData {
  month: string
  [year: number]: number
}

export function PaperTradingHeatmap({ dateRange }: { dateRange: DateRange }) {
  // 더미 데이터 (TODO: DB에서 실제 월별 데이터 조회)
  const heatmapData: HeatmapData[] = [
    { month: 'Jan', 2023: 2.5, 2024: -1.2 },
    { month: 'Feb', 2023: 1.8, 2024: 2.1 },
    { month: 'Mar', 2023: 3.2, 2024: 1.5 },
    { month: 'Apr', 2023: -0.8, 2024: 2.8 },
    { month: 'May', 2023: 2.1, 2024: -0.5 },
    { month: 'Jun', 2023: 1.5, 2024: 1.2 },
    { month: 'Jul', 2023: 2.8, 2024: 2.3 },
    { month: 'Aug', 2023: -1.2, 2024: 1.8 },
    { month: 'Sep', 2023: 2.2, 2024: 2.5 },
    { month: 'Oct', 2023: 3.1, 2024: -0.3 },
    { month: 'Nov', 2023: 1.9, 2024: 2.1 },
    { month: 'Dec', 2023: 2.6, 2024: 1.5 },
  ]

  const years = [2023, 2024]

  const getHeatmapColor = (value: number): string => {
    if (value >= 3) return 'bg-green-900 text-green-100'
    if (value >= 2) return 'bg-green-700 text-green-100'
    if (value >= 1) return 'bg-green-500 text-white'
    if (value >= 0) return 'bg-green-300 text-green-900'
    if (value >= -1) return 'bg-red-300 text-red-900'
    if (value >= -2) return 'bg-red-500 text-white'
    return 'bg-red-700 text-red-100'
  }

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-6">월별 수익률 히트맵</h2>
      <div className="space-y-6">
        {/* 연도별 히트맵 */}
        {years.map((year) => (
          <div key={year}>
            <h3 className="text-sm font-medium text-white/70 mb-2">{year}년</h3>
            <div className="grid grid-cols-6 gap-2">
              {heatmapData.map((row) => {
                const value = row[year]
                return (
                  <div
                    key={`${row.month}-${year}`}
                    className={`p-2 rounded text-center cursor-pointer hover:opacity-80 transition ${getHeatmapColor(value)}`}
                    title={`${row.month} ${year}: ${value >= 0 ? '+' : ''}${value.toFixed(1)}%`}
                  >
                    <div className="text-xs font-medium">{row.month}</div>
                    <div className="text-sm font-bold">{value >= 0 ? '+' : ''}{value.toFixed(1)}%</div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div className="mt-6 pt-4 border-t border-white/[0.08]">
        <div className="text-xs font-medium text-white/60 mb-3">범례</div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-700 rounded" />
            <span className="text-xs text-white/60">-2% 이하</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500 rounded" />
            <span className="text-xs text-white/60">-1~-2%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-300 rounded" />
            <span className="text-xs text-white/60">-1~0%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-300 rounded" />
            <span className="text-xs text-white/60">0~1%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded" />
            <span className="text-xs text-white/60">1~2%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-700 rounded" />
            <span className="text-xs text-white/60">2~3%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-900 rounded" />
            <span className="text-xs text-white/60">3% 이상</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app/paper-trading-heatmap.tsx
git commit -m "feat: add paper-trading monthly return heatmap"
```

---

## 스펙 커버리지 검증

✅ **네비게이션**: Task 1에서 사이드바 메뉴 추가
✅ **페이지 생성**: Task 2에서 `/paper-trading` 경로 생성
✅ **기간 선택**: Task 3에서 1년/3년/5년/전체 + 날짜 피커 구현
✅ **누적 수익 차트**: Task 4에서 시간별 자산 변화 시각화
✅ **메트릭 카드**: Task 5에서 수익률, 샤프 비율, MDD 표시
✅ **연도별 비교**: Task 6에서 연도별 로봇 성과 비교
✅ **월별 히트맵**: Task 7에서 월간 수익률 히트맵 시각화

---

## 다음 단계: 실제 데이터 연결 (향후)

각 컴포넌트의 `TODO: DB에서 실제 데이터 조회` 주석 위치에서:
- `backtest_results` 테이블 쿼리 추가
- 선택 기간에 맞는 데이터 필터링
- 메트릭 계산 (샤프 비율, MDD 등) 구현

---

## 체크리스트

- [ ] Task 1: 네비바 메뉴 추가
- [ ] Task 2: 페이지 구조
- [ ] Task 3: 클라이언트 컴포넌트
- [ ] Task 4: 누적 수익 차트
- [ ] Task 5: 메트릭 카드
- [ ] Task 6: 연도별 비교 테이블
- [ ] Task 7: 월별 리턴 히트맵
