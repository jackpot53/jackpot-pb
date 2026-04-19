# 기술스택 & 라이선스 페이지 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/tech-stack` 정적 페이지를 추가하고 `/help`에서 진입 카드로 노출한다.

**Architecture:** 서버 컴포넌트 1개 파일에 타입·데이터·뱃지 컴포넌트 인라인. 외부 API 호출 없음, 상태 없음, 이벤트 없음. 데이터는 하드코딩 상수 배열. 테이블 렌더러 2종(OSS용·API용) 분리.

**Tech Stack:** Next.js 16 App Router(서버 컴포넌트), React 19, Tailwind CSS 4, lucide-react, `@/components/app/page-header`

**Spec:** [docs/superpowers/specs/2026-04-19-tech-stack-page-design.md](../specs/2026-04-19-tech-stack-page-design.md)

**Testing note:** 본 프로젝트는 UI 페이지에 대한 단위 테스트를 작성하지 않는다 (tests/는 lib/actions만 커버). 정적 콘텐츠 페이지라 snapshot 테스트도 저가치(카피 수정마다 깨짐). 검증은 `tsc`/`lint`/브라우저 수동 확인으로 한다 — CLAUDE.md가 UI 변경은 브라우저 검증을 요구한다.

---

## File Structure

- **Create**: `app/(app)/tech-stack/page.tsx` — 서버 컴포넌트. 타입 정의, 데이터 상수, `LicenseBadge`·`AccessBadge`·`OssSectionCard`·`ApiSectionCard` 헬퍼, 페이지 본체. 단일 파일 내부 유지(예상 ~250줄) — 이 페이지 밖에서 재사용하지 않으므로 별도 파일 분리 YAGNI
- **Modify**: `app/(app)/help/page.tsx` — 마지막 `</div>` 직전에 `<Link href="/tech-stack">` 카드 추가, import 보강

---

### Task 1: tech-stack 페이지 골격 — 타입·데이터·헤더

**Files:**
- Create: `app/(app)/tech-stack/page.tsx`

- [ ] **Step 1: 파일 생성 — 타입, 데이터 상수, 페이지 껍데기만**

`app/(app)/tech-stack/page.tsx` 전체 내용:

