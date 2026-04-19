import { notFound, redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { getAssetById } from '@/db/queries/assets'
import { getHoldingByAssetId } from '@/db/queries/holdings'
import { getContributionDividendRates } from '@/db/queries/contribution'
import { AssetForm } from '@/components/app/asset-form'
import { updateAsset } from '@/app/actions/assets'
import type { ContributionDividendRateRow } from '@/db/schema/contribution-dividend-rates'

function decodeQuantity(stored: number): string {
  const intPart = Math.floor(stored / 1e8)
  const fracPart = stored % 1e8
  if (fracPart === 0) return intPart.toString()
  return `${intPart}.${fracPart.toString().padStart(8, '0').replace(/0+$/, '')}`
}

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await getAuthUser()
  if (!user) redirect('/login')

  const [asset, holding, dividendRatesMap] = await Promise.all([
    getAssetById(id, user.id),
    getHoldingByAssetId(id),
    getContributionDividendRates([id]),
  ])
  if (!asset) notFound()

  const contributionDividendRates: ContributionDividendRateRow[] =
    asset.assetType === 'contribution' ? (dividendRatesMap.get(id) ?? []) : []

  const holdingDefaults = holding && holding.totalQuantity > 0
    ? {
        initialQuantity: decodeQuantity(holding.totalQuantity),
        initialPricePerUnit: holding.avgCostPerUnit.toString(),
      }
    : {}

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{asset.name} 수정</h1>
      <AssetForm
        defaultValues={{ ...asset, ...holdingDefaults }}
        onSubmit={updateAsset.bind(null, id)}
        submitLabel="자산 수정"
        showInitialTransaction
        transactionSectionLabel="매수 추가 (선택)"
        contributionDividendRates={contributionDividendRates}
        assetId={id}
      />
    </div>
  )
}
