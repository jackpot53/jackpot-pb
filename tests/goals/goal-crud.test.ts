import { describe, it, expect } from 'vitest'

// Pure functions extracted from the achievement % formula (D-03)
function achievementPct(currentKrw: number, targetKrw: number): number {
  return Math.round((currentKrw / targetKrw) * 100)
}
function progressBarValue(pct: number): number {
  return Math.min(pct, 100)
}

describe('goal achievement %', () => {
  it('returns 100 when current equals target', () => {
    expect(achievementPct(1_000_000, 1_000_000)).toBe(100)
  })
  it('returns 50 when at half target', () => {
    expect(achievementPct(500_000, 1_000_000)).toBe(50)
  })
  it('returns 150 when 50% over target (label shows actual)', () => {
    expect(achievementPct(1_500_000, 1_000_000)).toBe(150)
  })
  it('returns 0 when current is zero', () => {
    expect(achievementPct(0, 1_000_000)).toBe(0)
  })
})

describe('progressBarValue (capped at 100)', () => {
  it('caps at 100 when pct > 100', () => {
    expect(progressBarValue(150)).toBe(100)
  })
  it('returns value unchanged when pct <= 100', () => {
    expect(progressBarValue(80)).toBe(80)
    expect(progressBarValue(100)).toBe(100)
  })
})
