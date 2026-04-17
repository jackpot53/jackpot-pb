'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { PlusCircle, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, ArrowRightLeft, Pencil } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { DeleteTransactionDialog } from '@/components/app/delete-transaction-dialog'
import { EditTransactionDialog } from '@/components/app/edit-transaction-dialog'
import { DeleteAssetDialog } from '@/components/app/delete-asset-dialog'
import { AssetLogo } from '@/components/app/asset-logo'
import { cn } from '@/lib/utils'
import type { TransactionWithAsset } from '@/db/queries/transactions'
import { AnimatedLogo } from '@/components/app/animated-logo'

type AssetType = 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate' | 'fund' | 'insurance' | 'precious_metal' | 'cma' | 'cma'
type Currency = 'KRW' | 'USD'

interface AssetOption {
  id: string
  name: string
  assetType: AssetType
  currency: Currency
}

interface Props {
  transactions: TransactionWithAsset[]
  assetOptions: AssetOption[]
}

const KRW_FMT = new Intl.NumberFormat('ko-KR')
function formatKrw(value: number): string {
  return KRW_FMT.format(value)
}

function decodeQuantity(stored: number): string {
  const intPart = Math.floor(stored / 1e8)
  const fracPart = stored % 1e8
  const formattedInt = new Intl.NumberFormat('ko-KR').format(intPart)
  if (fracPart === 0) return formattedInt
  return `${formattedInt}.${fracPart.toString().padStart(8, '0').replace(/0+$/, '')}`
}

const USD_FMT = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
function formatUsd(v: number) { return USD_FMT.format(v) }

function NoTransactionCard({ asset }: { asset: AssetOption }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-dashed border-white/20 transition-colors opacity-70 hover:opacity-100">
      <AssetLogo ticker={null} name={asset.name} assetType={asset.assetType} size={40} />
      <div className="flex-1 min-w-0">
        <span className="text-base text-foreground leading-snug" style={{ fontFamily: "'Sunflower', sans-serif", fontWeight: 700 }}>{asset.name}</span>
        <p className="text-xs text-muted-foreground mt-0.5">거래 내역 없음</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Link href={`/assets/${asset.id}/edit`}>
          <Button variant="ghost" size="sm" className="p-2" aria-label="자산 편집">
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
        </Link>
        <DeleteAssetDialog assetId={asset.id} assetName={asset.name} />
      </div>
    </div>
  )
}

