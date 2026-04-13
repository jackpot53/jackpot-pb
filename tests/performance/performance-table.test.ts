import { describe, it, expect } from 'vitest'

type AssetType = 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate'

interface MinimalRow {
  assetId: string
  assetType: AssetType
  returnPct: number
}

const TAB_FILTER: Record<string, AssetType[]> = {
  all: [],
  stocks: ['stock_kr', 'stock_us', 'etf_kr', 'etf_us'],
  crypto: ['crypto'],
  savings: ['savings'],
  real_estate: ['real_estate'],
}

function filterByTab(tab: string, rows: MinimalRow[]): MinimalRow[] {
  const types = TAB_FILTER[tab]
  if (!types || types.length === 0) return rows
  return rows.filter(r => (types as string[]).includes(r.assetType))
}

const mockRows: MinimalRow[] = [
  { assetId: '1', assetType: 'stock_kr',    returnPct: 10 },
  { assetId: '2', assetType: 'stock_us',    returnPct: 8  },
  { assetId: '3', assetType: 'etf_kr',      returnPct: 5  },
  { assetId: '4', assetType: 'etf_us',      returnPct: 3  },
  { assetId: '5', assetType: 'crypto',      returnPct: 25 },
  { assetId: '6', assetType: 'savings',     returnPct: 4  },
  { assetId: '7', assetType: 'real_estate', returnPct: 6  },
]

describe('filterByTab', () => {
  it('returns all rows when tab is "all"', () => {
    expect(filterByTab('all', mockRows)).toHaveLength(7)
  })
  it('returns only stock types for "stocks" tab', () => {
    const result = filterByTab('stocks', mockRows)
    expect(result).toHaveLength(4)
    result.forEach(r => expect(['stock_kr', 'stock_us', 'etf_kr', 'etf_us']).toContain(r.assetType))
  })
  it('returns only crypto for "crypto" tab', () => {
    const result = filterByTab('crypto', mockRows)
    expect(result).toHaveLength(1)
    expect(result[0].assetType).toBe('crypto')
  })
  it('returns only savings for "savings" tab', () => {
    const result = filterByTab('savings', mockRows)
    expect(result).toHaveLength(1)
    expect(result[0].assetType).toBe('savings')
  })
  it('returns only real_estate for "real_estate" tab', () => {
    const result = filterByTab('real_estate', mockRows)
    expect(result).toHaveLength(1)
    expect(result[0].assetType).toBe('real_estate')
  })
  it('returns empty array when no rows match the tab', () => {
    expect(filterByTab('crypto', [])).toHaveLength(0)
  })
  it('returns all rows for unknown tab (fallback to all)', () => {
    expect(filterByTab('unknown_tab', mockRows)).toHaveLength(7)
  })
})
