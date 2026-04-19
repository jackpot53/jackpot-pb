'use client'
import { useState } from 'react'
import { PenLine } from 'lucide-react'
import { UpdateCreateForm } from '@/components/app/update-create-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function UpdateAdminSection() {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex justify-end">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors border border-gray-200 hover:border-indigo-300 rounded-lg px-3 py-1.5 bg-white hover:bg-indigo-50">
            <PenLine className="h-3.5 w-3.5" />
            게시글 작성
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-lg bg-white text-gray-900 ring-gray-200">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="text-base text-gray-900 flex items-center gap-2">
              <PenLine className="h-4 w-4 text-indigo-500" />
              새 업데이트 작성
            </DialogTitle>
          </DialogHeader>
          <UpdateCreateForm onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
