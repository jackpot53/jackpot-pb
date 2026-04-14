/**
 * Compact KRW formatter for chart Y-axis labels (monthly chart).
 * Per 04-UI-SPEC.md Number Formatting Contract.
 *
 * Thresholds:
 *   >= 100,000,000 → "₩{N.N}억"     e.g. 150M → "₩1.5억"
 *   >=  10,000,000 → "₩{N}천만"     e.g.  50M → "₩5천만"
 *   >=   1,000,000 → "₩{N}백만"     e.g.   5M → "₩5백만"
 *   < 1,000,000    → "₩{N,NNN}"     e.g. 500K → "₩500,000"
 */
export function formatKrwCompact(n: number): string {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000_000) return `₩${Math.round(n / 10_000_000)}천만`
  if (n >= 1_000_000) return `₩${Math.round(n / 1_000_000)}백만`
  return `₩${n.toLocaleString('ko-KR')}`
}

/**
 * Month label formatter for chart X-axis ticks.
 * Per 04-UI-SPEC.md: "YYYY-MM" → "YY.MM"
 * Example: "2025-04" → "25.04"
 */
export function formatMonthLabel(s: string): string {
  // "2025-04" → slice from index 2 → "25-04" → replace '-' with '.' → "25.04"
  return s.slice(2).replace('-', '.')
}
