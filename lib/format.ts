const KRW_GROUP = new Intl.NumberFormat('ko-KR')

/**
 * KRW 숫자 포맷 (통화 기호 없음): 1234567 → "1,234,567"
 * 통화 기호(₩) 포함이 필요하면 `lib/portfolio.ts`의 `formatKrw` 사용.
 */
export function formatKrwPlain(value: number): string {
  return KRW_GROUP.format(value)
}

/** 소수점을 정수로 반올림 후 포맷: 1234.7 → "1,235" */
export function formatKrwRounded(value: number): string {
  return KRW_GROUP.format(Math.round(value))
}

/**
 * 큰 금액 단축 포맷: 1억 이상은 "1.2억", 1만 이상은 "1234만",
 * 그 미만은 로케일 포맷 그대로. 음수도 지원.
 */
export function formatKrwShort(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e8) return `${(value / 1e8).toFixed(1)}억`
  if (abs >= 1e4) return `${(value / 1e4).toFixed(0)}만`
  return value.toLocaleString()
}

/**
 * 저장된 수량(internal: × 1e8 정수)을 표시 문자열로 변환.
 * 정수 자릿수는 옵션에 따라 콤마 분리.
 * 소수부는 최대 8자리, 끝의 0은 잘라냄.
 */
export function decodeQuantity(
  stored: number,
  options: { grouping?: boolean } = {},
): string {
  const { grouping = false } = options
  const intPart = Math.floor(stored / 1e8)
  const fracPart = stored % 1e8
  const intStr = grouping ? KRW_GROUP.format(intPart) : intPart.toString()
  if (fracPart === 0) return intStr
  const fracStr = fracPart.toString().padStart(8, '0').replace(/0+$/, '')
  return `${intStr}.${fracStr}`
}
