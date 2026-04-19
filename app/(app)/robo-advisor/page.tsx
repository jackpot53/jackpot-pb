import { redirect } from 'next/navigation'
import { getAuthUser } from '@/utils/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Bot, Sparkles } from 'lucide-react'

export default async function RoboAdvisorIndexPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 p-8 text-white shadow-xl">
        <div className="relative space-y-2" style={{ fontFamily: "'Sunflower', sans-serif" }}>
          <div className="flex items-center gap-1.5 text-orange-100 text-xs font-semibold tracking-widest uppercase">
            <Bot className="h-3.5 w-3.5" />AI 자산관리
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Sunflower', sans-serif" }}>로보어드바이저</h1>
          <p className="text-orange-100/80 text-sm">
            AI 기반 시그널 대시보드 — <span className="text-white font-medium">준비 중</span>
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-semibold text-foreground">로보어드바이저 홈은 준비 중입니다</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            시장·섹터·종목 시그널을 통합 요약하는 대시보드를 제공할 예정입니다.
            지금은 좌측 메뉴에서 개별 시그널 페이지로 이동하세요.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
