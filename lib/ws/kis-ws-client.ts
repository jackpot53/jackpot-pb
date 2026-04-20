import type { Tick, SubscribeRequest, WsStatus, Market } from './kis-ws-types'

// KIS WS endpoint. Plain `ws://` per official docs.
// Mixed-content note: an HTTPS page cannot open ws:// directly; deploy behind a
// same-origin TLS proxy (or set NEXT_PUBLIC_KIS_WS_URL to your proxy origin).
const DEFAULT_WS_URL = 'ws://ops.koreainvestment.com:21000'
function getWsUrl(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_KIS_WS_URL) {
    return process.env.NEXT_PUBLIC_KIS_WS_URL
  }
  return DEFAULT_WS_URL
}

const TR_ID_KR = 'H0UNCNT0'
const TR_ID_US = 'HDFSCNT0'

// Hard cap (KIS personal account limit ~41) — leave 1 slot of headroom.
const MAX_SUBSCRIPTIONS = 40

// Reconnect backoff in seconds.
const RECONNECT_BACKOFF_S = [1, 2, 4, 8, 16, 30]

type SubKey = `${'kr' | 'us'}:${string}` // e.g. 'kr:005930' or 'us:NAS:AAPL'

type SubscriptionState = {
  ticker: string         // app-side ticker
  market: Market
  trId: string
  trKey: string
  refcount: number
  lastUsed: number
}

type Listener = (tick: Tick) => void

const DEBUG = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_KIS_WS_DEBUG === 'true'
function debug(...args: unknown[]) {
  if (DEBUG) console.debug('[kis-ws]', ...args)
}

type QueuedFrame = { trId: string; trKey: string; trType: '1' | '2' }

// KIS rejects batches of subscribe frames sent in rapid succession.
// Serialize them with a small interval to ensure each is accepted.
const FRAME_INTERVAL_MS = 40

export class KisWsClient {
  private socket: WebSocket | null = null
  private approvalKey: string | null = null
  private status: WsStatus = 'idle'
  private subs = new Map<SubKey, SubscriptionState>()
  private listeners = new Set<Listener>()
  private statusListeners = new Set<(s: WsStatus) => void>()
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private intentionalClose = false
  private frameQueue: QueuedFrame[] = []
  private frameTimer: ReturnType<typeof setInterval> | null = null

  setApprovalKey(key: string) {
    this.approvalKey = key
  }

  getStatus(): WsStatus {
    return this.status
  }

