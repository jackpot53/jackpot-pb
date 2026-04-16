'use client'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// Per 03-UI-SPEC.md: Pie Chart Color Palette
const ASSET_TYPE_COLORS: Record<string, string> = {
  stock_kr: '#3B82F6',
  stock_us: '#3B82F6',
  etf_kr: '#6366F1',
  etf_us: '#6366F1',
  crypto: '#F97316',
  real_estate: '#22C55E',
  savings: '#6B7280',
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  stock_kr: '국내주식',
  stock_us: '해외주식',
  etf_kr: '국내ETF',
  etf_us: '해외ETF',
  crypto: '암호화폐',
  real_estate: '부동산',
  savings: '예적금',
}

const KRW_FMT = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
})

function tooltipFormatter(value: unknown, name: unknown): [string, string] {
  return [typeof value === 'number' ? KRW_FMT.format(value) : String(value), String(name)]
}

export interface AllocationSlice {
  assetType: string
  totalValueKrw: number
  sharePct: number
}

interface AllocationPieChartProps {
  data: AllocationSlice[]
}

export function AllocationPieChart({ data }: AllocationPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
        보유 자산이 없습니다
      </div>
    )
  }

  const chartData = data.map((d) => ({
    name: ASSET_TYPE_LABELS[d.assetType] ?? d.assetType,
    value: d.totalValueKrw,
    sharePct: d.sharePct,
    assetType: d.assetType,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={ASSET_TYPE_COLORS[entry.assetType] ?? '#94A3B8'}
            />
          ))}
        </Pie>
        <Tooltip formatter={tooltipFormatter} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
