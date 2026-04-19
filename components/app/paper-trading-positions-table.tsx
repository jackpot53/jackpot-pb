import type { paperTradingPositions } from '@/db/schema/paper-trading-positions'

type Position = typeof paperTradingPositions.$inferSelect

export function PaperTradingPositionsTable({
  positions,
}: {
  positions: Position[]
}) {
  if (positions.length === 0) {
    return (
      <div data-component="PaperTradingPositionsTable" className='text-center py-8 text-gray-500'>
        보유 포지션이 없습니다.
      </div>
    )
  }

  return (
    <div data-component="PaperTradingPositionsTable" className='overflow-x-auto'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='border-b border-gray-200'>
            <th className='px-4 py-2 text-left font-semibold text-gray-700'>
              종목명
            </th>
            <th className='px-4 py-2 text-left font-semibold text-gray-700'>
              티커
            </th>
            <th className='px-4 py-2 text-right font-semibold text-gray-700'>
              진입가
            </th>
            <th className='px-4 py-2 text-left font-semibold text-gray-700'>
              진입일
            </th>
            <th className='px-4 py-2 text-right font-semibold text-gray-700'>
              수량
            </th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => (
            <tr key={position.id} className='border-b border-gray-100'>
              <td className='px-4 py-2 text-gray-900 font-medium'>
                {position.stockName}
              </td>
              <td className='px-4 py-2 text-gray-600'>{position.ticker}</td>
              <td className='px-4 py-2 text-right text-gray-900 font-medium'>
                {(position.entryPrice).toLocaleString('ko-KR')} 원
              </td>
              <td className='px-4 py-2 text-gray-600'>{position.entryDate}</td>
              <td className='px-4 py-2 text-right text-gray-900'>
                {position.quantity} 주
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
