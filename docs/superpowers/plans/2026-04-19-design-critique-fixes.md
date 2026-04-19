# Design Critique Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 슬롭 패턴 제거 (border-l-4 스트라이프, gradient text), 장식 애니메이션 축소, 자산 유형 색상 통합, 대시보드 정보 위계 개선으로 "차분한 명확함 + 절제된 개성" 달성.

**Architecture:** 파일별로 독립적 변경. Task 1-5는 병렬 처리 가능. Task 6(색상 통합)은 badge와 accent map을 동시 변경. Task 7(대시보드 위계)는 Task 1 완료 후 진행.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, shadcn/ui (Base UI), TypeScript strict

---

## Task 1: dashboard-stat-card.tsx — border-l-4 제거

**Files:**
- Modify: `components/app/dashboard-stat-card.tsx`

- [ ] **Step 1: accentColor prop 제거 및 카드 스타일 정리**

```tsx
// components/app/dashboard-stat-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface DashboardStatCardProps {
  label: string
  primaryValue: string
  secondaryValue?: string
  secondarySign?: 'positive' | 'negative' | 'neutral'
}

export function DashboardStatCard({
  label,
  primaryValue,
  secondaryValue,
  secondarySign = 'neutral',
}: DashboardStatCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground text-center">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-3xl font-semibold leading-tight">{primaryValue}</p>
        {secondaryValue && (
          <p
            className={cn(
              'mt-1 text-sm',
              secondarySign === 'positive' && 'text-emerald-600',
              secondarySign === 'negative' && 'text-red-600',
              secondarySign === 'neutral' && 'text-muted-foreground',
            )}
          >
            {secondaryValue}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: accentColor prop을 전달하는 호출 사이트 확인**

```bash
grep -rn "accentColor" /Users/amiz/dev/jackpot-pb --include="*.tsx" --include="*.ts"
```

accentColor prop을 전달하는 곳이 있으면 해당 prop 전달 코드를 제거한다.

- [ ] **Step 3: Commit**

```bash
git add components/app/dashboard-stat-card.tsx
git commit -m "refactor: remove border-l-4 accent stripe from DashboardStatCard"
```

---

## Task 2: app/(app)/page.tsx — border-l-4 및 gradient 카드 헤더 제거

**Files:**
- Modify: `app/(app)/page.tsx`

- [ ] **Step 1: 두 카드의 border-l-4와 gradient 헤더를 일관된 패턴으로 교체**

`app/(app)/page.tsx` 의 두 Card를 아래로 교체:

```tsx
{/* Left: Pie Chart */}
<Card className="shadow-sm">
  <CardHeader className="pb-3 border-b">
    <CardTitle className="text-base font-semibold">자산 배분</CardTitle>
    <p className="text-xs text-muted-foreground mt-0.5">자산 유형별 비중을 시각화합니다</p>
  </CardHeader>
  <CardContent>
    <AllocationPieChart data={byType} />
  </CardContent>
</Card>

