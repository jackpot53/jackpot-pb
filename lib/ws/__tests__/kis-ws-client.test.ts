import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

class MockWebSocket {
  static OPEN = 1
  readyState = 1
  url: string
  sent: string[] = []
  listeners: Record<string, ((ev: { data?: unknown }) => void)[]> = {}
  static instances: MockWebSocket[] = []

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
    // Defer 'open' so listeners can attach
    setTimeout(() => this.dispatch('open', {}), 0)
  }

  addEventListener(event: string, fn: (ev: { data?: unknown }) => void): void {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(fn)
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.readyState = 3
    this.dispatch('close', {})
  }

  dispatch(event: string, ev: { data?: unknown }): void {
    const fns = this.listeners[event] ?? []
    for (const fn of fns) fn(ev)
  }

  receive(data: string): void {
    this.dispatch('message', { data })
  }
}

beforeEach(() => {
  MockWebSocket.instances = []
  vi.stubGlobal('WebSocket', MockWebSocket)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function flush() {
  await new Promise((r) => setTimeout(r, 5))
}

describe('KisWsClient subscription frame format', () => {
  it('sends KR subscribe frame with H0UNCNT0 and 6-digit code', async () => {
    const { KisWsClient } = await import('../kis-ws-client')
    const client = new KisWsClient()
    client.setApprovalKey('approval-xyz')
    client.connect()
    await flush()

    client.subscribe({ ticker: '005930.KS', market: 'kr' })

    const ws = MockWebSocket.instances[0]
    expect(ws.sent).toHaveLength(1)
    const frame = JSON.parse(ws.sent[0])
    expect(frame.header.approval_key).toBe('approval-xyz')
    expect(frame.header.tr_type).toBe('1')
    expect(frame.body.input.tr_id).toBe('H0UNCNT0')
    expect(frame.body.input.tr_key).toBe('005930')
  })

  it('sends US subscribe frame with HDFSCNT0 and D{excd}{symbol} key', async () => {
    const { KisWsClient } = await import('../kis-ws-client')
    const client = new KisWsClient()
    client.setApprovalKey('k')
    client.connect()
    await flush()

    client.subscribe({ ticker: 'AAPL', market: 'us', excd: 'NAS' })

    const frame = JSON.parse(MockWebSocket.instances[0].sent[0])
    expect(frame.body.input.tr_id).toBe('HDFSCNT0')
    expect(frame.body.input.tr_key).toBe('DNASAAPL')
  })
})

describe('KisWsClient refcount', () => {
  it('sends one subscribe per unique ticker even when called multiple times', async () => {
    const { KisWsClient } = await import('../kis-ws-client')
    const client = new KisWsClient()
    client.setApprovalKey('k')
    client.connect()
    await flush()

    client.subscribe({ ticker: '005930.KS', market: 'kr' })
    client.subscribe({ ticker: '005930.KS', market: 'kr' })
    client.subscribe({ ticker: '005930.KS', market: 'kr' })

    const sent = MockWebSocket.instances[0].sent
    expect(sent).toHaveLength(1) // only first subscribe sends a frame
  })

  it('only unsubscribes when refcount hits zero', async () => {
    const { KisWsClient } = await import('../kis-ws-client')
    const client = new KisWsClient()
    client.setApprovalKey('k')
    client.connect()
    await flush()

    client.subscribe({ ticker: '005930.KS', market: 'kr' })
    client.subscribe({ ticker: '005930.KS', market: 'kr' })

    client.unsubscribe({ ticker: '005930.KS', market: 'kr' })
    let sent = MockWebSocket.instances[0].sent
    expect(sent.filter((s) => JSON.parse(s).header.tr_type === '2')).toHaveLength(0)

    client.unsubscribe({ ticker: '005930.KS', market: 'kr' })
    sent = MockWebSocket.instances[0].sent
    expect(sent.filter((s) => JSON.parse(s).header.tr_type === '2')).toHaveLength(1)
  })
})

describe('KisWsClient push frame parsing', () => {
  it('emits Tick for KR H0UNCNT0 push', async () => {
    const { KisWsClient } = await import('../kis-ws-client')
    const client = new KisWsClient()
    client.setApprovalKey('k')
    client.connect()
    await flush()
    client.subscribe({ ticker: '005930.KS', market: 'kr' })

    const ticks: unknown[] = []
    client.onTick((t) => ticks.push(t))

    // KR push: 0|H0UNCNT0|001|005930^123519^53700^2^1500^2.87
    MockWebSocket.instances[0].receive('0|H0UNCNT0|001|005930^123519^53700^2^1500^2.87')

    expect(ticks).toHaveLength(1)
    expect(ticks[0]).toMatchObject({
      ticker: '005930.KS',
      price: 53700,
      changePercent: 2.87,
      market: 'kr',
    })
  })

  it('emits Tick for US HDFSCNT0 push', async () => {
    const { KisWsClient } = await import('../kis-ws-client')
    const client = new KisWsClient()
    client.setApprovalKey('k')
    client.connect()
    await flush()
    client.subscribe({ ticker: 'AAPL', market: 'us', excd: 'NAS' })

    const ticks: unknown[] = []
    client.onTick((t) => ticks.push(t))

    // 15 fields min: RSYM|SYMB|ZDIV|TYMD|XYMD|XHMS|KYMD|KHMS|OPEN|HIGH|LOW|LAST|SIGN|DIFF|RATE
    const payload = 'DNASAAPL^AAPL^4^20260419^20260419^123000^20260419^223000^185.00^186.50^184.10^185.43^2^0.43^0.23'
    MockWebSocket.instances[0].receive(`0|HDFSCNT0|001|${payload}`)

    expect(ticks).toHaveLength(1)
    expect(ticks[0]).toMatchObject({
      ticker: 'AAPL',
      price: 185.43,
      changePercent: 0.23,
      market: 'us',
    })
  })

  it('echoes PINGPONG control frames', async () => {
    const { KisWsClient } = await import('../kis-ws-client')
    const client = new KisWsClient()
    client.setApprovalKey('k')
    client.connect()
    await flush()

    const ping = JSON.stringify({ header: { tr_id: 'PINGPONG' } })
    MockWebSocket.instances[0].receive(ping)

    expect(MockWebSocket.instances[0].sent).toContain(ping)
  })
})

describe('KisWsClient subscription cap', () => {
  it('caps total subscriptions at 40 with eviction', async () => {
    const { KisWsClient } = await import('../kis-ws-client')
    const client = new KisWsClient()
    client.setApprovalKey('k')
    client.connect()
    await flush()

    // Subscribe 40 KR tickers
    for (let i = 0; i < 40; i++) {
      client.subscribe({ ticker: `${String(i).padStart(6, '0')}.KS`, market: 'kr' })
    }
    // Drop one to make it idle
    client.unsubscribe({ ticker: '000000.KS', market: 'kr' })

    // 41st subscribe should evict the idle one
    client.subscribe({ ticker: '999999.KS', market: 'kr' })

    const sent = MockWebSocket.instances[0].sent.map((s) => JSON.parse(s))
    const subscribeFrames = sent.filter((f) => f.header.tr_type === '1')
    const unsubscribeFrames = sent.filter((f) => f.header.tr_type === '2')

    expect(subscribeFrames).toHaveLength(41) // 40 initial + 1 new
    expect(unsubscribeFrames).toHaveLength(1) // 1 eviction
  })
})
