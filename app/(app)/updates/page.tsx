import { History } from 'lucide-react'

export default function UpdatesPage() {
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
    </div>
  )
}
