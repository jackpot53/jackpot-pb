'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

function safeRedirectPath(path: string): string {
  // Allow only relative paths that start with / (but not //)
  if (!path.startsWith('/') || path.startsWith('//')) return '/'
  return path
}

export async function signIn(email: string, password: string, redirectPath: string = '/') {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: error.message }
  }
  redirect(safeRedirectPath(redirectPath))
}
