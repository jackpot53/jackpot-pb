'use client'
import dynamic from 'next/dynamic'

const GoalProgressChart = dynamic(
  () => import('@/components/app/goal-progress-chart').then((m) => m.GoalProgressChart),
  {
    ssr: false,
    loading: () => <div className="w-full h-[240px] animate-pulse bg-muted/40 rounded-xl" />,
  },
)

export { GoalProgressChart }
