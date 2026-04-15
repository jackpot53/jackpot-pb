/**
 * Fetches fund NAV (기준가) from FunETF (funetf.co.kr) by scraping the product page.
 * Used for Korean fund assets — fund code stored as ticker (e.g. 'K55236CN5311').
 *
 * Returns:
 *   - { price, changePercent } for a valid fund code
 *   - null if the fund code is unknown, page is unavailable, or price cannot be parsed
 *
 * The page is server-side rendered; the NAV appears after the text "기준가(전일대비)".
 */
export async function fetchFunetfNav(fundCode: string): Promise<{ price: number; changePercent: number | null } | null> {
  try {
    const url = `https://www.funetf.co.kr/product/fund/view/${encodeURIComponent(fundCode)}`
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    })
    if (!res.ok) return null

    const html = await res.text()

    // Extract price from the section labeled "기준가(전일대비)"
    // The NAV value appears as digits (with commas and optional decimal) followed by 원
    // We strip tags between the label and the number to handle arbitrary markup
    const sectionMatch = html.match(/기준가\(전일대비\)([\s\S]{0,500})/)
    if (!sectionMatch) return null

    // Price: <span>1,706.09</span>원
    const priceMatch = sectionMatch[1].match(/<span>([\d,]+(?:\.\d+)?)<\/span>원/)
    if (!priceMatch) return null

    const price = parseFloat(priceMatch[1].replace(/,/g, ''))
    if (!price || price <= 0) return null

    // Change direction from class="plus"/"minus", percent from (0.11%) pattern
    const signMatch = sectionMatch[1].match(/class="(plus|minus)"/)
    const sign = signMatch?.[1] === 'minus' ? -1 : 1
    const changePctMatch = sectionMatch[1].match(/\(([\d]+(?:\.\d+)?)\s*%\s*\)/)
    const changePercent = changePctMatch ? sign * parseFloat(changePctMatch[1]) : null

    return { price: Math.round(price), changePercent }
  } catch {
    return null
  }
}