```tsx
import { Package } from 'lucide-react'
import { PageHeader } from '@/components/app/page-header'

type LicenseKey = 'MIT' | 'Apache-2.0' | 'ISC' | 'Unlicense'
type AccessKind = 'official' | 'unofficial' | 'scraping'

type OssItem = {
  name: string
  purpose: string
  license: LicenseKey
  url: string
}

type ApiItem = {
  name: string
  purpose: string
  access: AccessKind
  url: string
}

type OssSection = {
  title: string
  stripe: string
  items: OssItem[]
}

const FRAMEWORK_SECTION: OssSection = {
  title: '프레임워크 & 언어',
  stripe: 'bg-indigo-500',
  items: [
    { name: 'Next.js 16',   purpose: 'App Router 기반 풀스택 프레임워크', license: 'MIT',        url: 'https://nextjs.org' },
    { name: 'React 19',     purpose: 'UI 라이브러리',                     license: 'MIT',        url: 'https://react.dev' },
    { name: 'TypeScript 5', purpose: '정적 타입 시스템',                  license: 'Apache-2.0', url: 'https://www.typescriptlang.org' },
  ],
}

const UI_SECTION: OssSection = {
  title: 'UI & 스타일링',
  stripe: 'bg-purple-500',
  items: [
    { name: 'Tailwind CSS 4',  purpose: '유틸리티 퍼스트 CSS 프레임워크', license: 'MIT', url: 'https://tailwindcss.com' },
    { name: 'shadcn/ui',       purpose: '복사해서 쓰는 React 컴포넌트',   license: 'MIT', url: 'https://ui.shadcn.com' },
    { name: 'Base UI',         purpose: '헤드리스 접근성 프리미티브',      license: 'MIT', url: 'https://base-ui.com' },
    { name: 'Lucide',          purpose: '아이콘 세트',                    license: 'ISC', url: 'https://lucide.dev' },
    { name: 'tw-animate-css',  purpose: 'Tailwind 애니메이션 유틸',       license: 'MIT', url: 'https://github.com/Wombosvideo/tw-animate-css' },
    { name: 'Sonner',          purpose: '토스트 알림',                    license: 'MIT', url: 'https://github.com/emilkowalski/sonner' },
    { name: 'next-themes',     purpose: '다크/라이트 모드',               license: 'MIT', url: 'https://github.com/pacocoursey/next-themes' },
  ],
}

const DATA_SECTION: OssSection = {
  title: '데이터 & 상태',
  stripe: 'bg-emerald-500',
  items: [
    { name: 'Supabase',         purpose: 'Postgres + Auth 백엔드', license: 'Apache-2.0', url: 'https://supabase.com' },
    { name: 'Drizzle ORM',      purpose: 'TypeScript ORM',         license: 'Apache-2.0', url: 'https://orm.drizzle.team' },
    { name: 'postgres.js',      purpose: 'Postgres 드라이버',      license: 'Unlicense',  url: 'https://github.com/porsager/postgres' },
    { name: 'React Hook Form',  purpose: '폼 상태 관리',           license: 'MIT',        url: 'https://react-hook-form.com' },
    { name: 'Zod',              purpose: '런타임 스키마 검증',     license: 'MIT',        url: 'https://zod.dev' },
  ],
}

const CHART_SECTION: OssSection = {
  title: '차트 & 시각화',
  stripe: 'bg-violet-500',
  items: [
    { name: 'Recharts',           purpose: '선언적 차트 라이브러리', license: 'MIT',        url: 'https://recharts.org' },
    { name: 'D3',                 purpose: '데이터 기반 DOM 조작',   license: 'ISC',        url: 'https://d3js.org' },
    { name: 'lightweight-charts', purpose: '금융 시계열 차트',       license: 'Apache-2.0', url: 'https://tradingview.github.io/lightweight-charts' },
    { name: 'canvas-confetti',    purpose: '컨페티 이펙트',          license: 'ISC',        url: 'https://github.com/catdad/canvas-confetti' },
  ],
}

const AI_SECTION: OssSection = {
  title: 'AI & 마크다운',
  stripe: 'bg-orange-500',
  items: [
    { name: 'Anthropic SDK',  purpose: 'Claude API 클라이언트', license: 'MIT', url: 'https://github.com/anthropics/anthropic-sdk-typescript' },
    { name: 'react-markdown', purpose: 'Markdown 렌더링',       license: 'MIT', url: 'https://github.com/remarkjs/react-markdown' },
  ],
}

const OSS_SECTIONS: OssSection[] = [
  FRAMEWORK_SECTION,
  UI_SECTION,
  DATA_SECTION,
  CHART_SECTION,
  AI_SECTION,
]

const API_ITEMS: ApiItem[] = [
  { name: '한국투자증권 Open API', purpose: '국내/해외 주식·ETF 실시간 시세', access: 'official',   url: 'https://apiportal.koreainvestment.com' },
  { name: 'Finnhub',              purpose: '암호화폐 시세',                   access: 'official',   url: 'https://finnhub.io' },
  { name: 'BOK ECOS',             purpose: '한국은행 공식 환율',              access: 'official',   url: 'https://ecos.bok.or.kr' },
  { name: 'Naver Finance',        purpose: '종목 검색 자동완성',              access: 'unofficial', url: 'https://finance.naver.com' },
  { name: 'Yahoo Finance',        purpose: '주식/환율/종목 검색 폴백',        access: 'unofficial', url: 'https://finance.yahoo.com' },
  { name: 'FunETF',               purpose: '펀드 기준가(NAV)',                access: 'scraping',   url: 'https://www.funetf.co.kr' },
]

export default function TechStackPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Package}
        title="기술스택 & 라이선스"
        description="이 앱을 구성하는 오픈소스와 외부 API"
      />
      {/* 섹션 렌더링은 다음 태스크에서 추가 */}
    </div>
  )
}
```

