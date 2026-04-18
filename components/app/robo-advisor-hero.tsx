'use client'

import { useState } from 'react'
import { Bot, BookOpen, ChevronDown } from 'lucide-react'

const SIGNALS = [
  {
    emoji: '🔀',
    name: '골든크로스',
    description: '단기(5일) 이동평균이 장기(20일) 이평선을 상향 돌파',
  },
  {
    emoji: '📉',
    name: 'RSI 과매도 반등',
    description: 'RSI 30 이하 후 반등 — 과매도 구간 탈출',
  },
  {
    emoji: '📊',
    name: 'MACD 교차',
    description: 'MACD 라인이 시그널 라인을 상향 교차',
  },
  {
    emoji: '🔊',
    name: '거래량 돌파',
    description: '거래량이 20일 평균 대비 2배 이상 급증',
  },
  {
    emoji: '📈',
    name: '볼린저 밴드 돌파',
    description: '가격이 하단 밴드를 터치 후 중심선 방향으로 반등',
  },
  {
    emoji: '🎯',
    name: '스토캐스틱 과매도',
    description: '%K가 20 이하 후 %D 상향 교차',
  },
  {
    emoji: '📐',
    name: 'ADX 추세 강도',
    description: 'ADX 25 이상 + DI+ > DI- (상승 추세 확인)',
  },
  {
    emoji: '⭐',
    name: '복합 시그널',
    description: '위 7가지 가중합 기반 — confidence 점수 포함',
  },
]

export function RoboAdvisorHero() {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a0010] via-[#1f0018] to-[#0f0014] p-8 text-white shadow-xl"
      style={{ fontFamily: 'var(--font-sunflower), sans-serif' }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {/* 배경 글로우 */}
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-48 rounded-full bg-pink-500/8 blur-3xl" />
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-fuchsia-500/5 blur-3xl" />

        {/* 도트 패턴 */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />

        {/* 스캔 라인 애니메이션 */}
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
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-400/40 to-transparent"
          style={{ animation: 'ra-scan 3s ease-in-out infinite' }}
        />

        {/* 펄스 링 장식 */}
        <div className="absolute top-1/2 right-20 -translate-y-1/2 hidden sm:block">
          <div
            className="w-28 h-28 rounded-full border border-rose-400/30"
            style={{ animation: 'ra-pulse-ring 2s ease-in-out infinite' }}
          />
          <div
            className="absolute inset-3 rounded-full border border-pink-400/20"
            style={{ animation: 'ra-pulse-ring 2s ease-in-out 0.4s infinite' }}
          />
          <div
            className="absolute inset-6 rounded-full border border-fuchsia-400/15"
            style={{ animation: 'ra-pulse-ring 2s ease-in-out 0.8s infinite' }}
          />
          {/* 중앙 봇 아이콘 */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ animation: 'ra-float 4s ease-in-out infinite' }}
          >
            <Bot size={32} className="text-rose-300/60" />
          </div>
        </div>

        {/* 우측 하단 매트릭스 숫자 장식 */}
        <div className="absolute right-6 bottom-2 flex gap-3 opacity-10 font-mono text-[9px] text-rose-300">
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

      <div className="relative flex flex-col gap-4">
        {/* 헤더: 제목 + 알고리즘 보기 버튼 */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="space-y-2 max-w-lg flex-1">
            <div className="flex items-center gap-1.5 text-rose-400/70 text-xs font-semibold tracking-widest uppercase">
              <Bot className="h-3.5 w-3.5" />
              로보어드바이저
            </div>
            <h1 className="text-3xl font-bold tracking-tight">알고리즘 시그널</h1>
            <p className="text-white/60 text-sm leading-relaxed">
              알고리즘이 시장을 스캔하는 중 —{' '}
              <span className="text-rose-300 font-medium">매수 시그널이 발생한 종목</span>을
              실시간으로 감지합니다
            </p>
            <p className="text-white/30 text-xs">
              과거 데이터 기반 통계이며 투자 조언이 아닙니다
            </p>
          </div>

          {/* 알고리즘 보기 버튼 */}
          <button
            onClick={() => setOpen(!open)}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-300 hover:bg-rose-500/30 transition-colors group text-sm font-medium whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4" />
            {open ? '접기' : '알고리즘 보기'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* 알고리즘 설명 패널 */}
        <div
          className="overflow-hidden transition-all duration-300 ease-out"
          style={{
            maxHeight: open ? '500px' : '0px',
            opacity: open ? 1 : 0,
          }}
        >
          <div className="pt-4 border-t border-white/10">
            <p className="text-white/50 text-xs mb-3">매수 신호를 감지하는 8가지 알고리즘</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SIGNALS.map((signal, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] transition-colors group"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg shrink-0 group-hover:scale-110 transition-transform">{signal.emoji}</span>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{signal.name}</p>
                      <p className="text-xs text-white/50 leading-relaxed">{signal.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
