interface Props {
  yearStr: string
}

// Smooth upward-trending line (SVG viewBox 0 0 200 60)
const LINE_POINTS = '0,52 20,48 40,44 55,46 70,36 88,30 105,22 118,25 132,14 148,8 165,10 180,4 200,2'

export function InsightsHero({ yearStr }: Props) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #020810 0%, #050f1a 50%, #071520 100%)',
        minHeight: 188,
      }}
    >
      <style>{`
        @keyframes ih-line {
          from { stroke-dashoffset: 520; opacity: 0; }
          to   { stroke-dashoffset: 0;   opacity: 1; }
        }
        @keyframes ih-area {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ih-dot {
          0%,100% { r: 3; opacity: .9; }
          50%      { r: 4.5; opacity: 1; }
        }
        @keyframes ih-glow {
          0%,100% { opacity: .25; transform: scale(1);   }
          50%      { opacity: .55; transform: scale(1.3); }
        }
        @keyframes ih-scan {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(500%);  }
        }
        @keyframes ih-badge {
          0%,100% { opacity: .7; } 50% { opacity: 1; }
        }
        @keyframes ih-hex {
          0%,100% { opacity: .018; } 50% { opacity: .04; }
        }
        @keyframes ih-num {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      {/* ── Background ─────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none select-none">

        {/* Hex grid */}
        <svg className="absolute inset-0 w-full h-full" style={{ animation: 'ih-hex 4s ease-in-out infinite' }}>
          <defs>
            <pattern id="ih-hexpat" width="28" height="32" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
              <polygon points="14,2 26,9 26,23 14,30 2,23 2,9" fill="none" stroke="rgba(34,211,238,0.9)" strokeWidth="0.4"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ih-hexpat)" />
        </svg>

        {/* Left radial glow */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 45% 80% at 0% 50%, rgba(6,182,212,.08) 0%, transparent 65%)' }}
        />

        {/* Scan beam */}
        <div
          className="absolute top-0 bottom-0 w-[15%]"
          style={{
            background: 'linear-gradient(to right, transparent, rgba(34,211,238,.04), transparent)',
            animation: 'ih-scan 8s cubic-bezier(.4,0,.6,1) 1s infinite',
          }}
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
            <linearGradient id="ih-linefill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="rgba(34,211,238,0.18)" />
              <stop offset="100%" stopColor="rgba(34,211,238,0)"    />
            </linearGradient>
            <filter id="ih-lineglow">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Area fill */}
          <polygon
            points={`${LINE_POINTS} 200,60 0,60`}
            fill="url(#ih-linefill)"
            style={{ animation: 'ih-area .9s ease-out .4s both' }}
          />

          {/* Line */}
          <polyline
            points={LINE_POINTS}
            fill="none"
            stroke="rgba(34,211,238,0.7)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="520"
            filter="url(#ih-lineglow)"
            style={{ animation: 'ih-line 1.4s ease-out .1s both' }}
          />

          {/* Peak dot */}
          <circle
            cx="180" cy="4" r="3"
            fill="#22d3ee"
            style={{ animation: 'ih-dot 2.4s ease-in-out infinite' }}
          />
          <circle
            cx="180" cy="4" r="10"
            fill="rgba(34,211,238,0.12)"
            style={{ animation: 'ih-glow 2.4s ease-in-out infinite' }}
          />
        </svg>

        {/* Large decorative year number — far right, faded */}
        <div
          className="absolute right-4 bottom-3 font-black text-[#22d3ee] select-none leading-none"
          style={{
            fontSize: 'clamp(48px, 8vw, 80px)',
            opacity: 0.06,
            letterSpacing: '-0.04em',
            fontVariantNumeric: 'tabular-nums',
          }}
          aria-hidden="true"
        >
          {yearStr.replace('년', '')}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────── */}
      <div className="relative px-6 sm:px-8 py-8 sm:py-10">
        <div className="space-y-3 max-w-sm">

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/[0.07] text-cyan-400/80 text-[11px] font-bold tracking-widest uppercase"
            style={{ animation: 'ih-badge 2.5s ease-in-out infinite' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
            {yearStr} · 인사이트
          </div>

          {/* Title */}
          <div style={{ animation: 'ih-num .6s ease-out .2s both' }}>
            <h1
              className="text-[28px] sm:text-4xl font-black leading-tight"
              style={{
                fontFamily: "'Sunflower', sans-serif",
                letterSpacing: '-0.02em',
                background: 'linear-gradient(90deg, #ffffff 0%, rgba(34,211,238,0.85) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              포트폴리오 인사이트
            </h1>
            <p className="text-white/35 text-sm mt-2 leading-relaxed">
              흐름을 읽고,{' '}
              <span className="text-cyan-400/60 font-semibold">패턴을 발견하고,</span>
              {' '}더 나은 결정을 내리세요
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
