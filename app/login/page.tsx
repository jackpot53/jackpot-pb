'use client'
import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, Mail, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { signIn, signUp } from './actions'
import { AnimatedLogo } from '@/components/app/animated-logo'



const authSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요.'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다.'),
})

type AuthFormValues = z.infer<typeof authSchema>

// Gold coin rain
const GOLD_DROPS = [
  { sym: '₩', left: '4%',  size: 22, dur: '6s',   delay: '0s'   },
  { sym: '₩', left: '11%', size: 16, dur: '8.5s', delay: '1.5s' },
  { sym: '₩', left: '19%', size: 20, dur: '7s',   delay: '3.2s' },
  { sym: '₩', left: '27%', size: 14, dur: '5.5s', delay: '0.8s' },
  { sym: '₩', left: '36%', size: 18, dur: '9s',   delay: '2.4s' },
  { sym: '₩', left: '46%', size: 24, dur: '6.5s', delay: '4.1s' },
  { sym: '₩', left: '56%', size: 17, dur: '7.5s', delay: '1.2s' },
  { sym: '₩', left: '64%', size: 21, dur: '5s',   delay: '2.9s' },
  { sym: '₩', left: '73%', size: 16, dur: '8s',   delay: '0.4s' },
  { sym: '₩', left: '81%', size: 19, dur: '6s',   delay: '3.7s' },
  { sym: '₩', left: '89%', size: 14, dur: '7s',   delay: '1.8s' },
  { sym: '₩', left: '95%', size: 22, dur: '5.5s', delay: '0.6s' },
]

// Rising green arrows
const RISE_ARROWS = [
  { left: '7%',  size: 24, dur: '5s',   delay: '0s'   },
  { left: '15%', size: 18, dur: '7.5s', delay: '1.8s' },
  { left: '25%', size: 22, dur: '6s',   delay: '0.9s' },
  { left: '35%', size: 16, dur: '8s',   delay: '2.5s' },
  { left: '44%', size: 20, dur: '5.5s', delay: '1.2s' },
  { left: '53%', size: 26, dur: '7s',   delay: '3.5s' },
  { left: '62%', size: 18, dur: '6.5s', delay: '0.5s' },
  { left: '72%', size: 22, dur: '5s',   delay: '2.1s' },
  { left: '82%', size: 20, dur: '7s',   delay: '1.4s' },
  { left: '91%', size: 16, dur: '6s',   delay: '3s'   },
]

// Asset emoji particles rising from bottom
const ASSET_PARTICLES = [
  { icon: '🏠', left: '6%',  size: 22, dur: '9s',   delay: '0s'   },
  { icon: '📈', left: '13%', size: 18, dur: '11s',  delay: '2.5s' },
  { icon: '💰', left: '21%', size: 24, dur: '8s',   delay: '1.2s' },
  { icon: '🏢', left: '30%', size: 20, dur: '12s',  delay: '4s'   },
  { icon: '💎', left: '39%', size: 18, dur: '9.5s', delay: '0.7s' },
  { icon: '📊', left: '48%', size: 22, dur: '10s',  delay: '3.2s' },
  { icon: '🪙', left: '57%', size: 20, dur: '8.5s', delay: '1.8s' },
  { icon: '🏠', left: '66%', size: 18, dur: '11s',  delay: '5s'   },
  { icon: '💵', left: '75%', size: 24, dur: '9s',   delay: '2s'   },
  { icon: '📈', left: '83%', size: 20, dur: '10.5s',delay: '0.4s' },
  { icon: '💰', left: '91%', size: 18, dur: '8s',   delay: '3.8s' },
]

// Gold sparkle particles
const GOLD_PARTICLES = [
  { left: '8%',  top: '15%', size: 5, dur: '3s',   delay: '0s'   },
  { left: '20%', top: '42%', size: 4, dur: '2.5s', delay: '0.8s' },
  { left: '33%', top: '28%', size: 6, dur: '4s',   delay: '1.6s' },
  { left: '45%', top: '65%', size: 4, dur: '3.2s', delay: '0.3s' },
  { left: '58%', top: '20%', size: 5, dur: '2.8s', delay: '2.1s' },
  { left: '67%', top: '55%', size: 6, dur: '3.5s', delay: '1s'   },
  { left: '78%', top: '35%', size: 4, dur: '4s',   delay: '0.5s' },
  { left: '88%', top: '70%', size: 5, dur: '2.6s', delay: '1.8s' },
  { left: '15%', top: '80%', size: 4, dur: '3.8s', delay: '2.5s' },
  { left: '52%', top: '48%', size: 6, dur: '3s',   delay: '0.9s' },
  { left: '72%', top: '12%', size: 5, dur: '2.4s', delay: '1.4s' },
  { left: '38%', top: '88%', size: 4, dur: '3.6s', delay: '0.2s' },
]

