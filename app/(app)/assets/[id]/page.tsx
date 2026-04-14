import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getAssetById } from '@/db/queries/assets'
import { getTransactionsByAsset } from '@/db/queries/transactions'
import { getValuationsByAsset } from '@/db/queries/manual-valuations'
import { getHoldingByAssetId } from '@/db/queries/holdings'
import { AssetTypeBadge } from '@/components/app/asset-type-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TransactionsTab } from '@/components/app/transactions-tab'
import { OverviewTab } from '@/components/app/overview-tab'

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [asset, txns, valuations, holding] = await Promise.all([
    getAssetById(id, user.id),
    getTransactionsByAsset(id),
    getValuationsByAsset(id, user.id),
    getHoldingByAssetId(id),
  ])
  if (!asset) notFound()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{asset.name}</h1>
        <AssetTypeBadge assetType={asset.assetType} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="transactions">거래내역</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab asset={asset} valuations={valuations} holding={holding} />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsTab asset={asset} transactions={txns} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
