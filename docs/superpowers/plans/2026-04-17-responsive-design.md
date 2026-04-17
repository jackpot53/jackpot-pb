# Responsive Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the entire app responsive across mobile (<640px), tablet (640–1023px), and desktop (≥1024px).

**Architecture:** Introduce `MobileSidebarContext` (React context) shared between the server-rendered layout and client components. Sidebar becomes a fixed overlay drawer on mobile (`lg:static` on desktop). Header gains a client `HamburgerButton`. Content containers drop the fixed `w-[1280px]` in favor of `w-full max-w-[1280px]`. Grid layouts adopt `sm:` and `lg:` breakpoints consistently.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS 4, React context, Lucide icons

---

## File Map

| Action | File |
|--------|------|
| CREATE | `components/app/mobile-sidebar-context.tsx` |
| CREATE | `components/app/hamburger-button.tsx` |
| MODIFY | `app/(app)/layout.tsx` |
| MODIFY | `components/app/sidebar.tsx` |
| MODIFY | `components/app/header.tsx` |
| MODIFY | `app/(app)/page.tsx` |
| MODIFY | `app/(app)/loading.tsx` |
| MODIFY | `app/(app)/charts/page.tsx` |
| MODIFY | `app/(app)/goals/page.tsx` |
| MODIFY | `components/app/assets-page-client.tsx` |
| MODIFY | `components/app/transactions-page-client.tsx` |
| MODIFY | `app/login/page.tsx` |
| MODIFY | `app/(app)/assets/loading.tsx` |
| MODIFY | `app/(app)/charts/loading.tsx` |
| MODIFY | `app/(app)/goals/loading.tsx` |
| MODIFY | `app/(app)/transactions/loading.tsx` |

---

### Task 1: Create MobileSidebarContext

**Files:**
- Create: `components/app/mobile-sidebar-context.tsx`

- [ ] **Step 1: Create the context file**

```typescript
'use client'
import { createContext, useContext, useState } from 'react'

interface MobileSidebarContextValue {
  isOpen: boolean
  toggle: () => void
  close: () => void
}

const MobileSidebarContext = createContext<MobileSidebarContextValue>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
})

export function MobileSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <MobileSidebarContext.Provider
      value={{
        isOpen,
        toggle: () => setIsOpen(v => !v),
        close: () => setIsOpen(false),
      }}
    >
      {children}
    </MobileSidebarContext.Provider>
  )
}

export function useMobileSidebar() {
  return useContext(MobileSidebarContext)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: no errors for `mobile-sidebar-context.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/app/mobile-sidebar-context.tsx
git commit -m "feat: add mobile sidebar context"
```

---

### Task 2: Create HamburgerButton component

**Files:**
- Create: `components/app/hamburger-button.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMobileSidebar } from '@/components/app/mobile-sidebar-context'

