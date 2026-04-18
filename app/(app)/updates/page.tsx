import { History } from 'lucide-react'
import { getUpdates } from '@/db/queries/updates'
import { createClient } from '@/utils/supabase/server'
import { UpdateAdminSection } from '@/components/app/update-admin-toggle'

const ADMIN_EMAIL = 'shuaihan77@gmail.com'

const CATEGORY_STYLES: Record<string, { badge: string; bar: string }> = {
  '신기능':  { badge: 'bg-indigo-500/20 text-indigo-300',  bar: 'bg-indigo-500' },
  '개선':    { badge: 'bg-emerald-500/20 text-emerald-300', bar: 'bg-emerald-500' },
  '버그수정': { badge: 'bg-amber-500/20 text-amber-300',    bar: 'bg-amber-500' },
  '보안':    { badge: 'bg-rose-500/20 text-rose-300',       bar: 'bg-rose-500' },
}

export default async function UpdatesPage() {
  const supabase = await createClient()
  const [items, { data: { user } }] = await Promise.all([
    getUpdates(),
    supabase.auth.getUser(),
  ])
  const isAdmin = user?.email === ADMIN_EMAIL


  return (
    <div className="space-y-6">
      {/* 히어로 배너 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-950 via-[#1a1535] to-[#0f0f1a] p-6 sm:p-8 text-white shadow-xl">
        <style>{`
          @keyframes upd-float { 0%,100%{transform:translateY(0);opacity:.5} 50%{transform:translateY(-10px);opacity:1} }
          @keyframes upd-ring { 0%{opacity:.5;transform:scale(.8)} 100%{opacity:0;transform:scale(1.8)} }
          @keyframes upd-pulse { 0%,100%{opacity:.2;transform:scale(1)} 50%{opacity:.5;transform:scale(1.08)} }
          @keyframes upd-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes upd-star { 0%,100%{opacity:0;transform:scale(.3) rotate(0deg)} 50%{opacity:.9;transform:scale(1) rotate(15deg)} }
          @keyframes upd-slide { 0%,100%{transform:translateX(0);opacity:.3} 50%{transform:translateX(6px);opacity:.7} }
        `}</style>

        {/* 배경 장식 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-72 h-48 rounded-full bg-violet-600/10 blur-3xl" />
          <div className="absolute top-1/2 right-1/3 w-48 h-48 rounded-full bg-indigo-400/5 blur-2xl" />

          {/* 펄스 링 */}
          <div className="absolute top-8 right-24 w-32 h-32 rounded-full border border-indigo-400/20" style={{ animation: 'upd-pulse 3.5s ease-in-out infinite' }} />
          <div className="absolute top-14 right-32 w-16 h-16 rounded-full border border-indigo-300/25" style={{ animation: 'upd-pulse 3.5s ease-in-out infinite', animationDelay: '1s' }} />
          <div className="absolute top-18 right-28 w-7 h-7 rounded-full bg-indigo-400/20" style={{ animation: 'upd-pulse 3s ease-in-out infinite', animationDelay: '2s' }} />

          {/* 레이더 스윕 */}
          <div className="absolute top-8 right-24 w-32 h-32 rounded-full border border-indigo-300/30" style={{ animation: 'upd-ring 3s ease-out infinite' }} />
          <div className="absolute top-8 right-24 w-32 h-32 rounded-full border border-violet-300/20" style={{ animation: 'upd-ring 3s ease-out infinite', animationDelay: '1.5s' }} />

          {/* 떠오르는 점 */}
          <div className="absolute bottom-5 left-8 w-2.5 h-2.5 rounded-full bg-indigo-300/50" style={{ animation: 'upd-float 2.6s ease-in-out infinite' }} />
          <div className="absolute bottom-9 left-16 w-1.5 h-1.5 rounded-full bg-violet-300/50" style={{ animation: 'upd-float 3s ease-in-out infinite', animationDelay: '0.9s' }} />
          <div className="absolute bottom-12 left-11 w-1 h-1 rounded-full bg-indigo-200/40" style={{ animation: 'upd-float 3.4s ease-in-out infinite', animationDelay: '1.8s' }} />

          {/* 슬라이딩 대시 (타임라인 느낌) */}
          <div className="absolute top-6 left-1/2 flex flex-col gap-2 opacity-20">
            {[0, 0.4, 0.8, 1.2].map((d, i) => (
              <div key={i} className="h-px bg-gradient-to-r from-transparent via-indigo-300 to-transparent" style={{ width: `${40 - i * 6}px`, animation: `upd-slide 2.5s ease-in-out infinite`, animationDelay: `${d}s` }} />
            ))}
          </div>

          {/* 별 반짝임 */}
          <div className="absolute top-4 right-14 text-indigo-300/60 text-xs" style={{ animation: 'upd-star 2.8s ease-in-out infinite' }}>✦</div>
          <div className="absolute top-10 right-8 text-violet-300/50 text-[10px]" style={{ animation: 'upd-star 3.3s ease-in-out infinite', animationDelay: '1.3s' }}>✦</div>
          <div className="absolute bottom-8 right-36 text-indigo-200/40 text-[8px]" style={{ animation: 'upd-star 2.5s ease-in-out infinite', animationDelay: '0.7s' }}>✦</div>

          {/* 도트 패턴 */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 36px)' }} />
        </div>

        {/* 컨텐츠 */}
        <div className="relative flex items-start justify-between gap-6">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-indigo-300/70 text-xs font-semibold tracking-widest uppercase">
              <History className="h-3.5 w-3.5" />업데이트
            </div>
            <h1 className="text-3xl font-bold tracking-tight leading-tight" style={{ fontFamily: "'Sunflower', sans-serif" }}>업데이트 내역</h1>
            <p className="text-indigo-100/60 text-sm leading-relaxed">
              jackpot의 새로운 기능과 개선사항을 기록합니다
            </p>

          </div>

        </div>
      </div>

      {/* 관리자 작성 섹션 */}
      {isAdmin && <UpdateAdminSection />}

      {/* 피드 */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          아직 업데이트 내역이 없습니다.
        </div>
      ) : (
        <ul className="w-full">
          {items.map((item, idx) => {
            const style = CATEGORY_STYLES[item.category] ?? { badge: 'bg-zinc-500/20 text-zinc-300', bar: 'bg-zinc-500' }
            const isLatest = idx === 0
            const isLast = idx === items.length - 1

            return (
              <li key={item.id} className="flex gap-4">
                {/* 왼쪽: 아이콘 + 세로선 */}
                <div className="flex flex-col items-center">
                  <div className="flex-none flex items-center justify-center w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 ring-4 ring-background z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
                </div>

                {/* 오른쪽: 컨텐츠 */}
                <div className={`pb-10 min-w-0 flex-1 ${isLast ? 'pb-0' : ''}`}>
                  {/* 메타 */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <time className="font-mono text-sm text-muted-foreground">{item.date}</time>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="font-mono text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {item.version}
                    </span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${style.badge}`}>
                      {item.category}
                    </span>
                    {isLatest && (
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
                        Latest
                      </span>
                    )}
                  </div>

                  {/* 제목 */}
                  <div className="text-base font-bold text-foreground mb-2">{item.title}</div>

                  {/* 항목 */}
                  <ul className="space-y-1">
                    {item.items.map((line, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="h-32" />
    </div>
  )
}
