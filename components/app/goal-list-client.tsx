'use client'
import { useState, useEffect } from 'react'

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}
import { Pencil, Trash2, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatKrw } from '@/lib/portfolio'
import { GoalDialog } from '@/components/app/goal-dialog'
import { DeleteGoalDialog } from '@/components/app/delete-goal-dialog'
import type { GoalRow } from '@/db/queries/goals'

interface GoalListClientProps {
  goals: GoalRow[]
}

export function GoalListClient({ goals }: GoalListClientProps) {
  const reducedMotion = useReducedMotion()
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<GoalRow | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [goalToDelete, setGoalToDelete] = useState<GoalRow | null>(null)

  return (
    <>
      <Card className="h-full shadow-sm">
        <CardHeader className="pb-4 rounded-tl-[calc(var(--radius)-1px)]">
          <CardTitle className="flex items-center gap-2 text-blue-400">
            <Target className="h-4 w-4" />나의 목표
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">달성하고 싶은 자산 목표를 관리합니다</p>
        </CardHeader>
        <Separator />
        <CardContent>
          {goals.length === 0 ? (
            <div className="space-y-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`flex items-center gap-3 py-3 ${i < 2 ? 'border-b' : ''}`}>
                  <Skeleton className="h-4 flex-1" style={{ opacity: 1 - i * 0.25 }} />
                  <Skeleton className="h-4 w-20" style={{ opacity: 1 - i * 0.25 }} />
                  <Skeleton className="h-4 w-16" style={{ opacity: 1 - i * 0.25 }} />
                  <Skeleton className="h-7 w-7 rounded-md" style={{ opacity: 0.3 }} />
                  <Skeleton className="h-7 w-7 rounded-md" style={{ opacity: 0.3 }} />
                </div>
              ))}
              <div className="flex flex-col items-center gap-2 py-5">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/15"
                  style={reducedMotion ? {} : { animation: 'goal-bounce 2s ease-in-out infinite' }}
                >
                  <Target className="h-5 w-5 text-blue-400" />
                </div>
                <p
                  className="text-sm font-medium text-foreground/70"
                  style={reducedMotion ? {} : { animation: 'goal-fadein 0.6s ease-out both' }}
                >
                  목표를 추가해보세요
                </p>
                <p
                  className="text-xs text-muted-foreground"
                  style={reducedMotion ? {} : { animation: 'goal-fadein 0.6s 0.15s ease-out both' }}
                >
                  상단 + 버튼으로 첫 목표를 만들어보세요
                </p>
              </div>
              <style>{`
                @keyframes goal-bounce {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-5px); }
                }
                @keyframes goal-fadein {
                  from { opacity: 0; transform: translateY(4px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </div>
          ) : (
            <div className="space-y-0">
              {goals.map((goal, i) => {
                const colors = [
                  'bg-blue-500',
                  'bg-violet-500',
                  'bg-emerald-500',
                  'bg-amber-500',
                  'bg-rose-500',
                  'bg-cyan-500',
                ]
                const color = colors[i % colors.length]
                return (
                  <div
                    key={goal.id}
                    className={`flex items-center gap-3 py-3 ${i < goals.length - 1 ? 'border-b' : ''}`}
                  >
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold shrink-0 ${color}`}>
                      {i + 1}
                    </span>
                    <span className="flex-1 text-base font-medium">{goal.name}</span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {formatKrw(goal.targetAmountKrw)}
                    </span>
                    <span className="text-xs text-muted-foreground/70 tabular-nums hidden sm:block">
                      {goal.targetDate ?? '—'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2"
                      aria-label="목표 수정"
                      onClick={() => {
                        setSelectedGoal(goal)
                        setDialogMode('edit')
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2"
                      aria-label="목표 삭제"
                      onClick={() => {
                        setGoalToDelete(goal)
                        setDeleteOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <GoalDialog
        key={dialogMode ?? 'closed'}
        mode={dialogMode === 'edit' ? 'edit' : 'create'}
        goal={selectedGoal ?? undefined}
        open={dialogMode !== null}
        onOpenChange={(v) => {
          if (!v) setDialogMode(null)
        }}
      />

      <DeleteGoalDialog
        goalId={goalToDelete?.id ?? ''}
        goalName={goalToDelete?.name ?? ''}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
