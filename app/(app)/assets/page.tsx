import Link from 'next/link'
import { Wallet, PlusCircle } from 'lucide-react'
import { refreshAllPrices } from '@/app/actions/prices'
import { loadPerformances } from '@/lib/server/load-performances'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AssetsPageClient } from '@/components/app/assets-page-client'

export default async function AssetsPage() {
  await refreshAllPrices()
  const { performances } = await loadPerformances()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Wallet className="h-5 w-5" />
          내 자산
        </h1>
        <Link href="/assets/new" className={buttonVariants()}>
          <PlusCircle className="h-4 w-4 mr-1.5" />자산 추가
        </Link>
      </div>
      <Separator />
      <AssetsPageClient performances={performances} />
    </div>
  )
}
