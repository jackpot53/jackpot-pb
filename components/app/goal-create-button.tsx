'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { GoalDialog } from '@/components/app/goal-dialog'

export function GoalCreateButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        data-component="GoalCreateButton"
        onClick={() => setOpen(true)}
        className="group relative flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/25 text-white text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-white/10 active:scale-95"
      >
        <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
        목표 추가
      </button>
      <GoalDialog
        key={open ? 'open' : 'closed'}
        mode="create"
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
