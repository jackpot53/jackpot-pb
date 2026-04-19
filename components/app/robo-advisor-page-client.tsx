'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, TrendingUp, BarChart3, ArrowUpDown, Layers,
  Cpu, Landmark, Car, Pill, FlaskConical, Building2, Wifi,
  ShoppingCart, Utensils, MonitorPlay, Zap, Leaf, Trophy
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { UniverseStockWithSignals, BacktestStats } from '@/db/queries/robo-advisor'
import { RoboAdvisorDetailDialog } from '@/components/app/robo-advisor-detail-dialog'

interface Props {
  universe: UniverseStockWithSignals[]
  statsMap: Map<string, Map<number, BacktestStats>>
}

type FilterTab = 'sector' | 'signal' | 'top200'
type SortKey = 'marketcap' | 'signal' | 'change'

function SectorIcon({ sector, className }: { sector: string; className?: string }) {
  const s = sector.toLowerCase();
  if (s.includes('반도체') || s.includes('it') || s.includes('소프트') || s.includes('디지털')) return <Cpu className={className} />;
  if (s.includes('금융') || s.includes('은행') || s.includes('증권') || s.includes('보험')) return <Landmark className={className} />;
  if (s.includes('자동차') || s.includes('운수') || s.includes('조선') || s.includes('해운')) return <Car className={className} />;
  if (s.includes('바이오') || s.includes('의약') || s.includes('의료') || s.includes('건강')) return <Pill className={className} />;
  if (s.includes('화학') || s.includes('에너지') || s.includes('정유')) return <FlaskConical className={className} />;
  if (s.includes('건설') || s.includes('기계') || s.includes('철강') || s.includes('인프라')) return <Building2 className={className} />;
  if (s.includes('통신') || s.includes('네트워크') || s.includes('텔레콤')) return <Wifi className={className} />;
  if (s.includes('유통') || s.includes('상업') || s.includes('쇼핑') || s.includes('소비')) return <ShoppingCart className={className} />;
  if (s.includes('음식') || s.includes('식료') || s.includes('제과')) return <Utensils className={className} />;
  if (s.includes('엔터') || s.includes('미디어') || s.includes('게임') || s.includes('콘텐츠')) return <MonitorPlay className={className} />;
  if (s.includes('전기') || s.includes('전자') || s.includes('배터리') || s.includes('전지')) return <Zap className={className} />;
  if (s.includes('환경') || s.includes('농업') || s.includes('목재')) return <Leaf className={className} />;
  return <Layers className={className} />;
}

