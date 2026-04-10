'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    // Log for observability; still redirect so the user is not stuck.
    console.error('[signOut] Supabase error:', error.message)
  }
  redirect('/login')
}
