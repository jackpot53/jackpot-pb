'use client'

import { TrendingUp, TrendingDown, Flame, Globe, Building2, Users } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { AssetLogo } from '@/components/app/asset-logo'
import { cn } from '@/lib/utils'
import type { MarketFlowData, FlowEntry } from '@/lib/market-flow/types'
import { useKisLivePrice } from '@/lib/ws/kis-ws-context'

// Subscription budget for the market-flow widget. Holdings page mounts first so
// it gets priority on the 40-symbol cap; we keep market-flow well below that.
const KR_LIVE_LIMIT = 3   // top-3 of each KR column
const US_LIVE_LIMIT = 5   // top-5 of US trending

// 백만원 → "XXX억" 표시
function formatNetAmount(amountInMillions: number): string {
  if (amountInMillions === 0) return ''
  const eok = Math.round(amountInMillions / 100)
  if (eok >= 10000) {
    return `${(eok / 10000).toFixed(1)}조`
  }
  return `${new Intl.NumberFormat('ko-KR').format(eok)}억`
}

function formatChangePercent(pct: number): string {
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

// 개별 종목 행 (KR 순매수 컬럼용)
function FlowRow({
  entry,
  rank,
  showAmount,
  enableLive,
}: {
  entry: FlowEntry
  rank: number
  showAmount: boolean
  enableLive: boolean
}) {
  const assetType = entry.assetType as Parameters<typeof AssetLogo>[0]['assetType']
  const tick = useKisLivePrice(enableLive ? entry.ticker : null, enableLive ? entry.assetType : null)
  const liveChange = tick?.changePercent ?? null
  const displayChange = liveChange ?? entry.changePercent
  const isPositive = (displayChange ?? 0) >= 0

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors">
      <span className="text-xs font-bold text-muted-foreground w-4 shrink-0 text-right">
        {rank}
      </span>
      <AssetLogo ticker={entry.ticker} name={entry.name} assetType={assetType} size={36} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate leading-tight">{entry.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
          {showAmount && entry.netAmount > 0 ? `+${formatNetAmount(entry.netAmount)}` : '\u00A0'}
        </p>
      </div>
      {displayChange !== undefined && (
        <span className={cn(
          'text-xs font-mono font-bold shrink-0 inline-flex items-center gap-1',
          isPositive ? 'text-red-400' : 'text-blue-400',
        )}>
          {formatChangePercent(displayChange)}
          {tick && <span className="inline-block w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />}
        </span>
      )}
    </div>
  )
}

// KR 컬럼 헤더 + 종목 목록
function FlowColumn({
  icon: Icon,
  title,
  subtitle,
  entries,
  showAmount,
  emptyLabel,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
  entries: FlowEntry[]
  showAmount: boolean
  emptyLabel: string
}) {
  return (
    <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-4 first:border-0 first:pt-0 first:pl-0">
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-[10px] text-muted-foreground">{subtitle}</div>
        </div>
      </div>
      <div className="space-y-1">
        {entries.length === 0 ? (
          <div className="text-xs text-muted-foreground py-4 text-center">{emptyLabel}</div>
        ) : (
          entries.map((entry, i) => (
            <FlowRow
              key={entry.code}
              entry={entry}
              rank={i + 1}
              showAmount={showAmount}
              enableLive={i < KR_LIVE_LIMIT}
            />
          ))
        )}
      </div>
    </div>
  )
}

// US 트렌딩 칩
function TrendingChip({ entry, enableLive }: { entry: FlowEntry; enableLive: boolean }) {
  const assetType = entry.assetType as Parameters<typeof AssetLogo>[0]['assetType']
  const tick = useKisLivePrice(enableLive ? entry.ticker : null, enableLive ? entry.assetType : null)
  const pct = tick?.changePercent ?? entry.changePercent
  const isPositive = (pct ?? 0) >= 0

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card border border-border shrink-0 hover:bg-muted/30 transition-colors">
      <AssetLogo ticker={entry.ticker} name={entry.name} assetType={assetType} size={20} />
      <div className="text-xs font-medium">{entry.ticker}</div>
      {pct !== undefined && (
        <div className={cn(
          'text-[10px] font-semibold inline-flex items-center gap-1',
          isPositive ? 'text-red-500' : 'text-blue-500',
        )}>
          {formatChangePercent(pct)}
          {tick && <span className="inline-block w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />}
        </div>
      )}
    </div>
  )
}

interface Props {
  data: MarketFlowData
}

export function MarketFlowSection({ data }: Props) {
  const { kr, us } = data

  return (
    <div data-component="MarketFlowSection" className="space-y-4">
      <Separator className="bg-border" />

      {/* 섹션 컨테이너 */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        {/* 섹션 헤더 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
            <Flame className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-base font-bold">시장 동향</h2>
            <p className="text-[10px] text-muted-foreground">오늘 외국인·기관 순매수 상위 + 거래량 HOT 종목</p>
          </div>
        </div>
        <Separator className="bg-border" />

        {/* KR 3열 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FlowColumn
            icon={Globe}
            title="외국인 순매수"
            subtitle="오늘 기준"
            entries={kr.foreign}
            showAmount={true}
            emptyLabel="데이터 없음"
          />
          <FlowColumn
            icon={Building2}
            title="기관 순매수"
            subtitle="오늘 기준"
            entries={kr.institutional}
            showAmount={true}
            emptyLabel="데이터 없음"
          />
          <FlowColumn
            icon={Users}
            title="거래량 HOT"
            subtitle="개인 관심 종목"
            entries={kr.hotStocks.slice(0, 5)}
            showAmount={false}
            emptyLabel="데이터 없음"
          />
        </div>

        {/* US 트렌딩 */}
        {us.trending.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-sm font-semibold">US 트렌딩</span>
                <span className="text-[10px] text-muted-foreground ml-1.5">KIS 거래량 기준</span>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {us.trending.map((entry, i) => (
                <TrendingChip key={entry.code} entry={entry} enableLive={i < US_LIVE_LIMIT} />
              ))}
            </div>
          </div>
        )}

        {/* 하락 종목 (거래량 상위 중 하락) */}
        {kr.hotStocks.some((e) => (e.changePercent ?? 0) < 0) && (
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              거래량 HOT은 개인 투자자 관심 종목 대리지표입니다. 등락률로 매수/매도 방향을 가늠해보세요.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