export function HamburgerButton() {
  const { toggle } = useMobileSidebar()
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="lg:hidden text-white/80 hover:text-white hover:bg-white/15 border-0 shrink-0"
      aria-label="메뉴 열기"
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/app/hamburger-button.tsx
git commit -m "feat: add hamburger menu button"
```

---

### Task 3: Wrap layout in provider + fix content width

**Files:**
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Add import and wrap in provider**

At top of file, add:
```typescript
import { MobileSidebarProvider } from '@/components/app/mobile-sidebar-context'
```

Wrap the outer `<div>` in `<MobileSidebarProvider>`:
```typescript
return (
  <MobileSidebarProvider>
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-4 sm:p-6 main-bg">
          ...
        </main>
      </div>
    </div>
  </MobileSidebarProvider>
)
```

- [ ] **Step 2: Fix content container width**

Find: `<div className="w-[1280px] mx-auto">`
Replace: `<div className="w-full max-w-[1280px] mx-auto">`

Find: `<footer className="w-[1280px] mx-auto mt-20 pb-10">`
Replace: `<footer className="w-full max-w-[1280px] mx-auto mt-20 pb-10">`

- [ ] **Step 3: Verify dev server loads**

Open http://localhost:3000
Expected: page loads, no horizontal scroll at 375px width, no console errors

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/layout.tsx
git commit -m "feat: wrap layout in MobileSidebarProvider, fix content width"
```

---

### Task 4: Add mobile drawer behavior to Sidebar

**Files:**
- Modify: `components/app/sidebar.tsx`

- [ ] **Step 1: Add import at top of file**

```typescript
import { useMobileSidebar } from '@/components/app/mobile-sidebar-context'
```

- [ ] **Step 2: Replace Sidebar component definition**

Replace:
```typescript
export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'relative z-10 h-screen border-r border-white flex flex-col shrink-0 transition-[width] duration-300 overflow-hidden',
        collapsed ? 'w-14' : 'w-60'
      )}
      style={{ background: 'linear-gradient(to bottom, #000000 0%, #0d0f2b 60%, #1a1a4e 100%)' }}
    >
```

With:
```typescript
export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { isOpen: isMobileOpen, close: closeMobile } = useMobileSidebar()

  return (
    <>
      {/* 모바일 백드롭 */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMobile}
        />
      )}
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
```

- [ ] **Step 3: Close closing tag — add fragment close**

At the very end of the component (after the closing `</aside>`), add `</>` to close the fragment. The return statement ends with:
```typescript
      </aside>
    </>
  )
}
```

- [ ] **Step 4: Add closeMobile to nav links**

In the `NAV_ITEMS.map(...)` section, add `onClick={closeMobile}` to each `<Link>`:
```typescript
<Link
  key={item.href}
  href={item.href}
  onClick={closeMobile}
  title={collapsed ? item.label : undefined}
  className={cn(...)}
>
```

- [ ] **Step 5: Verify in browser at 375px**

Open http://localhost:3000 in DevTools mobile view (375px)
Expected:
- Sidebar hidden by default
- No horizontal overflow
- Main content fills full width

- [ ] **Step 6: Commit**

```bash
git add components/app/sidebar.tsx
git commit -m "feat: sidebar mobile drawer with overlay backdrop"
```

---

### Task 5: Add hamburger button to Header

**Files:**
- Modify: `components/app/header.tsx`

- [ ] **Step 1: Add import**

```typescript
import { HamburgerButton } from '@/components/app/hamburger-button'
```

- [ ] **Step 2: Replace header JSX**

Replace the entire return statement with:
```typescript
  return (
    <header className="relative z-10 h-14 flex items-center px-4 sm:px-6 shrink-0 bg-black/60 border-b border-white backdrop-blur-md gap-3">
      {/* 햄버거 버튼 — 모바일/태블릿만 표시 */}
      <HamburgerButton />

      {/* 브랜드 */}
      <div className="shrink-0 select-none">
        <span
          className="text-lg text-foreground"
          style={{ fontFamily: "'Story Script', cursive", letterSpacing: '0.05em' }}
        >
          JACKPOT 77
        </span>
      </div>

      {/* 종목 티커 — 태블릿(sm) 이상만 표시 */}
      <div className="hidden sm:flex flex-1 min-w-0">
        <Suspense fallback={null}>
          <TickerBand />
        </Suspense>
      </div>

      {/* 우측 액션 */}
      <div className="shrink-0 flex items-center gap-3 ml-auto">
        {user?.email && (
          <span className="text-xs text-white/80 hidden md:block truncate max-w-[200px] bg-white/10 border border-white/20 px-2.5 py-1 rounded-full">
            {user.email}
          </span>
        )}
        <form action={signOut}>
          <Button
            variant="ghost"
            size="sm"
            type="submit"
            className="text-white/80 hover:text-white hover:bg-white/15 border border-white/20 gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">로그아웃</span>
          </Button>
        </form>
      </div>
    </header>
  )
```

- [ ] **Step 3: Verify hamburger at 375px**

Open http://localhost:3000 at 375px
Expected:
- Hamburger button visible
- Click opens sidebar with overlay
- Clicking overlay closes sidebar
- TickerBand hidden

- [ ] **Step 4: Verify desktop at 1280px**

Expected:
- Hamburger button not visible
- Sidebar shows normally
- TickerBand visible

- [ ] **Step 5: Commit**

```bash
git add components/app/header.tsx
git commit -m "feat: add hamburger button and mobile-aware header"
```

---

### Task 6: Fix dashboard page grid breakpoints

**Files:**
- Modify: `app/(app)/page.tsx`

- [ ] **Step 1: Fix stat cards grid (line ~86)**

Find: `className="grid grid-cols-4 gap-4 md:grid-cols-2"`
Replace: `className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"`

- [ ] **Step 2: Fix allocation + breakdown grid (~line 97)**

Find: `className="grid grid-cols-2 gap-6 md:grid-cols-1"`
Replace: `className="grid grid-cols-1 lg:grid-cols-2 gap-6"`

- [ ] **Step 3: Fix hero banner padding**

Find: `...bg-gradient-to-br from-slate-700 via-indigo-700 to-violet-800 p-8 text-white shadow-xl"`
Replace: `...bg-gradient-to-br from-slate-700 via-indigo-700 to-violet-800 p-6 sm:p-8 text-white shadow-xl"`

- [ ] **Step 4: Verify at 375px**

Expected: 4 stat cards stack to 1 column on mobile, 2 columns on tablet, 4 on desktop

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/page.tsx
git commit -m "feat: responsive grid breakpoints for dashboard"
```

---

### Task 7: Fix dashboard loading skeleton breakpoints

**Files:**
- Modify: `app/(app)/loading.tsx`

- [ ] **Step 1: Fix stat cards skeleton grid**

Find: `className="grid grid-cols-4 gap-4 md:grid-cols-2"`
Replace: `className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"`

- [ ] **Step 2: Fix pie + list skeleton grid**

Find: `className="grid grid-cols-2 gap-5 md:grid-cols-1"`
Replace: `className="grid grid-cols-1 lg:grid-cols-2 gap-5"`

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/loading.tsx
git commit -m "feat: responsive grid breakpoints for dashboard skeleton"
```

---

### Task 8: Fix charts page grid breakpoints

**Files:**
- Modify: `app/(app)/charts/page.tsx`

- [ ] **Step 1: Read the file and find all grid-cols patterns**

Run: `grep -n "grid-cols" app/\(app\)/charts/page.tsx`

- [ ] **Step 2: Update grid classes**

For each `grid grid-cols-2 ... md:grid-cols-1`:
Replace with `grid grid-cols-1 lg:grid-cols-2` (keep existing gap class)

For each `grid grid-cols-3 ... md:grid-cols-1` or similar:
Replace with `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (keep gap)

Example:
- `"grid grid-cols-2 gap-6 md:grid-cols-1"` → `"grid grid-cols-1 lg:grid-cols-2 gap-6"`

- [ ] **Step 3: Verify at 375px**

Expected: Charts stack vertically on mobile

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/charts/page.tsx
git commit -m "feat: responsive grid breakpoints for charts page"
```

---

### Task 9: Fix goals page grid breakpoints

**Files:**
- Modify: `app/(app)/goals/page.tsx`

- [ ] **Step 1: Find all grid-cols patterns**

Run: `grep -n "grid-cols" app/\(app\)/goals/page.tsx`

- [ ] **Step 2: Update grid classes**

Replace `grid grid-cols-2 ... md:grid-cols-1` → `grid grid-cols-1 lg:grid-cols-2` (keep gap)
Replace `grid grid-cols-3 ...` → `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (keep gap)

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/goals/page.tsx
git commit -m "feat: responsive grid breakpoints for goals page"
```

---

### Task 10: Fix assets and transactions client components

**Files:**
- Modify: `components/app/assets-page-client.tsx`
- Modify: `components/app/transactions-page-client.tsx`

- [ ] **Step 1: Find grid patterns in assets client**

Run: `grep -n "grid-cols" components/app/assets-page-client.tsx`

- [ ] **Step 2: Update assets grids**

Replace `grid-cols-3` patterns: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
Replace `grid-cols-2` patterns: `grid grid-cols-1 lg:grid-cols-2`
(keep existing gap classes)

- [ ] **Step 3: Find table structure in transactions client**

Run: `grep -n "table-cell\|grid-cols\|<th\|<td" components/app/transactions-page-client.tsx | head -30`

- [ ] **Step 4: Hide non-essential table columns on mobile**

For columns that are secondary (e.g., asset type details, secondary date fields), add `hidden sm:table-cell` class to both the `<th>` header cell and the corresponding `<td>` data cells.

Example: if there's a "메모" or "자산 코드" column:
```typescript
// Before
<th className="...">메모</th>
// After
<th className="... hidden sm:table-cell">메모</th>
```
And the matching `<td>`:
```typescript
// Before
<td className="...">...</td>
// After
<td className="... hidden sm:table-cell">...</td>
```

- [ ] **Step 5: Fix filter bar layout if present**

Look for filter/search bar. If it uses `flex gap-2`:
Replace with `flex flex-col sm:flex-row gap-2`

- [ ] **Step 6: Commit**

```bash
git add components/app/assets-page-client.tsx components/app/transactions-page-client.tsx
git commit -m "feat: responsive layouts for assets and transactions"
```

---

### Task 11: Fix login page for mobile

**Files:**
- Modify: `app/login/page.tsx`

- [ ] **Step 1: Find the two-panel layout**

Run: `grep -n "flex\|grid\|w-\[" app/login/page.tsx | head -30`

- [ ] **Step 2: Hide left decorative panel on mobile**

Find the left decorative panel container. It likely has a class like `w-1/2` or `flex-1` inside a flex row.
Add `hidden lg:flex` to that panel's outermost element.

Example:
```typescript
// Before
<div className="flex-1 bg-gradient-to-br ...">
// After
<div className="hidden lg:flex flex-1 bg-gradient-to-br ...">
```

- [ ] **Step 3: Fix form panel width**

Find the right panel (form side). Ensure it takes full width on mobile:
```typescript
// Before
<div className="w-1/2 flex items-center justify-center p-8">
// After
<div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8">
```

- [ ] **Step 4: Fix inner form container**

Find the card/container holding the actual form fields. Ensure mobile padding:
`w-full max-w-sm mx-auto`

- [ ] **Step 5: Verify login page at 375px**

Open http://localhost:3000/login at 375px
Expected: Single column layout, form fully visible, no horizontal overflow

- [ ] **Step 6: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat: responsive login page layout"
```

---

### Task 12: Fix sub-page loading skeletons

**Files:**
- Modify: `app/(app)/assets/loading.tsx`
- Modify: `app/(app)/charts/loading.tsx`
- Modify: `app/(app)/goals/loading.tsx`
- Modify: `app/(app)/transactions/loading.tsx`

- [ ] **Step 1: Find grid patterns in each file**

Run: `grep -rn "grid-cols" app/\(app\)/assets/loading.tsx app/\(app\)/charts/loading.tsx app/\(app\)/goals/loading.tsx app/\(app\)/transactions/loading.tsx`

- [ ] **Step 2: Apply consistent breakpoints to each file**

Rules:
- `grid-cols-4 ... md:grid-cols-2` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- `grid-cols-3 ... md:grid-cols-2` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- `grid-cols-2 ... md:grid-cols-1` → `grid-cols-1 lg:grid-cols-2`

(Keep all existing gap classes unchanged)

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/assets/loading.tsx app/\(app\)/charts/loading.tsx app/\(app\)/goals/loading.tsx app/\(app\)/transactions/loading.tsx
git commit -m "feat: responsive grid breakpoints for loading skeletons"
```

---

## Verification Checklist

After all tasks complete, verify at each breakpoint:

**375px (iPhone SE)**
- [ ] No horizontal scroll on any page
- [ ] Sidebar hidden, hamburger visible
- [ ] Hamburger opens sidebar drawer with overlay
- [ ] All grids show 1 column
- [ ] TickerBand hidden

**768px (tablet)**
- [ ] Hamburger still visible, sidebar as drawer
- [ ] Stat cards show 2 columns
- [ ] TickerBand visible

**1280px (desktop)**
- [ ] Hamburger hidden, sidebar visible normally
- [ ] Full layout as before responsive changes
- [ ] Collapse/expand still works
