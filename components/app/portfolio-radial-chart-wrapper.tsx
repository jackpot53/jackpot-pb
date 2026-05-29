'use client'
import dynamic from 'next/dynamic'
import type { AllocationItem } from '@/components/app/portfolio-radial-chart'

const PortfolioRadialChart = dynamic(
  () => import('@/components/app/portfolio-radial-chart').then((m) => m.PortfolioRadialChart),
  {
    ssr: false,
    loading: () => <div className="w-full h-[300px] animate-pulse bg-muted/40 rounded-xl" />,
  },
)

export { PortfolioRadialChart }
export type { AllocationItem }
