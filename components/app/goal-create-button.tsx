'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { GoalDialog } from '@/components/app/goal-dialog'

export function GoalCreateButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="default" onClick={() => setOpen(true)}>
        목표 추가
      </Button>
      <GoalDialog
        key={open ? 'open' : 'closed'}
        mode="create"
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
