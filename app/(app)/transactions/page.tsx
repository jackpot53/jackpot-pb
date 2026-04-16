import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { getAllTransactionsWithAsset } from '@/db/queries/transactions'
import { getAssets } from '@/db/queries/assets'
import { fetchSparklinesForTickers } from '@/lib/price/sparkline'
import { getMarketFlow } from '@/lib/market-flow'
import { TransactionsPageClient } from '@/components/app/transactions-page-client'

const NO_SPARKLINE_TYPES = new Set(['fund', 'real_estate', 'savings'])

export default async function TransactionsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const [txns, assets, marketFlow] = await Promise.all([
    getAllTransactionsWithAsset(user.id),
    getAssets(user.id),
    getMarketFlow(),
  ])

  const uniqueTickers = [...new Set(
    txns
      .filter((tx) => tx.ticker && !NO_SPARKLINE_TYPES.has(tx.assetType))
      .map((tx) => tx.ticker!)
  )]
  const sparklineMap = await fetchSparklinesForTickers(uniqueTickers)
  const sparklines = Object.fromEntries(sparklineMap)

  const assetOptions = assets.map((a) => ({ id: a.id, name: a.name, assetType: a.assetType, currency: a.currency }))

  return (
    <div className="space-y-4">
      <TransactionsPageClient transactions={txns} assetOptions={assetOptions} sparklines={sparklines} marketFlow={marketFlow} />
    </div>
  )
}
