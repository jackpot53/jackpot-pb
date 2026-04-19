# Assets Hero Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `AssetsHero` 컴포넌트를 만들고 assets 페이지에 추가한다.

**Architecture:** InsightsHero 구조를 에메랄드 컬러로 변형. 순수 서버 컴포넌트로 CSS keyframe 애니메이션만 사용. assets page의 기존 PageHeader 위에 병치.

**Tech Stack:** React 19, Tailwind CSS 4, inline SVG, CSS keyframes

---

### Task 1: AssetsHero 컴포넌트 생성

**Files:**
- Create: `components/app/assets-hero.tsx`

- [ ] **Step 1: 파일 생성**

`components/app/assets-hero.tsx`를 아래 내용으로 작성한다:

```tsx
// Line points for upward-trending chart (SVG viewBox 0 0 200 60)
const LINE_POINTS = '0,54 18,50 36,46 52,48 68,38 86,30 104,20 120,23 136,13 152,7 168,9 184,3 200,1'

export function AssetsHero() {
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #020c0a 0%, #051510 50%, #071a12 100%)',
        minHeight: 188,
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
      <div className="relative px-6 sm:px-8 py-5 sm:py-7">
        <div className="space-y-3 max-w-sm">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-400/80 text-[11px] font-bold tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            내 포트폴리오
          </div>

          {/* Title */}
          <div style={{ animation: 'ah-num .6s ease-out .2s both', fontFamily: "'Sunflower', sans-serif" }}>
            <h1
              className="text-[28px] sm:text-4xl font-black leading-tight text-white"
              style={{
                fontFamily: "'Sunflower', sans-serif",
                letterSpacing: '-0.02em',
              }}
            >
              보유 자산
            </h1>
            <p className="text-white/35 text-sm mt-2 leading-relaxed">
              자산을 등록하고{' '}
              <span className="text-emerald-400/60 font-semibold">실시간 수익률을 추적합니다</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add components/app/assets-hero.tsx
git commit -m "feat(assets): add AssetsHero banner component"
```

---

### Task 2: assets 페이지에 AssetsHero 추가

**Files:**
- Modify: `app/(app)/assets/page.tsx`

- [ ] **Step 1: import 추가**

`app/(app)/assets/page.tsx` 상단 import 목록에 추가:

```tsx
import { AssetsHero } from '@/components/app/assets-hero'
```

- [ ] **Step 2: JSX에 AssetsHero 삽입**

`AssetsPage` 컴포넌트의 return 안에서 `<PageHeader ... />` 바로 위에 `<AssetsHero />`를 추가한다:

```tsx
return (
  <div className="space-y-6">
    <AssetsHero />
    <PageHeader
      icon={Wallet}
      title="내 포트폴리오"
      description="보유 자산을 등록하고 실시간 수익률을 추적합니다"
      action={action}
    />

    <Suspense fallback={
      <div className="h-96 rounded-2xl bg-muted/40 animate-pulse" />
    }>
      <AssetsContent userId={user.id} />
    </Suspense>
  </div>
)
```

- [ ] **Step 3: 개발 서버에서 확인**

```bash
# 개발 서버가 이미 실행 중이면 브라우저에서 /assets 경로 확인
# 히어로 배너가 PageHeader 위에 렌더링되는지 확인
# 라인 차트 드로우 애니메이션 정상 동작 확인
```

- [ ] **Step 4: 커밋**

```bash
git add app/(app)/assets/page.tsx
git commit -m "feat(assets): integrate AssetsHero into assets page"
```
