'use client'

import { useState } from 'react'
import Markdown from 'react-markdown'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type BacktestStats = {
  winRate: number
  sampleCount: number
  avgReturn: number
  medianReturn: number
}

export function RoboAdvisorAiReport({
  ticker,
  stockName,
  sector,
  market,
  currentPrice,
  changePercent,
  changeAmount,
  marketCapKrw,
  triggeredSignals,
  backtestStats,
}: {
  ticker: string
  stockName: string
  sector: string | null
  market: string
  currentPrice: number
  changePercent: number | null
  changeAmount: number | null
  marketCapKrw: number | null
  triggeredSignals: string[]
  backtestStats: Record<string, BacktestStats>
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [report, setReport] = useState<string>('')

  const handleAnalyze = async () => {
    setIsLoading(true)
    setReport('')

    try {
      const response = await fetch(`/api/robo-advisor/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker,
          stockName,
          sector,
          market,
          currentPrice,
          changePercent,
          changeAmount,
          marketCapKrw,
          triggeredSignals,
          backtestStats,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch analysis')
      }

      const reader = response.body?.getReader()
      if (!reader) return

      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk
        setReport(accumulated)
      }
    } catch (error) {
      console.error('Analysis error:', error)
      setReport('분석 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='w-full space-y-4'>
      <Button onClick={handleAnalyze} disabled={isLoading} className='gap-2'>
        {isLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : <Sparkles className='w-4 h-4' />}
        {isLoading ? 'AI 분석 중...' : 'AI 분석 시작'}
      </Button>

      {report && (
        <div className='max-w-none p-4 bg-muted/40 rounded-lg border border-border'>
          <Markdown
            components={{
              h3: (props) => (
                <h3 className='text-base font-semibold text-foreground mt-4 mb-2 first:mt-0' {...props} />
              ),
              h4: (props) => (
                <h4 className='text-sm font-semibold text-foreground mt-3 mb-1' {...props} />
              ),
              p: (props) => (
                <p className='text-sm text-foreground/80 leading-relaxed mb-2 last:mb-0' {...props} />
              ),
              ul: (props) => (
                <ul className='text-sm text-foreground/80 ml-5 space-y-1 mb-2 list-disc' {...props} />
              ),
              li: (props) => <li {...props} />,
              strong: (props) => (
                <strong className='font-semibold text-foreground' {...props} />
              ),
              em: (props) => (
                <em className='italic text-muted-foreground' {...props} />
              ),
            }}
          >
            {report}
          </Markdown>
        </div>
      )}
    </div>
  )
}
