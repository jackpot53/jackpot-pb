import Link from 'next/link'
import { PlusCircle } from 'lucide-react'

// Line points for upward-trending chart (SVG viewBox 0 0 200 60)
const LINE_POINTS = '0,54 18,50 36,46 52,48 68,38 86,30 104,20 120,23 136,13 152,7 168,9 184,3 200,1'

export function AssetsHero() {
  return (
    <div
      className="relative rounded-2xl overflow-hidden min-h-[160px]"
      style={{
        background: 'linear-gradient(135deg, #020c0a 0%, #051510 50%, #071a12 100%)',
        minHeight: 148,
      }}
    >
      <style>{`
        @keyframes ah-line {
          from { stroke-dashoffset: 520; opacity: 0; }
          to   { stroke-dashoffset: 0;   opacity: 1; }
        }
        @keyframes ah-area {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ah-dot {
          0%,100% { r: 3; opacity: .9; }
          50%      { r: 4.5; opacity: 1; }
        }
        @keyframes ah-glow {
          0%,100% { opacity: .25; transform: scale(1);   }
          50%      { opacity: .55; transform: scale(1.3); }
        }
        @keyframes ah-num {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      {/* ── Background ─────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none select-none">

        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(52,211,153,0.8) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />

        {/* Left radial glow */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 45% 80% at 0% 50%, rgba(16,185,129,.08) 0%, transparent 65%)' }}
        />

        {/* Line chart — right half */}
        <svg
          className="absolute right-0 top-0 h-full"
          style={{ width: '52%' }}
          viewBox="0 0 200 60"
          preserveAspectRatio="xMaxYMid meet"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="ah-linefill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="rgba(52,211,153,0.18)" />
              <stop offset="100%" stopColor="rgba(52,211,153,0)"    />
            </linearGradient>
            <filter id="ah-lineglow">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Area fill */}
          <polygon
            points={`${LINE_POINTS} 200,60 0,60`}
            fill="url(#ah-linefill)"
            style={{ animation: 'ah-area .9s ease-out .4s both' }}
          />

          {/* Line */}
          <polyline
            points={LINE_POINTS}
            fill="none"
            stroke="rgba(52,211,153,0.7)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="520"
            filter="url(#ah-lineglow)"
            style={{ animation: 'ah-line 1.4s ease-out .1s both' }}
          />

          {/* Peak dot */}
          <circle
            cx="184" cy="3" r="3"
            fill="#34d399"
            style={{ animation: 'ah-dot 2.4s ease-in-out infinite' }}
          />
          <circle
            cx="184" cy="3" r="10"
            fill="rgba(52,211,153,0.12)"
            style={{ animation: 'ah-glow 2.4s ease-in-out infinite' }}
          />
        </svg>

        {/* Large decorative % — far right, faded */}
        <div
          className="absolute right-4 bottom-3 font-black select-none leading-none"
          style={{
            fontSize: 'clamp(48px, 8vw, 80px)',
            color: '#34d399',
            opacity: 0.06,
            letterSpacing: '-0.04em',
          }}
          aria-hidden="true"
        >
          %
        </div>
      </div>

      {/* ── Content ────────────────────────────────────── */}
      <div className="relative p-4 sm:p-6 flex items-center justify-between gap-4">
        <div className="space-y-3 min-w-0">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-400/80 text-[11px] font-bold tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            내 포트폴리오
          </div>

          {/* Title */}
          <div style={{ animation: 'ah-num .6s ease-out .2s both', fontFamily: "'Sunflower', sans-serif" }}>
            <h1
              className="text-[28px] sm:text-4xl font-black leading-tight text-white"
              style={{ fontFamily: "'Sunflower', sans-serif", letterSpacing: '-0.02em' }}
            >
              보유 자산
            </h1>
            <p className="text-white/35 text-sm mt-2 leading-relaxed">
              자산을 등록하고{' '}
              <span className="text-emerald-400/60 font-semibold">실시간 수익률을 추적합니다</span>
            </p>
          </div>
        </div>

        {/* Action — right */}
        <Link
          href="/assets/new"
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30 transition-colors text-sm font-semibold whitespace-nowrap"
        >
          <PlusCircle className="h-4 w-4" />
          자산 추가
        </Link>
      </div>
    </div>
  )
}
