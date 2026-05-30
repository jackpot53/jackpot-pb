'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type TickerMarket = 'stock_kr' | 'etf_kr' | 'stock_us' | 'etf_us'

export interface TickerSuggestion {
  name: string
  ticker: string
  market: TickerMarket
}

interface Props {
  onSelect: (s: TickerSuggestion) => void
  selectedTicker: string | null
}

const MARKET_LABELS: Record<TickerMarket, string> = {
  stock_kr: 'KR 주식',
  etf_kr: 'KR ETF',
  stock_us: 'US 주식',
  etf_us: 'US ETF',
}

const MARKET_COLORS: Record<TickerMarket, string> = {
  stock_kr: 'bg-blue-50 text-blue-700 border-blue-200',
  etf_kr: 'bg-sky-50 text-sky-700 border-sky-200',
  stock_us: 'bg-orange-50 text-orange-700 border-orange-200',
  etf_us: 'bg-amber-50 text-amber-700 border-amber-200',
}

const MARKETS: TickerMarket[] = ['stock_kr', 'etf_kr', 'stock_us', 'etf_us']

async function searchAll(q: string, signal: AbortSignal): Promise<TickerSuggestion[]> {
  const results = await Promise.allSettled(
    MARKETS.map((market) =>
      fetch(`/api/ticker-search?q=${encodeURIComponent(q)}&type=${market}`, { signal })
        .then((r) => r.json())
        .then((data: { results?: { name: string; ticker: string }[] }) =>
          (data.results ?? []).map((item) => ({ ...item, market })),
        )
        .catch((): TickerSuggestion[] => []),
    ),
  )

  const seen = new Set<string>()
  const merged: TickerSuggestion[] = []
  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    for (const item of result.value) {
      if (!item.ticker || seen.has(item.ticker)) continue
      seen.add(item.ticker)
      merged.push(item)
    }
  }
  return merged.slice(0, 15)
}

export function RoboAdvisorTickerSearch({ onSelect, selectedTicker }: Props) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [composing, setComposing] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const runSearch = useCallback((q: string) => {
    if (q.trim().length < 1) {
      setSuggestions([])
      setOpen(false)
      return
    }
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    searchAll(q, ctrl.signal)
      .then((items) => {
        setSuggestions(items)
        setOpen(items.length > 0)
        setActiveIdx(-1)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setQuery(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => runSearch(v), 250)
  }

  const handleSelect = useCallback(
    (s: TickerSuggestion) => {
      setQuery('')
      setSuggestions([])
      setOpen(false)
      setActiveIdx(-1)
      onSelect(s)
    },
    [onSelect],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (composing) return
    if (!open || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && suggestions[activeIdx]) handleSelect(suggestions[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 언마운트 시 정리
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    abortRef.current?.abort()
  }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
          placeholder={selectedTicker ? `선택됨: ${selectedTicker} — 다시 검색하려면 입력` : '종목명 또는 코드 검색 (예: 삼성전자, QQQ)'}
          className="pl-9 pr-4 h-10 text-sm"
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">검색 중…</span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={`${s.ticker}-${s.market}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
              onMouseEnter={() => setActiveIdx(i)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                i === activeIdx ? 'bg-muted' : 'hover:bg-muted/50',
              )}
            >
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-foreground truncate">{s.name}</span>
                <span className="block text-xs text-muted-foreground tabular-nums">{s.ticker}</span>
              </span>
              <Badge
                variant="outline"
                className={cn('text-[10px] px-1.5 py-0 shrink-0 border', MARKET_COLORS[s.market])}
              >
                {MARKET_LABELS[s.market]}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {open && !loading && suggestions.length === 0 && query.trim().length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover px-4 py-3 text-sm text-muted-foreground shadow-lg">
          검색 결과가 없습니다
        </div>
      )}
    </div>
  )
}