function getSectorStyles(sector: string) {
  const s = sector.toLowerCase();
  if (s.includes('반도체') || s.includes('it') || s.includes('소프트') || s.includes('디지털')) return { border: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-600' };
  if (s.includes('금융') || s.includes('은행') || s.includes('증권') || s.includes('보험')) return { border: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600' };
  if (s.includes('자동차') || s.includes('운수') || s.includes('조선') || s.includes('해운')) return { border: 'from-orange-500 to-amber-500', bg: 'bg-orange-50', text: 'text-orange-600' };
  if (s.includes('바이오') || s.includes('의약') || s.includes('의료') || s.includes('건강')) return { border: 'from-purple-500 to-fuchsia-500', bg: 'bg-purple-50', text: 'text-purple-600' };
  if (s.includes('화학') || s.includes('에너지') || s.includes('정유')) return { border: 'from-rose-500 to-pink-500', bg: 'bg-rose-50', text: 'text-rose-600' };
  if (s.includes('건설') || s.includes('기계') || s.includes('철강') || s.includes('인프라')) return { border: 'from-amber-500 to-yellow-500', bg: 'bg-amber-50', text: 'text-amber-600' };
  if (s.includes('통신') || s.includes('네트워크') || s.includes('텔레콤')) return { border: 'from-indigo-500 to-violet-500', bg: 'bg-indigo-50', text: 'text-indigo-600' };
  if (s.includes('유통') || s.includes('상업') || s.includes('쇼핑') || s.includes('소비')) return { border: 'from-sky-500 to-blue-500', bg: 'bg-sky-50', text: 'text-sky-600' };
  if (s.includes('음식') || s.includes('식료') || s.includes('제과')) return { border: 'from-lime-500 to-green-500', bg: 'bg-lime-50', text: 'text-lime-700' };
  if (s.includes('엔터') || s.includes('미디어') || s.includes('게임') || s.includes('콘텐츠')) return { border: 'from-fuchsia-500 to-pink-500', bg: 'bg-fuchsia-50', text: 'text-fuchsia-600' };
  if (s.includes('전기') || s.includes('전자') || s.includes('배터리') || s.includes('전지')) return { border: 'from-yellow-400 to-orange-500', bg: 'bg-yellow-50', text: 'text-yellow-700' };
  if (s.includes('환경') || s.includes('농업') || s.includes('목재')) return { border: 'from-green-500 to-emerald-500', bg: 'bg-green-50', text: 'text-green-600' };
  return { border: 'from-zinc-400 to-slate-400', bg: 'bg-muted', text: 'text-muted-foreground' };
}

function getTopStyles(title: string) {
  if (title === 'TOP 1 - 10') return { border: 'from-yellow-400 to-amber-500', bg: 'bg-amber-50', text: 'text-amber-600' };
  if (title === 'TOP 11 - 20') return { border: 'from-slate-300 to-zinc-400', bg: 'bg-slate-100', text: 'text-slate-600' };
  if (title === 'TOP 21 - 30') return { border: 'from-orange-500 to-amber-700', bg: 'bg-orange-50', text: 'text-orange-700' };
  return { border: 'from-zinc-400 to-slate-400', bg: 'bg-muted', text: 'text-muted-foreground' };
}

function getSignalScore(stock: UniverseStockWithSignals): number {
  const triggered = stock.signals.filter((s) => s.triggered)
  if (triggered.length === 0) return 0
  const composite = triggered.find((s) => s.signalType === 'composite')
  if (composite?.confidence !== null && composite?.confidence !== undefined) {
    return Number(composite.confidence)
  }
  return triggered.length * 0.1
}

const StockRow = ({
  stock,
  onClick,
  winRate,
  highlightSignal = false,
  displayRank,
}: {
  stock: UniverseStockWithSignals
  onClick: () => void
  winRate?: number | null
  highlightSignal?: boolean
  displayRank?: number
}) => {
  const isUp = stock.changeAmount !== null && stock.changeAmount > 0;
  const isDown = stock.changeAmount !== null && stock.changeAmount < 0;

  const changePercentBg = isUp
    ? 'bg-red-500 text-white'
    : isDown
      ? 'bg-blue-500 text-white'
      : 'bg-muted text-muted-foreground';

  const changePercentText = stock.changePercent !== null
    ? `${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%`
    : '0.00%';

  const hasSignal = stock.signals.some(s => s.triggered);
  const triggeredSignals = stock.signals.filter(s => s.triggered);
  const signalCount = triggeredSignals.length;
  const showColorfulAnim = highlightSignal && hasSignal;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full flex items-center justify-between py-2 px-2 rounded-lg transition-colors group text-left overflow-hidden border',
        showColorfulAnim
          ? 'border-amber-300 hover:border-amber-400 bg-amber-50/50'
          : 'border-transparent hover:bg-muted/60',
        !showColorfulAnim && hasSignal && !highlightSignal && 'bg-amber-50/40 hover:bg-amber-50/70'
      )}
    >
      {showColorfulAnim && (
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, #f43f5e, #f59e0b, #10b981, #3b82f6, #8b5cf6, #f43f5e)',
          }}
        />
      )}
      <div className="relative z-10 flex flex-col items-start gap-0.5 max-w-[140px]">
        {hasSignal && (
          <div className="flex items-center gap-0.75">
            {signalCount <= 5 ? (
              Array.from({ length: signalCount }).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              ))
            ) : (
              <div className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-700 font-semibold">
                +{signalCount}
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-1.5 w-full">
          {(displayRank !== undefined || stock.rank !== null) && (
            <span className="text-[11px] text-muted-foreground font-normal tabular-nums min-w-[18px] shrink-0 text-center">
              {displayRank ?? stock.rank}
            </span>
          )}
          <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 bg-muted flex items-center justify-center border border-border">
            <img
              src={`https://file.alphasquare.co.kr/media/images/stock_logo/kr/${stock.code}.png`}
              alt={stock.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <span className="text-[13px] font-medium text-foreground group-hover:text-foreground transition-colors truncate">
            {stock.name}
          </span>
        </div>
      </div>
      <div className="relative z-10 flex flex-col items-end gap-1">
        <div className={cn('w-[56px] py-1 flex items-center justify-center rounded text-[11px] font-semibold tabular-nums', changePercentBg)}>
          {changePercentText}
        </div>
        {winRate !== undefined && winRate !== null && (
          <div className="text-[10px] font-medium text-emerald-600 tabular-nums pr-0.5">
            승률 {winRate.toFixed(1)}%
          </div>
        )}
      </div>
    </button>
  )
}

export function RoboAdvisorPageClient({ universe, statsMap }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterTab>('sector')
  const [sort, setSort] = useState<SortKey>('marketcap')
  const [search, setSearch] = useState('')
  const [selectedStock, setSelectedStock] = useState<UniverseStockWithSignals | null>(null)

  const getPrimaryWinRate = (stock: UniverseStockWithSignals) => {
    const triggered = stock.signals.filter((s) => s.triggered)
    if (triggered.length === 0) return null
    const sig = triggered.find((s) => s.signalType === 'composite') || triggered[0]
    const sm = statsMap.get(sig.signalType)
    if (!sm) return null
    const row = sm.get(20) || sm.get(10) || sm.get(5) || Array.from(sm.values())[0]
    return row ? Number(row.winRate) : null
  }

  const signalCount = useMemo(
    () => universe.filter((s) => s.signals.some((sig) => sig.triggered)).length,
    [universe],
  )

  const filtered = useMemo(() => {
    let list = universe

    // 필터 탭
    if (filter === 'signal') {
      list = list.filter((s) => s.signals.some((sig) => sig.triggered))
    } else if (filter === 'top200') {
      // 서버에서 이미 시총 순으로 정렬되어 오므로 상위 200개만 사용
      list = list.slice(0, 200)
    }

    // 검색
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.ticker.toLowerCase().includes(q),
      )
    }

    // 정렬
    if (sort === 'marketcap') {
      list = [...list].sort((a, b) => (b.marketCapKrw ?? 0) - (a.marketCapKrw ?? 0))
    } else if (sort === 'signal') {
      list = [...list].sort((a, b) => getSignalScore(b) - getSignalScore(a))
    } else if (sort === 'change') {
      list = [...list].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
    }

    return list
  }, [universe, filter, sort, search])

  const groupedData = useMemo(() => {
    if (filter === 'sector') {
      const groups: Record<string, typeof filtered> = {}
      for (const stock of filtered) {
        const sector = stock.sector || '기타'
        if (!groups[sector]) groups[sector] = []
        groups[sector].push(stock)
      }

      const sortedKeys = Object.keys(groups).sort((a, b) => {
        if (a === '기타') return 1
        if (b === '기타') return -1
        return groups[b].length - groups[a].length
      })

      return sortedKeys.map(key => ({
        title: key,
        stocks: groups[key]
      }))
    } else if (filter === 'top200') {
      const groups: { title: string; stocks: UniverseStockWithSignals[] }[] = []
      const sorted = [...filtered].sort((a, b) => (b.marketCapKrw ?? 0) - (a.marketCapKrw ?? 0))
      for (let i = 0; i < sorted.length; i += 10) {
        const chunk = sorted.slice(i, i + 10)
        if (chunk.length === 0) continue
        const startRank = (Math.floor(i / 10) * 10) + 1
        const endRank = startRank + 9
        groups.push({
          title: `TOP ${startRank} - ${endRank}`,
          stocks: chunk
        })
      }
      return groups
    }
    return []
  }, [filtered, filter])

  if (universe.length === 0) {
    return (
      <div data-component="RoboAdvisorPageClient" className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-foreground font-medium">종목 데이터가 아직 준비되지 않았습니다</p>
          <p className="text-muted-foreground text-sm">
            관리자가 초기 데이터를 로드하면 자동으로 표시됩니다
          </p>
        </div>
      </div>
    )
  }

  return (
    <div data-component="RoboAdvisorPageClient" className="space-y-4">
      {/* 상단 통계 + 검색 */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={cn(
              'border-amber-400 text-amber-700 bg-amber-50 text-xs px-3 py-1',
              signalCount === 0 && 'border-border text-muted-foreground bg-transparent',
            )}
          >
            <TrendingUp className="w-3 h-3 mr-1.5" />
            시그널 발생 {signalCount}개 / 전체 {universe.length}개
          </Badge>
        </div>

        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="종목명·코드 검색"
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* 필터 탭 + 정렬 */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1.5">
          {(
            [
              { key: 'sector', label: '업종별' },
              { key: 'signal', label: '시그널 발생' },
              { key: 'top200', label: '시총 TOP 200' },
            ] as { key: FilterTab; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                filter === key
                  ? 'bg-orange-100 border border-orange-300 text-orange-700 shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {(
            [
              { key: 'marketcap', label: '시총순' },
              { key: 'signal', label: '시그널순' },
              { key: 'change', label: '등락률순' },
            ] as { key: SortKey; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                sort === key
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
              )}
            >
              <ArrowUpDown className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 없음 */}
      {filtered.length === 0 && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          조건에 맞는 종목이 없습니다
        </div>
      )}

      {/* 종목 리스트 (필터에 따른 뷰) */}
      {filter === 'sector' || filter === 'top200' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {groupedData.map(({ title, stocks }) => {
            const isTop = filter === 'top200'
            const styles = isTop ? getTopStyles(title) : getSectorStyles(title)
            return (
              <div key={title} className="break-inside-avoid rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-border bg-muted/40 relative overflow-hidden flex items-center justify-between">
                  <div className={cn('absolute left-0 right-0 top-0 h-1 bg-gradient-to-r', styles.border)} />
                  <div className="flex items-center gap-2">
                    <div className={cn('p-1.5 rounded', styles.bg, styles.text)}>
                      {isTop ? <Trophy className="w-3.5 h-3.5" /> : <SectorIcon sector={title} className="w-3.5 h-3.5" />}
                    </div>
                    <h3 className="text-[14px] font-semibold text-foreground tracking-wide">{title}</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border">
                    {stocks.length}
                  </span>
                </div>
                <div className="p-2 space-y-0.5">
                  {stocks.map((stock) => {
                    const realRank = universe.findIndex(s => s.ticker === stock.ticker) + 1;
                    return (
                      <StockRow
                        key={stock.id}
                        stock={stock}
                        displayRank={filter === 'top200' ? realRank : undefined}
                        winRate={undefined}
                        highlightSignal={true}
                        onClick={() => {
                          if (stock.signals.some(s => s.triggered)) {
                            router.push(`/robo-advisor/${stock.ticker}`)
                          } else {
                            setSelectedStock(stock)
                          }
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {filtered.map((stock) => {
            return (
              <div key={stock.id} className="rounded-xl border border-border bg-card p-2 shadow-sm">
                <StockRow
                  stock={stock}
                  displayRank={undefined}
                  winRate={getPrimaryWinRate(stock)}
                  highlightSignal={false}
                  onClick={() => {
                    if (stock.signals.some(s => s.triggered)) {
                      router.push(`/robo-advisor/${stock.ticker}`)
                    } else {
                      setSelectedStock(stock)
                    }
                  }}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* 상세 모달 */}
      <RoboAdvisorDetailDialog
        stock={selectedStock}
        statsMap={statsMap}
        onClose={() => setSelectedStock(null)}
      />
    </div>
  )
}

