import { describe, it, expect } from 'vitest'

function computeContributionValue(
  principal: number,
  dividendRates: Array<{ year: number; rateBp: number }>,
  currentYear: number,
): { currentValueKrw: number; returnPct: number } {
  const cumulativeDividends = dividendRates
    .filter(r => r.year <= currentYear)
    .reduce((sum, r) => sum + Math.round(principal * r.rateBp / 1_000_000), 0)
  const currentValueKrw = principal + cumulativeDividends
  const returnPct = principal > 0 ? ((currentValueKrw - principal) / principal) * 100 : 0
  return { currentValueKrw, returnPct }
}

describe('computeContributionValue', () => {
  it('원금만 있고 배당 이력 없으면 currentValueKrw = principal', () => {
    const result = computeContributionValue(1_000_000, [], 2026)
    expect(result.currentValueKrw).toBe(1_000_000)
    expect(result.returnPct).toBe(0)
  })

  it('단일 연도 3.5% 배당 적용', () => {
    const result = computeContributionValue(
      1_000_000,
      [{ year: 2025, rateBp: 35_000 }],
      2026,
    )
    expect(result.currentValueKrw).toBe(1_035_000)
    expect(result.returnPct).toBeCloseTo(3.5, 5)
  })

  it('2개 연도 배당 누적', () => {
    const result = computeContributionValue(
      1_000_000,
      [
        { year: 2024, rateBp: 30_000 },
        { year: 2025, rateBp: 35_000 },
      ],
      2026,
    )
    expect(result.currentValueKrw).toBe(1_065_000)
  })

  it('미래 연도 배당은 포함하지 않음', () => {
    const result = computeContributionValue(
      1_000_000,
      [
        { year: 2025, rateBp: 35_000 },
        { year: 2027, rateBp: 40_000 },
      ],
      2026,
    )
    expect(result.currentValueKrw).toBe(1_035_000)
  })

  it('원금 0이면 returnPct = 0 (나눗셈 안전)', () => {
    const result = computeContributionValue(0, [], 2026)
    expect(result.returnPct).toBe(0)
  })
})