- [ ] **Step 2: 타입체크 & 린트 통과 확인**

Run:
```bash
cd /Users/amiz/dev/jackpot-pb && npx tsc --noEmit && npm run lint
```
Expected: 0 errors.

- [ ] **Step 3: 브라우저에서 `/tech-stack` 경로가 열리는지 확인**

Run:
```bash
cd /Users/amiz/dev/jackpot-pb && npm run dev
```
브라우저 `http://localhost:3000/tech-stack` — 헤더만 보이면 성공. (로그인 필요 시 로그인 후 이동)

- [ ] **Step 4: 커밋**

```bash
git -C /Users/amiz/dev/jackpot-pb add app/\(app\)/tech-stack/page.tsx
git -C /Users/amiz/dev/jackpot-pb commit -m "feat(tech-stack): scaffold page with types and data"
```

---

### Task 2: OSS 섹션 렌더러 + 라이선스 뱃지

**Files:**
- Modify: `app/(app)/tech-stack/page.tsx`

- [ ] **Step 1: `ExternalLink` 아이콘 import 추가**

`app/(app)/tech-stack/page.tsx` 상단 import 수정:

Before:
```tsx
import { Package } from 'lucide-react'
```

After:
```tsx
import { Package, ExternalLink } from 'lucide-react'
```

- [ ] **Step 2: `LicenseBadge`와 `OssSectionCard` 헬퍼 + OSS 섹션 렌더 추가**

`page.tsx`에서 `API_ITEMS` 상수 선언 아래, `export default function TechStackPage` 위에 다음을 삽입:

```tsx
const LICENSE_BADGE: Record<LicenseKey, string> = {
  'MIT':        'bg-green-500/20 text-green-300',
  'Apache-2.0': 'bg-blue-500/20 text-blue-300',
  'ISC':        'bg-purple-500/20 text-purple-300',
  'Unlicense':  'bg-zinc-500/20 text-zinc-300',
}

function LicenseBadge({ license }: { license: LicenseKey }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-semibold ${LICENSE_BADGE[license]}`}>
      {license}
    </span>
  )
}

