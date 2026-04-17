import { Eye } from 'lucide-react'

interface Props {
  dateStr: string
  dayStr: string
}

// Constellation node positions (x%, y%) and connection pairs
const NODES = [
  { x: 72, y: 18 }, { x: 85, y: 38 }, { x: 78, y: 58 },
  { x: 91, y: 68 }, { x: 65, y: 72 }, { x: 94, y: 22 },
  { x: 58, y: 30 }, { x: 70, y: 48 },
]
const EDGES = [[0,1],[1,2],[1,5],[2,3],[2,4],[0,6],[6,7],[7,2]]

export function TodayHero({ dateStr, dayStr }: Props) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #04040e 0%, #090916 45%, #0e0826 100%)',
        minHeight: 188,
      }}
    >
      <style>{`
        @keyframes th-pulse {
          0%   { transform: scale(1);   opacity: .55; }
          50%  { transform: scale(1.9); opacity: 0;   }
          100% { transform: scale(1.9); opacity: 0;   }
        }
        @keyframes th-scan {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(600%);  }
        }
        @keyframes th-blink {
          0%,100% { opacity: .25; } 50% { opacity: .9; }
        }
        @keyframes th-float {
          0%,100% { transform: translateY(0);    }
          50%      { transform: translateY(-6px); }
        }
        @keyframes th-draw {
          from { stroke-dashoffset: 120; }
          to   { stroke-dashoffset: 0;   }
        }
        @keyframes th-live {
          0%,100% { opacity: 1; } 50% { opacity: .3; }
        }
        @keyframes th-orb {
          0%,100% { box-shadow: 0 0 14px rgba(254,229,0,.35); }
          50%      { box-shadow: 0 0 32px rgba(254,229,0,.75); }
        }
      `}</style>

      {/* ── Background layers ─────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none select-none">

        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        />

        {/* Radial vignette */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 80% at 20% 50%, rgba(109,40,217,.07) 0%, transparent 70%)' }}
        />

        {/* Scan beam */}
        <div
          className="absolute top-0 bottom-0 w-[18%]"
          style={{
            background: 'linear-gradient(to right, transparent, rgba(254,229,0,.045), transparent)',
            animation: 'th-scan 6s cubic-bezier(.4,0,.6,1) 1s infinite',
          }}
        />

        {/* Constellation SVG */}
        <svg
          className="absolute right-0 top-0 h-full"
          style={{ width: '50%' }}
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {/* Edges */}
          {EDGES.map(([a, b], i) => {
            const from = NODES[a], to = NODES[b]
            const len = Math.hypot(to.x - from.x, to.y - from.y)
            return (
              <line
                key={i}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke="rgba(254,229,0,0.22)"
                strokeWidth="0.5"
                strokeDasharray={len}
                strokeDashoffset={0}
                style={{ animation: `th-draw 1.8s ease-out ${i * 0.18 + 0.3}s both` }}
              />
            )
          })}
          {/* Nodes */}
          {NODES.map((n, i) => (
            <g key={i}>
              <circle cx={n.x} cy={n.y} r="1.5" fill="rgba(254,229,0,0.15)" />
              <circle
                cx={n.x} cy={n.y} r="0.9"
                fill="#FEE500"
                style={{ animation: `th-blink ${1.8 + i * 0.3}s ease-in-out ${i * 0.22}s infinite` }}
              />
            </g>
          ))}
        </svg>

        {/* Pulse rings (top-right anchor) */}
        {[0, 0.7, 1.4].map((delay, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-[#FEE500]/25"
            style={{
              width: 80 + i * 40,
              height: 80 + i * 40,
              top: '50%',
              right: '-2%',
              marginTop: -(40 + i * 20),
              animation: `th-pulse 2.8s ease-out ${delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div className="relative px-6 sm:px-8 py-8 sm:py-10 flex items-start justify-between gap-4">
        <div className="space-y-3 min-w-0">

          {/* Live date badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#FEE500]/25 bg-[#FEE500]/[0.07] text-[#FEE500]/90 text-[11px] font-bold tracking-wide">
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#FEE500] shrink-0"
              style={{ animation: 'th-live 1.4s ease-in-out infinite' }}
            />
            {dateStr}
            <span className="opacity-50">·</span>
            {dayStr}
          </div>

          {/* Title */}
          <div>
            <h1
              className="text-[28px] sm:text-4xl font-black text-white leading-tight"
              style={{ fontFamily: "'Sunflower', sans-serif", letterSpacing: '-0.01em' }}
            >
              오늘의 인사이트
            </h1>
            <p className="text-white/40 text-sm mt-1.5 leading-relaxed">
              시장의 신호를 읽고{' '}
              <span
                className="font-semibold"
                style={{ color: 'rgba(254,229,0,0.65)' }}
              >
                포트폴리오의 흐름을 포착하세요
              </span>
            </p>
          </div>
        </div>

        {/* Floating orb icon */}
        <div
          className="hidden sm:flex shrink-0 items-center justify-center w-14 h-14 rounded-2xl border border-[#FEE500]/30 bg-[#FEE500]/[0.08]"
          style={{ animation: 'th-float 3.5s ease-in-out infinite, th-orb 3.5s ease-in-out infinite' }}
        >
          <Eye className="h-7 w-7 text-[#FEE500]" />
        </div>
      </div>
    </div>
  )
}
