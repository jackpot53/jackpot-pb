import { redirect } from 'next/navigation'
import { PlusCircle } from 'lucide-react'
import { getAuthUser } from '@/utils/supabase/server'
import { NewAssetForm } from '@/components/app/new-asset-form'
import { createAsset } from '@/app/actions/assets'

export default async function NewAssetPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <PlusCircle className="h-5 w-5" />
          자산 추가
        </h1>
        <hr className="mt-3 border-border" />
      </div>
      <NewAssetForm onSubmit={createAsset} />
    </div>
  )
}
