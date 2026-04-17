'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Wallet,
  ArrowLeftRight,
  LineChart,
  Target,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: '목표', href: '/goals', icon: Target },
  { label: '자산', href: '/assets', icon: Wallet },
  { label: '거래내역', href: '/transactions', icon: ArrowLeftRight },
  { label: '차트', href: '/charts', icon: LineChart },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 transition-[width,border] duration-300 overflow-hidden',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      <div
        className={cn(
          'flex items-center py-5',
          collapsed ? 'justify-center px-2' : 'px-6 justify-between'
        )}
      >
        {!collapsed && (
          <span className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider whitespace-nowrap">
            투자 관리
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors shrink-0 rounded"
          aria-label={collapsed ? '펼치기' : '접기'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 px-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-md',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && (
                <span className="whitespace-nowrap">{item.label}</span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
