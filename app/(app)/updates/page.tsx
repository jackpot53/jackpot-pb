import { getUpdates } from '@/db/queries/updates'
import { createClient } from '@/utils/supabase/server'
import { UpdateAdminSection } from '@/components/app/update-admin-toggle'
import { UpdatesFeed } from '@/components/app/updates-feed'
import { AnimatedLogo } from '@/components/app/animated-logo'

const ADMIN_EMAIL = 'shuaihan77@gmail.com'

export default async function UpdatesPage() {
  const supabase = await createClient()
  const [items, { data: { user } }] = await Promise.all([
    getUpdates(),
    supabase.auth.getUser(),
  ])
  const isAdmin = user?.email === ADMIN_EMAIL


  return (
    <div className="space-y-6 [font-family:var(--font-sunflower)]">
      {/* 히어로 배너 */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-950 via-[#1a1535] to-[#0f0f1a] px-6 py-4 sm:px-8 sm:py-5 text-white">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight leading-tight">업데이트 내역</h1>
            <p className="text-indigo-100/60 text-sm">새로운 기능과 개선사항을 기록합니다</p>
          </div>
          <div className="flex-none hidden sm:block">
            <AnimatedLogo size={64} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-900 shadow-sm p-6 sm:p-8 space-y-6">
        {items.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center text-gray-400">
            아직 업데이트 내역이 없습니다.
          </div>
        ) : (
          <UpdatesFeed items={items} />
        )}

        {isAdmin && <UpdateAdminSection />}
      </div>
    </div>
  )
}
