'use client'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMobileSidebar } from '@/components/app/mobile-sidebar-context'

export function HamburgerButton() {
  const { toggle } = useMobileSidebar()
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="lg:hidden text-gray-500 hover:text-gray-800 hover:bg-gray-100 border-0 shrink-0"
      aria-label="메뉴 열기"
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}
