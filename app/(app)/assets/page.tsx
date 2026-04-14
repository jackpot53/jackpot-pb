import { redirect } from 'next/navigation'
import { Wallet } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { refreshAllPrices } from '@/app/actions/prices'
import { loadPerformances } from '@/lib/server/load-performances'
import { Separator } from '@/components/ui/separator'
import { AssetsPageClient } from '@/components/app/assets-page-client'
import { AddAssetDialog } from '@/components/app/add-asset-dialog'

export default async function AssetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await refreshAllPrices()
  const { performances } = await loadPerformances(user.id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Wallet className="h-5 w-5" />
          내 자산
        </h1>
        <AddAssetDialog />
      </div>
      <Separator />
      <AssetsPageClient performances={performances} />
    </div>
  )
}
