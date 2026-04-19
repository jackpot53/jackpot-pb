import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface DashboardStatCardProps {
  label: string
  primaryValue: string
  secondaryValue?: string
  secondarySign?: 'positive' | 'negative' | 'neutral'
}

export function DashboardStatCard({
  label,
  primaryValue,
  secondaryValue,
  secondarySign = 'neutral',
}: DashboardStatCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground text-center">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-3xl font-semibold leading-tight">{primaryValue}</p>
        {secondaryValue && (
          <p
            className={cn(
              'mt-1 text-sm',
              secondarySign === 'positive' && 'text-emerald-600',
              secondarySign === 'negative' && 'text-red-600',
              secondarySign === 'neutral' && 'text-muted-foreground',
            )}
          >
            {secondaryValue}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
