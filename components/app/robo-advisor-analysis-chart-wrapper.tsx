'use client'

import dynamic from 'next/dynamic'

const RoboAdvisorAnalysisChart = dynamic(
  () =>
    import('@/components/app/robo-advisor-analysis-chart').then(
      (m) => m.RoboAdvisorAnalysisChart,
    ),
  { ssr: false },
)

export { RoboAdvisorAnalysisChart }
