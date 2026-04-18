'use client'

import { useState } from 'react'
import { Bot, BookOpen, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type SignalCategory = 'trend' | 'momentum' | 'volatility' | 'volume' | 'supply' | 'composite'

// SVG Mini Charts for Technical Analysis
function GoldenCrossChart() {
  return (
    <svg viewBox="0 0 80 50" className="w-[72px] h-[44px]">
      {/* 배경 */}
      <rect width="80" height="50" fill="rgba(255,255,255,0.02)" />
      {/* 장기선 (파란색) */}
      <path d="M0,35 Q20,28 40,22 T80,10" stroke="#3b82f6" strokeWidth="1.5" fill="none" strokeDasharray="200" style={{ animation: 'ra-draw-line 2s ease-in-out infinite' }} />
      {/* 단기선 (노란색) */}
      <path d="M0,38 Q20,30 40,18 T80,8" stroke="#fbbf24" strokeWidth="1.5" fill="none" strokeDasharray="200" style={{ animation: 'ra-draw-line 2s ease-in-out infinite 0.2s' }} />
      {/* 교차점 강조 */}
      <circle cx="40" cy="20" fill="none" stroke="#10b981" strokeWidth="1" style={{ animation: 'ra-glow-dot 1s ease-in-out infinite' }} />
      <circle cx="40" cy="20" r="1" fill="#10b981" />
    </svg>
  )
}

function RSIChart() {
  return (
    <svg viewBox="0 0 80 50" className="w-[72px] h-[44px]">
      <rect width="80" height="50" fill="rgba(255,255,255,0.02)" />
      {/* 과매도 영역 (30선) */}
      <line x1="0" y1="35" x2="80" y2="35" stroke="rgba(239,68,68,0.3)" strokeWidth="1" strokeDasharray="2" />
      {/* RSI 곡선 */}
      <path d="M0,32 Q20,40 40,38 Q60,28 80,15" stroke="#a78bfa" strokeWidth="1.5" fill="none" strokeDasharray="200" style={{ animation: 'ra-draw-line 2s ease-in-out infinite' }} />
      {/* 반등 포인트 */}
      <circle cx="50" cy="25" fill="none" stroke="#34d399" strokeWidth="1" style={{ animation: 'ra-glow-dot 1s ease-in-out infinite' }} />
      <circle cx="50" cy="25" r="1" fill="#34d399" />
    </svg>
  )
}

function MACDChart() {
  return (
    <svg viewBox="0 0 80 50" className="w-[72px] h-[44px]">
      <rect width="80" height="50" fill="rgba(255,255,255,0.02)" />
      {/* 0 기준선 */}
      <line x1="0" y1="25" x2="80" y2="25" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
      {/* MACD 선 (파란색) */}
      <path d="M0,28 Q20,22 40,20 T80,18" stroke="#3b82f6" strokeWidth="1.5" fill="none" strokeDasharray="200" style={{ animation: 'ra-draw-line 2s ease-in-out infinite' }} />
      {/* 시그널 선 (주황색) */}
      <path d="M0,30 Q20,24 40,22 T80,20" stroke="#f97316" strokeWidth="1.5" fill="none" strokeDasharray="200" style={{ animation: 'ra-draw-line 2s ease-in-out infinite 0.2s' }} />
      {/* 교차점 */}
      <circle cx="40" cy="21" fill="none" stroke="#06b6d4" strokeWidth="1" style={{ animation: 'ra-glow-dot 1s ease-in-out infinite' }} />
      <circle cx="40" cy="21" r="1" fill="#06b6d4" />
    </svg>
  )
}

function StochasticChart() {
  return (
    <svg viewBox="0 0 80 50" className="w-[72px] h-[44px]">
      <rect width="80" height="50" fill="rgba(255,255,255,0.02)" />
      {/* 과매도 영역 (20선) */}
      <line x1="0" y1="36" x2="80" y2="36" stroke="rgba(239,68,68,0.3)" strokeWidth="1" strokeDasharray="2" />
      {/* %K 선 (보라색) */}
      <path d="M0,34 Q20,42 40,32 Q60,22 80,12" stroke="#d946ef" strokeWidth="1.5" fill="none" strokeDasharray="200" style={{ animation: 'ra-draw-line 2s ease-in-out infinite' }} />
      {/* %D 선 (주황색) */}
      <path d="M0,36 Q20,40 40,34 Q60,24 80,14" stroke="#f97316" strokeWidth="1.5" fill="none" strokeDasharray="200" style={{ animation: 'ra-draw-line 2s ease-in-out infinite 0.15s' }} />
      {/* 교차점 */}
      <circle cx="48" cy="27" fill="none" stroke="#34d399" strokeWidth="1" style={{ animation: 'ra-glow-dot 1s ease-in-out infinite' }} />
      <circle cx="48" cy="27" r="1" fill="#34d399" />
    </svg>
  )
}

function BollingerChart() {
  return (
    <svg viewBox="0 0 80 50" className="w-[72px] h-[44px]">
      <rect width="80" height="50" fill="rgba(255,255,255,0.02)" />
      {/* 밴드 영역 */}
      <path d="M0,15 Q40,18 80,12" stroke="rgba(100,200,255,0.3)" strokeWidth="1" fill="none" />
      <path d="M0,35 Q40,32 80,38" stroke="rgba(100,200,255,0.3)" strokeWidth="1" fill="none" />
      {/* 중심선 */}
      <path d="M0,25 Q40,25 80,25" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
      {/* 가격선 (V자 반등) */}
      <path d="M0,25 L30,38 L60,18 L80,12" stroke="#fbbf24" strokeWidth="1.5" fill="none" strokeDasharray="200" style={{ animation: 'ra-draw-line 2.5s ease-in-out infinite' }} />
      {/* 반등 포인트 */}
      <circle cx="35" cy="34" fill="none" stroke="#34d399" strokeWidth="1" style={{ animation: 'ra-glow-dot 1s ease-in-out infinite' }} />
      <circle cx="35" cy="34" r="1" fill="#34d399" />
    </svg>
  )
}

const SIGNAL_CATEGORIES: Record<SignalCategory, { label: string; description: string; signals: Array<{ emoji: string; name: string; description: string; status?: 'active' | 'coming-soon' }> }> = {
  trend: {
    label: '추세 지표 (Trend)',
    description: '현재 주가 방향(상승/하락/횡보)과 추세 강도를 분석합니다',
    signals: [
      {
        emoji: '🔀',
        name: '이동평균선 (MA) — 골든크로스',
        description: '단기(5일) 이동평균이 장기(20일) 이평선을 상향 돌파 — 상승 추세 시작 신호',
        status: 'active',
      },
      {
        emoji: '📊',
        name: 'MACD 교차',
        description: 'MACD 라인이 시그널 라인을 상향 교차 — 모멘텀 전환 신호',
        status: 'active',
      },
      {
        emoji: '📍',
        name: '파라볼릭 SAR',
        description: '차트 위아래 점으로 추세 전환점(Stop And Reverse) 포착',
        status: 'coming-soon',
      },
      {
        emoji: '☁️',
        name: '일목균형표 (Ichimoku Cloud)',
        description: '구름대, 전환선, 기준선으로 현재 추세와 미래 지지·저항 표시',
        status: 'coming-soon',
      },
    ],
  },
  momentum: {
    label: '모멘텀 지표 (Momentum)',
    description: '주가의 상승/하락 속도와 강도, 과매수/과매도 구간을 측정합니다',
    signals: [
      {
        emoji: '📉',
        name: 'RSI 과매도 반등',
        description: 'RSI 30 이하 후 반등 — 과매도 구간에서의 회복 신호',
        status: 'active',
      },
      {
        emoji: '🎯',
        name: '스토캐스틱 과매도',
        description: '%K가 20 이하 후 %D 상향 교차 — 과매도 영역 탈출 신호',
        status: 'active',
      },
      {
        emoji: '🌊',
        name: 'CCI (상품채널지수)',
        description: '현재 주가의 비정상적인 편차를 수치로 측정',
        status: 'coming-soon',
      },
      {
        emoji: '🚀',
        name: '모멘텀 / ROC (변화율)',
        description: '과거 특정 시점 대비 현재 주가의 상승/하락 가속도 측정',
        status: 'coming-soon',
      },
    ],
  },
  volatility: {
    label: '변동성 지표 (Volatility)',
    description: '주가의 위아래 변동폭을 측정하여 과도한 움직임을 포착합니다',
    signals: [
      {
        emoji: '📈',
        name: '볼린저 밴드 돌파',
        description: '가격이 하단 밴드를 터치 후 중심선 방향으로 반등 — 변동성 축소 후 회복',
        status: 'active',
      },
      {
        emoji: '📏',
        name: 'ATR (평균 진정 범위)',
        description: '하루 주가 변동폭의 평균값으로 변동성 크기 측정',
        status: 'coming-soon',
      },
      {
        emoji: '🎭',
        name: '엔벨로프 (Envelope)',
        description: '이동평균선 위아래 일정 퍼센트 범위로 정상적인 가격 튜브 표시',
        status: 'coming-soon',
      },
    ],
  },
  volume: {
    label: '거래량 지표 (Volume)',
    description: '거래량의 흐름으로 주가를 움직이는 실제 연료와 세력 매집을 파악합니다',
    signals: [
      {
        emoji: '📦',
        name: 'OBV (누적 거래량)',
        description: '상승일 거래량은 더하고 하락일은 빼서 누적 — 매집/이탈 신호 감지',
        status: 'coming-soon',
      },
      {
        emoji: '💰',
        name: 'MFI (자금흐름지수)',
        description: 'RSI + 거래량으로 돈의 흐름을 입체적으로 분석',
        status: 'coming-soon',
      },
      {
        emoji: '⚖️',
        name: 'VR (거래량비율)',
        description: '상승일 거래량 합 ÷ 하락일 거래량 합 — 바닥과 상투 예측',
        status: 'coming-soon',
      },
    ],
  },
  supply: {
    label: '수급분석',
    description: '거래량과 매수세를 통한 신호 감지',
    signals: [
      {
        emoji: '🔊',
        name: '거래량 돌파',
        description: '거래량이 20일 평균 대비 2배 이상 급증 — 실제 자금의 관심도 증가 신호',
        status: 'active',
      },
    ],
  },
  composite: {
    label: '복합신호',
    description: '모든 기술지표를 종합한 최종 매수 신호',
    signals: [
      {
        emoji: '⭐',
        name: '종합 신호 (Composite)',
        description: '위 기술지표들의 가중합 기반 — confidence 점수(0~100)로 신뢰도 표시. 점수가 높을수록 여러 지표가 동시에 매수 신호를 발생',
        status: 'active',
      },
    ],
  },
}

export function RoboAdvisorHero() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<SignalCategory>('trend')

  const currentCategory = SIGNAL_CATEGORIES[activeTab]
  const tabs = Object.entries(SIGNAL_CATEGORIES).map(([key, value]) => ({
    key: key as SignalCategory,
    label: value.label,
  }))

  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a0010] via-[#1f0018] to-[#0f0014] p-8 text-white shadow-xl"
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
          @keyframes ra-draw-line {
            0% { stroke-dashoffset: 200; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes ra-glow-dot {
            0%, 100% { opacity: 1; r: 2; }
            50% { opacity: 0.4; r: 3; }
          }
          @keyframes ra-bounce-line {
            0% { transform: translateY(8px); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateY(-8px); }
          }
          @keyframes ra-slide-up {
            0% { transform: translateY(6px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
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
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Sunflower', sans-serif" }}>알고리즘 시그널</h1>
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
            maxHeight: open ? '600px' : '0px',
            opacity: open ? 1 : 0,
          }}
        >
          <div className="pt-4 border-t border-white/10 space-y-3">
            {/* 탭 버튼 */}
            <div className="flex gap-1.5 flex-wrap">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                    activeTab === tab.key
                      ? 'bg-rose-500/30 border border-rose-400/50 text-rose-200'
                      : 'bg-white/[0.05] border border-white/[0.12] text-white/60 hover:text-white/80 hover:bg-white/[0.08]',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 카테고리 설명 + 신호 목록 */}
            <div className="space-y-2">
              <p className="text-white/60 text-xs">{currentCategory.description}</p>
              <div className={cn(
                'grid gap-2 transition-opacity duration-300',
                currentCategory.signals.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
              )}>
                {currentCategory.signals.map((signal, idx) => {
                  const getTechnicalChart = (name: string) => {
                    if (name.includes('골든크로스')) return <GoldenCrossChart />
                    if (name.includes('RSI')) return <RSIChart />
                    if (name.includes('MACD')) return <MACDChart />
                    if (name.includes('스토캐스틱')) return <StochasticChart />
                    if (name.includes('볼린저')) return <BollingerChart />
                    return null
                  }

                  const isTechnicalTab = ['trend', 'momentum', 'volatility'].includes(activeTab)
                  const hasChart = isTechnicalTab && getTechnicalChart(signal.name)

                  return (
                    <div
                      key={idx}
                      className={cn(
                        'p-3 rounded-lg border transition-colors group',
                        signal.status === 'coming-soon'
                          ? 'bg-white/[0.02] border-white/[0.06] opacity-60'
                          : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05]'
                      )}
                    >
                      <div className={cn('flex items-start gap-2.5', hasChart && 'justify-between')}>
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <span className="text-lg shrink-0 group-hover:scale-110 transition-transform">{signal.emoji}</span>
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-white">{signal.name}</p>
                              {signal.status === 'coming-soon' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 font-medium">
                                  업데이트중
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/50 leading-relaxed">{signal.description}</p>
                          </div>
                        </div>
                        {hasChart && getTechnicalChart(signal.name)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
