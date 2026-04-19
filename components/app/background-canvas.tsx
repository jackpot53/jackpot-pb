// 고정 배경 — 그리드 패턴만 표시 (서버 컴포넌트, hooks 없음)
// pointer-events: none, z-index: 0 이므로 콘텐츠에 영향 없음

export function BackgroundCanvas() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <style>{`
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

    </div>
  )
}
