'use client'
import dynamic from 'next/dynamic'

const GoalAchievementChart = dynamic(
  () => import('@/components/app/goal-achievement-chart').then((m) => m.GoalAchievementChart),
  {
    ssr: false,
    loading: () => <div className="w-full h-[300px] animate-pulse bg-muted/40 rounded-xl" />,
  },
)

export { GoalAchievementChart }
