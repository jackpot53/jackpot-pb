import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { ArrowLeftRight } from 'lucide-react'
import { getAuthUser } from '@/utils/supabase/server'
import { getAllTransactionsWithAsset } from '@/db/queries/transactions'
import { getAssets } from '@/db/queries/assets'
import { TransactionsPageClient } from '@/components/app/transactions-page-client'
import { PageHeader } from '@/components/app/page-header'

export default async function TransactionsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ArrowLeftRight}
        title="거래내역"
        description="매수·매도 기록을 확인하고 관리합니다"
      />
      <Suspense fallback={<div className="h-96 rounded-2xl bg-muted/40 animate-pulse" />}>
        <TransactionsContent userId={user.id} />
      </Suspense>
    </div>
  )
}

async function TransactionsContent({ userId }: { userId: string }) {
  const [txns, assets] = await Promise.all([
    getAllTransactionsWithAsset(userId),
    getAssets(userId),
  ])

  const assetOptions = assets.map((a) => ({ id: a.id, name: a.name, assetType: a.assetType, currency: a.currency }))

  return (
    <TransactionsPageClient transactions={txns} assetOptions={assetOptions} />
  )
}
