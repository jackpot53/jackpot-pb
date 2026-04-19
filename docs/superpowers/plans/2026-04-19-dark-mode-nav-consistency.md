# Dark Mode, Navigation & Page Header Consistency

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사이드바/헤더 다크모드 수정, 누락된 /today 네비게이션 추가, 페이지 헤더 컴포넌트 통일, updates 페이지 다크모드 수정, globals.css 데드코드 제거로 디자인 시스템 일관성 확보.

**Architecture:** 독립적 파일 변경 7개. Task 3(PageHeader 컴포넌트 생성) → Task 4-5(적용)는 순서 의존성 있음. 나머지는 병렬 처리 가능.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4 (`dark:` variant), shadcn/ui, TypeScript strict

---

## Files

**Create:**
- `components/app/page-header.tsx` — 공통 페이지 헤더 컴포넌트 (icon + h1 + description + optional action)

**Modify:**
- `components/app/sidebar.tsx` — 다크모드 시맨틱 토큰, /today 네비 추가
- `components/app/header.tsx` — 다크모드 시맨틱 토큰, 로고 링크화
- `app/(app)/transactions/page.tsx` — PageHeader 추가
- `app/(app)/paper-trading/page.tsx` — PageHeader로 교체 (primary 색상 통일)
- `app/(app)/help/page.tsx` — PageHeader로 교체 (primary 색상 통일)
- `app/(app)/updates/page.tsx` — 콘텐츠 카드 다크모드 토큰 수정
- `app/globals.css` — 비활성화된 ::before/::after 데드코드 제거

---

## Task 1: Sidebar 다크모드 + /today 네비 추가

**Files:**
- Modify: `components/app/sidebar.tsx`

현재 `sidebar.tsx`는 `bg-white`, `border-gray-900`, `text-gray-*`, `bg-gray-*` 등 하드코딩된 라이트모드 색상을 사용해 다크모드에서 완전히 깨진다.

- [ ] **Step 1: 파일 상단 import에 `Sun` 아이콘 추가**

`sidebar.tsx` 1-19번 줄의 import 블록을 아래로 교체:

```tsx
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
```

- [ ] **Step 2: NAV_ITEMS에 Today 추가**

`NAV_ITEMS` 배열 (21-31번 줄)을 아래로 교체. `/today`를 포트폴리오 바로 뒤에 추가:

```tsx
const NAV_ITEMS = [
  { label: '목표',        href: '/goals',         icon: Target,       color: 'text-amber-400',  activeColor: 'text-amber-300'  },
  { label: '포트폴리오',  href: '/assets',        icon: Wallet,       color: 'text-emerald-400',activeColor: 'text-emerald-300'},
  { label: '오늘',        href: '/today',         icon: Sun,          color: 'text-yellow-400', activeColor: 'text-yellow-300' },
  { label: '거래내역',    href: '/transactions',  icon: ArrowLeftRight,color: 'text-sky-400',   activeColor: 'text-sky-300'    },
  { label: '차트',        href: '/charts',        icon: LineChart,    color: 'text-violet-400', activeColor: 'text-violet-300' },
  { label: '인사이트',    href: '/insights',      icon: Sparkles,     color: 'text-pink-400',   activeColor: 'text-pink-300'   },
  { label: '모의투자',    href: '/paper-trading', icon: TrendingUp,   color: 'text-cyan-400',   activeColor: 'text-cyan-300'   },
  { label: 'Signals',     href: '/robo-advisor',  icon: Bot,          color: 'text-orange-400', activeColor: 'text-orange-300' },
  { label: '도움말',      href: '/help',          icon: HelpCircle,   color: 'text-zinc-400',   activeColor: 'text-zinc-300'   },
  { label: '업데이트 내역',href: '/updates',      icon: History,      color: 'text-teal-400',   activeColor: 'text-teal-300'   },
]
```

- [ ] **Step 3: `<aside>` 색상을 시맨틱 토큰으로 교체**

`<aside>` 엘리먼트 className (153-160번 줄):

```tsx
// 변경 전:
'fixed lg:static inset-y-0 left-0 z-50 h-screen border-r border-gray-900 bg-white flex flex-col shrink-0 overflow-hidden',

// 변경 후:
'fixed lg:static inset-y-0 left-0 z-50 h-screen border-r border-sidebar-border bg-sidebar flex flex-col shrink-0 overflow-hidden',
```

- [ ] **Step 4: 헤더 영역(슬롯머신 + 토글 버튼) 색상 교체**

162번 줄 헤더 div:
```tsx
// 변경 전:
<div className="relative flex h-14 items-center justify-center shrink-0 border-b border-gray-900">

// 변경 후:
<div className="relative flex h-14 items-center justify-center shrink-0 border-b border-sidebar-border">
```