function ExternalLinkIcon({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} 공식 사이트 열기`}
      className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
    >
      <ExternalLink className="h-4 w-4" />
    </a>
  )
}

function OssSectionCard({ section }: { section: OssSection }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className={`h-1 ${section.stripe}`} />
      <div className="px-6 py-4">
        <h2 className="font-semibold text-foreground font-[family-name:var(--font-sunflower)] mb-3">
          {section.title}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-semibold text-foreground">이름</th>
                <th className="text-left py-2 px-2 font-semibold text-foreground">용도</th>
                <th className="text-left py-2 px-2 font-semibold text-foreground">라이선스</th>
                <th className="text-left py-2 px-2 font-semibold text-foreground w-12">링크</th>
              </tr>
            </thead>
            <tbody>
              {section.items.map((item) => (
                <tr key={item.name} className="border-b border-border last:border-b-0">
                  <td className="py-2 px-2 font-semibold text-foreground whitespace-nowrap">{item.name}</td>
                  <td className="py-2 px-2 text-foreground/70">{item.purpose}</td>
                  <td className="py-2 px-2"><LicenseBadge license={item.license} /></td>
                  <td className="py-2 px-2"><ExternalLinkIcon href={item.url} label={item.name} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

그리고 `TechStackPage` 본체에서 `{/* 섹션 렌더링은 다음 태스크에서 추가 */}` 주석을 다음으로 교체:

```tsx
      {OSS_SECTIONS.map((section) => (
        <OssSectionCard key={section.title} section={section} />
      ))}
```

- [ ] **Step 3: 타입체크 & 린트**

Run:
```bash
cd /Users/amiz/dev/jackpot-pb && npx tsc --noEmit && npm run lint
```
Expected: 0 errors.

- [ ] **Step 4: 브라우저 확인**

`http://localhost:3000/tech-stack` — 5개 OSS 섹션이 각 컬러 스트라이프와 테이블로 렌더되어야 함. 각 항목의 외부 링크 아이콘 클릭 시 해당 사이트가 새 탭에서 열려야 함. 최소 3개 항목 링크가 정상적으로 열리는지 확인.

- [ ] **Step 5: 커밋**

```bash
git -C /Users/amiz/dev/jackpot-pb add app/\(app\)/tech-stack/page.tsx
git -C /Users/amiz/dev/jackpot-pb commit -m "feat(tech-stack): render OSS sections with license badges"
```

---

### Task 3: 외부 API 섹션 렌더러 + 접근방식 뱃지 + ToS 배너

**Files:**
- Modify: `app/(app)/tech-stack/page.tsx`

- [ ] **Step 1: `AccessBadge`와 `ApiSectionCard` 헬퍼 + API 섹션 렌더 추가**

`OssSectionCard` 함수 아래에 다음을 삽입:

```tsx
const ACCESS_BADGE: Record<AccessKind, { label: string; className: string }> = {
  official:   { label: '공식 API',    className: 'bg-green-500/20 text-green-300' },
  unofficial: { label: '비공식 API',  className: 'bg-blue-500/20 text-blue-300' },
  scraping:   { label: '웹 스크래핑', className: 'bg-amber-500/20 text-amber-300' },
}

function AccessBadge({ access }: { access: AccessKind }) {
  const { label, className } = ACCESS_BADGE[access]
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}

function ApiSectionCard() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="h-1 bg-amber-500" />
      <div className="px-6 py-4">
        <h2 className="font-semibold text-foreground font-[family-name:var(--font-sunflower)] mb-2">
          외부 API & 데이터 소스
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          ⚠️ 외부 서비스는 오픈소스가 아니며 각 제공처의 이용약관에 따릅니다.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-semibold text-foreground">서비스</th>
                <th className="text-left py-2 px-2 font-semibold text-foreground">용도</th>
                <th className="text-left py-2 px-2 font-semibold text-foreground">접근 방식</th>
                <th className="text-left py-2 px-2 font-semibold text-foreground w-12">링크</th>
              </tr>
            </thead>
            <tbody>
              {API_ITEMS.map((item) => (
                <tr key={item.name} className="border-b border-border last:border-b-0">
                  <td className="py-2 px-2 font-semibold text-foreground whitespace-nowrap">{item.name}</td>
                  <td className="py-2 px-2 text-foreground/70">{item.purpose}</td>
                  <td className="py-2 px-2"><AccessBadge access={item.access} /></td>
                  <td className="py-2 px-2"><ExternalLinkIcon href={item.url} label={item.name} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

그리고 `TechStackPage` 본체 끝(OSS 섹션 map 뒤)에 추가:

```tsx
      <ApiSectionCard />
```

- [ ] **Step 2: 타입체크 & 린트**

Run:
```bash
cd /Users/amiz/dev/jackpot-pb && npx tsc --noEmit && npm run lint
```
Expected: 0 errors.

- [ ] **Step 3: 브라우저 확인 — 데스크탑 + 모바일 뷰포트**

데스크탑(1440px): 6개 섹션 모두 렌더, 외부 API 섹션 상단에 ⚠️ 안내 줄 + 3가지 접근 방식 뱃지 색이 구분되는지 확인.

모바일(375px, Chrome DevTools responsive mode): 테이블이 가로 스크롤되는지 확인(레이아웃 깨짐 없음).

- [ ] **Step 4: 커밋**

```bash
git -C /Users/amiz/dev/jackpot-pb add app/\(app\)/tech-stack/page.tsx
git -C /Users/amiz/dev/jackpot-pb commit -m "feat(tech-stack): add external API section with access badges"
```

---

### Task 4: help 페이지에 진입 카드 추가

**Files:**
- Modify: `app/(app)/help/page.tsx`

- [ ] **Step 1: import 추가**

`app/(app)/help/page.tsx` 상단 import 블록 수정:

Before:
```tsx
import { HelpCircle } from 'lucide-react'
import { PageHeader } from '@/components/app/page-header'
```

After:
```tsx
import { HelpCircle, Package } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/app/page-header'
```

- [ ] **Step 2: FAQ 리스트 닫힌 뒤 진입 카드 추가**

`app/(app)/help/page.tsx`의 FAQ `map`이 끝나는 `})}` 다음의 `</div>` (FAQ 영역 div 닫기) **뒤**, 최상위 `</div>` (`space-y-6` 래퍼) **앞** 위치에 추가:

```tsx
      {/* 기술스택 진입 카드 */}
      <Link
        href="/tech-stack"
        className="block rounded-xl border border-border bg-card hover:shadow-md transition-shadow overflow-hidden"
      >
        <div className="h-1 bg-slate-500" />
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-slate-400" />
            <div>
              <div className="font-semibold text-foreground font-[family-name:var(--font-sunflower)]">
                기술스택 & 라이선스
              </div>
              <div className="text-sm text-foreground/70">
                이 앱을 구성하는 오픈소스와 외부 API
              </div>
            </div>
          </div>
          <span className="text-muted-foreground">→</span>
        </div>
      </Link>
