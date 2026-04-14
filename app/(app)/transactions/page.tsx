import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getAllTransactionsWithAsset } from '@/db/queries/transactions'
import { getAssets } from '@/db/queries/assets'
import { TransactionsPageClient } from '@/components/app/transactions-page-client'

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [txns, assets] = await Promise.all([
    getAllTransactionsWithAsset(user.id),
    getAssets(user.id),
  ])

  const assetOptions = assets.map((a) => ({ id: a.id, name: a.name, assetType: a.assetType, currency: a.currency }))

  return (
    <div className="space-y-4">
      <TransactionsPageClient transactions={txns} assetOptions={assetOptions} />
    </div>
  )
}
