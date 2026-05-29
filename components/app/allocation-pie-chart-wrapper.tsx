'use client'
import dynamic from 'next/dynamic'
import type { AllocationSlice } from '@/components/app/allocation-pie-chart'

const AllocationPieChart = dynamic(
  () => import('@/components/app/allocation-pie-chart').then((m) => m.AllocationPieChart),
  {
    ssr: false,
    loading: () => <div className="w-full h-[300px] animate-pulse bg-muted/40 rounded-xl" />,
  },
)

export { AllocationPieChart }
export type { AllocationSlice }
