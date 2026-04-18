'use client'

import { useState } from 'react'
import Markdown from 'react-markdown'

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
      <button
        onClick={handleAnalyze}
        disabled={isLoading}
        className='px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:bg-gray-400 transition'
      >
        {isLoading ? 'AI 분석 중...' : 'AI 분석 시작'}
      </button>

      {report && (
        <div className='prose prose-sm max-w-none p-4 bg-gray-50 rounded border border-gray-200'>
          <Markdown
            components={{
              h3: ({ node, ...props }) => (
                <h3 className='text-lg font-bold mt-4 mb-2' {...props} />
              ),
              h4: ({ node, ...props }) => (
                <h4 className='text-base font-bold mt-3 mb-1' {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className='text-sm text-gray-700 mb-2' {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className='text-sm text-gray-700 ml-4 space-y-1' {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className='list-disc' {...props} />
              ),
              strong: ({ node, ...props }) => (
                <strong className='font-bold text-gray-900' {...props} />
              ),
              em: ({ node, ...props }) => (
                <em className='italic text-gray-600' {...props} />
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