const BADGES = [
  { label: '+12.4%',  sub: '올해 수익률', top: '14%', right: '4%',   delay: '0s'   },
  { label: '₩2.4억',  sub: '총 자산',    top: '50%', left: '2%',    delay: '1.5s' },
  { label: '+₩320만', sub: '이번 달',    bottom: '20%', right: '5%', delay: '0.8s' },
]

const TICKERS = ['AAPL +1.2%','TSLA +3.8%','005930 +0.9%','BTC +4.2%','ETH +2.7%','NVDA +5.1%','035720 +1.4%','SPY +0.6%']

function AuthForm() {
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get('redirect') ?? '/'
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [serverError, setServerError] = useState<string | null>(null)
  const [signUpSuccess, setSignUpSuccess] = useState(false)

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: '', password: '' },
  })

  const { isSubmitting } = form.formState

  async function onSubmit(values: AuthFormValues) {
    setServerError(null)
    setSignUpSuccess(false)
    try {
      if (mode === 'login') {
        const result = await signIn(values.email, values.password)
        if (result?.error) {
          setServerError('이메일 또는 비밀번호가 올바르지 않습니다.')
        } else {
          router.push(redirectPath.startsWith('/') && !redirectPath.startsWith('//') ? redirectPath : '/')
          router.refresh()
        }
      } else {
        const result = await signUp(values.email, values.password)
        if (result?.error) {
          setServerError(result.error)
        } else {
          setSignUpSuccess(true)
          form.reset()
        }
      }
    } catch {
      setServerError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <>
      {/* Logo */}
      <div className="flex flex-col items-center mb-6">
        <AnimatedLogo size={72} />
      </div>

      {/* Mode tabs */}
      <div className="flex rounded-2xl p-1 mb-6"
        style={{ background: 'rgba(245,200,66,0.05)', border: '1px solid rgba(245,200,66,0.12)' }}>
        {(['login', 'signup'] as const).map((m) => (
          <button key={m} type="button"
            onClick={() => { setMode(m); setServerError(null) }}
            className="flex-1 py-2.5 text-xs font-bold tracking-widest rounded-xl transition-all"
            style={mode === m ? {
              background: 'linear-gradient(135deg, rgba(245,200,66,0.22), rgba(249,115,22,0.18))',
              color: '#f5c842',
              boxShadow: '0 0 16px rgba(245,200,66,0.18)',
            } : { color: 'rgba(255,255,255,0.25)' }}>
            {m === 'login' ? '로그인' : '계정 만들기'}
          </button>
        ))}
      </div>

      {signUpSuccess && (
        <div className="text-sm rounded-xl p-4 flex flex-col gap-1 mb-4"
          style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <p className="font-semibold" style={{ color: '#34d399' }}>이메일을 확인해주세요</p>
          <p className="leading-relaxed" style={{ color: 'rgba(52,211,153,0.65)' }}>
            가입 확인 링크를 이메일로 보냈습니다.<br />
            받은 메일함에서 <strong>&quot;Confirm your signup&quot;</strong> 링크를 클릭해주세요.
          </p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-xl px-4 py-3.5 transition-all"
                style={{ background: 'rgba(245,200,66,0.04)', border: '1px solid rgba(245,200,66,0.14)' }}>
                <FormLabel className="shrink-0" style={{ color: 'rgba(245,200,66,0.55)' }}>
                  <Mail className="w-4 h-4" />
                </FormLabel>
                <div className="flex-1 min-w-0">
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      autoComplete="email"
                      disabled={isSubmitting}
                      className="h-8 border-none bg-transparent p-0 shadow-none focus-visible:ring-0 text-sm text-white placeholder:text-slate-600"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-xl px-4 py-3.5 transition-all"
                style={{ background: 'rgba(245,200,66,0.04)', border: '1px solid rgba(245,200,66,0.14)' }}>
                <FormLabel className="shrink-0" style={{ color: 'rgba(245,200,66,0.55)' }}>
                  <Lock className="w-4 h-4" />
                </FormLabel>
                <div className="flex-1 min-w-0">
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="패스워드 입력"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      disabled={isSubmitting}
                      className="h-8 border-none bg-transparent p-0 shadow-none focus-visible:ring-0 text-sm text-white placeholder:text-slate-600"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  {serverError && (
                    <p className="text-xs mt-1" style={{ color: '#f87171' }} role="alert">{serverError}</p>
                  )}
                </div>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 mt-1 font-black rounded-xl border-0 text-sm tracking-[0.12em] uppercase"
            style={{
              background: 'linear-gradient(135deg, #f5c842 0%, #f97316 50%, #e11d48 100%)',
              backgroundSize: '200% 100%',
              boxShadow: '0 4px 28px rgba(245,200,66,0.35), 0 0 60px rgba(249,115,22,0.12)',
              color: '#1a0800',
              animation: 'btnShimmer 3s ease infinite',
            }}
          >
            {isSubmitting
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'login' ? '인증 중...' : '등록 중...'}</>
              : mode === 'login' ? '시작하기 →' : '계정 생성 →'
            }
          </Button>
        </form>
      </Form>

      <div className="flex items-center gap-3 mt-6">
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(245,200,66,0.15))' }} />
        <span className="text-xs" style={{ color: 'rgba(245,200,66,0.3)' }}>✦</span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(245,200,66,0.15))' }} />
      </div>

      <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
        {mode === 'login' ? (
          <>
            처음이신가요?{' '}
            <button type="button"
              className="font-bold transition-colors"
              style={{ color: '#f5c842' }}
              onClick={() => { setMode('signup'); setServerError(null) }}>
              계정 만들기 →
            </button>
          </>
        ) : (
          <>
            이미 계정이 있으신가요?{' '}
            <button type="button"
              className="font-bold transition-colors"
              style={{ color: '#f5c842' }}
              onClick={() => { setMode('login'); setServerError(null) }}>
              로그인 →
            </button>
          </>
        )}
      </p>
    </>
  )
}