토글 버튼 (164-174번 줄):
```tsx
// 변경 전:
'p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors rounded-md',

// 변경 후:
'p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-md',
```

- [ ] **Step 5: 씬 영역 border 교체**

177번 줄:
```tsx
// 변경 전:
className="shrink-0 w-full overflow-hidden border-b border-gray-100"

// 변경 후:
className="shrink-0 w-full overflow-hidden border-b border-sidebar-border"
```

- [ ] **Step 6: MiniSlotMachine `Reel` 컴포넌트 색상 교체**

`Reel` 함수 (35-56번 줄) — className의 하드코딩 색상 제거:

```tsx
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
```

- [ ] **Step 7: MiniSlotMachine 버튼 색상 교체**

`MiniSlotMachine` 함수 내 버튼 (100-127번 줄) — isJackpot 미적용 상태의 색상:

```tsx
<button
  onClick={spin}
  title="SPIN!"
  className={cn(
    'flex items-center gap-1.5 px-2 py-1.5 rounded-xl border transition-colors duration-300 cursor-pointer',
    isJackpot
      ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'
      : 'border-border bg-background hover:border-border/70 hover:bg-muted'
  )}
  style={isJackpot ? { animation: 'jp-glow 1s ease-in-out infinite' } : {}}
>
```

- [ ] **Step 8: 네비게이션 링크 active/inactive 색상 교체**

`nav` 내부의 각 `<Link>` className (279-305번 줄):

```tsx
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
  <div className={cn(
    'shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-200',
  )}>
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
```

- [ ] **Step 9: Commit**

```bash
git add components/app/sidebar.tsx
git commit -m "fix: replace hardcoded light-mode colors with semantic tokens in sidebar, add /today nav"
```

---

## Task 2: Header 다크모드 + 로고 링크화

**Files:**
- Modify: `components/app/header.tsx`

`header.tsx`의 `bg-white border-b border-gray-900`이 다크모드에서 흰색 배경을 그대로 유지한다.

- [ ] **Step 1: header.tsx 전체 교체**

```tsx
import { getAuthUser } from '@/utils/supabase/server'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { Suspense } from 'react'
import Link from 'next/link'
import { TickerBand } from '@/components/app/ticker-band'
import { HamburgerButton } from '@/components/app/hamburger-button'

export async function Header() {
  const user = await getAuthUser()

  return (
    <header className="relative z-10 h-14 flex items-center px-4 sm:px-6 shrink-0 bg-background border-b border-border gap-3">
      {/* 햄버거 버튼 — 모바일/태블릿만 표시 */}
      <HamburgerButton />

      {/* 브랜드 — 홈 링크 */}
      <Link href="/" className="shrink-0 select-none hover:opacity-80 transition-opacity">
        <span
          className="text-lg text-foreground"
          style={{ fontFamily: "'Story Script', cursive", letterSpacing: '0.05em' }}
        >
          JACKPOT 77
        </span>
      </Link>

      {/* 종목 티커 — 태블릿(sm) 이상만 표시 */}
      <div className="hidden sm:flex flex-1 min-w-0">
        <Suspense fallback={null}>
          <TickerBand />
        </Suspense>
      </div>

      {/* 우측 액션 */}
      <div className="shrink-0 flex items-center gap-3 ml-auto">
        <form action={signOut}>
          <Button
            variant="ghost"
            size="sm"
            type="submit"
            className="text-muted-foreground hover:text-foreground hover:bg-muted border border-border gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">로그아웃</span>
          </Button>
        </form>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app/header.tsx
git commit -m "fix: replace hardcoded light-mode colors with semantic tokens in header, make logo a home link"
```

---

## Task 3: PageHeader 공통 컴포넌트 생성

**Files:**
- Create: `components/app/page-header.tsx`

assets, paper-trading, help, transactions 페이지에서 사용할 공통 페이지 헤더. 아이콘 + h1 + 설명 + 선택적 액션 버튼 패턴을 통일한다.

- [ ] **Step 1: components/app/page-header.tsx 생성**

```tsx
import { type LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ icon: Icon, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app/page-header.tsx
git commit -m "feat: add shared PageHeader component for consistent page titles"
```

---

## Task 4: PageHeader 적용 — assets, paper-trading, help

**Files:**
- Modify: `app/(app)/assets/page.tsx`
- Modify: `app/(app)/paper-trading/page.tsx`
- Modify: `app/(app)/help/page.tsx`

- [ ] **Step 1: assets/page.tsx — PageHeader + CTA 버튼 패턴 교체**

현재 assets/page.tsx의 페이지 헤더(21-38번 줄)는 Link를 직접 스타일링한다. PageHeader 컴포넌트와 Button 컴포넌트로 교체:

```tsx
import { Suspense } from 'react'
import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { Wallet, PlusCircle } from 'lucide-react'
import { getAuthUser } from '@/utils/supabase/server'
import { refreshAllPricesInternal } from '@/app/actions/prices'
import { loadPerformances } from '@/lib/server/load-performances'
import { getAllSnapshotsWithBreakdowns } from '@/db/queries/portfolio-snapshots'
import { toMonthlyData, toAnnualData, toDailyData, snapshotsForType } from '@/lib/snapshot/aggregation'
import { AssetsPageClient } from '@/components/app/assets-page-client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/app/page-header'
import { timed } from '@/lib/perf'

export default async function AssetsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const action = (
    <Button asChild size="sm" className="gap-1.5 rounded-xl font-semibold">
      <Link href="/assets/new">
        <PlusCircle className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
        자산 추가
      </Link>
    </Button>
  )

  return (
    <div className="space-y-6">
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
}
```

`AssetsContent` 함수는 기존 코드 그대로 유지 (49-87번 줄).

- [ ] **Step 2: paper-trading/page.tsx — PageHeader 교체**

현재 paper-trading 페이지는 `bg-blue-500/10` + `text-blue-600`으로 primary 색상과 불일치한다. PageHeader로 교체:

```tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
import { getAuthUser } from '@/utils/supabase/server'
import { getPaperTradingPositions } from '@/db/queries/paper-trading'
import { PaperTradingClient } from '@/components/app/paper-trading-client'
import { PageHeader } from '@/components/app/page-header'

export const metadata: Metadata = {
  title: '모의투자 백테스팅',
}

export default async function PaperTradingPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const positions = await getPaperTradingPositions(user.id)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={TrendingUp}
        title="모의투자 백테스팅"
        description="로보어드바이저 포트폴리오의 역사적 성과를 분석합니다"
      />

      <PaperTradingClient positions={positions} />
    </div>
  )
}
```

- [ ] **Step 3: help/page.tsx — PageHeader 교체**

현재 help 페이지는 `bg-cyan-500/10` + `text-cyan-600`으로 불일치. PageHeader로 교체.

`help/page.tsx` 상단 import에 추가:
```tsx
import { PageHeader } from '@/components/app/page-header'
```

49-62번 줄의 기존 헤더 div를 교체:
```tsx
export default function HelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={HelpCircle}
        title="자주 묻는 질문"
        description="도움말 및 API 정보"
      />

      {/* FAQ 영역 — 이하 동일 */}
```

`<div className="h-32" />` (하단 여백) 제거 — footer가 충분한 여백 제공.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/assets/page.tsx app/\(app\)/paper-trading/page.tsx app/\(app\)/help/page.tsx
git commit -m "refactor: replace custom page headers with shared PageHeader component"
```

---

## Task 5: transactions/page.tsx — PageHeader 추가

**Files:**
- Modify: `app/(app)/transactions/page.tsx`

현재 transactions 페이지에는 페이지 헤더가 전혀 없다.

- [ ] **Step 1: transactions/page.tsx에 PageHeader 추가**

```tsx
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { ArrowLeftRight } from 'lucide-react'
import { getAuthUser } from '@/utils/supabase/server'
import { getAllTransactionsWithAsset } from '@/db/queries/transactions'
import { getAssets } from '@/db/queries/assets'
import { TransactionsPageClient } from '@/components/app/transactions-page-client'
import { PageHeader } from '@/components/app/page-header'

export default async function TransactionsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ArrowLeftRight}
        title="거래내역"
        description="매수·매도 기록을 확인하고 관리합니다"
      />
      <Suspense fallback={<div className="h-96 rounded-2xl bg-muted/40 animate-pulse" />}>
        <TransactionsContent userId={user.id} />
      </Suspense>
    </div>
  )
}

