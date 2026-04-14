import { redirect } from 'next/navigation'

// Root page redirects to /assets which is handled by app/(app)/layout.tsx with auth guard.
export default function RootPage() {
  redirect('/assets')
}
