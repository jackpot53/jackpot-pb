import Image from 'next/image'
import { createClient } from '@/utils/supabase/server'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center select-none">
        <div className="overflow-hidden rounded-lg">
          <Image src="/logo.jpg" alt="77잭팟 로고" width={80} height={40} className="object-cover" />
        </div>
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
