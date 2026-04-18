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
} from 'lucide-react'

const NAV_ITEMS = [
  { label: '목표', href: '/goals', icon: Target, color: 'text-foreground/70', bg: 'bg-foreground/5', activeBg: 'bg-foreground/10', activeColor: 'text-foreground' },
  { label: '포트폴리오', href: '/assets', icon: Wallet, color: 'text-foreground/70', bg: 'bg-foreground/5', activeBg: 'bg-foreground/10', activeColor: 'text-foreground' },
  { label: '거래내역', href: '/transactions', icon: ArrowLeftRight, color: 'text-foreground/70', bg: 'bg-foreground/5', activeBg: 'bg-foreground/10', activeColor: 'text-foreground' },
  { label: '차트', href: '/charts', icon: LineChart, color: 'text-foreground/70', bg: 'bg-foreground/5', activeBg: 'bg-foreground/10', activeColor: 'text-foreground' },
  { label: '인사이트', href: '/insights', icon: Sparkles, color: 'text-foreground/70', bg: 'bg-foreground/5', activeBg: 'bg-foreground/10', activeColor: 'text-foreground' },
  { label: '모의투자', href: '/paper-trading', icon: TrendingUp, color: 'text-foreground/70', bg: 'bg-foreground/5', activeBg: 'bg-foreground/10', activeColor: 'text-foreground' },
  { label: '로보어드바이저', href: '/robo-advisor', icon: Bot, color: 'text-foreground/70', bg: 'bg-foreground/5', activeBg: 'bg-foreground/10', activeColor: 'text-foreground' },
  { label: '도움말', href: '/help', icon: HelpCircle, color: 'text-foreground/70', bg: 'bg-foreground/5', activeBg: 'bg-foreground/10', activeColor: 'text-foreground' },
  { label: '업데이트 내역', href: '/updates', icon: History, color: 'text-foreground/70', bg: 'bg-foreground/5', activeBg: 'bg-foreground/10', activeColor: 'text-foreground' },
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
      'bg-black/50 border border-white/[0.12]',
      isSpinning ? 'blur-[1.5px] opacity-60' : '',
      !isSpinning && display === '7' ? 'text-amber-400' : 'text-white/85',
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
        @keyframes jp-glow  { 0%,100%{box-shadow:0 0 8px rgba(251,191,36,0.4)} 50%{box-shadow:0 0 20px rgba(251,191,36,0.9)} }
      `}</style>
      <button
        onClick={spin}
        title="SPIN!"
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-xl border transition-colors duration-300 cursor-pointer',
          isJackpot
            ? 'border-amber-400/50 bg-amber-400/10'
            : 'border-white/[0.08] bg-black/30 hover:border-white/20 hover:bg-white/[0.05]'
        )}
        style={isJackpot ? { animation: 'jp-glow 1s ease-in-out infinite' } : {}}
      >
        {/* 릴 3개 */}
        <div className="flex items-center gap-0.5">
          {symbols.map((sym, i) => (
            <Reel key={i} symbol={sym} isSpinning={spinning[i]} />
          ))}
        </div>
        {/* 잭팟 텍스트 */}
        {isJackpot && (
          <span
            className="text-[9px] font-black text-amber-400 tracking-widest"
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
  const [collapsed, setCollapsed] = useState(false)
  const { isOpen: isMobileOpen, close: closeMobile } = useMobileSidebar()

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
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 h-screen border-r border-white flex flex-col shrink-0 overflow-hidden',
          'transition-[transform,width] duration-300',
          collapsed ? 'lg:w-14' : 'lg:w-60',
          'w-60',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{ background: 'linear-gradient(to bottom, #000000 0%, #0d0f2b 60%, #1a1a4e 100%)' }}
      >
      {/* 헤더: 슬롯머신 + 토글 */}
      <div className="relative flex h-14 items-center justify-center shrink-0 border-b border-white/[0.08]">
        {!collapsed && <MiniSlotMachine />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-1.5 text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-colors rounded-md',
            collapsed ? '' : 'absolute right-2'
          )}
          aria-label={collapsed ? '펼치기' : '접기'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* 자연인의 욕망 씬 */}
      <div className="shrink-0 w-full overflow-hidden" style={{ height: collapsed ? 56 : 96 }}>
        <style>{`
          @keyframes sn-bird1 { 0%{transform:translateX(-10px)} 100%{transform:translateX(260px)} }
          @keyframes sn-bird2 { 0%{transform:translateX(-10px)} 100%{transform:translateX(260px)} }
          @keyframes sn-bird3 { 0%{transform:translateX(-20px)} 100%{transform:translateX(260px)} }
          @keyframes sn-tree  { 0%,100%{transform-origin:bottom center;transform:rotate(-1deg)} 50%{transform:rotate(1.5deg)} }
          @keyframes sn-person{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
          @keyframes sn-smoke { 0%{transform:translateY(0) scaleX(1);opacity:.5} 100%{transform:translateY(-12px) scaleX(1.6);opacity:0} }
          @keyframes sn-star  { 0%,100%{opacity:.15} 50%{opacity:.7} }
          @keyframes sn-moon  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
        `}</style>
        <svg viewBox="0 0 240 96" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="sn-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a0a1a"/>
              <stop offset="60%" stopColor="#1a1040"/>
              <stop offset="100%" stopColor="#2d1b4e"/>
            </linearGradient>
            <linearGradient id="sn-ground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d2010"/>
              <stop offset="100%" stopColor="#060e08"/>
            </linearGradient>
          </defs>
          <rect width="240" height="96" fill="url(#sn-sky)"/>
          {[[20,8],[55,5],[90,12],[130,4],[160,9],[195,6],[215,13],[35,18],[110,3],[175,16]].map(([x,y],i)=>(
            <circle key={i} cx={x} cy={y} r={i%3===0?1:0.7} fill="white" style={{animation:`sn-star ${1.8+i*0.3}s ease-in-out ${i*0.4}s infinite`}}/>
          ))}
          <g style={{animation:'sn-moon 6s ease-in-out infinite'}}>
            <circle cx="195" cy="18" r="8" fill="#fffbe0" opacity="0.85"/>
            <circle cx="198" cy="15" r="6.5" fill="#1a1040"/>
          </g>
          <polygon points="0,65 40,30 80,65" fill="#0f0820" opacity="0.9"/>
          <polygon points="50,65 100,25 150,65" fill="#0d0b1e" opacity="0.95"/>
          <polygon points="120,65 170,32 220,65" fill="#100d22"/>
          <polygon points="180,65 230,38 260,65" fill="#0e0c1e"/>
          <rect x="0" y="65" width="240" height="31" fill="url(#sn-ground)"/>
          <rect x="148" y="52" width="22" height="16" fill="#1a2e10" rx="1"/>
          <polygon points="145,53 170,53 157.5,43" fill="#132208"/>
          <rect x="152" y="55" width="5" height="5" fill="#ffe066" opacity="0.6" rx="0.5"/>
          <rect x="161" y="55" width="5" height="5" fill="#ffe066" opacity="0.4" rx="0.5"/>
          <circle cx="165" cy="43" r="2" fill="#aaa" style={{animation:'sn-smoke 2s ease-out infinite'}}/>
          <circle cx="166" cy="43" r="1.5" fill="#999" style={{animation:'sn-smoke 2s ease-out 0.7s infinite'}}/>
          {([[30,65,10],[42,65,8],[55,65,12],[200,65,9],[212,65,11]] as [number,number,number][]).map(([x,y,h],i)=>(
            <g key={i} style={{animation:`sn-tree ${2.5+i*0.4}s ease-in-out ${i*0.5}s infinite`}}>
              <polygon points={`${x},${y} ${x-h*0.45},${y} ${x},${y-h}`} fill="#0d2010"/>
              <polygon points={`${x},${y} ${x+h*0.45},${y} ${x},${y-h}`} fill="#112a14"/>
            </g>
          ))}
          <g style={{animation:'sn-person 3s ease-in-out infinite'}}>
            <line x1="105" y1="75" x2="105" y2="83" stroke="#a0c8ff" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="105" cy="73" r="2.5" fill="#a0c8ff"/>
            <line x1="105" y1="77" x2="100" y2="74" stroke="#a0c8ff" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="105" y1="77" x2="110" y2="74" stroke="#a0c8ff" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="105" y1="83" x2="102" y2="88" stroke="#a0c8ff" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="105" y1="83" x2="108" y2="88" stroke="#a0c8ff" strokeWidth="1.2" strokeLinecap="round"/>
          </g>
          <g style={{animation:'sn-bird1 9s linear 0s infinite'}}>
            <path d="M10,28 Q12,25 14,28 Q16,25 18,28" stroke="white" strokeWidth="0.8" fill="none" opacity="0.7"/>
          </g>
          <g style={{animation:'sn-bird2 12s linear 2s infinite'}}>
            <path d="M5,22 Q7,19 9,22 Q11,19 13,22" stroke="white" strokeWidth="0.7" fill="none" opacity="0.5"/>
          </g>
          <g style={{animation:'sn-bird3 10s linear 5s infinite'}}>
            <path d="M8,33 Q10,30 12,33 Q14,30 16,33" stroke="white" strokeWidth="0.6" fill="none" opacity="0.6"/>
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
                'group flex items-center gap-3 rounded-xl border transition-colors duration-200',
                collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
                isActive
                  ? 'bg-indigo-500/20 border-indigo-400/40 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                  : 'bg-white/[0.04] border-white/[0.07] hover:bg-white/[0.09] hover:border-white/[0.15]'
              )}
            >
              <div className={cn(
                'shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-200',
                isActive ? item.activeBg : cn(item.bg, 'group-hover:brightness-125')
              )}>
                <Icon size={15} className={cn(isActive ? item.activeColor : item.color)} />
              </div>
              {!collapsed && (
                <span className={cn(
                  'whitespace-nowrap text-sm tracking-wide transition-colors duration-200',
                  isActive ? 'text-indigo-100' : 'text-white/50 group-hover:text-white/80'
                )} style={{ fontFamily: "'Sunflower', sans-serif", fontWeight: 300 }}>
                  {item.label}
                </span>
              )}
              {!collapsed && isActive && (
                <div className="ml-auto w-1 h-1 rounded-full bg-indigo-300" />
              )}
            </Link>
          )
        })}
      </nav>
      </aside>
    </>
  )
}