  onTick(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  onStatus(fn: (s: WsStatus) => void): () => void {
    this.statusListeners.add(fn)
    fn(this.status)
    return () => this.statusListeners.delete(fn)
  }

  connect(): void {
    if (typeof WebSocket === 'undefined') return
    if (this.socket && (this.status === 'open' || this.status === 'connecting')) return
    if (!this.approvalKey) {
      debug('connect aborted — no approval key')
      return
    }

    this.intentionalClose = false
    this.setStatus('connecting')

    let socket: WebSocket
    try {
      socket = new WebSocket(getWsUrl())
    } catch (err) {
      debug('socket construction failed', err)
      this.scheduleReconnect()
      return
    }
    this.socket = socket

    socket.addEventListener('open', () => {
      debug('socket open')
      this.reconnectAttempt = 0
      this.setStatus('open')
      // Re-subscribe everything that had refcount > 0, serialized via queue.
      for (const sub of this.subs.values()) {
        if (sub.refcount > 0) this.enqueueFrame(sub.trId, sub.trKey, '1')
      }
    })

    socket.addEventListener('message', (ev) => this.handleMessage(ev.data))

    socket.addEventListener('close', () => {
      debug('socket closed')
      this.socket = null
      if (this.intentionalClose) {
        this.setStatus('closed')
      } else {
        this.scheduleReconnect()
      }
    })

    socket.addEventListener('error', (err) => {
      debug('socket error', err)
    })
  }

  disconnect(): void {
    this.intentionalClose = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.stopPump()
    this.frameQueue = []
    if (this.socket) {
      try { this.socket.close() } catch {}
      this.socket = null
    }
    this.setStatus('closed')
  }

  subscribe(req: SubscribeRequest): void {
    const { trId, trKey } = this.toTrPair(req)
    if (!trKey) return

    const subKey = this.toSubKey(req)
    const existing = this.subs.get(subKey)
    if (existing) {
      existing.refcount++
      existing.lastUsed = Date.now()
      debug('+ref', subKey, existing.refcount, `(active: ${this.activeCount()})`)
      return
    }

    if (this.activeCount() >= MAX_SUBSCRIPTIONS) {
      const evicted = this.evictOldestIdle()
      if (!evicted) {
        console.warn(`[kis-ws] subscription cap (${MAX_SUBSCRIPTIONS}) reached, dropping ${subKey}`)
        return
      }
    }

    this.subs.set(subKey, {
      ticker: req.ticker,
      market: req.market,
      trId,
      trKey,
      refcount: 1,
      lastUsed: Date.now(),
    })
    debug('+sub', subKey, `(active: ${this.activeCount()})`)
    this.enqueueFrame(trId, trKey, '1')
  }

  unsubscribe(req: SubscribeRequest): void {
    const subKey = this.toSubKey(req)
    const existing = this.subs.get(subKey)
    if (!existing) return

    existing.refcount = Math.max(0, existing.refcount - 1)
    debug('-ref', subKey, existing.refcount, `(active: ${this.activeCount()})`)
    if (existing.refcount > 0) return

    this.subs.delete(subKey)
    this.enqueueFrame(existing.trId, existing.trKey, '2')
  }

  private toSubKey(req: SubscribeRequest): SubKey {
    return req.market === 'kr'
      ? `kr:${req.ticker}` as SubKey
      : `us:${req.excd ?? 'NAS'}:${req.ticker}` as SubKey
  }

  private toTrPair(req: SubscribeRequest): { trId: string; trKey: string } {
    if (req.market === 'kr') {
      // KR ticker '005930.KS' → trKey '005930'
      const code = req.ticker.split('.')[0]
      return { trId: TR_ID_KR, trKey: /^\d{6}$/.test(code) ? code : '' }
    }
    // US: trKey 'D' + 3-char excd + symbol e.g. 'DNASAAPL'
    const excd = (req.excd ?? 'NAS').toUpperCase()
    return { trId: TR_ID_US, trKey: `D${excd}${req.ticker.toUpperCase()}` }
  }

  private activeCount(): number {
    let n = 0
    for (const s of this.subs.values()) if (s.refcount > 0) n++
    return n
  }

  private evictOldestIdle(): boolean {
    let oldest: { key: SubKey; ts: number } | null = null
    for (const [key, sub] of this.subs.entries()) {
      if (sub.refcount === 0 && (oldest === null || sub.lastUsed < oldest.ts)) {
        oldest = { key, ts: sub.lastUsed }
      }
    }
    if (!oldest) return false
    const sub = this.subs.get(oldest.key)
    if (sub) this.enqueueFrame(sub.trId, sub.trKey, '2')
    this.subs.delete(oldest.key)
    return true
  }

  private enqueueFrame(trId: string, trKey: string, trType: '1' | '2'): void {
    if (this.frameQueue.length >= 10) {
      console.warn(`[kis-ws] frame queue growing large (${this.frameQueue.length}), possible backlog`)
    }
    this.frameQueue.push({ trId, trKey, trType })
    this.startPump()
  }

  private startPump(): void {
    if (this.frameTimer) return
    this.frameTimer = setInterval(() => {
      if (this.frameQueue.length === 0) {
        this.stopPump()
        return
      }
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
      const f = this.frameQueue.shift()!
      this.sendFrameNow(f.trId, f.trKey, f.trType)
    }, FRAME_INTERVAL_MS)
  }

  private stopPump(): void {
    if (this.frameTimer) {
      clearInterval(this.frameTimer)
      this.frameTimer = null
    }
  }

  private sendFrameNow(trId: string, trKey: string, trType: '1' | '2'): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    if (!this.approvalKey) return

    const frame = {
      header: {
        approval_key: this.approvalKey,
        custtype: 'P',
        tr_type: trType,
        'content-type': 'utf-8',
      },
      body: {
        input: { tr_id: trId, tr_key: trKey },
      },
    }
    try {
      this.socket.send(JSON.stringify(frame))
    } catch (err) {
      debug('send failed', err)
    }
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== 'string') return

