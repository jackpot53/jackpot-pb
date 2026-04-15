import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getAllTransactionsWithAsset } from '@/db/queries/transactions'
import { getAssets } from '@/db/queries/assets'
import { fetchSparklinesForTickers } from '@/lib/price/sparkline'
import { TransactionsPageClient } from '@/components/app/transactions-page-client'

const NO_SPARKLINE_TYPES = new Set(['fund', 'real_estate', 'savings'])

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [txns, assets] = await Promise.all([
    getAllTransactionsWithAsset(user.id),
    getAssets(user.id),
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
      <TransactionsPageClient transactions={txns} assetOptions={assetOptions} sparklines={sparklines} />
    </div>
  )
}
