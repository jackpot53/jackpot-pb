import { AssetForm } from '@/components/app/asset-form'
import { createAsset } from '@/app/actions/assets'

export default function NewAssetPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">자산 추가</h1>
      <AssetForm onSubmit={createAsset} submitLabel="자산 저장" />
    </div>
  )
}