    // Push data frames start with '0|' (plain) or '1|' (encrypted; ignored here)
    if (raw.startsWith('0|')) {
      const parts = raw.split('|')
      if (parts.length < 4) return
      const trId = parts[1]
      const payload = parts[3] // may contain multiple records joined by '^'

      if (trId === TR_ID_KR) this.parseKrTicks(payload)
      else if (trId === TR_ID_US) this.parseUsTicks(payload)
      return
    }

    // JSON control frames (subscribe ack, ping/pong)
    try {
      const obj = JSON.parse(raw) as {
        header?: { tr_id?: string; tr_key?: string }
        body?: { rt_cd?: string; msg_cd?: string; msg1?: string }
      }
      if (obj.header?.tr_id === 'PINGPONG' && this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(raw)
        return
      }
      if (obj.body?.rt_cd !== undefined && obj.body.rt_cd !== '0') {
        console.warn('[kis-ws] subscribe failed', {
          trId: obj.header?.tr_id,
          trKey: obj.header?.tr_key,
          code: obj.body.msg_cd,
          msg: obj.body.msg1,
        })
      } else {
        debug('ack', obj.header?.tr_id, obj.header?.tr_key, obj.body?.msg1)
      }
    } catch {
      // ignore
    }
  }

  private parseKrTicks(payload: string): void {
    // KR H0UNCNT0 fields (positional, '^' separated):
    // [0]=MKSC_SHRN_ISCD code, [1]=time, [2]=price, [3]=sign, [4]=diff, [5]=ctrt(%)
    const fields = payload.split('^')
    if (fields.length < 6) return

    const code = fields[0]?.trim()
    const price = parseFloat(fields[2])
    const changePercent = fields[5] !== '' ? parseFloat(fields[5]) : null
    if (!code || !Number.isFinite(price) || price <= 0) return

    // Look up which ticker this code maps to (could be '005930.KS' or '005930.KQ')
    for (const sub of this.subs.values()) {
      if (sub.market === 'kr' && sub.trKey === code) {
        this.emit({
          ticker: sub.ticker,
          price,
          changePercent: Number.isFinite(changePercent ?? NaN) ? changePercent : null,
          tradedAt: Date.now(),
          market: 'kr',
        })
      }
    }
  }

  private parseUsTicks(payload: string): void {
    // US HDFSCNT0 fields (positional, '^' separated):
    // [0]=RSYM, [1]=SYMB, [2]=ZDIV, [3]=TYMD, [4]=XYMD, [5]=XHMS, [6]=KYMD, [7]=KHMS,
    // [8]=OPEN, [9]=HIGH, [10]=LOW, [11]=LAST, [12]=SIGN, [13]=DIFF, [14]=RATE
    const fields = payload.split('^')
    if (fields.length < 15) return

    const rsym = fields[0]?.trim()  // e.g. 'DNASAAPL'
    const symb = fields[1]?.trim()
    const last = parseFloat(fields[11])
    const rate = fields[14] !== '' ? parseFloat(fields[14]) : null
    if (!Number.isFinite(last) || last <= 0) return

    for (const sub of this.subs.values()) {
      if (sub.market !== 'us') continue
      if (sub.trKey === rsym || sub.ticker === symb) {
        this.emit({
          ticker: sub.ticker,
          price: last,
          changePercent: Number.isFinite(rate ?? NaN) ? rate : null,
          tradedAt: Date.now(),
          market: 'us',
        })
      }
    }
  }

  private emit(tick: Tick): void {
    for (const fn of this.listeners) {
      try { fn(tick) } catch {}
    }
  }

  private setStatus(s: WsStatus): void {
    if (this.status === s) return
    this.status = s
    for (const fn of this.statusListeners) {
      try { fn(s) } catch {}
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose) return
    if (this.reconnectAttempt >= RECONNECT_BACKOFF_S.length) {
      debug('reconnect attempts exhausted')
      this.setStatus('closed')
      return
    }
    const delayS = RECONNECT_BACKOFF_S[this.reconnectAttempt]
    this.reconnectAttempt++
    this.setStatus('reconnecting')
    debug(`reconnecting in ${delayS}s (attempt ${this.reconnectAttempt})`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delayS * 1000)
  }
}

// Module-level singleton — survives Next.js fast refresh by virtue of module identity.
let singleton: KisWsClient | null = null
export function getKisWsClient(): KisWsClient {
  if (!singleton) singleton = new KisWsClient()
  return singleton
}
