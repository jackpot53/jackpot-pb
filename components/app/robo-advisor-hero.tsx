'use client'

import { Bot } from 'lucide-react'

export function RoboAdvisorHero() {
  return (
    <div
      data-component="RoboAdvisorHero"
      className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700 p-4 sm:p-6 text-white shadow-xl min-h-[160px]"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {/* 배경 글로우 */}
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-amber-200/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-48 rounded-full bg-orange-300/15 blur-3xl" />
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-rose-300/10 blur-3xl" />

        {/* 도트 패턴 */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />

        <style>{`
          @keyframes ra-scan {
            0% { transform: translateY(-100%); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(400%); opacity: 0; }
          }
          @keyframes ra-pulse-ring {
            0%, 100% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.15); opacity: 0.2; }
          }
          @keyframes ra-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          @keyframes ra-float {
            0%, 100% { transform: translateY(0px) rotate(-4deg); }
            50% { transform: translateY(-10px) rotate(4deg); }
          }
        `}</style>

        {/* 스캔 라인 */}
        <div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
          style={{ animation: 'ra-scan 3s ease-in-out infinite' }}
        />

        {/* 펄스 링 장식 */}
        <div className="absolute top-1/2 right-20 -translate-y-1/2 hidden sm:block">
          <div
            className="w-28 h-28 rounded-full border border-white/40"
            style={{ animation: 'ra-pulse-ring 2s ease-in-out infinite' }}
          />
          <div
            className="absolute inset-3 rounded-full border border-white/25"
            style={{ animation: 'ra-pulse-ring 2s ease-in-out 0.4s infinite' }}
          />
          <div
            className="absolute inset-6 rounded-full border border-white/15"
            style={{ animation: 'ra-pulse-ring 2s ease-in-out 0.8s infinite' }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ animation: 'ra-float 4s ease-in-out infinite' }}
          >
            <Bot size={32} className="text-white/75" />
          </div>
        </div>

        {/* 우측 하단 매트릭스 숫자 장식 */}
        <div className="absolute right-6 bottom-2 flex gap-3 opacity-20 font-mono text-[9px] text-white">
          {['01001101', '10110010', '01110101'].map((b, i) => (
            <div
              key={i}
              className="flex flex-col gap-0.5"
              style={{ animation: `ra-blink ${1.2 + i * 0.3}s ease-in-out ${i * 0.4}s infinite` }}
            >
              {b.split('').map((c, j) => <span key={j}>{c}</span>)}
            </div>
          ))}
        </div>
      </div>

      <div className="relative space-y-2 max-w-lg" style={{ fontFamily: "'Sunflower', sans-serif" }}>
        <div className="flex items-center gap-1.5 text-white/80 text-xs font-semibold tracking-widest uppercase">
          <Bot className="h-3.5 w-3.5" />
          로보어드바이저
        </div>
        <h1 className="text-3xl font-bold tracking-tight">알고리즘 시그널</h1>
        <p className="text-white/80 text-sm leading-relaxed">
          알고리즘이 시장을 스캔하는 중 —{' '}
          <span className="text-white font-semibold">매수 시그널이 발생한 종목</span>을
          실시간으로 감지합니다
        </p>
        <p className="text-white/55 text-xs">
          과거 데이터 기반 통계이며 투자 조언이 아닙니다
        </p>
      </div>
    </div>
  )
}
