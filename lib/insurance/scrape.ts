export type InsuranceProduct = { name: string; company: string | null; kind: 'life' | 'nonlife' }

const KPUB_CATEGORIES = ['PB11', 'PB12', 'PB13', 'PB14', 'PB22', 'PB24', 'PB25', 'PB27'] as const

const PUB_ASSURANCE_CODES = [
  '024400010001', '024400010002', '024400010003', '024400010004', '024400010005',
  '024400010006', '024400010007', '024400010008', '024400010009', '024400010010', '024400010011',
] as const

const PUB_SAVING_CODES = ['024400020001', '024400020002', '024400020003', '024400020004'] as const

const KPUB_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'X-Requested-With': 'XMLHttpRequest',
  'Content-Type': 'application/x-www-form-urlencoded',
}

const PUB_BASE = 'https://pub.insure.or.kr'
const PUB_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }

async function withConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = []
  const queue = [...tasks]

  async function runTask(task: () => Promise<T>): Promise<void> {
    try {
      results.push(await task())
    } catch {
      // silently drop failed category, partial results still returned
    }
  }

  while (queue.length > 0) {
    const batch = queue.splice(0, limit)
    await Promise.allSettled(batch.map(runTask))
  }
  return results
}

// exported for unit tests
export function parseKpubList(text: string): InsuranceProduct[] {
  const products: InsuranceProduct[] = []
  // JS object literals in response have unquoted keys and single-quoted values.
  // handles both orderings: TP_NAME before P_CODE_NM and vice-versa.
  const re = /\{[^}]*?TP_NAME:'([^']+)'[^}]*?P_CODE_NM:'([^']*)'[^}]*?\}|\{[^}]*?P_CODE_NM:'([^']*)'[^}]*?TP_NAME:'([^']+)'[^}]*?\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const name = (m[1] ?? m[4]).trim()
    const company = (m[2] ?? m[3] ?? '').trim() || null
    if (name) products.push({ name, company, kind: 'nonlife' })
  }
  return products
}

// exported for unit tests
export function parsePubHtml(html: string): InsuranceProduct[] {
  const seen = new Set<string>()
  const products: InsuranceProduct[] = []
  const re = />\s*(\([무유]\)[^<]{5,120}?)\s*</g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const name = m[1].trim()
    if (!seen.has(name)) {
      seen.add(name)
      products.push({ name, company: null, kind: 'life' })
    }
  }
  return products
}

async function fetchKpubCategory(code: string): Promise<InsuranceProduct[]> {
  const body = `tabType=1&tptyCode=${code}&refreshYn=&detailYn=&pCode=`
  const res = await fetch('https://kpub.knia.or.kr/popup/disclosureList.do', {
    method: 'POST',
    headers: {
      ...KPUB_HEADERS,
      Referer: `https://kpub.knia.or.kr/popup/disclosurePopup.do?tabType=1&tptyCode=${code}`,
    },
    body,
    signal: AbortSignal.timeout(5000),
  })
  return parseKpubList(await res.text())
}

async function getPubSessionCookie(): Promise<string> {
  try {
    const res = await fetch(`${PUB_BASE}/main.do`, { headers: PUB_HEADERS, signal: AbortSignal.timeout(5000) })
    const raw = res.headers.get('set-cookie') ?? ''
    const match = raw.match(/JSESSIONID=[^;]+/)
    return match ? match[0] : ''
  } catch {
    return ''
  }
}

async function fetchPubCategory(
  path: string,
  code: string,
  headers: Record<string, string>,
): Promise<InsuranceProduct[]> {
  const url = `${PUB_BASE}${path}?search_prodGroup=${code}`
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) })
  return parsePubHtml(await res.text())
}

export async function fetchNonLifeProducts(): Promise<InsuranceProduct[]> {
  const tasks = KPUB_CATEGORIES.map(code => () => fetchKpubCategory(code))
  const batches = await withConcurrency(tasks, 4)
  return batches.flat()
}

// exported for unit tests
export function parsePubVariableHtml(html: string): InsuranceProduct[] {
  // Variable insurance pages use <a title="[product name] 상품정보 페이지 새창"> structure.
  // Multiple rows exist per product (different holding periods) — deduplicate by name.
  const seen = new Set<string>()
  const products: InsuranceProduct[] = []
  const re = /title="([^"]+)\s+상품정보 페이지 새창"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const name = m[1].trim()
    if (name && !seen.has(name)) {
      seen.add(name)
      products.push({ name, company: null, kind: 'life' })
    }
  }
  return products
}

export async function fetchLifeProducts(): Promise<InsuranceProduct[]> {
  const cookie = await getPubSessionCookie()
  const headers = cookie ? { ...PUB_HEADERS, Cookie: cookie } : PUB_HEADERS

  const assuranceTasks = PUB_ASSURANCE_CODES.map(
    code => () => fetchPubCategory('/compareDis/prodCompare/assurance/listNew.do', code, headers),
  )
  const savingTasks = PUB_SAVING_CODES.map(
    code => () => fetchPubCategory('/compareDis/prodCompare/saving/list.do', code, headers),
  )
  const fetchVariable = async (path: string) => {
    const url = `${PUB_BASE}${path}`
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) })
    return parsePubVariableHtml(await res.text())
  }
  const variableTasks = [
    () => fetchVariable('/compareDis/variableInsrn/prodCompare/assurance/listNew.do'),
    () => fetchVariable('/compareDis/variableInsrn/prodCompare/saving/list.do'),
  ]

  const batches = await withConcurrency([...assuranceTasks, ...savingTasks, ...variableTasks], 4)
  const all = batches.flat()

  const seen = new Set<string>()
  return all.filter(p => {
    if (seen.has(p.name)) return false
    seen.add(p.name)
    return true
  })
}
