'use client'
import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PerformanceTable } from '@/components/app/performance-table'
import type { AssetPerformance } from '@/lib/portfolio'

// Next.js serializes Date → string across Server/Client boundary
type SerializedPerformance = Omit<AssetPerformance, 'cachedAt'> & {
  cachedAt: Date | string | null
}

interface PerformanceFilterClientProps {
  rows: SerializedPerformance[]
}

type AssetType = 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate'

const TAB_FILTER: Record<string, AssetType[]> = {
  all: [],
  stocks: ['stock_kr', 'stock_us', 'etf_kr', 'etf_us'],
  crypto: ['crypto'],
  savings: ['savings'],
  real_estate: ['real_estate'],
}

function filterByTab(tab: string, rows: SerializedPerformance[]): SerializedPerformance[] {
  const types = TAB_FILTER[tab]
  if (!types || types.length === 0) return rows
  return rows.filter(r => (types as string[]).includes(r.assetType))
}

export function PerformanceFilterClient({ rows }: PerformanceFilterClientProps) {
  const [activeTab, setActiveTab] = useState('all')
  const filteredRows = filterByTab(activeTab, rows)

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList>
        <TabsTrigger value="all">전체</TabsTrigger>
        <TabsTrigger value="stocks">주식</TabsTrigger>
        <TabsTrigger value="crypto">코인</TabsTrigger>
        <TabsTrigger value="savings">예적금</TabsTrigger>
        <TabsTrigger value="real_estate">부동산</TabsTrigger>
      </TabsList>
      <TabsContent value={activeTab}>
        <PerformanceTable rows={filteredRows} />
      </TabsContent>
    </Tabs>
  )
}
