import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { RoboAdvisorPageClient } from '@/components/app/robo-advisor-page-client'
import { RoboAdvisorHero } from '@/components/app/robo-advisor-hero'

export default async function StockSignalPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <RoboAdvisorHero />
      <RoboAdvisorPageClient />
    </div>
  )
}
