import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Layers, Sparkles } from 'lucide-react'

export default async function SectorSignalPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-orange-500 via-rose-600 to-pink-700 p-8 text-white shadow-xl">
        <div className="relative space-y-2" style={{ fontFamily: "'Sunflower', sans-serif" }}>
          <div className="flex items-center gap-1.5 text-pink-100 text-xs font-semibold tracking-widest uppercase">
            <Layers className="h-3.5 w-3.5" />섹터 단위
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Sunflower', sans-serif" }}>섹터시그널</h1>
          <p className="text-pink-100/80 text-sm">
            GICS 섹터별 집계 시그널 — <span className="text-white font-medium">준비 중</span>
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-semibold text-foreground">섹터시그널 기능은 준비 중입니다</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            IT·헬스케어·금융 등 섹터 단위로 종목 시그널을 집계해 로테이션 전략을 제안할 예정입니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
