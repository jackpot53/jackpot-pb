import { getAllTransactionsWithAsset } from '@/db/queries/transactions'
import { getAssets } from '@/db/queries/assets'
import { TransactionsPageClient } from '@/components/app/transactions-page-client'

export default async function TransactionsPage() {
  const [txns, assets] = await Promise.all([
    getAllTransactionsWithAsset(),
    getAssets(),
  ])

  const assetOptions = assets.map((a) => ({ id: a.id, name: a.name, assetType: a.assetType, currency: a.currency }))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">거래내역</h1>
      <TransactionsPageClient transactions={txns} assetOptions={assetOptions} />
    </div>
  )
}