function TransactionCard({ tx, onDeleted }: { tx: TransactionWithAsset; onDeleted: (id: string) => void }) {
  const isUsAsset = tx.assetType === 'stock_us' || tx.assetType === 'etf_us'
  const isKrwPurchase = isUsAsset && tx.currency === 'KRW'
  const isUsdPurchase = isUsAsset && tx.currency === 'USD'

  // 달러매수: pricePerUnit은 KRW 환산값 — USD 원래 단가 역산
  const fxRate = tx.exchangeRateAtTime != null ? tx.exchangeRateAtTime / 10000 : null
  const priceUsd = isUsdPurchase && fxRate ? tx.pricePerUnit / fxRate : null

  const hasSecondaryRow = isUsAsset || tx.fee > 0 || !!tx.notes

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-white/40 hover:bg-muted/30 transition-colors',
      tx.isVoided && 'opacity-50',
    )}>
      <AssetLogo ticker={tx.ticker} name={tx.assetName} assetType={tx.assetType as Parameters<typeof AssetLogo>[0]['assetType']} size={40} />
      <div className="flex-1 min-w-0">
        {/* Row1: 이름 + 매수/매도 배지 */}
        <div className="flex items-center gap-1.5">
          <span className={cn('inline-block', tx.isVoided && 'line-through')}>
            <span className="text-base text-foreground leading-snug" style={{ fontFamily: "'Sunflower', sans-serif", fontWeight: 700 }}>{tx.assetName}</span>
            <span className="block h-[2px] w-full rounded-full" style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899, #f59e0b, #10b981)', backgroundSize: '200% 100%', animation: 'shimmer-underline 3s linear infinite' }} />
          </span>
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
            tx.type === 'buy' ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'
          }`}>
            {tx.assetType === 'savings'
              ? tx.type === 'buy'
                ? <><TrendingUp className="h-3 w-3" />납입</>
                : <><TrendingDown className="h-3 w-3" />해지출금</>
              : tx.type === 'buy'
                ? <><TrendingUp className="h-3 w-3" />매수</>
                : <><TrendingDown className="h-3 w-3" />매도</>}
          </span>
        </div>
        {/* Row2: 날짜 · 수량 · 단가 (핵심 정보) */}
        <div className={cn('flex items-center gap-2 text-sm text-muted-foreground mt-0.5', tx.isVoided && 'line-through')}>
          <span><span className="text-muted-foreground/50 text-xs mr-1">{tx.assetType === 'savings' ? '가입날짜' : tx.type === 'buy' ? '매수일' : '매도일'}</span>{(tx.assetType === 'savings' ? tx.depositStartDate : null) ?? tx.transactionDate ?? '-'}</span>
          <span className="opacity-30">|</span>
          <span>수량 {decodeQuantity(tx.quantity)}</span>
          <span className="opacity-30">|</span>
          <span>단가 {priceUsd != null ? formatUsd(priceUsd) : `₩${formatKrw(tx.pricePerUnit)}`}</span>
        </div>
        {/* Row3: 원화매수/달러매수 + 환율 · 수수료 · 메모 (보조 정보) */}
        {hasSecondaryRow && (
          <div className={cn('flex items-center gap-1.5 text-[10px] mt-0.5', tx.isVoided && 'line-through')}>
            {isUsAsset && (
              <span className={`font-medium shrink-0 ${isKrwPurchase ? 'text-amber-600' : 'text-sky-600'}`}>
                {isKrwPurchase ? '원화매수' : '달러매수'}
              </span>
            )}
            {isUsdPurchase && fxRate != null && (
              <><span className="opacity-30">·</span><span className="text-muted-foreground/70">환율 ₩{formatKrw(Math.round(fxRate))}</span></>
            )}
            {tx.fee > 0 && (
              <><span className="opacity-30">·</span><span className="text-muted-foreground/70">수수료 ₩{formatKrw(tx.fee)}</span></>
            )}
            {tx.notes && (
              <><span className="opacity-30">·</span><span className="text-muted-foreground/70 truncate max-w-[140px]">{tx.notes}</span></>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <EditTransactionDialog tx={tx} />
        <DeleteTransactionDialog
          transactionId={tx.id}
          assetId={tx.assetId}
          label={`${tx.transactionDate} ${tx.assetName} ${tx.type === 'buy' ? '매수' : '매도'}`}
          onDeleted={onDeleted}
        />
      </div>
    </div>
  )
}

export function TransactionsPageClient({ transactions, assetOptions }: Props) {
  const [assetFilter, setAssetFilter] = useState<string>('전체')
  const [typeFilter, setTypeFilter] = useState<string>('전체')
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const handleDeleted = (id: string) => setDeletedIds(prev => new Set(prev).add(id))

  const assetIdsWithTx = useMemo(() => new Set(transactions.filter(tx => !tx.isVoided).map(tx => tx.assetId)), [transactions])
  const assetsWithNoTx = useMemo(() => assetOptions.filter(a => !assetIdsWithTx.has(a.id)), [assetOptions, assetIdsWithTx])

  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.isVoided) return false
      if (deletedIds.has(tx.id)) return false
      if (assetFilter !== '전체' && tx.assetId !== assetFilter) return false
      if (typeFilter !== '전체' && tx.type !== typeFilter) return false
      return true
    })
  }, [transactions, deletedIds, assetFilter, typeFilter])

  useEffect(() => {
    setPage(1)
  }, [assetFilter, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* 히어로 배너 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-orange-500 via-rose-600 to-red-600 p-8 text-white shadow-xl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <style>{`
            @keyframes tx-slide-r { 0%{transform:translateX(-6px);opacity:0} 40%{opacity:1} 100%{transform:translateX(10px);opacity:0} }
            @keyframes tx-slide-l { 0%{transform:translateX(6px);opacity:0} 40%{opacity:1} 100%{transform:translateX(-10px);opacity:0} }
            @keyframes tx-coin { 0%,100%{transform:translateY(0) scale(1);opacity:.5} 50%{transform:translateY(-7px) scale(1.15);opacity:.85} }
            @keyframes tx-pulse-ring { 0%{transform:scale(.6);opacity:.5} 100%{transform:scale(1.8);opacity:0} }
          `}</style>
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-48 rounded-full bg-red-900/40 blur-3xl" />
          <div className="absolute top-6 right-20 w-28 h-28 rounded-full border border-white/10" />
          <div className="absolute top-12 right-28 w-14 h-14 rounded-full border border-white/10" />
          <div className="absolute top-16 right-24 w-6 h-6 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full border border-white/10" />
          {/* 매수/매도 화살표 애니메이션 — 우측 중앙 */}
          <div className="absolute right-10 top-1/2 -translate-y-1/2 hidden sm:flex flex-col gap-3">
            {/* 매수 (→) 흐름 */}
            <div className="flex items-center gap-1">
              {[0, 0.25, 0.5].map((delay, i) => (
                <svg key={i} viewBox="0 0 16 16" className="w-5 h-5" style={{ animation: `tx-slide-r 1.4s ease-in-out ${delay}s infinite` }}>
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="rgba(253,186,116,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              ))}
              <span className="text-[10px] font-bold text-orange-200/60 ml-1">매수</span>
            </div>
            {/* 코인 펄스 */}
            <div className="flex items-center justify-center relative w-10 h-10 mx-auto">
              <div className="absolute inset-0 rounded-full border border-orange-300/40" style={{ animation: 'tx-pulse-ring 1.8s ease-out infinite' }} />
              <div className="absolute inset-0 rounded-full border border-rose-300/30" style={{ animation: 'tx-pulse-ring 1.8s ease-out infinite', animationDelay: '0.9s' }} />
              <span className="text-base relative" style={{ animation: 'tx-coin 2s ease-in-out infinite' }}>₩</span>
            </div>
            {/* 매도 (←) 흐름 */}
            <div className="flex items-center gap-1 flex-row-reverse">
              {[0, 0.25, 0.5].map((delay, i) => (
                <svg key={i} viewBox="0 0 16 16" className="w-5 h-5" style={{ animation: `tx-slide-l 1.4s ease-in-out ${delay}s infinite` }}>
                  <path d="M13 8H3M7 4L3 8l4 4" stroke="rgba(253,164,175,0.75)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              ))}
              <span className="text-[10px] font-bold text-rose-200/60 mr-1">매도</span>
            </div>
          </div>
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
          {/* AnimatedLogo — 동전 던지듯 펜듈럼 스윙 */}
          <style>{`
            @keyframes tx-logo-pendulum {
              0%,100% { transform: rotate(-12deg) scale(1); filter: drop-shadow(0 0 6px rgba(251,113,133,0.3)); }
              25% { transform: rotate(12deg) scale(1.06); filter: drop-shadow(0 0 16px rgba(251,191,36,0.6)); }
              50% { transform: rotate(-8deg) scale(0.96); }
              75% { transform: rotate(10deg) scale(1.04); filter: drop-shadow(0 0 14px rgba(251,113,133,0.5)); }
            }
          `}</style>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-75 hidden sm:block"
            style={{ animation: 'tx-logo-pendulum 2.2s ease-in-out infinite', transformOrigin: 'top center' }}>
            <AnimatedLogo size={108} />
          </div>
        </div>
        <div className="relative flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-orange-200 text-xs font-semibold tracking-widest uppercase">
              <ArrowRightLeft className="h-3.5 w-3.5" />매수 · 매도
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Sunflower', sans-serif" }}>거래내역</h1>
              {filtered.length > 0 && (
                <span className="text-sm font-semibold bg-white/20 rounded-full px-2.5 py-0.5 tabular-nums">
                  {filtered.length}건
                </span>
              )}
            </div>
            <p className="text-orange-100/70 text-sm">
              매수·매도 거래를 기록하고 <span className="text-orange-100/90 font-medium">투자 내역을 한눈에 관리</span>합니다
            </p>
          </div>
          <Link href="/assets/new" className="group shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/25 text-white text-sm font-semibold transition-all duration-200 hover:shadow-lg active:scale-95">
            <PlusCircle className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
            거래 추가
          </Link>
        </div>
      </div>
      {/* Filters */}
      <div className="flex items-center gap-1 p-1 bg-muted/40 border border-border rounded-xl w-fit">
        <Select value={assetFilter} onValueChange={(v) => setAssetFilter(v ?? '전체')}>
          <SelectTrigger className="h-8 w-40 bg-transparent border-none shadow-none text-sm focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="전체 종목">
              {assetFilter === '전체' ? '전체 종목' : (assetOptions.find(a => a.id === assetFilter)?.name ?? '전체 종목')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="전체">전체 종목</SelectItem>
            {assetOptions.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="h-5 w-px bg-border mx-0.5" />

        <div className="flex items-center gap-0.5 px-0.5">
          {(['전체', 'buy', 'sell'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                typeFilter === t
                  ? t === 'buy' ? 'bg-red-500/20 text-red-400'
                    : t === 'sell' ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t === '전체' ? '전체' : t === 'buy' ? '매수' : '매도'}
            </button>
          ))}
        </div>
      </div>

      {/* Card list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-sm font-semibold text-foreground">거래 내역이 없습니다</p>
          <p className="text-sm text-muted-foreground">
            위의 버튼으로 거래를 추가해보세요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
          {paginated.map((tx) => (
            <TransactionCard key={tx.id} tx={tx} onDeleted={handleDeleted} />
          ))}
          {assetFilter === '전체' && assetsWithNoTx.map((a) => (
            <NoTransactionCard key={a.id} asset={a} />
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="이전 페이지"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPage(p)}
                className="w-8"
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="다음 페이지"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

    </div>
  )
}