```

(Help 페이지 현재 구조상 `{/* FAQ 영역 */}` 주석 바로 아래 `<div className="space-y-3">` 블록이 FAQ 영역 — 그 닫는 `</div>` 뒤에 삽입)

- [ ] **Step 3: 타입체크 & 린트**

Run:
```bash
cd /Users/amiz/dev/jackpot-pb && npx tsc --noEmit && npm run lint
```
Expected: 0 errors.

- [ ] **Step 4: 브라우저에서 `/help` 하단에 카드가 보이고 클릭 시 `/tech-stack`로 이동하는지 확인**

`http://localhost:3000/help` → 페이지 하단에 "기술스택 & 라이선스" 카드 → 클릭 → `/tech-stack` 이동 확인.

- [ ] **Step 5: 커밋**

```bash
git -C /Users/amiz/dev/jackpot-pb add app/\(app\)/help/page.tsx
git -C /Users/amiz/dev/jackpot-pb commit -m "feat(help): add entry card linking to tech-stack page"
```

---

### Task 5: 최종 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 프로덕션 빌드 성공 확인**

Run:
```bash
cd /Users/amiz/dev/jackpot-pb && npm run build
```
Expected: 빌드 성공, `/tech-stack` 라우트가 빌드 출력에 정적 페이지로 표시(○ 심볼)되어야 함.

- [ ] **Step 2: 다크/라이트 모드 둘 다에서 확인**

브라우저에서 테마 토글하며 `/tech-stack` 확인:
- 컬러 스트라이프, 라이선스 뱃지, 접근방식 뱃지 모두 양쪽 모드에서 읽기 좋은 대비 유지
- 텍스트 가독성 OK

- [ ] **Step 3: 접근성 스모크 체크**

외부 링크들이 키보드 Tab으로 도달 가능하고, aria-label이 스크린리더에 의미 있게 읽히는지 확인(DevTools Accessibility tree).

- [ ] **Step 4: 스펙 점검**

[스펙 문서](../specs/2026-04-19-tech-stack-page-design.md)의 모든 섹션이 구현되었는지 최종 점검:
- 6개 섹션 (OSS 5 + API 1) ✓
- 라이선스 뱃지 색 매핑 ✓
- 접근방식 뱃지 색 매핑 ✓
- help 페이지 진입 카드 ✓
- `overflow-x-auto` 반응형 테이블 ✓
- `target="_blank" rel="noopener noreferrer"` 외부 링크 ✓