async function TransactionsContent({ userId }: { userId: string }) {
  const [txns, assets] = await Promise.all([
    getAllTransactionsWithAsset(userId),
    getAssets(userId),
  ])

  const assetOptions = assets.map((a) => ({ id: a.id, name: a.name, assetType: a.assetType, currency: a.currency }))

  return (
    <TransactionsPageClient transactions={txns} assetOptions={assetOptions} />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/transactions/page.tsx
git commit -m "feat: add PageHeader to transactions page"
```

---

## Task 6: updates/page.tsx 다크모드 수정

**Files:**
- Modify: `app/(app)/updates/page.tsx`

현재 `bg-white rounded-2xl border border-gray-900`이 다크모드에서 흰색 카드를 노출시킨다. 빈 상태의 `border-gray-200 bg-gray-50 text-gray-400`도 동일 문제.

- [ ] **Step 1: updates/page.tsx 콘텐츠 카드 색상 교체**

33번 줄:
```tsx
// 변경 전:
<div className="bg-white rounded-2xl border border-gray-900 shadow-sm p-6 sm:p-8 space-y-6">

// 변경 후:
<div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
```

34-37번 줄 빈 상태:
```tsx
// 변경 전:
<div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center text-gray-400">

// 변경 후:
<div className="rounded-xl border border-border bg-muted/50 p-12 text-center text-muted-foreground">
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/updates/page.tsx
git commit -m "fix: replace hardcoded light-mode colors with semantic tokens in updates page"
```

---

## Task 7: globals.css 데드코드 제거

**Files:**
- Modify: `app/globals.css`

`main-bg::before`, `main-bg::after`가 정의되어 있지만 `display: none`으로 비활성화되어 있다. `BackgroundCanvas`가 이 역할을 대체하므로 데드코드를 제거한다.

- [ ] **Step 1: 현재 globals.css에서 비활성화된 블록 확인**

```bash
grep -n "main-bg::before\|main-bg::after\|display: none\|float-a\|float-b" /Users/amiz/dev/jackpot-pb/app/globals.css
```

- [ ] **Step 2: 사용되지 않는 `float-a`, `float-b` 키프레임 및 비활성화된 의사요소 제거**

`globals.css`에서 제거할 블록들 (실제 줄 번호는 Step 1에서 확인):

1. `@keyframes float-a { ... }` 블록 전체 (약 150-154번 줄)
2. `@keyframes float-b { ... }` 블록 전체 (약 155-158번 줄)
3. `.main-bg::before, .main-bg::after { content: ''; ... }` 블록 (약 159-171번 줄, 첫 번째 블록)
4. `.main-bg::before, .main-bg::after { display: none; }` 블록 (약 168-170번 줄)
5. `logo-float-1` ~ `logo-float-4` 키프레임 — 각각 `0%, 100% { transform: none; }` 만 있는 빈 애니메이션 (178-184번 줄)
6. `.logo-float-1`, `.logo-float-2`, `.logo-float-3`, `.logo-float-4` 빈 클래스 (191-194번 줄)

`logo-float-5`, `logo-float-6`, `.logo-float-5`, `.logo-float-6`은 실제 애니메이션이 있으므로 **유지**.

- [ ] **Step 3: float-a, float-b가 실제로 사용되는지 확인 후 제거**

```bash
grep -rn "float-a\|float-b" /Users/amiz/dev/jackpot-pb --include="*.tsx" --include="*.ts"
```

미사용이 확인되면 globals.css에서 두 키프레임을 제거한다.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "refactor: remove dead code from globals.css (disabled pseudo-elements, unused keyframes)"
```

---

## Self-Review

### Spec Coverage

| 이슈 | 태스크 |
|------|--------|
| 사이드바 다크모드 (bg-white, border-gray-900, text-gray-* 전체) | Task 1 |
| 슬롯머신 릴 다크모드 | Task 1 |
| /today 사이드바 네비 추가 | Task 1 |
| 헤더 다크모드 | Task 2 |
| 헤더 로고 링크화 | Task 2 |
| PageHeader 공통 컴포넌트 | Task 3 |
| assets CTA Link → Button asChild 패턴 | Task 4 |
| paper-trading 비primary 색상 통일 | Task 4 |
| help 비primary 색상 통일 | Task 4 |
| transactions 페이지 헤더 누락 | Task 5 |
| updates 콘텐츠 카드 다크모드 | Task 6 |
| globals.css 데드코드 | Task 7 |

### Placeholder Scan

없음 — 모든 태스크에 실제 코드 포함.

### Type Consistency

- `PageHeader` props의 `icon` 타입: `LucideIcon` — Lucide v3에서는 `LucideIcon` 대신 `React.ElementType` 또는 `LucideProps`를 받는 컴포넌트 타입을 쓸 수도 있다. 빌드 에러 발생 시 `icon: React.ElementType`으로 교체.
- `NAV_ITEMS`에서 `bg: ''`, `activeBg: ''` 필드가 기존 코드에 있었으나 새 코드에서 제거했다. 타입 에러 없음 (구조적으로 더 단순해짐).
- Task 4의 `Button asChild` 패턴: Next.js `<Link>`는 shadcn `Button`의 `asChild` prop과 호환됨.

### 주의사항

- Task 1 Step 8 (nav 링크 className): 기존 코드에 있던 `bg: ''`, `activeBg: ''` prop이 새 NAV_ITEMS에서 제거되었으므로 `item.bg`, `item.activeBg` 참조도 모두 제거해야 한다. 위 Step 8 코드에서 이미 제거됨.
- Task 7: `logo-float-5`, `logo-float-6` 클래스는 `animated-logo.tsx`에서 사용될 수 있으니 **절대 제거하지 말 것**.
