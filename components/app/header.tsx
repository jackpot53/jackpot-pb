import { createClient } from '@/utils/supabase/server'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2 select-none">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground font-black text-sm leading-none">
          77
        </div>
        <span className="text-base font-black tracking-tight text-foreground">잭팟</span>
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-muted-foreground">{user.email}</span>
        )}
        <form action={signOut}>
          <Button variant="outline" size="sm" type="submit">
            <LogOut className="h-4 w-4 mr-1.5" />로그아웃
          </Button>
        </form>
      </div>
    </header>
  )
}
