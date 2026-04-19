'use client'

import { useTransition } from 'react'
import { startPaperTrading } from '@/app/actions/paper-trading'

export function StartPaperTradingButton({ ticker }: { ticker: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useTransition()

  const handleClick = () => {
    setError(async () => {
      const result = await startPaperTrading(ticker)
      if (result?.error) {
        console.error(result.error)
      }
    })
  }

  return (
    <div data-component="StartPaperTradingButton" className='space-y-2'>
      <button
        onClick={() => startTransition(handleClick)}
        disabled={isPending}
        className='px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:bg-gray-400 transition'
      >
        {isPending ? '처리 중...' : '모의투자 시작'}
      </button>
    </div>
  )
}
