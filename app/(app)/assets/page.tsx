import Link from 'next/link'
import { refreshAllPrices } from '@/app/actions/prices'
import { loadPerformances } from '@/lib/server/load-performances'
import { buttonVariants } from '@/components/ui/button'
import { AssetsPageClient } from '@/components/app/assets-page-client'

export default async function AssetsPage() {
  await refreshAllPrices()
  const { performances } = await loadPerformances()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">내 자산</h1>
        <Link href="/assets/new" className={buttonVariants()}>
          자산 추가
        </Link>
      </div>
      <AssetsPageClient performances={performances} />
    </div>
  )
}
