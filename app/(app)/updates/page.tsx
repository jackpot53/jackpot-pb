import { History } from 'lucide-react'
import { getUpdates } from '@/db/queries/updates'
import { createClient } from '@/utils/supabase/server'
import { UpdateCreateForm } from '@/components/app/update-create-form'

const ADMIN_EMAIL = 'shuaihan77@gmail.com'

const CATEGORY_STYLES: Record<string, { badge: string; bar: string }> = {
  '신기능':  { badge: 'bg-indigo-500/20 text-indigo-300',  bar: 'bg-indigo-500' },
  '개선':    { badge: 'bg-emerald-500/20 text-emerald-300', bar: 'bg-emerald-500' },
  '버그수정': { badge: 'bg-amber-500/20 text-amber-300',    bar: 'bg-amber-500' },
  '보안':    { badge: 'bg-rose-500/20 text-rose-300',       bar: 'bg-rose-500' },
}

export default async function UpdatesPage() {
  const [items, supabase] = await Promise.all([getUpdates(), createClient()])
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === ADMIN_EMAIL

  return (
    <div className="space-y-6">
      {/* 히어로 배너 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#111111] p-8 text-white shadow-xl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-indigo-400/5 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-48 rounded-full bg-indigo-400/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        </div>
        <div className="relative flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-indigo-400/70 text-xs font-semibold tracking-widest uppercase">
              <History className="h-3.5 w-3.5" />업데이트
            </div>
            <h1 className="text-3xl font-bold tracking-tight leading-tight" style={{ fontFamily: "'Sunflower', sans-serif" }}>업데이트 내역</h1>
            <p className="text-white/60 text-sm">
              최신 기능과 개선사항을 확인하세요
            </p>
          </div>
        </div>
      </div>

      {/* 관리자 작성 폼 */}
      {isAdmin && <UpdateCreateForm />}

      {/* 게시판 */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          아직 업데이트 내역이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const style = CATEGORY_STYLES[item.category] ?? { badge: 'bg-zinc-500/20 text-zinc-300', bar: 'bg-zinc-500' }
            return (
              <div key={item.id} className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow">
                <div className={`h-1 ${style.bar}`} />
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {item.version}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${style.badge}`}>
                      {item.category}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">{item.date}</span>
                  </div>
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <ul className="space-y-1">
                    {item.items.map((line, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="h-32" />
    </div>
  )
}
