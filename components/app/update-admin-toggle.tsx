'use client'
import { useState } from 'react'
import { PenLine } from 'lucide-react'
import { UpdateCreateForm } from '@/components/app/update-create-form'

export function UpdateAdminSection() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors border border-border hover:border-indigo-500/50 rounded-lg px-3 py-1.5 bg-card hover:bg-indigo-500/5"
      >
        <PenLine className="h-3.5 w-3.5" />
        게시글 작성
        <span className={`transition-transform duration-200 text-muted-foreground/50 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="mt-3">
          <UpdateCreateForm />
        </div>
      )}
    </div>
  )
}