export default function LoginPage() {
  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33%       { transform: translateY(-10px) rotate(3deg); }
          66%       { transform: translateY(-5px) rotate(-2deg); }
        }
        @keyframes floatBadge {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-7px); }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes nodeGlow {
          0%, 100% { opacity: 0.2; r: 3; }
          50%       { opacity: 1;   r: 5; }
        }
        @keyframes edgePulse {
          0%, 100% { opacity: 0.04; }
          50%       { opacity: 0.18; }
        }
        @keyframes drawLine {
          0%   { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes drawLine2 {
          0%   { stroke-dashoffset: 800; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes candleUp {
          0%   { transform: scaleY(0); opacity: 0; }
          100% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pricePop {
          0%   { opacity: 0; transform: translateY(6px) scale(0.9); }
          15%  { opacity: 1; transform: translateY(0) scale(1); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-6px); }
        }
        @keyframes barGrow {
          0%   { height: 0%; opacity: 0; }
          100% { height: var(--bar-h); opacity: 1; }
        }
        @keyframes sparkDot {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.3); }
        }
        @keyframes glowBlob {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%       { opacity: 0.9; transform: scale(1.08); }
        }
        @keyframes btnShimmer {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes cornerSpin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes goldFall {
          0%   { transform: translateY(-40px) rotate(-10deg) scale(0.8); opacity: 0; }
          8%   { opacity: 1; }
          85%  { opacity: 0.8; }
          100% { transform: translateY(105vh) rotate(30deg) scale(1.05); opacity: 0; }
        }
        @keyframes arrowRise {
          0%   { transform: translateY(105vh) translateX(0px) scale(0.7); opacity: 0; }
          8%   { opacity: 1; }
          50%  { transform: translateY(50vh) translateX(15px) scale(1); opacity: 0.9; }
          92%  { opacity: 0.6; }
          100% { transform: translateY(-60px) translateX(30px) scale(1.1); opacity: 0; }
        }
        .gold-drop  { position: absolute; animation: goldFall var(--dur) linear var(--delay) infinite; }
        .arrow-rise { position: absolute; animation: arrowRise var(--dur) ease-in var(--delay) infinite; }
        @keyframes assetRise {
          0%   { transform: translateY(0) scale(0.7); opacity: 0; }
          10%  { opacity: 1; transform: translateY(-8px) scale(1); }
          75%  { opacity: 0.8; }
          100% { transform: translateY(-110vh) scale(1.15); opacity: 0; }
        }
        @keyframes goldParticle {
          0%,100% { transform: translateY(0) scale(1); opacity: 0.15; }
          50%     { transform: translateY(-12px) scale(1.4); opacity: 0.7; }
        }
        .asset-rise   { position: absolute; animation: assetRise var(--dur) ease-out var(--delay) infinite; }
        .gold-particle { position: absolute; border-radius: 50%; animation: goldParticle var(--dur) ease-in-out var(--delay) infinite; }
        .particle    { animation: float var(--dur) ease-in-out var(--delay) infinite; }
        .badge-float { animation: floatBadge var(--dur) ease-in-out var(--delay) infinite; }
        .bar         { animation: barGrow 1.2s cubic-bezier(.22,1,.36,1) var(--delay) both; }
        .spark-dot   { animation: sparkDot var(--dur) ease-in-out var(--delay) infinite; }
        .chart-line  { stroke-dasharray: 1000; animation: drawLine 3s ease-out var(--delay) forwards; }
        .chart-line2 { stroke-dasharray: 800;  animation: drawLine2 4s ease-out var(--delay) forwards; }
        .candle      { transform-origin: bottom; animation: candleUp 0.5s cubic-bezier(.22,1,.36,1) var(--delay) both; }
        .ticker-scroll { animation: tickerScroll 22s linear infinite; }
        .price-pop   { animation: pricePop var(--dur) ease-in-out var(--delay) infinite; }
        .node-glow   { animation: nodeGlow var(--dur) ease-in-out var(--delay) infinite; }
        .edge-pulse  { animation: edgePulse var(--dur) ease-in-out var(--delay) infinite; }
        .glow-blob   { animation: glowBlob var(--dur) ease-in-out var(--delay) infinite; }
        .scanline    { animation: scanline 6s linear infinite; }
        .corner-spin { animation: cornerSpin 8s linear infinite; }
        input::placeholder { color: rgba(255,255,255,0.2) !important; }
        .login-page input { background: transparent !important; }
        .login-page, .login-page * { font-family: 'Gaegu', cursive !important; }
        .login-page input, .login-page button { font-family: 'Gaegu', cursive !important; }
      `}</style>

      <main className="login-page min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{ background: '#03050e' }}>

        {/* Glow blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="glow-blob absolute rounded-full"
            style={{ width: 600, height: 600, top: '-150px', left: '-150px',
              background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)',
              '--dur': '7s', '--delay': '0s' } as React.CSSProperties} />
          <div className="glow-blob absolute rounded-full"
            style={{ width: 500, height: 500, bottom: '-100px', right: '-100px',
              background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)',
              '--dur': '9s', '--delay': '2s' } as React.CSSProperties} />
          <div className="glow-blob absolute rounded-full"
            style={{ width: 350, height: 350, top: '40%', left: '40%',
              background: 'radial-gradient(circle, rgba(0,245,255,0.06) 0%, transparent 70%)',
              '--dur': '5s', '--delay': '1s' } as React.CSSProperties} />
        </div>

        {/* Scanline effect */}
        <div className="scanline absolute left-0 right-0 h-[2px] pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.08), transparent)', zIndex: 1 }} />

        {/* Background: Gold Rain + Rising Arrows */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">

          {/* Gold coin rain */}
          {GOLD_DROPS.map((d, i) => (
            <div key={i} className="gold-drop"
              style={{
                left: d.left,
                top: 0,
                width: d.size + 8,
                height: d.size + 8,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, #fff6aa, #f5c842 45%, #b8860a)',
                boxShadow: `0 0 ${d.size / 2}px rgba(245,200,66,0.55), inset 0 1px 0 rgba(255,255,255,0.35)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: d.size * 0.48,
                color: '#7a4800',
                fontWeight: 900,
                ['--dur' as string]: d.dur,
                ['--delay' as string]: d.delay,
              }}>
              ₩
            </div>
          ))}

          {/* Rising neon arrows */}
          {RISE_ARROWS.map((a, i) => (
            <div key={i} className="arrow-rise"
              style={{
                left: a.left,
                bottom: 0,
                fontSize: a.size,
                lineHeight: 1,
                fontWeight: 900,
                color: '#22c55e',
                textShadow: '0 0 10px rgba(34,197,94,0.9), 0 0 24px rgba(34,197,94,0.5)',
                ['--dur' as string]: a.dur,
                ['--delay' as string]: a.delay,
              }}>
              ↑
            </div>
          ))}

          {/* Asset emoji particles rising */}
          {ASSET_PARTICLES.map((p, i) => (
            <div key={i} className="asset-rise"
              style={{
                left: p.left,
                bottom: '5%',
                fontSize: p.size,
                lineHeight: 1,
                filter: 'drop-shadow(0 0 6px rgba(245,200,66,0.5))',
                ['--dur' as string]: p.dur,
                ['--delay' as string]: p.delay,
              }}>
              {p.icon}
            </div>
          ))}

          {/* Gold sparkle particles */}
          {GOLD_PARTICLES.map((p, i) => (
            <div key={i} className="gold-particle"
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                background: 'radial-gradient(circle, #ffe066, #f5c842)',
                boxShadow: `0 0 ${p.size * 2}px rgba(245,200,66,0.7)`,
                ['--dur' as string]: p.dur,
                ['--delay' as string]: p.delay,
              }}
            />
          ))}

          {/* Ticker bar */}
          <div className="absolute bottom-0 left-0 right-0 h-7 overflow-hidden flex items-center"
            style={{ background: 'rgba(0,5,20,0.9)', borderTop: '1px solid rgba(0,245,255,0.1)' }}>
            <div className="ticker-scroll flex gap-8 whitespace-nowrap text-xs font-mono px-4">
              {[...TICKERS, ...TICKERS].map((t, i) => (
                <span key={i} style={{ color: t.includes('+') ? '#00f5ff' : '#ff6b8a' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Main card */}
        <div className="relative z-10 w-full max-w-4xl">
          <div className="flex flex-col md:flex-row rounded-2xl overflow-hidden"
            style={{
              border: '1px solid rgba(0,245,255,0.12)',
              boxShadow: '0 0 0 1px rgba(124,58,237,0.08), 0 0 80px rgba(14,165,233,0.1), 0 30px 60px rgba(0,0,0,0.7)',
            }}>

            {/* Left panel */}
            <div className="md:w-[52%] relative flex flex-col items-center justify-between p-10 overflow-hidden"
              style={{ background: 'rgba(4,8,20,0.95)', backdropFilter: 'blur(20px)' }}>

              {/* Corner accents */}
              <div className="absolute top-3 left-3 w-5 h-5 pointer-events-none"
                style={{ borderTop: '1.5px solid rgba(0,245,255,0.5)', borderLeft: '1.5px solid rgba(0,245,255,0.5)' }} />
              <div className="absolute top-3 right-3 w-5 h-5 pointer-events-none"
                style={{ borderTop: '1.5px solid rgba(0,245,255,0.5)', borderRight: '1.5px solid rgba(0,245,255,0.5)' }} />
              <div className="absolute bottom-3 left-3 w-5 h-5 pointer-events-none"
                style={{ borderBottom: '1.5px solid rgba(0,245,255,0.5)', borderLeft: '1.5px solid rgba(0,245,255,0.5)' }} />
              <div className="absolute bottom-3 right-3 w-5 h-5 pointer-events-none"
                style={{ borderBottom: '1.5px solid rgba(0,245,255,0.5)', borderRight: '1.5px solid rgba(0,245,255,0.5)' }} />

              {/* Badges */}
              {BADGES.map((b, i) => (
                <div key={i} className="badge-float absolute z-20 rounded-xl px-3 py-2 flex flex-col items-center"
                  style={{
                    top: b.top, left: (b as {left?:string}).left,
                    right: (b as {right?:string}).right, bottom: (b as {bottom?:string}).bottom,
                    background: 'rgba(0,15,35,0.85)',
                    border: '1px solid rgba(0,245,255,0.22)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 0 12px rgba(0,245,255,0.1)',
                    ['--delay' as string]: b.delay,
                    ['--dur' as string]: '4s',
                  }}>
                  <span className="text-sm font-bold font-mono" style={{ color: '#00f5ff', textShadow: '0 0 10px rgba(0,245,255,0.6)' }}>{b.label}</span>
                  <span className="text-[10px] mt-0.5 tracking-wider" style={{ color: 'rgba(0,245,255,0.4)' }}>{b.sub}</span>
                </div>
              ))}

              {/* Center */}
              <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-5">
                <AnimatedLogo size={120} />

                {/* Mini bar chart */}
                <div className="flex items-end gap-1.5 h-14 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.12)' }}>
                  {[
                    {h:'38%',d:'0.1s'},{h:'52%',d:'0.25s'},{h:'44%',d:'0.4s'},
                    {h:'68%',d:'0.55s'},{h:'58%',d:'0.7s'},{h:'82%',d:'0.85s'},{h:'100%',d:'1.0s'},
                  ].map((bar, i) => (
                    <div key={i} className="bar w-4 rounded-t-sm"
                      style={{
                        ['--bar-h' as string]: bar.h,
                        ['--delay' as string]: bar.d,
                        background: i === 6
                          ? 'linear-gradient(to top, #00f5ff, #7c3aed)'
                          : 'rgba(0,245,255,0.3)',
                        boxShadow: i === 6 ? '0 0 8px rgba(0,245,255,0.6)' : 'none',
                      }} />
                  ))}
                </div>

                <div className="text-center flex flex-col gap-1">
                  <h2 className="text-lg font-extrabold tracking-widest"
                    style={{ color: '#e0f7ff', textShadow: '0 0 20px rgba(0,245,255,0.3)' }}>
                    자산을 불려보세요
                  </h2>
                  <p className="text-xs leading-relaxed tracking-wide" style={{ color: 'rgba(0,245,255,0.4)' }}>
                    연말에 내 자산이 얼마나 늘었는지<br />
                    한 화면에서 확인하세요
                  </p>
                </div>
              </div>

              {/* Bottom dots */}
              <div className="relative z-10 flex gap-2 mt-4">
                {[{dur:'2s',delay:'0s'},{dur:'2.4s',delay:'0.4s'},{dur:'1.8s',delay:'0.8s'}].map((d, i) => (
                  <div key={i} className="spark-dot rounded-full"
                    style={{
                      width: i === 0 ? 20 : 8, height: 8,
                      background: i === 0
                        ? 'linear-gradient(90deg, #00f5ff, #7c3aed)'
                        : 'rgba(0,245,255,0.25)',
                      boxShadow: i === 0 ? '0 0 8px rgba(0,245,255,0.6)' : 'none',
                      ['--dur' as string]: d.dur, ['--delay' as string]: d.delay,
                    }} />
                ))}
              </div>
            </div>

            {/* Right panel */}
            <div className="md:w-[48%] p-8 md:p-12 flex flex-col justify-center relative"
              style={{ background: 'rgba(10,7,22,0.98)', backdropFilter: 'blur(24px)' }}>
              {/* Gold grid */}
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(rgba(245,200,66,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,200,66,0.03) 1px, transparent 1px)',
                  backgroundSize: '28px 28px',
                }} />
              {/* Gold glow top-right */}
              <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
                style={{ background: 'radial-gradient(circle at top right, rgba(245,200,66,0.07), transparent 65%)' }} />
              {/* Orange glow bottom-left */}
              <div className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none"
                style={{ background: 'radial-gradient(circle at bottom left, rgba(249,115,22,0.06), transparent 65%)' }} />
              {/* Top gold line */}
              <div className="absolute top-0 left-8 right-8 h-px"
                style={{ background: 'linear-gradient(to right, transparent, rgba(245,200,66,0.25), transparent)' }} />
              <div className="relative z-10">
                <Suspense fallback={null}>
                  <AuthForm />
                </Suspense>
              </div>
            </div>

          </div>
        </div>
      </main>
    </>
  )
}
