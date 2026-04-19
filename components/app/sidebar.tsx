'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useMobileSidebar } from '@/components/app/mobile-sidebar-context'
import {
  Wallet,
  ArrowLeftRight,
  LineChart,
  Target,
  Sparkles,
  Bot,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  History,
  Sun,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: '목표',         href: '/goals',         icon: Target,        color: 'text-amber-400',   activeColor: 'text-amber-300'   },
  { label: '포트폴리오',   href: '/assets',         icon: Wallet,        color: 'text-emerald-400', activeColor: 'text-emerald-300' },
  { label: '오늘의 인사이트', href: '/today',        icon: Sun,           color: 'text-yellow-400',  activeColor: 'text-yellow-300'  },
  { label: '자산 거래내역', href: '/transactions',   icon: ArrowLeftRight,color: 'text-sky-400',     activeColor: 'text-sky-300'     },
  { label: '업데이트 정보',href: '/updates',        icon: History,       color: 'text-teal-400',    activeColor: 'text-teal-300'    },
  { label: '도움말',       href: '/help',           icon: HelpCircle,    color: 'text-zinc-400',    activeColor: 'text-zinc-300'    },
  { label: '차트',         href: '/charts',         icon: LineChart,     color: 'text-violet-400',  activeColor: 'text-violet-300'  },
  { label: '인사이트',     href: '/insights',       icon: Sparkles,      color: 'text-pink-400',    activeColor: 'text-pink-300'    },
  { label: '모의투자',     href: '/paper-trading',  icon: TrendingUp,    color: 'text-cyan-400',    activeColor: 'text-cyan-300'    },
  { label: '로보어드바이저', href: '/robo-advisor',   icon: Bot,           color: 'text-orange-400',  activeColor: 'text-orange-300'  },
]

const SYMBOLS = ['7', '₩', '★', '♦', '♠']

