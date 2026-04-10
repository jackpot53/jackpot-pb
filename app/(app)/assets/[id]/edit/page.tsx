import { notFound } from 'next/navigation'
import { getAssetById } from '@/db/queries/assets'
import { AssetForm } from '@/components/app/asset-form'
import { updateAsset } from '@/app/actions/assets'

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const asset = await getAssetById(id)
  if (!asset) notFound()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{asset.name} 수정</h1>
      <AssetForm
        defaultValues={asset}
        onSubmit={(data) => updateAsset(id, data)}
        submitLabel="자산 저장"
      />
    </div>
  )
}
