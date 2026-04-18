'use client'

import { useState, useMemo } from 'react'
import { Search, TrendingUp, BarChart3, ArrowUpDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { UniverseStockWithSignals, BacktestStats } from '@/db/queries/robo-advisor'
import { RoboAdvisorTile } from '@/components/app/robo-advisor-tile'
import { RoboAdvisorDetailDialog } from '@/components/app/robo-advisor-detail-dialog'

interface Props {
  universe: UniverseStockWithSignals[]
  statsMap: Map<string, Map<number, BacktestStats>>
}

type FilterTab = 'all' | 'signal' | 'top50'
type SortKey = 'marketcap' | 'signal' | 'change'

function getSignalScore(stock: UniverseStockWithSignals): number {
  const triggered = stock.signals.filter((s) => s.triggered)
  if (triggered.length === 0) return 0
  const composite = triggered.find((s) => s.signalType === 'composite')
  if (composite?.confidence !== null && composite?.confidence !== undefined) {
    return Number(composite.confidence)
  }
  return triggered.length * 0.1
}

export function RoboAdvisorPageClient({ universe, statsMap }: Props) {
  const [filter, setFilter] = useState<FilterTab>('all')
  const [sort, setSort] = useState<SortKey>('marketcap')
  const [search, setSearch] = useState('')
  const [selectedStock, setSelectedStock] = useState<UniverseStockWithSignals | null>(null)

  const signalCount = useMemo(
    () => universe.filter((s) => s.signals.some((sig) => sig.triggered)).length,
    [universe],
  )

  const filtered = useMemo(() => {
    let list = universe

    // 필터 탭
    if (filter === 'signal') {
      list = list.filter((s) => s.signals.some((sig) => sig.triggered))
    } else if (filter === 'top50') {
      list = list.filter((s) => s.rank !== null && s.rank <= 50)
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
      list = [...list].sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))
    } else if (sort === 'signal') {
      list = [...list].sort((a, b) => getSignalScore(b) - getSignalScore(a))
    } else if (sort === 'change') {
      list = [...list].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
    }

    return list
  }, [universe, filter, sort, search])

  if (universe.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-white/20" />
        </div>
        <div className="space-y-1">
          <p className="text-white/60 font-medium">종목 데이터가 아직 준비되지 않았습니다</p>
          <p className="text-white/30 text-sm">
            관리자가 초기 데이터를 로드하면 자동으로 표시됩니다
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 상단 통계 + 검색 */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={cn(
              'border-yellow-400/40 text-yellow-300 bg-yellow-400/5 text-xs px-3 py-1',
              signalCount === 0 && 'border-white/20 text-white/40 bg-transparent',
            )}
          >
            <TrendingUp className="w-3 h-3 mr-1.5" />
            시그널 발생 {signalCount}개 / 전체 {universe.length}개
          </Badge>
        </div>

        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="종목명·코드 검색"
            className="pl-8 h-8 text-xs bg-white/[0.05] border-white/[0.12] text-white placeholder:text-white/30 focus-visible:ring-rose-500/30 focus-visible:border-rose-400/40"
          />
        </div>
      </div>

      {/* 필터 탭 + 정렬 */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1.5">
          {(
            [
              { key: 'all', label: '전체' },
              { key: 'signal', label: '시그널 발생' },
              { key: 'top50', label: '시총 Top50' },
            ] as { key: FilterTab; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                filter === key
                  ? 'bg-rose-500/20 border border-rose-400/40 text-rose-300'
                  : 'bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20',
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
                  ? 'bg-white/[0.1] text-white'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]',
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
        <div className="py-12 text-center text-white/30 text-sm">
          조건에 맞는 종목이 없습니다
        </div>
      )}

      {/* 종목 그리드 */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {filtered.map((stock) => (
          <RoboAdvisorTile
            key={stock.id}
            stock={stock}
            onClick={() => setSelectedStock(stock)}
          />
        ))}
      </div>

      {/* 상세 모달 */}
      <RoboAdvisorDetailDialog
        stock={selectedStock}
        statsMap={statsMap}
        onClose={() => setSelectedStock(null)}
      />
    </div>
  )
}
