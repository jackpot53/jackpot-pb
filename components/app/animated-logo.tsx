export function AnimatedLogo({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <style>{`
        @keyframes ll-b1 { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-3px) rotate(2deg)} }
        @keyframes ll-b2 { 0%,100%{transform:translateY(0) rotate(3deg)} 50%{transform:translateY(-4px) rotate(-2deg)} }
        @keyframes ll-cf { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes ll-sp { 0%,100%{opacity:0;transform:scale(0.3)} 50%{opacity:1;transform:scale(1)} }
        @keyframes ll-tongue { 0%,100%{transform:scaleX(1)} 50%{transform:scaleX(1.3)} }
        @keyframes ll-heartbeat { 0%,100%{transform:scale(1)} 40%{transform:scale(1.15)} 60%{transform:scale(0.95)} }
        @keyframes ll-77slot {
          0%,70%,100% { transform:translateY(0) }
          74% { transform:translateY(-5px) }
          80% { transform:translateY(2.5px) }
          86% { transform:translateY(-1.5px) }
          92% { transform:translateY(0.8px) }
        }
        @keyframes ll-brand-glow {
          0%,100% { opacity:0.88; filter:drop-shadow(0 0 2px rgba(245,200,66,0.4)) }
          50% { opacity:1; filter:drop-shadow(0 0 6px rgba(245,200,66,0.85)) }
        }
        @keyframes ll-shimmer {
          0% { fill:#d4a000 }
          30% { fill:#ffe066 }
          60% { fill:#f5c842 }
          100% { fill:#d4a000 }
        }
        .ll-m { transform-origin:20px 52px; animation:ll-b1 2.8s ease-in-out infinite; }
        .ll-f { transform-origin:58px 50px; animation:ll-b2 2.6s ease-in-out 0.35s infinite; }
        .ll-coin { transform-origin:40px 14px; animation:ll-cf 2s ease-in-out infinite; }
        .ll-sp1 { animation:ll-sp 2.2s ease-in-out 0s infinite; }
        .ll-sp2 { animation:ll-sp 2.2s ease-in-out 0.7s infinite; }
        .ll-sp3 { animation:ll-sp 2.2s ease-in-out 1.4s infinite; }
        .ll-tongue { transform-origin:26px 33px; animation:ll-tongue 1.2s ease-in-out infinite; }
        .ll-tongue2 { transform-origin:52px 31px; animation:ll-tongue 1.4s ease-in-out 0.2s infinite; }
        .ll-heart { transform-origin:40px 36px; animation:ll-heartbeat 1.8s ease-in-out infinite; }
        .ll-77 { transform-origin:22px 88px; animation:ll-77slot 3.4s ease-in-out 1.2s infinite; }
        .ll-jp { animation:ll-brand-glow 2.6s ease-in-out infinite; }
        .ll-shimmer { animation:ll-shimmer 3s ease-in-out infinite; }
      `}</style>

      {/* ── Male snake (blue, left) ── */}
      <g className="ll-m">
        <path d="M18 38 C22 46 28 48 24 56 C20 64 13 65 15 72"
          stroke="#4a7fd4" strokeWidth="10" strokeLinecap="round" fill="none"/>
        <path d="M18 38 C22 46 28 48 24 56 C20 64 13 65 15 72"
          stroke="#a8c8ff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.35"/>
        <ellipse cx="18" cy="30" rx="9" ry="8" fill="#5b8fe8"/>
        <ellipse cx="25" cy="33" rx="5" ry="3.5" fill="#6fa0f0"/>
        <circle cx="15" cy="27" r="3" fill="white"/>
        <circle cx="15.6" cy="27.2" r="1.6" fill="#1a2f6a"/>
        <circle cx="16.2" cy="26.6" r="0.5" fill="white"/>
        <circle cx="27.5" cy="32.5" r="0.9" fill="#3a60b0" opacity="0.7"/>
        <g className="ll-tongue">
          <path d="M29 35 L34 37" stroke="#ff4477" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M34 37 L33 39.5 M34 37 L36 39.5" stroke="#ff4477" strokeWidth="1" strokeLinecap="round"/>
        </g>
        <circle cx="8" cy="44" r="2.5" fill="none" stroke="#a8c8ff" strokeWidth="0.8" opacity="0.6"/>
        <path d="M10 42 L12 40 M10.5 40 L12 40 L12 41.5" stroke="#a8c8ff" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
      </g>

      {/* ── Female snake (teal-green, right) ── */}
      <g className="ll-f">
        <path d="M58 36 C54 44 48 46 52 54 C56 62 63 63 61 70"
          stroke="#3a9e68" strokeWidth="10" strokeLinecap="round" fill="none"/>
        <path d="M58 36 C54 44 48 46 52 54 C56 62 63 63 61 70"
          stroke="#a0e8b8" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.35"/>
        <ellipse cx="58" cy="28" rx="9" ry="8" fill="#4caf72"/>
        <ellipse cx="51" cy="31" rx="5" ry="3.5" fill="#5dc882"/>
        <circle cx="61" cy="25" r="3" fill="white"/>
        <circle cx="61.4" cy="25.2" r="1.6" fill="#1a4a2a"/>
        <circle cx="62" cy="24.6" r="0.5" fill="white"/>
        <line x1="59" y1="22.5" x2="58.2" y2="20.5" stroke="#1a4a2a" strokeWidth="0.9" strokeLinecap="round"/>
        <line x1="61" y1="22"   x2="61"   y2="20"   stroke="#1a4a2a" strokeWidth="0.9" strokeLinecap="round"/>
        <line x1="63" y1="22.5" x2="63.8" y2="20.5" stroke="#1a4a2a" strokeWidth="0.9" strokeLinecap="round"/>
        <circle cx="48.5" cy="30.5" r="0.9" fill="#2a7a48" opacity="0.7"/>
        <g className="ll-tongue2">
          <path d="M47 33 L42 35" stroke="#ff4477" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M42 35 L41 37.5 M42 35 L40 37.5" stroke="#ff4477" strokeWidth="1" strokeLinecap="round"/>
        </g>
        <path d="M54 20 C52 17.5 50 18.5 52 20.5 C54 22.5 56 21 54 20 Z" fill="#ff8fab"/>
        <path d="M60 20 C62 17.5 64 18.5 62 20.5 C60 22.5 58 21 60 20 Z" fill="#ff8fab"/>
        <circle cx="57" cy="20" r="2" fill="#ff5577"/>
        <circle cx="70" cy="44" r="2.5" fill="none" stroke="#a0e8b8" strokeWidth="0.8" opacity="0.6"/>
        <line x1="70" y1="46.5" x2="70" y2="50" stroke="#a0e8b8" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
        <line x1="68" y1="48.5" x2="72" y2="48.5" stroke="#a0e8b8" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
      </g>

      {/* ── Gold coin (center top) ── */}
      <g className="ll-coin">
        <circle cx="40" cy="13" r="9" fill="#f5c842" stroke="#d4a000" strokeWidth="1.2"/>
        <circle cx="40" cy="13" r="6.5" fill="none" stroke="#f0b800" strokeWidth="0.8" opacity="0.6"/>
        <text x="36.2" y="16.8" fontSize="8" fill="#a06800" fontWeight="bold">₩</text>
      </g>

      {/* ── Heart between them ── */}
      <g className="ll-heart">
        <path d="M40 38 C40 36 37 34 37 36.5 C37 39 40 41 40 41 C40 41 43 39 43 36.5 C43 34 40 36 40 38 Z"
          fill="#ff5577" opacity="0.85"/>
      </g>

      {/* ── Sparkles ── */}
      <g className="ll-sp1" style={{transformOrigin:'8px 18px'}}>
        <path d="M8 16 L8.5 18 L10 18 L8.8 19.2 L9.3 21 L8 20 L6.7 21 L7.2 19.2 L6 18 L7.5 18 Z" fill="#00f5ff"/>
      </g>
      <g className="ll-sp2" style={{transformOrigin:'70px 16px'}}>
        <path d="M70 14 L70.5 16 L72 16 L70.8 17.2 L71.3 19 L70 18 L68.7 19 L69.2 17.2 L68 16 L69.5 16 Z" fill="#f5c842"/>
      </g>
      <g className="ll-sp3" style={{transformOrigin:'74px 36px'}}>
        <path d="M74 34 L74.4 36 L76 36 L74.8 37 L75.2 39 L74 38 L72.8 39 L73.2 37 L72 36 L73.6 36 Z" fill="#7c3aed" opacity="0.9"/>
      </g>

      {/* ── Brand: 77잭팟 ── */}
      <line x1="12" y1="78" x2="68" y2="78" stroke="rgba(245,200,66,0.2)" strokeWidth="0.6"/>
      <g className="ll-77">
        <text x="22" y="91" textAnchor="middle" fontSize="11" fontWeight="bold"
          fontFamily="'Gaegu', cursive" className="ll-shimmer">77</text>
      </g>
      <g className="ll-jp">
        <text x="52" y="91" textAnchor="middle" fontSize="10" fontWeight="bold"
          fontFamily="'Nanum Pen Script', cursive" fill="#f5c842" letterSpacing="1">잭팟</text>
      </g>
    </svg>
  )
}
