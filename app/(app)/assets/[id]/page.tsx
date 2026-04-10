import { notFound } from 'next/navigation'
import { getAssetById } from '@/db/queries/assets'
import { getTransactionsByAsset } from '@/db/queries/transactions'
import { AssetTypeBadge } from '@/components/app/asset-type-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TransactionsTab } from '@/components/app/transactions-tab'

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [asset, txns] = await Promise.all([
    getAssetById(id),
    getTransactionsByAsset(id),
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
          {/* Wired in Plan 02-04 (manual valuations) */}
          <p className="text-sm text-muted-foreground py-8">개요 준비 중...</p>
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsTab asset={asset} transactions={txns} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