function Reel({ symbol, isSpinning }: { symbol: string; isSpinning: boolean }) {
  const [display, setDisplay] = useState(symbol)

  useEffect(() => {
    if (!isSpinning) { setDisplay(symbol); return }
    const id = setInterval(() => {
      setDisplay(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
    }, 70)
    return () => clearInterval(id)
  }, [isSpinning, symbol])

  return (
    <div className={cn(
      'flex items-center justify-center w-6 h-8 rounded text-sm font-black select-none transition-opacity duration-100',
      'bg-muted border border-border',
      isSpinning ? 'blur-[1.5px] opacity-60' : '',
      !isSpinning && display === '7' ? 'text-amber-500' : 'text-foreground/80',
    )}>
      {display}
    </div>
  )
}

function MiniSlotMachine() {
  const [symbols, setSymbols] = useState(['7', '7', '7'])
  const [spinning, setSpinning] = useState([false, false, false])
  const [jackpot, setJackpot] = useState(true)
  const runningRef = useRef(false)

  function spin() {
    if (runningRef.current) return
    runningRef.current = true
    setJackpot(false)
    setSpinning([true, true, true])

    const isWin = Math.random() < 0.2
    const result = isWin
      ? ['7', '7', '7']
      : Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])

    ;[900, 1500, 2100].forEach((t, i) => {
      setTimeout(() => {
        setSymbols(prev => { const n = [...prev]; n[i] = result[i]; return n })
        setSpinning(prev => { const n = [...prev]; n[i] = false; return n })
        if (i === 2) {
          runningRef.current = false
          if (isWin) setJackpot(true)
        }
      }, t)
    })
  }

  useEffect(() => {
    const init = setTimeout(spin, 1200)
    return () => clearTimeout(init)
  }, [])

  const isJackpot = jackpot && symbols.every(s => s === '7')

  return (
    <>
      <style>{`
        @keyframes jp-flash { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes jp-glow  { 0%,100%{box-shadow:0 0 8px rgba(251,191,36,0.5)} 50%{box-shadow:0 0 20px rgba(251,191,36,1)} }
      `}</style>
      <button
        onClick={spin}
        title="SPIN!"
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-xl border transition-colors duration-300 cursor-pointer',
          isJackpot
            ? 'border-amber-400 bg-amber-50'
            : 'border-border bg-background hover:border-border/70 hover:bg-muted'
        )}
        style={isJackpot ? { animation: 'jp-glow 1s ease-in-out infinite' } : {}}
      >
        <div className="flex items-center gap-0.5">
          {symbols.map((sym, i) => (
            <Reel key={i} symbol={sym} isSpinning={spinning[i]} />
          ))}
        </div>
        {isJackpot && (
          <span
            className="text-[9px] font-black text-amber-500 tracking-widest"
            style={{ animation: 'jp-flash 0.6s ease-in-out infinite' }}
          >
            JACKPOT!
          </span>
        )}
      </button>
    </>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sidebar-collapsed') === 'true'
  })
  const { isOpen: isMobileOpen, close: closeMobile } = useMobileSidebar()

  const handleCollapse = (next: boolean) => {
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  return (
    <>
      {/* 모바일 백드롭 */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300',
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={closeMobile}
      />
      <aside
        data-component="Sidebar"
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 h-screen border-r border-sidebar-border bg-sidebar flex flex-col shrink-0 overflow-hidden',
          'transition-[transform,width] duration-300',
          collapsed ? 'lg:w-14' : 'lg:w-60',
          'w-60',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
      {/* 헤더: 슬롯머신 + 토글 */}
      <div className="relative flex h-14 items-center justify-center shrink-0 border-b border-sidebar-border">
        {!collapsed && <MiniSlotMachine />}
        <button
          onClick={() => handleCollapse(!collapsed)}
          className={cn(
            'p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-md',
            collapsed ? '' : 'absolute right-2'
          )}
          aria-label={collapsed ? '펼치기' : '접기'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* 자연인의 욕망 씬 - 낮 버전 */}
      <div className="shrink-0 w-full overflow-hidden border-b border-sidebar-border" style={{ height: collapsed ? 56 : 96 }}>
        <style>{`
          @keyframes sn-bird1 { 0%{transform:translateX(-10px)} 100%{transform:translateX(260px)} }
          @keyframes sn-bird2 { 0%{transform:translateX(-10px)} 100%{transform:translateX(260px)} }
          @keyframes sn-bird3 { 0%{transform:translateX(-20px)} 100%{transform:translateX(260px)} }
          @keyframes sn-tree  { 0%,100%{transform-origin:bottom center;transform:rotate(-1deg)} 50%{transform:rotate(1.5deg)} }
          @keyframes sn-person{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
          @keyframes sn-smoke { 0%{transform:translateY(0) scaleX(1);opacity:.4} 100%{transform:translateY(-12px) scaleX(1.6);opacity:0} }
          @keyframes sn-sun   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
          @keyframes sn-cloud { 0%{transform:translateX(-20px)} 100%{transform:translateX(260px)} }
        `}</style>
        <svg viewBox="0 0 240 96" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="sn-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bfdbfe"/>
              <stop offset="100%" stopColor="#e0f2fe"/>
            </linearGradient>
            <linearGradient id="sn-ground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#86efac"/>
              <stop offset="100%" stopColor="#4ade80"/>
            </linearGradient>
            <linearGradient id="sn-mt1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#93c5fd"/>
              <stop offset="100%" stopColor="#bfdbfe"/>
            </linearGradient>
            <linearGradient id="sn-mt2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a5b4fc"/>
              <stop offset="100%" stopColor="#c7d2fe"/>
            </linearGradient>
          </defs>
          <rect width="240" height="96" fill="url(#sn-sky)"/>
          {/* 태양 */}
          <g style={{animation:'sn-sun 5s ease-in-out infinite'}}>
            <circle cx="195" cy="18" r="10" fill="#fde68a" opacity="0.95"/>
            <circle cx="195" cy="18" r="13" fill="#fde68a" opacity="0.25"/>
          </g>
          {/* 구름 */}
          <g style={{animation:'sn-cloud 25s linear 0s infinite'}} opacity="0.85">
            <ellipse cx="40" cy="22" rx="16" ry="7" fill="white"/>
            <ellipse cx="52" cy="19" rx="12" ry="8" fill="white"/>
            <ellipse cx="28" cy="21" rx="10" ry="6" fill="white"/>
          </g>
          <g style={{animation:'sn-cloud 35s linear 8s infinite'}} opacity="0.7">
            <ellipse cx="10" cy="14" rx="12" ry="5" fill="white"/>
            <ellipse cx="20" cy="11" rx="9" ry="6" fill="white"/>
          </g>
          {/* 산 */}
          <polygon points="0,65 40,30 80,65" fill="url(#sn-mt1)" opacity="0.7"/>
          <polygon points="50,65 100,22 150,65" fill="url(#sn-mt2)" opacity="0.8"/>
          <polygon points="120,65 170,30 220,65" fill="url(#sn-mt1)" opacity="0.65"/>
          <polygon points="180,65 230,35 260,65" fill="url(#sn-mt2)" opacity="0.7"/>
          {/* 땅 */}
          <rect x="0" y="65" width="240" height="31" fill="url(#sn-ground)"/>
          {/* 집 */}
          <rect x="148" y="52" width="22" height="14" fill="#fef3c7" rx="1"/>
          <polygon points="145,53 170,53 157.5,43" fill="#f97316" opacity="0.8"/>
          <rect x="152" y="55" width="5" height="5" fill="#7dd3fc" opacity="0.8" rx="0.5"/>
          <rect x="161" y="55" width="5" height="5" fill="#7dd3fc" opacity="0.6" rx="0.5"/>
          <circle cx="165" cy="43" r="1.8" fill="#d1d5db" style={{animation:'sn-smoke 3s ease-out infinite'}}/>
          <circle cx="166" cy="43" r="1.3" fill="#e5e7eb" style={{animation:'sn-smoke 3s ease-out 1s infinite'}}/>
          {/* 나무 */}
          {([[30,65,10],[42,65,8],[55,65,12],[200,65,9],[212,65,11]] as [number,number,number][]).map(([x,y,h],i)=>(
            <g key={i} style={{animation:`sn-tree ${2.5+i*0.4}s ease-in-out ${i*0.5}s infinite`}}>
              <rect x={x-1} y={y-h*0.4} width="2" height={h*0.4} fill="#92400e" opacity="0.7"/>
              <circle cx={x} cy={y-h*0.5} r={h*0.45} fill="#4ade80" opacity="0.85"/>
              <circle cx={x} cy={y-h*0.5} r={h*0.3} fill="#22c55e" opacity="0.6"/>
            </g>
          ))}
          {/* 사람 */}
          <g style={{animation:'sn-person 3s ease-in-out infinite'}}>
            <line x1="105" y1="75" x2="105" y2="83" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="105" cy="73" r="2.5" fill="#fbbf24"/>
            <line x1="105" y1="77" x2="100" y2="74" stroke="#374151" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="105" y1="77" x2="110" y2="74" stroke="#374151" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="105" y1="83" x2="102" y2="88" stroke="#374151" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="105" y1="83" x2="108" y2="88" stroke="#374151" strokeWidth="1.2" strokeLinecap="round"/>
          </g>
          {/* 새 */}
          <g style={{animation:'sn-bird1 9s linear 0s infinite'}}>
            <path d="M10,28 Q12,25 14,28 Q16,25 18,28" stroke="#374151" strokeWidth="0.8" fill="none" opacity="0.6"/>
          </g>
          <g style={{animation:'sn-bird2 12s linear 2s infinite'}}>
            <path d="M5,22 Q7,19 9,22 Q11,19 13,22" stroke="#374151" strokeWidth="0.7" fill="none" opacity="0.5"/>
          </g>
          <g style={{animation:'sn-bird3 10s linear 5s infinite'}}>
            <path d="M8,33 Q10,30 12,33 Q14,30 16,33" stroke="#374151" strokeWidth="0.6" fill="none" opacity="0.5"/>
          </g>
        </svg>
      </div>

      <nav className="flex-1 px-2 space-y-1.5 pt-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobile}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group flex items-center gap-3 border rounded-lg transition-all duration-200',
                collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
                isActive
                  ? 'bg-foreground border-foreground shadow-sm'
                  : 'bg-sidebar border-sidebar-border hover:bg-sidebar-accent hover:border-sidebar-border/70 hover:shadow-sm'
              )}
            >
              <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-200">
                <Icon size={15} className={cn(isActive ? item.activeColor : item.color)} />
              </div>
              {!collapsed && (
                <span className={cn(
                  'whitespace-nowrap text-sm font-light transition-colors duration-200 font-[family-name:var(--font-sunflower)]',
                  isActive ? 'text-background' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'
                )}>
                  {item.label}
                </span>
              )}
              {!collapsed && isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-background/60" />
              )}
            </Link>
          )
        })}
      </nav>
      </aside>
    </>
  )
}
