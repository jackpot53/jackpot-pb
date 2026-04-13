/**
 * Fetches USD/KRW exchange rate from Bank of Korea ECOS API.
 * Returns the rate as an integer × 10000 for lossless integer storage (D-17).
 * Example: rate 1356.5 → returned as 13565000.
 *
 * ECOS stat code: 036Y001 (외환 - 환율)
 * Item code: 0000001 (미국 달러 기준환율)
 *
 * BOK API key must be registered at: https://ecos.bok.or.kr → 인증키 신청
 * Registration takes up to 1 business day. Without a key, function returns null
 * and the caller preserves the existing stale cache entry (D-09).
 */
export async function fetchBokFxRate(): Promise<number | null> {
  const apiKey = process.env.BOK_API_KEY
  if (!apiKey) return null

  const BOK_STAT_CODE = '036Y001'
  const BOK_ITEM_CODE = '0000001'

  try {
    // BOK ECOS API format: /StatisticSearch/{apiKey}/json/kr/{startCount}/{endCount}/{statCode}/{cycle}/{startDate}/{endDate}/{itemCode}
    // Using 'D' (daily) cycle. Start/end date = today's YYYYMMDD.
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const url = `https://ecos.bok.or.kr/api/StatisticSearch/${encodeURIComponent(apiKey)}/json/kr/1/1/${BOK_STAT_CODE}/D/${today}/${today}/${BOK_ITEM_CODE}`

    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null

    const data = await res.json()
    const value = data?.StatisticSearch?.row?.[0]?.DATA_VALUE
    if (!value) return null

    // Parse to float (e.g. "1356.5"), then store as integer × 10000
    const rate = parseFloat(value)
    if (isNaN(rate) || rate <= 0) return null

    return Math.round(rate * 10000)  // 1356.5 → 13565000
  } catch {
    return null
  }
}
