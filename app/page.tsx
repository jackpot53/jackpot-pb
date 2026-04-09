import { Button } from '@/components/ui/button'
import { signOut } from '@/app/actions/auth'

// Authenticated placeholder — Phase 3 will replace this with the dashboard.
export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="flex justify-end p-4">
        <form action={signOut}>
          <Button type="submit" variant="outline">
            로그아웃
          </Button>
        </form>
      </div>
    </main>
  )
}
