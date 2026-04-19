'use client'
import { useState } from 'react'
import { DatabaseZap, Loader2, CheckCircle2 } from 'lucide-react'
import { takeSnapshot } from '@/app/actions/snapshot'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export function TakeSnapshotButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const router = useRouter()

  async function handleClick() {
    setState('loading')
    const result = await takeSnapshot()
    if (result.ok) {
      setState('done')
      setTimeout(() => {
        router.refresh()
        setState('idle')
      }, 1200)
    } else {
      setState('error')
      setTimeout(() => setState('idle'), 2500)
    }
  }

  return (
    <button
      data-component="TakeSnapshotButton"
      onClick={handleClick}
      disabled={state === 'loading' || state === 'done'}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all',
        state === 'idle' && 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
        state === 'loading' && 'bg-muted border-border text-muted-foreground cursor-wait',
        state === 'done' && 'bg-emerald-50 border-emerald-200 text-emerald-700',
        state === 'error' && 'bg-red-50 border-red-200 text-red-600',
      )}
    >
      {state === 'loading' && <Loader2 className="h-3 w-3 animate-spin" />}
      {state === 'done' && <CheckCircle2 className="h-3 w-3" />}
      {(state === 'idle' || state === 'error') && <DatabaseZap className="h-3 w-3" />}
      {state === 'idle' && '스냅샷 저장'}
      {state === 'loading' && '저장 중...'}
      {state === 'done' && '저장 완료'}
      {state === 'error' && '저장 실패'}
    </button>
  )
}
