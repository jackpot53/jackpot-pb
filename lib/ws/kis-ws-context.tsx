'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { getKisWsClient } from './kis-ws-client'
import type { Tick, WsStatus } from './kis-ws-types'
import { resolveExchangeAction } from '@/app/actions/kis-ws'

const REFRESH_BEFORE_EXPIRY_MS = 30 * 60 * 1000

type KrAssetType = 'stock_kr' | 'etf_kr'
type UsAssetType = 'stock_us' | 'etf_us'
type LiveAssetType = KrAssetType | UsAssetType

type ContextValue = {
  status: WsStatus
  enabled: boolean
}

const KisWsContext = createContext<ContextValue>({ status: 'idle', enabled: false })

export function useKisWsStatus(): WsStatus {
  return useContext(KisWsContext).status
}

/**
 * Tick store: keyed by ticker, the latest Tick (or null) per ticker.
 * Each <LivePrice> subscribes only to its own ticker's slot via useSyncExternalStore,
 * so a push for one ticker re-renders only the row that displays it.
 */
const tickStore = (() => {
  const data = new Map<string, Tick>()
  const listeners = new Map<string, Set<() => void>>()

  function getSnapshot(ticker: string): Tick | undefined {
    return data.get(ticker)
  }

  function subscribe(ticker: string, fn: () => void): () => void {
    let set = listeners.get(ticker)
    if (!set) {
      set = new Set()
      listeners.set(ticker, set)
    }
    set.add(fn)
    return () => {
      set?.delete(fn)
      if (set?.size === 0) listeners.delete(ticker)
    }
  }

  function setTick(tick: Tick): void {
    const prev = data.get(tick.ticker)
    if (prev && prev.tradedAt > tick.tradedAt) return
    data.set(tick.ticker, tick)
    const set = listeners.get(tick.ticker)
    if (set) for (const fn of set) fn()
  }

  return { getSnapshot, subscribe, setTick }
})()

export function KisWsProvider({ children }: { children: ReactNode }) {
  const enabled = process.env.NEXT_PUBLIC_KIS_WS_ENABLED === 'true'
  const [status, setStatus] = useState<WsStatus>('idle')
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return

    const client = getKisWsClient()
    const offTick = client.onTick((tick) => tickStore.setTick(tick))
    const offStatus = client.onStatus(setStatus)

    let cancelled = false

    async function mintAndConnect() {
      try {
        const res = await fetch('/api/kis-ws-approval', { cache: 'no-store' })
        if (!res.ok) {
          console.warn('[kis-ws] approval mint failed', res.status)
          return
        }
        const { approvalKey, expiresAt } = (await res.json()) as { approvalKey: string; expiresAt: string }
        if (cancelled) return

        client.setApprovalKey(approvalKey)
        client.connect()

        const expiresAtMs = new Date(expiresAt).getTime()
        const refreshIn = Math.max(60_000, expiresAtMs - Date.now() - REFRESH_BEFORE_EXPIRY_MS)
        refreshTimerRef.current = setTimeout(mintAndConnect, refreshIn)
      } catch (err) {
        console.warn('[kis-ws] mint+connect failed', err)
      }
    }

    mintAndConnect()

    return () => {
      cancelled = true
      offTick()
      offStatus()
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      client.disconnect()
    }
  }, [enabled])

  const value = useMemo(() => ({ status, enabled }), [status, enabled])
  return <KisWsContext.Provider value={value}>{children}</KisWsContext.Provider>
}

/**
 * Subscribe a single component to live price ticks for one ticker.
 * Returns the latest Tick (or undefined if no live update yet).
 *
 * Multiple components mounting with the same ticker share one underlying KIS subscription
 * via refcount in KisWsClient. Unmount decrements; reaching zero unsubscribes.
 */
export function useKisLivePrice(ticker: string | null | undefined, assetType: string | null | undefined): Tick | undefined {
  const { enabled } = useContext(KisWsContext)

  const subscribe = useCallback(
    (cb: () => void) => (ticker ? tickStore.subscribe(ticker, cb) : () => {}),
    [ticker],
  )
  const getSnapshot = useCallback(
    () => (ticker ? tickStore.getSnapshot(ticker) : undefined),
    [ticker],
  )
  const tick = useSyncExternalStore(subscribe, getSnapshot, () => undefined)

  // Track the resolved US exchange across register/cleanup so unsubscribe matches.
  const resolvedExcdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !ticker || !assetType) return
    if (!isLiveAssetType(assetType)) return

    const client = getKisWsClient()
    let cancelled = false
    let registered = false
    resolvedExcdRef.current = null

    async function register() {
      if (assetType === 'stock_kr' || assetType === 'etf_kr') {
        client.subscribe({ ticker: ticker!, market: 'kr' })
        registered = true
      } else if (assetType === 'stock_us' || assetType === 'etf_us') {
        const excd = (await resolveExchangeAction(ticker!)) ?? 'NAS'
        if (cancelled) return
        resolvedExcdRef.current = excd
        client.subscribe({ ticker: ticker!, market: 'us', excd })
        registered = true
      }
    }

    register()

    return () => {
      cancelled = true
      if (!registered) return
      if (assetType === 'stock_kr' || assetType === 'etf_kr') {
        client.unsubscribe({ ticker, market: 'kr' })
      } else if (assetType === 'stock_us' || assetType === 'etf_us') {
        client.unsubscribe({ ticker, market: 'us', excd: resolvedExcdRef.current ?? 'NAS' })
      }
    }
  }, [enabled, ticker, assetType])

  return tick
}

function isLiveAssetType(assetType: string): assetType is LiveAssetType {
  return assetType === 'stock_kr' || assetType === 'etf_kr' || assetType === 'stock_us' || assetType === 'etf_us'
}
