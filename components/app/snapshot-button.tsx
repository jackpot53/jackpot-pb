'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { takeSnapshot } from '@/app/actions/snapshot'

export function SnapshotButton() {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const router = useRouter()

  function handleClick() {
    setDone(false)
    startTransition(async () => {
      const result = await takeSnapshot()
      if (result.ok) {
        toast.success(`스냅샷 완료 (${result.snapshotDate})`)
        setDone(true)
        router.refresh()
      } else {
        toast.error(`스냅샷 실패: ${result.error}`)
      }
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : done ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Camera className="h-4 w-4" />
      )}
      <span className="ml-1.5">{isPending ? '스냅샷 중…' : '스냅샷'}</span>
    </Button>
  )
}
