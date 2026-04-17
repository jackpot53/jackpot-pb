import { describe, it, expect } from 'vitest'
import { parseKpubList, parsePubHtml, parsePubVariableHtml } from '../scrape'
import { searchInsuranceProducts } from '../catalog'

// ── parseKpubList ────────────────────────────────────────────────────────────

const KPUB_FIXTURE = `{list:[{TP_NAME:'(무) 메리츠 우리집보험 M-House2601',P_CODE_NM:'메리츠화재',TPTY_CODE:'PB11'},{TP_NAME:'(무) 삼성화재 실손의료비보험',P_CODE_NM:'삼성화재',TPTY_CODE:'PB11'},{TP_NAME:'(유) DB손보 다이렉트 자동차보험',P_CODE_NM:'DB손해보험',TPTY_CODE:'PB14'}]}`

describe('parseKpubList', () => {
  it('extracts product names and company from JS-literal response', () => {
    const products = parseKpubList(KPUB_FIXTURE)
    expect(products.length).toBe(3)
    expect(products[0]).toMatchObject({ name: '(무) 메리츠 우리집보험 M-House2601', company: '메리츠화재', kind: 'nonlife' })
    expect(products[1]).toMatchObject({ name: '(무) 삼성화재 실손의료비보험', company: '삼성화재', kind: 'nonlife' })
    expect(products[2]).toMatchObject({ name: '(유) DB손보 다이렉트 자동차보험', company: 'DB손해보험', kind: 'nonlife' })
  })

  it('returns empty array for empty list', () => {
    expect(parseKpubList('{list:[]}')).toEqual([])
  })

  it('returns empty array for malformed response', () => {
    expect(parseKpubList('error: internal server error')).toEqual([])
  })
})

// ── parsePubHtml ─────────────────────────────────────────────────────────────

const PUB_HTML_FIXTURE = `
<table>
  <tr><td class="company">삼성생명</td><td>(무)삼성생명 인생금고 종신보험</td></tr>
  <tr><td class="company">교보생명</td><td>(무)교보생명 평생든든 종신보험2501</td></tr>
  <tr><td class="company">한화생명</td><td>(유)한화생명 변액연금 스마트알파</td></tr>
  <tr><td colspan="2"><!-- 기타 셀 --></td></tr>
</table>
`

describe('parsePubHtml', () => {
  it('extracts (무)/(유) prefixed product names from HTML', () => {
    const products = parsePubHtml(PUB_HTML_FIXTURE)
    const names = products.map(p => p.name)
    expect(names).toContain('(무)삼성생명 인생금고 종신보험')
    expect(names).toContain('(무)교보생명 평생든든 종신보험2501')
    expect(names).toContain('(유)한화생명 변액연금 스마트알파')
  })

  it('deduplicates identical product names', () => {
    const html = `<td>(무)테스트상품 종신A</td><td>(무)테스트상품 종신A</td>`
    const products = parsePubHtml(html)
    const testProducts = products.filter(p => p.name === '(무)테스트상품 종신A')
    expect(testProducts.length).toBe(1)
  })

  it('returns empty array when no (무)/(유) names found', () => {
    expect(parsePubHtml('<html><body><p>내용 없음</p></body></html>')).toEqual([])
  })

  it('marks products as life kind', () => {
    const products = parsePubHtml(PUB_HTML_FIXTURE)
    expect(products.every(p => p.kind === 'life')).toBe(true)
  })
})

// ── parsePubVariableHtml ─────────────────────────────────────────────────────

const VARIABLE_HTML_FIXTURE = `
<table>
  <tr><td><a href="https://www.imlifeins.co.kr/BA/BA_A020.do" title="HighFive그랑에이지변액연금보험 무배당 2601 상품정보 페이지 새창">HighFive그랑에이지변액연금보험 무배당 2601</a></td></tr>
  <tr><td><a href="https://www.imlifeins.co.kr/BA/BA_A020.do" title="HighFive그랑에이지변액연금보험 무배당 2601 상품정보 페이지 새창">HighFive그랑에이지변액연금보험 무배당 2601</a></td></tr>
  <tr><td><a href="https://www.samsunglife.com/..." title="삼성 탄탄한 변액연금보험(B2601)(무배당) 상품정보 페이지 새창">삼성 탄탄한 변액연금보험(B2601)(무배당)</a></td></tr>
  <tr><td><a href="http://www.kyobo.com/..." title="교보변액연금보험(무배당) 상품정보 페이지 새창">교보변액연금보험(무배당)</a></td></tr>
</table>
`

describe('parsePubVariableHtml', () => {
  it('extracts product names from title attribute of anchor tags', () => {
    const products = parsePubVariableHtml(VARIABLE_HTML_FIXTURE)
    const names = products.map(p => p.name)
    expect(names).toContain('HighFive그랑에이지변액연금보험 무배당 2601')
    expect(names).toContain('삼성 탄탄한 변액연금보험(B2601)(무배당)')
    expect(names).toContain('교보변액연금보험(무배당)')
  })

  it('deduplicates products appearing in multiple rows (different holding periods)', () => {
    const products = parsePubVariableHtml(VARIABLE_HTML_FIXTURE)
    const highFive = products.filter(p => p.name === 'HighFive그랑에이지변액연금보험 무배당 2601')
    expect(highFive.length).toBe(1)
  })

  it('marks products as life kind', () => {
    const products = parsePubVariableHtml(VARIABLE_HTML_FIXTURE)
    expect(products.every(p => p.kind === 'life')).toBe(true)
  })

  it('returns empty array for HTML with no matching anchors', () => {
    expect(parsePubVariableHtml('<html><body><p>내용 없음</p></body></html>')).toEqual([])
  })
})

// ── searchInsuranceProducts ──────────────────────────────────────────────────

const MOCK_CATALOG = [
  { name: '(무) 삼성화재 실손의료비보험', company: '삼성화재', kind: 'nonlife' as const },
  { name: '(무)삼성생명 인생금고 종신보험', company: '삼성생명', kind: 'life' as const },
  { name: '(무) 메리츠 우리집보험 M-House2601', company: '메리츠화재', kind: 'nonlife' as const },
  { name: '(유)한화생명 변액연금', company: '한화생명', kind: 'life' as const },
]
const mockCatalogFn = async () => MOCK_CATALOG

describe('searchInsuranceProducts', () => {
  it('returns products matching the query (case-insensitive, normalized)', async () => {
    const results = await searchInsuranceProducts('삼성', mockCatalogFn)
    expect(results.length).toBe(2)
    expect(results.map(r => r.company)).toContain('삼성화재')
    expect(results.map(r => r.company)).toContain('삼성생명')
  })

  it('normalizes (무)/(유) prefix and spaces in query matching', async () => {
    const results = await searchInsuranceProducts('메리츠', mockCatalogFn)
    expect(results.length).toBe(1)
    expect(results[0].name).toBe('(무) 메리츠 우리집보험 M-House2601')
  })

  it('returns empty array for no matches', async () => {
    const results = await searchInsuranceProducts('없는상품xyz', mockCatalogFn)
    expect(results).toEqual([])
  })

  it('returns empty array for empty query', async () => {
    const results = await searchInsuranceProducts('', mockCatalogFn)
    expect(results).toEqual([])
  })
})
