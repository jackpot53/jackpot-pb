// 고정 배경 — 색상 orb + 미세 파티클 (서버 컴포넌트, hooks 없음)
// pointer-events: none, z-index: 0 이므로 콘텐츠에 영향 없음

const ORBS = [
  // color, width, height, top, left, animDuration, animDelay, keyframe
  { bg: 'rgb(167 139 250 / 0.20)', w: 520, h: 520, top: '-120px', left: '-100px', dur: '10s', delay: '0s',   kf: 'bg-orb-a' },
  { bg: 'rgb(96  165 250 / 0.16)', w: 440, h: 440, top: 'auto',   left: 'auto', bottom: '-80px', right: '-80px', dur: '13s', delay: '2s', kf: 'bg-orb-b' },
  { bg: 'rgb(52  211 153 / 0.13)', w: 340, h: 340, top: '55%',    left: '5%',   dur: '17s', delay: '3.5s', kf: 'bg-orb-d' },
  { bg: 'rgb(250 204  21 / 0.11)', w: 300, h: 300, top: '10%',    left: '40%',  dur: '19s', delay: '0.5s', kf: 'bg-orb-e' },
]

const PARTICLES = [
  { top: '8%',  left: '12%', dur: '4s',   delay: '0s'   },
  { top: '22%', left: '35%', dur: '5.5s', delay: '1.2s' },
  { top: '45%', left: '55%', dur: '3.8s', delay: '2.4s' },
  { top: '68%', left: '25%', dur: '6s',   delay: '0.8s' },
  { top: '80%', left: '78%', dur: '4.5s', delay: '3s'   },
  { top: '15%', left: '88%', dur: '5s',   delay: '1.8s' },
  { top: '55%', left: '8%',  dur: '3.5s', delay: '4.5s' },
  { top: '35%', left: '72%', dur: '6.5s', delay: '0.3s' },
  { top: '90%', left: '45%', dur: '4.2s', delay: '2s'   },
]

export function BackgroundCanvas() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <style>{`
        @keyframes bg-orb-a {
          0%,100% { transform: translate(0,0) scale(1); }
          25%      { transform: translate(18px,-24px) scale(1.05); }
          50%      { transform: translate(-12px, 16px) scale(0.97); }
          75%      { transform: translate(22px, 10px) scale(1.03); }
        }
        @keyframes bg-orb-b {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(-20px, 14px) scale(1.06); }
          66%      { transform: translate(14px,-18px) scale(0.96); }
        }
        @keyframes bg-orb-d {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(24px,-16px) scale(1.07); }
        }
        @keyframes bg-orb-e {
          0%,100% { transform: translate(0,0) scale(1); }
          30%      { transform: translate(-10px, 20px) scale(1.04); }
          70%      { transform: translate(16px,-10px) scale(0.98); }
        }
        @keyframes bg-particle {
          0%,100% { opacity:0.15; transform:scale(0.8) translateY(0); }
          50%      { opacity:0.55; transform:scale(1.4) translateY(-8px); }
        }
        @keyframes bg-grid-drift {
          0%,100% { background-position: 0px 0px; }
          50%      { background-position: 14px 14px; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-bg-anim] { animation: none !important; }
        }
      `}</style>

      {/* 그리드 패턴 — 천천히 흐름 */}
      <div
        data-bg-anim=""
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, rgb(139 92 246) 1px, transparent 0)',
          backgroundSize: '28px 28px',
          animation: 'bg-grid-drift 20s ease-in-out infinite',
        }}
      />

      {/* 색상 orb 블롭들 */}
      {ORBS.map((orb, i) => (
        <div
          key={i}
          data-bg-anim=""
          className="absolute rounded-full"
          style={{
            width: orb.w,
            height: orb.h,
            top: orb.top,
            left: orb.left,
            bottom: (orb as { bottom?: string }).bottom,
            right: (orb as { right?: string }).right,
            background: orb.bg,
            filter: 'blur(48px)',
            animation: `${orb.kf} ${orb.dur} ease-in-out ${orb.delay} infinite`,
          }}
        />
      ))}

      {/* 미세 파티클 점들 */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          data-bg-anim=""
          className="absolute rounded-full hidden md:block"
          style={{
            top: p.top,
            left: p.left,
            width: 4 + (i % 3) * 2,
            height: 4 + (i % 3) * 2,
            background: [
              'rgb(167 139 250)',
              'rgb(96 165 250)',
              'rgb(52 211 153)',
              'rgb(250 204 21)',
              'rgb(251 113 133)',
              'rgb(34 211 238)',
            ][i % 6],
            animation: `bg-particle ${p.dur} ease-in-out ${p.delay} infinite`,
          }}
        />
      ))}
    </div>
  )
}
