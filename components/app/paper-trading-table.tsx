'use client'

import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DateRange {
  startDate: string
  endDate: string
}

interface YearlyReturn {
  robot: string
  [year: number]: string | number
  average: number
}

export function PaperTradingTable({ dateRange }: { dateRange: DateRange }) {
  // Dummy data (TODO: DB에서 실제 연도별 데이터 조회)
  const tableData: YearlyReturn[] = [
    { robot: 'Balanced', 2023: '8.5%', 2024: '12.5%', average: 10.5 },
    { robot: 'Growth', 2023: '15.2%', 2024: '18.2%', average: 16.7 },
    { robot: 'Conservative', 2023: '4.2%', 2024: '6.8%', average: 5.5 },
  ]

  const years = [2023, 2024]

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">연도별 수익률 비교</h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">전략</TableHead>
              {years.map((year) => (
                <TableHead key={year} className="text-right">
                  {year}년
                </TableHead>
              ))}
              <TableHead className="text-right font-semibold">평균</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row) => (
              <TableRow key={row.robot}>
                <TableCell className="font-medium">{row.robot}</TableCell>
                {years.map((year) => {
                  const value = row[year] as string
                  return (
                    <TableCell key={year} className="text-right">
                      <span className={value.startsWith('-') ? 'text-red-400' : 'text-green-400'}>
                        {value}
                      </span>
                    </TableCell>
                  )
                })}
                <TableCell className="text-right font-semibold">
                  <span className={row.average >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {row.average >= 0 ? '+' : ''}{row.average.toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
