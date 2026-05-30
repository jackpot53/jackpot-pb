'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, ReferenceLine,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import type { Period } from '@/components/app/asset-candle-chart'
import type { InvestorFlowPoint } from '@/app/api/investor-flow/route'

interface Props {
  ticker: string
  period: Period
  range?: '1y' | '3y' | '5y'
}

type AggPoint = InvestorFlowPoint & { weekKey?: string; monthKey?: string }

function formatDate(date: string): string {
  // 'YYYY-MM-DD' → 'MM/DD'
  return date.slice(5).replace('-', '/')
}

function formatMonth(date: string): string {
  return date.slice(0, 7).replace('-', '/')
}

function fmtK(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`
  if (abs >= 10_000) return `${(v / 10_000).toFixed(0)}만`
  return v.toLocaleString('ko-KR')
}

function aggregateByWeek(data: InvestorFlowPoint[]): InvestorFlowPoint[] {
  const map = new Map<string, InvestorFlowPoint>()
  for (const p of data) {
    const d = new Date(p.date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d.setDate(diff))
    const key = monday.toISOString().slice(0, 10)
    const existing = map.get(key)
    if (existing) {
      existing.institution += p.institution
      existing.foreign += p.foreign
      existing.individual += p.individual
    } else {
      map.set(key, { ...p, date: key })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function aggregateByMonth(data: InvestorFlowPoint[]): InvestorFlowPoint[] {
  const map = new Map<string, InvestorFlowPoint>()
  for (const p of data) {
    const key = p.date.slice(0, 7) + '-01'
    const existing = map.get(key)
    if (existing) {
      existing.institution += p.institution
      existing.foreign += p.foreign
      existing.individual += p.individual
    } else {
      map.set(key, { ...p, date: key })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

const UP_COLOR = '#ef4444'
const DOWN_COLOR = '#3b82f6'

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null
  const v = payload[0]?.value ?? 0
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className={v >= 0 ? 'text-red-500 font-semibold' : 'text-blue-500 font-semibold'}>
        {v >= 0 ? '+' : ''}{fmtK(v)}주
      </p>
    </div>
  )
}

function FlowBar({
  data,
  label,
  dataKey,
  showXAxis,
  tickFormatter,
}: {
  data: InvestorFlowPoint[]
  label: string
  dataKey: keyof InvestorFlowPoint
  showXAxis: boolean
  tickFormatter: (d: string) => string
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground pl-1 mb-0.5">{label}</p>
      <ResponsiveContainer width="100%" height={110}>
        <BarChart data={data} margin={{ top: 2, right: 4, bottom: 0, left: 0 }} barCategoryGap="20%">
          <XAxis
            dataKey="date"
            tickFormatter={tickFormatter}
            tick={showXAxis ? { fontSize: 9, fill: 'var(--muted-foreground)' } : false}
            axisLine={false}
            tickLine={false}
            height={showXAxis ? 18 : 4}
          />
          <YAxis
            tickFormatter={fmtK}
            tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
          <Bar dataKey={dataKey} isAnimationActive={false}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={(entry[dataKey] as number) >= 0 ? UP_COLOR : DOWN_COLOR}
                opacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function InvestorFlowChart({ ticker, period, range = '1y' }: Props) {
  const [raw, setRaw] = useState<InvestorFlowPoint[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [unsupported, setUnsupported] = useState(false)

  useEffect(() => {
    setRaw(null)
    setUnsupported(false)
    setLoading(true)
    const ctrl = new AbortController()
    fetch(`/api/investor-flow?ticker=${encodeURIComponent(ticker)}&range=${range}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then((res: { data?: InvestorFlowPoint[]; unsupported?: boolean }) => {
        if (res.unsupported) { setUnsupported(true); return }
        setRaw(res.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [ticker, range])

  const data = useMemo(() => {
    if (!raw) return []
    if (period === '주봉') return aggregateByWeek(raw)
    if (period === '월봉') return aggregateByMonth(raw)
    return raw
  }, [raw, period])

  const tickFmt = period === '월봉' ? formatMonth : formatDate

  if (loading) {
    return (
      <div className="space-y-2">
        {['개인', '외국인', '기관'].map(l => (
          <div key={l}>
            <p className="text-[10px] text-muted-foreground pl-1 mb-0.5">{l}</p>
            <Skeleton className="h-[110px] w-full rounded-md" />
          </div>
        ))}
      </div>
    )
  }

  if (unsupported) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
        해당 종목은 매매동향을 제공하지 않습니다 (미국 주식/ETF)
      </div>
    )
  }

  if (!raw || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
        매매동향 데이터를 불러오지 못했습니다
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <FlowBar data={data} label="개인" dataKey="individual" showXAxis={false} tickFormatter={tickFmt} />
      <FlowBar data={data} label="외국인" dataKey="foreign" showXAxis={false} tickFormatter={tickFmt} />
      <FlowBar data={data} label="기관" dataKey="institution" showXAxis={true} tickFormatter={tickFmt} />
    </div>
  )
}
