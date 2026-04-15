'use client'
import { useState } from 'react'
import { Pencil, Trash2, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKrw } from '@/lib/portfolio'
import { GoalDialog } from '@/components/app/goal-dialog'
import { DeleteGoalDialog } from '@/components/app/delete-goal-dialog'
import type { GoalRow } from '@/db/queries/goals'

interface GoalListClientProps {
  goals: GoalRow[]
}

export function GoalListClient({ goals }: GoalListClientProps) {
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<GoalRow | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [goalToDelete, setGoalToDelete] = useState<GoalRow | null>(null)

  return (
    <>
      <Card className="ring-border">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />나의 목표
          </CardTitle>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 목표가 없습니다.</p>
          ) : (
            <div className="space-y-0">
              {goals.map((goal, i) => (
                <div
                  key={goal.id}
                  className={`flex items-center gap-4 py-3 ${i < goals.length - 1 ? 'border-b' : ''}`}
                >
                  <span className="flex-1 text-base">{goal.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatKrw(goal.targetAmountKrw)}
                  </span>
                  <span className="text-sm text-muted-foreground">
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
              ))}
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