{/* Right: Breakdown by type */}
<Card className="shadow-sm">
  <CardHeader className="pb-3 border-b">
    <CardTitle className="text-base font-semibold">유형별 합계</CardTitle>
    <p className="text-xs text-muted-foreground mt-0.5">각 자산 유형의 평가금액 합계입니다</p>
  </CardHeader>
  <CardContent>
    {byType.length === 0 ? (
      <p className="text-sm text-muted-foreground py-8 text-center">
        아직 자산이 없습니다.{' '}
        <a href="/assets" className="underline text-foreground">첫 자산을 추가해보세요 →</a>
      </p>
    ) : (
      <div className="space-y-0">
        {byType.map((entry, i) => (
          <div key={entry.assetType}>
            <div className="flex items-center justify-between py-3">
              <AssetTypeBadge assetType={entry.assetType as 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate'} />
              <div className="text-right">
                <p className="text-base font-semibold">{formatKrw(entry.totalValueKrw)}</p>
                <p className="text-sm text-muted-foreground">{entry.sharePct.toFixed(1)}%</p>
              </div>
            </div>
            {i < byType.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    )}
  </CardContent>
</Card>
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/page.tsx
git commit -m "refactor: replace border-l-4/gradient card headers with consistent border-b pattern on dashboard"
```

---

## Task 3: portfolio-charts.tsx, annual-return-chart.tsx, monthly-portfolio-chart.tsx — border-l-4 제거

**Files:**
- Modify: `components/app/portfolio-charts.tsx`
- Modify: `components/app/annual-return-chart.tsx`
- Modify: `components/app/monthly-portfolio-chart.tsx`

- [ ] **Step 1: portfolio-charts.tsx 3개 카드 교체**

`components/app/portfolio-charts.tsx` 에서:
```tsx
// 변경 전 (3군데):
<Card className="border-l-4 border-l-blue-500 shadow-sm">
  <CardHeader className="bg-gradient-to-r from-blue-50/60 to-transparent dark:from-blue-950/20 rounded-tl-[calc(var(--radius)-1px)]">
    <CardTitle className="text-blue-700 dark:text-blue-400">자산 배분</CardTitle>

// 변경 후 (통일 패턴):
<Card className="shadow-sm">
  <CardHeader className="pb-3 border-b">
    <CardTitle>자산 배분</CardTitle>
```

3개 카드 모두 같은 패턴 적용:
1. `border-l-4 border-l-blue-500` → 제거
2. `bg-gradient-to-r from-blue-50/60 to-transparent dark:from-blue-950/20 rounded-tl-[calc(var(--radius)-1px)]` → `pb-3 border-b`
3. `text-blue-700 dark:text-blue-400` (CardTitle 색상 클래스) → 제거 (기본 foreground 사용)
4. `border-l-emerald-500`, `border-l-violet-500` → 같은 패턴으로 제거

- [ ] **Step 2: annual-return-chart.tsx 교체**

```bash
grep -n "border-l-4\|bg-gradient" /Users/amiz/dev/jackpot-pb/components/app/annual-return-chart.tsx
```

찾은 줄에서 `border-l-4 border-l-indigo-500` 및 gradient header 패턴 제거, `shadow-sm` + `pb-3 border-b` 패턴으로 통일.

- [ ] **Step 3: monthly-portfolio-chart.tsx 교체**

```bash
grep -n "border-l-4\|bg-gradient" /Users/amiz/dev/jackpot-pb/components/app/monthly-portfolio-chart.tsx
```

같은 패턴으로 교체.

- [ ] **Step 4: Commit**

```bash
git add components/app/portfolio-charts.tsx components/app/annual-return-chart.tsx components/app/monthly-portfolio-chart.tsx
git commit -m "refactor: remove border-l-4 stripe and gradient headers from chart cards"
```

---

## Task 4: dashboard-goals-section.tsx, goal-list-client.tsx — border-l-4 제거

**Files:**
- Modify: `components/app/dashboard-goals-section.tsx`
- Modify: `components/app/goal-list-client.tsx`

- [ ] **Step 1: dashboard-goals-section.tsx**

`components/app/dashboard-goals-section.tsx` 24번째 줄:
```tsx
// 변경 전:
<Card className="border-l-4 border-l-blue-500 shadow-sm">

// 변경 후:
<Card className="shadow-sm">
```

- [ ] **Step 2: goal-list-client.tsx**

```bash
grep -n "border-l-4" /Users/amiz/dev/jackpot-pb/components/app/goal-list-client.tsx
```

같은 패턴으로 제거. `h-full` 클래스는 유지.

- [ ] **Step 3: Commit**

```bash
git add components/app/dashboard-goals-section.tsx components/app/goal-list-client.tsx
git commit -m "refactor: remove border-l-4 from goals cards"
```

---

## Task 5: charts/page.tsx — border-l-4 제거

**Files:**
- Modify: `app/(app)/charts/page.tsx`

- [ ] **Step 1: 모든 border-l-4 인스턴스 제거**

```bash
grep -n "border-l-4\|bg-gradient" /Users/amiz/dev/jackpot-pb/app/\(app\)/charts/page.tsx
```

찾은 모든 Card에서:
- `border-l-4 border-l-*-*` 클래스 제거
- `bg-gradient-to-r from-*-50/60 to-transparent` 헤더 클래스 → `pb-3 border-b`
- CardTitle 색상 클래스 제거

- [ ] **Step 2: price-loading-skeleton.tsx 확인**

```bash
grep -n "border-l-4" /Users/amiz/dev/jackpot-pb/components/app/price-loading-skeleton.tsx
```

border-l-4가 있으면 동일하게 제거.

- [ ] **Step 3: goal-achievement-chart.tsx, goal-progress-chart.tsx 확인**

```bash
grep -n "border-l-4" /Users/amiz/dev/jackpot-pb/components/app/goal-achievement-chart.tsx /Users/amiz/dev/jackpot-pb/components/app/goal-progress-chart.tsx
```

동일하게 제거.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/charts/page.tsx components/app/price-loading-skeleton.tsx components/app/goal-achievement-chart.tsx components/app/goal-progress-chart.tsx
git commit -m "refactor: remove border-l-4 from charts page and remaining cards"
```

---

## Task 6: assets-page-client.tsx — ASSET_TYPE_ACCENT 교체

border-l-4 스트라이프를 자산 유형 색상 배경 틴트로 교체. 색상 식별은 유지하면서 스트라이프 패턴 제거.

**Files:**
- Modify: `components/app/assets-page-client.tsx`

- [ ] **Step 1: ASSET_TYPE_ACCENT 맵을 배경 틴트로 교체**

`components/app/assets-page-client.tsx` 95-107번 줄:

```tsx
const ASSET_TYPE_ACCENT: Record<string, string> = {
  stock_kr:       'bg-blue-500/[0.04]',
  stock_us:       'bg-sky-500/[0.04]',
  etf_kr:         'bg-indigo-500/[0.04]',
  etf_us:         'bg-violet-500/[0.04]',
  crypto:         'bg-amber-500/[0.04]',
  fund:           'bg-teal-500/[0.04]',
  savings:        'bg-emerald-500/[0.04]',
  real_estate:    'bg-amber-700/[0.04]',
  insurance:      'bg-slate-500/[0.04]',
  precious_metal: 'bg-yellow-500/[0.04]',
  cma:            'bg-rose-500/[0.04]',
}
```

- [ ] **Step 2: border-l-4 사용 부분에서 border-l-4 클래스 제거**

549번 줄:
```tsx
// 변경 전:
<div className={cn("relative rounded-xl border border-border border-l-4 hover:shadow-md transition-all bg-card", ASSET_TYPE_ACCENT[asset.assetType] ?? 'border-l-border')} ...>

// 변경 후:
<div className={cn("relative rounded-xl border border-border hover:shadow-md transition-all", ASSET_TYPE_ACCENT[asset.assetType] ?? 'bg-card')} ...>
```

620번 줄:
```tsx
// 변경 전:
<div className={cn("rounded-xl border border-border p-4 flex flex-col gap-2.5 hover:shadow-md transition-all border-l-4 bg-card", ASSET_TYPE_ACCENT[asset.assetType] ?? 'border-l-border')} ...>

// 변경 후:
<div className={cn("rounded-xl border border-border p-4 flex flex-col gap-2.5 hover:shadow-md transition-all", ASSET_TYPE_ACCENT[asset.assetType] ?? 'bg-card')} ...>
```

680번 줄:
```tsx
// 변경 전:
<div className={cn("rounded-xl bg-card border border-border p-3.5 flex flex-col gap-2 border-l-4", assetType ? (ASSET_TYPE_ACCENT[assetType] ?? 'border-l-border') : 'border-l-border')}>

// 변경 후:
<div className={cn("rounded-xl border border-border p-3.5 flex flex-col gap-2", assetType ? (ASSET_TYPE_ACCENT[assetType] ?? 'bg-card') : 'bg-card')}>
```

1020번 줄:
```tsx
// 변경 전:
<div key={type} className={cn("rounded-xl border border-border px-4 py-3 flex flex-col gap-1.5 border-l-4 bg-card shadow-sm", ASSET_TYPE_ACCENT[type] ?? 'border-l-border')}>

// 변경 후:
<div key={type} className={cn("rounded-xl border border-border px-4 py-3 flex flex-col gap-1.5 shadow-sm", ASSET_TYPE_ACCENT[type] ?? 'bg-card')}>
```

- [ ] **Step 3: Commit**

```bash
git add components/app/assets-page-client.tsx
git commit -m "refactor: replace border-l-4 asset type stripes with subtle background tint"
```

---

## Task 7: gradient text 제거 — insights-hero.tsx

**Files:**
- Modify: `components/app/insights-hero.tsx`

- [ ] **Step 1: gradient text를 solid white로 교체 (165-167번 줄)**

```tsx
// 변경 전 (165-169번 줄):
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

// 변경 후:
<h1
  className="text-[28px] sm:text-4xl font-black leading-tight text-white"
  style={{
    fontFamily: "'Sunflower', sans-serif",
    letterSpacing: '-0.02em',
  }}
>
```

- [ ] **Step 2: 스캔 빔 제거 (69-76번 줄)**

다음 블록 전체 제거:
```tsx
{/* Scan beam */}
<div
  className="absolute top-0 bottom-0 w-[15%]"
  style={{
    background: 'linear-gradient(to right, transparent, rgba(34,211,238,.04), transparent)',
    animation: 'ih-scan 8s cubic-bezier(.4,0,.6,1) 1s infinite',
  }}
/>
```

`ih-scan` 키프레임도 인라인 `<style>` 블록(17-48번 줄)에서 제거:
```
@keyframes ih-scan {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(500%);  }
}
```

- [ ] **Step 3: badge 펄싱 애니메이션 제거 (152번 줄)**

```tsx
// 변경 전:
<div
  className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/[0.07] text-cyan-400/80 text-[11px] font-bold tracking-widest uppercase"
  style={{ animation: 'ih-badge 2.5s ease-in-out infinite' }}
>

// 변경 후:
<div
  className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/[0.07] text-cyan-400/80 text-[11px] font-bold tracking-widest uppercase"
>
```

`ih-badge` 키프레임도 인라인 `<style>` 블록에서 제거.

- [ ] **Step 4: 인라인 style 블록 최종 상태 확인**

나머지 키프레임(`ih-line`, `ih-area`, `ih-dot`, `ih-glow`, `ih-num`)은 차트 애니메이션이므로 유지.

- [ ] **Step 5: Commit**

```bash
git add components/app/insights-hero.tsx
git commit -m "fix: remove gradient text and decorative scan beam from insights hero"
```

---

## Task 8: brand-shimmer gradient text → solid amber 교체

footer의 JACKPOT 텍스트는 gradient text(절대 금지 패턴)를 사용 중. solid amber color로 교체.

**Files:**
- Modify: `app/globals.css`
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: globals.css brand-shimmer 클래스 교체**

기존 `brand-shimmer` 블록(307-321번 줄):
```css
.brand-shimmer {
  background: linear-gradient(...);
  background-size: 200% auto;
  animation: shimmer-gold 5s linear infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

교체:
```css
.brand-shimmer {
  color: oklch(0.65 0.15 55);
}
```

`shimmer-gold` 키프레임도 더 이상 사용되지 않으므로 제거(302-305번 줄).

- [ ] **Step 2: layout.tsx footer-scan 정리 확인**

`app/(app)/layout.tsx`에서 `footer-scan` 애니메이션이 정의되어 있는지 확인:

```bash
grep -n "footer-scan" /Users/amiz/dev/jackpot-pb/app/\(app\)/layout.tsx
```

footer-scan은 텍스트가 아닌 라인 요소 애니메이션이므로 유지해도 되지만, 있다면 globals.css로 이동하거나 제거 여부를 판단한다.

- [ ] **Step 3: robo-advisor-page-client.tsx shimmer-gold 사용 확인**

```bash
grep -n "shimmer-gold\|brand-shimmer" /Users/amiz/dev/jackpot-pb/components/app/robo-advisor-page-client.tsx
```

125번 줄에 `animation: 'shimmer-gold 4s linear infinite'`가 있다. 이것도 gradient text를 사용 중인지 확인 후 동일하게 교체.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/\(app\)/layout.tsx components/app/robo-advisor-page-client.tsx
git commit -m "fix: replace gradient text brand-shimmer with solid amber color"
```

---

## Task 9: globals.css — 장식 애니메이션 키프레임 제거

**Files:**
- Modify: `app/globals.css`

유지: `logo-float-*` (animated-logo.tsx에서 사용), `step-enter-*` (페이지 전환), `shimmer-underline`, `jp-glow`, `jp-flash` (슬롯머신 기능적)

제거 대상: `tx-rise`, `tx-fall`, `chart-scan`, `goal-radar`, `goal-check`, `bar-1~9` + `.hero-bar-*`, `hero-ring` + `.hero-ring-*`

- [ ] **Step 1: 실제 사용 여부 재확인**

```bash
grep -rn "tx-rise\|tx-fall\|chart-scan\|goal-radar\|goal-check\|hero-bar\|hero-ring" /Users/amiz/dev/jackpot-pb --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v globals.css
```

아직 사용 중인 클래스가 있으면 해당 컴포넌트도 함께 수정해야 한다(Task 10에서 처리).

- [ ] **Step 2: globals.css에서 제거할 블록 목록 확인 및 제거**

제거할 범위 (대략적인 줄 번호, 실제 파일에서 확인):
- `@keyframes tx-rise` + `.tx-rise-1~4` (약 215-234번 줄)
- `@keyframes tx-fall` + `.tx-fall-1~4` (같은 블록)
- `@keyframes chart-scan` + `.chart-scan` (약 237-241번 줄)
- `@keyframes goal-radar` + `.goal-radar-1~3` (약 244-250번 줄)
- `@keyframes goal-check` + `.goal-check-1~3` (약 252-259번 줄)
- `@keyframes bar-1~9` + `.hero-bar-1~9` (약 272-290번 줄)
- `@keyframes hero-ring` + `.hero-ring-1~3` (약 292-300번 줄)

각 블록을 제거한다.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "refactor: remove unused decorative animation keyframes from globals.css"
```

---

## Task 10: 장식 애니메이션 사용 컴포넌트 정리

**Files:**
- Modify: `app/(app)/assets/page.tsx`

- [ ] **Step 1: assets/page.tsx hero 섹션 — hero-ring, hero-bar 제거**

```bash
grep -n "hero-ring\|hero-bar" /Users/amiz/dev/jackpot-pb/app/\(app\)/assets/page.tsx
```

31-60번 줄 영역의 hero-ring divs (3개)와 hero-bar divs (9개)를 제거한다. 해당 `<div>` 요소들이 들어있는 장식용 컨테이너 블록 전체를 제거하고 남은 hero 섹션 구조가 정상적으로 보이는지 확인.

- [ ] **Step 2: 제거 후 assets/page.tsx hero 외관 확인**

```bash
grep -n "relative\|overflow-hidden\|bg-gradient\|hero" /Users/amiz/dev/jackpot-pb/app/\(app\)/assets/page.tsx | head -20
```

hero 컨테이너의 배경이나 기본 구조가 남아 있는지 확인하고, 남은 내용이 자연스럽게 보이도록 조정.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/assets/page.tsx
git commit -m "refactor: remove decorative hero-ring and hero-bar animations from assets page"
```

---

## Task 11: asset-type-badge.tsx — 11개 색상을 5개 그룹으로 통합

**Files:**
- Modify: `components/app/asset-type-badge.tsx`

- [ ] **Step 1: BADGE_MAP을 5개 색상 패밀리로 교체**

```tsx
// components/app/asset-type-badge.tsx
import { TrendingUp, BarChart2, Bitcoin, Building2, PiggyBank, BookOpen, ShieldCheck, Gem, CreditCard } from 'lucide-react'

type AssetType = 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate' | 'fund' | 'insurance' | 'precious_metal' | 'cma'

const BADGE_MAP: Record<AssetType, { label: string; icon: React.ElementType; dark: string; light: string }> = {
  // 주식 패밀리 — blue
  stock_kr:      { label: '주식 (국내)', icon: TrendingUp,   dark: 'bg-blue-500/15 text-blue-300 ring-blue-500/30',    light: 'bg-blue-50 text-blue-700 ring-blue-200' },
  stock_us:      { label: '주식 (미국)', icon: TrendingUp,   dark: 'bg-blue-400/15 text-blue-200 ring-blue-400/30',    light: 'bg-blue-50 text-blue-600 ring-blue-150' },
  // ETF 패밀리 — indigo
  etf_kr:        { label: 'ETF (국내)', icon: BarChart2,    dark: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30', light: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  etf_us:        { label: 'ETF (미국)', icon: BarChart2,    dark: 'bg-indigo-400/15 text-indigo-200 ring-indigo-400/30', light: 'bg-indigo-50 text-indigo-600 ring-indigo-150' },
  // 코인 — amber
  crypto:        { label: '코인',       icon: Bitcoin,      dark: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',  light: 'bg-amber-50 text-amber-700 ring-amber-200' },
  // 실물자산 패밀리 — emerald
  real_estate:   { label: '부동산',     icon: Building2,    dark: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30', light: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  precious_metal:{ label: '금/은',      icon: Gem,          dark: 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/30', light: 'bg-emerald-50 text-emerald-600 ring-emerald-150' },
  // 저축/기타 패밀리 — slate
  savings:       { label: '예적금',     icon: PiggyBank,    dark: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',  light: 'bg-slate-100 text-slate-600 ring-slate-200' },
  fund:          { label: '펀드',       icon: BookOpen,     dark: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',  light: 'bg-slate-100 text-slate-600 ring-slate-200' },
  insurance:     { label: '보험',       icon: ShieldCheck,  dark: 'bg-slate-400/15 text-slate-200 ring-slate-400/30',  light: 'bg-slate-50 text-slate-500 ring-slate-150' },
  cma:           { label: 'CMA',        icon: CreditCard,   dark: 'bg-slate-400/15 text-slate-200 ring-slate-400/30',  light: 'bg-slate-50 text-slate-500 ring-slate-150' },
}

export function AssetTypeBadge({ assetType, light }: { assetType: AssetType; light?: boolean }) {
  const { label, icon: Icon, dark, light: lightStyle } = BADGE_MAP[assetType]
  const style = light ? lightStyle : dark
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${style}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}
```

- [ ] **Step 2: ASSET_TYPE_ACCENT도 동일한 5개 그룹으로 맞추기**

`components/app/assets-page-client.tsx` 의 `ASSET_TYPE_ACCENT` (Task 6에서 배경 틴트로 바꿨음)도 동일한 그룹핑으로 업데이트:

```tsx
const ASSET_TYPE_ACCENT: Record<string, string> = {
  stock_kr:       'bg-blue-500/[0.04]',
  stock_us:       'bg-blue-400/[0.04]',
  etf_kr:         'bg-indigo-500/[0.04]',
  etf_us:         'bg-indigo-400/[0.04]',
  crypto:         'bg-amber-500/[0.04]',
  real_estate:    'bg-emerald-500/[0.04]',
  precious_metal: 'bg-emerald-400/[0.04]',
  savings:        'bg-slate-500/[0.04]',
  fund:           'bg-slate-500/[0.04]',
  insurance:      'bg-slate-400/[0.04]',
  cma:            'bg-slate-400/[0.04]',
}
```

- [ ] **Step 3: Commit**

```bash
git add components/app/asset-type-badge.tsx components/app/assets-page-client.tsx
git commit -m "refactor: consolidate asset type colors from 11 to 5 semantic groups"
```

---

## Task 12: 대시보드 정보 위계 개선

**Files:**
- Modify: `app/(app)/page.tsx`

- [ ] **Step 1: 섹션 제목 + spacing 위계 추가**

`app/(app)/page.tsx`에서 두 카드 그리드 위에 시각적 구분선 역할을 하는 섹션 레이블을 추가해 위계를 명확히 한다:

```tsx
return (
  <div className="space-y-8">
    {/* 자산 현황 — 주요 섹션 */}
    <section className="space-y-4">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">자산 현황</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ... 두 카드 (Task 2에서 이미 수정됨) */}
      </div>
    </section>

    {/* 오늘의 리포트 */}
    <section className="space-y-4">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">오늘의 리포트</h2>
      <Suspense fallback={<TodayReport performances={performances} />}>
        <TodayReportWithNews performances={performances} />
      </Suspense>
    </section>

    {/* 목표 — goals 있을 때만 표시 (DashboardGoalsSection 내부에서 처리) */}
    <DashboardGoalsSection goals={goalsList} totalValueKrw={summary.totalValueKrw} />
  </div>
)
```

- [ ] **Step 2: FX rate 미사용 시 배지 추가**

`computePortfolio(performances, fxRateInt ?? 0)` 직후, fxRateInt가 null인 경우 사용자에게 알림:

```tsx
// 기존 summary 계산 이후에 추가:
const fxRateUnavailable = fxRateInt === null
```

그리고 리턴 JSX 상단에:
```tsx
{fxRateUnavailable && (
  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
    환율 정보를 불러오는 중입니다. 미국 주식 평가금액이 일시적으로 부정확할 수 있습니다.
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/page.tsx
git commit -m "feat: add section labels and FX rate warning to dashboard"
```

---

## Task 13: 사이드바 상태 localStorage 유지

**Files:**
- Modify: `components/app/sidebar.tsx`

- [ ] **Step 1: 사이드바 collapsed 상태 읽기/저장 구현**

```bash
grep -n "collapsed\|isCollapsed\|useState" /Users/amiz/dev/jackpot-pb/components/app/sidebar.tsx | head -10
```

현재 collapsed 상태가 어떻게 관리되는지 확인한 후:

collapsed state를 관리하는 `useState` 초기값을 localStorage에서 읽고, 변경 시 저장:

```tsx
// useState 부분 교체 (실제 변수명은 확인 후 맞출 것):
const [isCollapsed, setIsCollapsed] = React.useState(() => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('sidebar-collapsed') === 'true'
})

// toggle 핸들러에 저장 추가:
const handleToggle = () => {
  const next = !isCollapsed
  setIsCollapsed(next)
  localStorage.setItem('sidebar-collapsed', String(next))
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app/sidebar.tsx
git commit -m "feat: persist sidebar collapsed state to localStorage"
```

---

## Self-Review

### Spec Coverage

| 문제 | 태스크 |
|------|--------|
| border-l-4 stripe 85+ 인스턴스 제거 | Task 1-6 |
| gradient text (insights-hero) | Task 7 |
| gradient text (brand-shimmer footer) | Task 8 |
| 장식 애니메이션 keyframe 제거 | Task 9 |
| 장식 애니메이션 사용 컴포넌트 정리 | Task 10 |
| 자산 유형 11→5 색상 그룹 통합 | Task 11 |
| 대시보드 정보 위계 | Task 12 |
| FX rate 경고 | Task 12 |
| 사이드바 상태 유지 | Task 13 |
| 빈 상태 카피 개선 | Task 2 (page.tsx empty state) |

### Placeholder Scan

없음 — 모든 태스크에 실제 코드 포함.

### Type Consistency

- `AssetType` — asset-type-badge.tsx에서 정의, assets-page-client.tsx에서 문자열로 사용. 인터페이스 변경 없음.
- `DashboardStatCardProps` — `accentColor` 제거됨. 호출 사이트에서 prop 제거 필요 (Step 2에서 확인 지시).

### 주의사항

- Task 8에서 `shimmer-gold` 키프레임 제거 전에 robo-advisor-page-client.tsx의 shimmer-gold 사용 확인 필수.
- Task 9에서 keyframe 제거 전 실제 사용 여부 grep 확인 필수 (Step 1).
- Task 13에서 실제 변수명은 파일을 직접 읽어 확인할 것.
