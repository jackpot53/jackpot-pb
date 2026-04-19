'use client'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { formatKrw, formatReturn } from '@/lib/portfolio'
import type { AssetPerformance } from '@/lib/portfolio'

const ASSET_TYPE_LABELS: Record<string, string> = {
  stock_kr: '주식 (국내)',
  stock_us: '주식 (미국)',
  etf_kr: 'ETF (국내)',
  etf_us: 'ETF (미국)',
  crypto: '코인',
  fund: '펀드',
  savings: '예적금',
  real_estate: '부동산',
}

const TYPE_COLORS: Record<string, string> = {
  stock_kr: '#60A5FA',
  stock_us: '#34D399',
  etf_kr: '#FBBF24',
  etf_us: '#A78BFA',
  crypto: '#F87171',
  fund: '#FB923C',
  savings: '#2DD4BF',
  real_estate: '#E879F9',
}

// ─── Allocation Donut ────────────────────────────────────────────────────────

interface AllocEntry {
  type: string
  label: string
  value: number
  color: string
}

function AllocationTooltip({ active, payload }: TooltipContentProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload as AllocEntry
  const total = (payload[0] as any).total as number
  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0'
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-lg text-sm space-y-0.5">
      <p className="font-semibold text-foreground">{d.label}</p>
      <p className="text-muted-foreground">{formatKrw(d.value)}</p>
      <p className="text-muted-foreground">{pct}%</p>
    </div>
  )
}

function AllocationDonut({ performances }: { performances: AssetPerformance[] }) {
  const byType = performances.reduce<Record<string, number>>((acc, a) => {
    if (a.currentValueKrw > 0) {
      acc[a.assetType] = (acc[a.assetType] ?? 0) + a.currentValueKrw
    }
    return acc
  }, {})

  const data: AllocEntry[] = Object.entries(byType)
    .map(([type, value]) => ({
      type,
      label: ASSET_TYPE_LABELS[type] ?? type,
      value,
      color: TYPE_COLORS[type] ?? '#94A3B8',
    }))
    .sort((a, b) => b.value - a.value)

  const total = data.reduce((s, d) => s + d.value, 0)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
        평가금액이 있는 자산이 없습니다
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.type} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={(props) => {
              const p = props as TooltipContentProps<number, string>
              if (!p.active || !p.payload?.length) return null
              return <AllocationTooltip {...p} payload={p.payload.map((pl) => ({ ...pl, total }))} />
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 px-2">
        {data.map((d) => {
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0'
          return (
            <div key={d.type} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="text-muted-foreground truncate">{d.label}</span>
              <span className="ml-auto font-mono text-foreground">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Return Bar Chart ─────────────────────────────────────────────────────────

interface ReturnEntry {
  name: string
  returnPct: number
  profit: number
  color: string
}

function ReturnTooltip({ active, payload }: TooltipContentProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload as ReturnEntry
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-lg text-sm space-y-0.5">
      <p className="font-semibold text-foreground truncate max-w-[160px]">{d.name}</p>
      <p className={d.returnPct >= 0 ? 'text-red-400' : 'text-blue-400'}>
        {d.returnPct >= 0 ? '+' : ''}{d.returnPct.toFixed(2)}%
      </p>
      <p className="text-muted-foreground">{formatKrw(d.profit)}</p>
    </div>
  )
}

function ReturnBarChart({ performances }: { performances: AssetPerformance[] }) {
  const data: ReturnEntry[] = performances
    .filter((a) => a.totalCostKrw > 0 && a.currentValueKrw > 0)
    .map((a) => ({
      name: a.name,
      returnPct: a.returnPct,
      profit: a.currentValueKrw - a.totalCostKrw,
      color: a.returnPct >= 0 ? '#F87171' : '#60A5FA',
    }))
    .sort((a, b) => b.returnPct - a.returnPct)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
        수익률 데이터가 없습니다
      </div>
    )
  }

  const barHeight = 36
  const height = Math.max(200, data.length * barHeight + 40)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 48, bottom: 0, left: 8 }}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(1)}%`}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <ReferenceLine x={0} stroke="var(--border)" strokeWidth={1.5} />
        <Tooltip content={(props) => <ReturnTooltip {...(props as TooltipContentProps<number, string>)} />} />
        <Bar dataKey="returnPct" radius={[0, 3, 3, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Value Bar Chart ──────────────────────────────────────────────────────────

interface ValueEntry {
  name: string
  cost: number
  value: number
  type: string
}

function ValueTooltip({ active, payload }: TooltipContentProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload as ValueEntry
  const profit = d.value - d.cost
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-lg text-sm space-y-0.5">
      <p className="font-semibold text-foreground truncate max-w-[160px]">{d.name}</p>
      <p className="text-muted-foreground">투자: {formatKrw(d.cost)}</p>
      <p className="text-muted-foreground">평가: {formatKrw(d.value)}</p>
      <p className={profit >= 0 ? 'text-red-400' : 'text-blue-400'}>
        손익: {formatKrw(profit)}
      </p>
    </div>
  )
}

function ValueBarChart({ performances }: { performances: AssetPerformance[] }) {
  const data: ValueEntry[] = performances
    .filter((a) => a.totalCostKrw > 0)
    .map((a) => ({
      name: a.name,
      cost: a.totalCostKrw,
      value: a.currentValueKrw,
      type: a.assetType,
    }))
    .sort((a, b) => b.cost - a.cost)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
        자산 데이터가 없습니다
      </div>
    )
  }

  const barHeight = 40
  const height = Math.max(200, data.length * barHeight + 40)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
        barCategoryGap="25%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => {
            const n = Number(v)
            if (n >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(0)}억`
            if (n >= 1_0000) return `${(n / 1_0000).toFixed(0)}만`
            return String(n)
          }}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={(props) => <ValueTooltip {...(props as TooltipContentProps<number, string>)} />} />
        <Bar dataKey="cost" name="투자금액" fill="#475569" radius={[0, 0, 0, 0]} />
        <Bar
          dataKey="value"
          name="평가금액"
          radius={[0, 3, 3, 0]}
        >
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={TYPE_COLORS[entry.type] ?? '#94A3B8'}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function PortfolioCharts({ performances }: { performances: AssetPerformance[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle>자산 배분</CardTitle>
          <CardDescription>유형별 평가금액 비중</CardDescription>
        </CardHeader>
        <CardContent>
          <AllocationDonut performances={performances} />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle>종목별 수익률</CardTitle>
          <CardDescription>평가 가능 자산의 수익률 비교 (%)</CardDescription>
        </CardHeader>
        <CardContent>
          <ReturnBarChart performances={performances} />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle>종목별 투자 vs 평가금액</CardTitle>
          <CardDescription>투자금액(회색) · 평가금액(유형색)</CardDescription>
        </CardHeader>
        <CardContent>
          <ValueBarChart performances={performances} />
        </CardContent>
      </Card>
    </div>
  )
}
