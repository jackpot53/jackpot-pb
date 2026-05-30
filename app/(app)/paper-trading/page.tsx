import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'

export default async function PaperTradingPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return null
}
