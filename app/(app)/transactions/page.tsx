import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { getAllTransactionsWithAsset } from '@/db/queries/transactions'
import { getAssets } from '@/db/queries/assets'
import { getMarketFlow } from '@/lib/market-flow'
import { TransactionsPageClient } from '@/components/app/transactions-page-client'

export default async function TransactionsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-4">
      <Suspense fallback={<div className="h-96 rounded-2xl bg-muted/40 animate-pulse" />}>
        <TransactionsContent userId={user.id} />
      </Suspense>
    </div>
  )
}

async function TransactionsContent({ userId }: { userId: string }) {
  const [txns, assets, marketFlow] = await Promise.all([
    getAllTransactionsWithAsset(userId),
    getAssets(userId),
    getMarketFlow(),
  ])

  const assetOptions = assets.map((a) => ({ id: a.id, name: a.name, assetType: a.assetType, currency: a.currency }))

  // sparklines are fetched client-side via /api/sparklines to avoid blocking server TTFB
  return (
    <TransactionsPageClient transactions={txns} assetOptions={assetOptions} marketFlow={marketFlow} />
  )
}
