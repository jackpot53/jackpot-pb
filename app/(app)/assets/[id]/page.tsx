import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { getAssetById } from '@/db/queries/assets'
import { getValuationsByAsset } from '@/db/queries/manual-valuations'
import { getHoldingByAssetId } from '@/db/queries/holdings'
import { AssetTypeBadge } from '@/components/app/asset-type-badge'
import { OverviewTab } from '@/components/app/overview-tab'

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const [asset, valuations, holding] = await Promise.all([
    getAssetById(id, user.id),
    getValuationsByAsset(id, user.id),
    getHoldingByAssetId(id),
  ])
  if (!asset) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{asset.name}</h1>
        <AssetTypeBadge assetType={asset.assetType} />
      </div>

      <OverviewTab asset={asset} valuations={valuations} holding={holding} />
    </div>
  )
}
