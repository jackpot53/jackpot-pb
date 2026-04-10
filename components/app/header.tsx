import { createClient } from '@/utils/supabase/server'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-end px-6 gap-4 shrink-0">
      {user && (
        <span className="text-sm text-muted-foreground">{user.email}</span>
      )}
      <form action={signOut}>
        <Button variant="outline" size="sm" type="submit">
          로그아웃
        </Button>
      </form>
    </header>
  )
}
