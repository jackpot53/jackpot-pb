# Page Skeleton Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모든 `(app)` 라우트에 페이지 레이아웃과 일치하는 skeleton loading UI(`loading.tsx`)를 추가한다.

**Architecture:** 각 페이지 세그먼트에 독립적인 `loading.tsx` 파일을 생성한다. 기존 `components/ui/skeleton.tsx`의 `<Skeleton>` 컴포넌트를 사용하며, Hero 배너는 실제 그라데이션 배경을 유지하고 내부 텍스트만 shimmer 처리한다. 기존 Suspense 경계는 건드리지 않는다.

**Tech Stack:** Next.js App Router `loading.tsx` convention, Tailwind CSS, `components/ui/skeleton.tsx`

---

### Task 1: 대시보드 loading.tsx 교체

**Files:**
- Modify: `app/(app)/loading.tsx`

- [ ] **Step 1: 기존 파일 확인**

현재 내용 (spinner):
```tsx
import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}
```

- [ ] **Step 2: skeleton으로 교체**

`app/(app)/loading.tsx` 전체를 아래로 교체:

```tsx
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Hero 배너 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-700 via-indigo-700 to-violet-800 p-8 shadow-xl">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 bg-white/25" />
          <Skeleton className="h-8 w-40 bg-white/30" />
          <Skeleton className="h-3 w-56 bg-white/18" />
        </div>
      </div>

      {/* 통계 카드 4개 */}
      <div className="grid grid-cols-4 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-20" />
            </CardHeader>
            <CardContent className="space-y-1">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 파이차트 + 자산 목록 */}
      <div className="grid grid-cols-2 gap-5 md:grid-cols-1">
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <Skeleton className="h-36 w-36 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-2.5 w-2.5 rounded-full flex-shrink-0" />
                  <Skeleton className="h-3 flex-1" style={{ width: `${[100, 70, 85, 60][i]}%` }} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border/50">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
                <Skeleton className="h-3.5 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 브라우저에서 확인**

`http://localhost:3000` 으로 이동 후 새로고침. 잠깐 skeleton이 보이다가 실제 콘텐츠로 전환되는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add app/\(app\)/loading.tsx
git commit -m "feat: replace dashboard spinner with layout skeleton"
```

---

### Task 2: /assets loading.tsx 생성

**Files:**
- Create: `app/(app)/assets/loading.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function AssetsLoading() {
  return (
    <div className="space-y-6">
      {/* Hero 배너 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-8 shadow-xl">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 bg-white/25" />
          <Skeleton className="h-8 w-36 bg-white/30" />
          <Skeleton className="h-3 w-52 bg-white/18" />
        </div>
      </div>

      {/* 미니 통계 카드 3개 */}
      <div className="grid grid-cols-3 gap-4 md:grid-cols-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 자산 테이블 */}
      <Card>
        <CardContent className="divide-y divide-border/50 pt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="h-5 w-12 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-18" />
              </div>
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저에서 확인**

`http://localhost:3000/assets` 로 이동. skeleton이 보이다가 실제 자산 목록으로 전환되는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add app/\(app\)/assets/loading.tsx
git commit -m "feat: add assets page skeleton loading"
```

---

### Task 3: /charts loading.tsx 생성

**Files:**
- Create: `app/(app)/charts/loading.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function ChartsLoading() {
  return (
    <div className="space-y-6">
      {/* Hero 배너 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-700 via-indigo-700 to-violet-800 p-8 shadow-xl">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 bg-white/25" />
          <Skeleton className="h-8 w-32 bg-white/30" />
          <Skeleton className="h-3 w-48 bg-white/18" />
        </div>
      </div>

      {/* 차트 카드 2×2 그리드 */}
      <div className="grid grid-cols-2 gap-5 md:grid-cols-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-l-4 border-l-slate-300 dark:border-l-slate-600">
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-28 mt-1" />
              <Skeleton className="h-2.5 w-20 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[240px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저에서 확인**

`http://localhost:3000/charts` 로 이동. skeleton 4개 카드가 보이다가 실제 차트로 전환되는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add app/\(app\)/charts/loading.tsx
git commit -m "feat: add charts page skeleton loading"
```

---

### Task 4: /goals loading.tsx 생성

**Files:**
- Create: `app/(app)/goals/loading.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function GoalsLoading() {
  return (
    <div className="space-y-6">
      {/* Hero 배너 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-8 shadow-xl">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16 bg-white/25" />
          <Skeleton className="h-8 w-32 bg-white/30" />
          <Skeleton className="h-3 w-44 bg-white/18" />
        </div>
      </div>

      {/* 미니 통계 카드 3개 */}
      <div className="grid grid-cols-3 gap-4 md:grid-cols-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 목표 항목 3개 */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 py-4">
              <Skeleton className="h-9 w-9 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <Skeleton className="h-1.5 rounded-full" style={{ width: `${[65, 30, 80][i]}%` }} />
                </div>
              </div>
              <Skeleton className="h-3.5 w-14 flex-shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저에서 확인**

`http://localhost:3000/goals` 로 이동. skeleton 목표 항목들이 보이다가 실제 목표로 전환되는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add app/\(app\)/goals/loading.tsx
git commit -m "feat: add goals page skeleton loading"
```

---

### Task 5: /transactions loading.tsx 생성

**Files:**
- Create: `app/(app)/transactions/loading.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function TransactionsLoading() {
  return (
    <div className="space-y-4">
      {/* Hero 배너 */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-teal-600 via-cyan-600 to-sky-700 p-8 shadow-xl">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 bg-white/25" />
          <Skeleton className="h-8 w-36 bg-white/30" />
          <Skeleton className="h-3 w-48 bg-white/18" />
        </div>
      </div>

      {/* 필터 칩 */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded-full" style={{ width: `${[72, 60, 80][i]}px` }} />
        ))}
      </div>

      {/* 거래 행 */}
      <Card>
        <CardContent className="divide-y divide-border/50 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-18" />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-12" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저에서 확인**

`http://localhost:3000/transactions` 로 이동. skeleton 거래 행들이 보이다가 실제 거래내역으로 전환되는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add app/\(app\)/transactions/loading.tsx
git commit -m "feat: add transactions page skeleton loading"
```
