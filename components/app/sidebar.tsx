'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: '대시보드', href: '/' },
  { label: '자산', href: '/assets' },
  { label: '거래내역', href: '/transactions' },
  { label: '차트', href: '/charts' },
  { label: '목표', href: '/goals' },
  { label: '성과', href: '/performance' },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-60 h-screen bg-sidebar border-r border-border flex flex-col shrink-0">
      <div className="px-6 py-5">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          투자 관리
        </span>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center px-3 py-2 rounded-md text-sm transition-colors',
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'text-foreground hover:bg-muted'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
