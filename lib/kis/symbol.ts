/**
 * Yahoo Finance 티커 형식 → KIS 6자리 종목코드 변환.
 * 한국 종목(.KS/.KQ)이 아니면 null 반환 → 호출부에서 KIS 미적용 신호.
 */
export function toKisCode(yahooTicker: string): string | null {
  if (yahooTicker.endsWith('.KS') || yahooTicker.endsWith('.KQ')) {
    return yahooTicker.replace(/\.(KS|KQ)$/, '')
  }
  return null
}
