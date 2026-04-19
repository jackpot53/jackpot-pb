# 기술스택 & 라이선스 페이지 디자인

## 개요

`/tech-stack` 경로에 본 앱을 구성하는 핵심 오픈소스와 외부 API를 한눈에 보여주는 정적 페이지를 추가합니다. 사용자가 "내가 쓰는 도구들이 뭐였더라"를 빠르게 확인하고, 각 OSS의 라이선스를 표기합니다.

## 요구사항

- **라우트**: `/tech-stack` — `app/(app)/tech-stack/page.tsx` (서버 컴포넌트, 정적)
- **진입점**: 사이드바 독립 항목 없음. `/help` 페이지 FAQ 하단에 카드 링크 추가
- **레이아웃**: 섹션별 테이블. 섹션은 help 페이지와 동일한 스타일(컬러 스트라이프 + `rounded-xl border bg-card` 카드)
- **데이터**: 하드코딩된 정적 배열 (page 파일 상단 const). 30개 남짓이라 JSON 분리 불필요
- **테스팅/린팅 섹션 제외** (개발 도구는 제외하고 런타임 스택만 노출)

## 섹션 구성

총 6개 섹션. 각 섹션은 help 페이지 FAQ 카드와 동일한 패턴:

```
<div className="rounded-xl border border-border bg-card overflow-hidden">
  <div className={`h-1 ${color}`} />
  <div className="px-6 py-4">
    <h2>...</h2>
    <table>...</table>
  </div>
</div>
```

| # | 섹션명                      | 컬러 스트라이프     | 액센트 |
|---|----------------------------|---------------------|--------|
| 1 | 프레임워크 & 언어          | `bg-indigo-500`     | indigo |
| 2 | UI & 스타일링              | `bg-purple-500`     | purple |
| 3 | 데이터 & 상태              | `bg-emerald-500`    | emerald |
| 4 | 차트 & 시각화              | `bg-violet-500`     | violet |
| 5 | AI & 마크다운              | `bg-orange-500`     | orange |
| 6 | 외부 API & 데이터 소스     | `bg-amber-500`      | amber |

## 테이블 스펙

### OSS 섹션 (1–5) 공통

| 컬럼      | 내용                                                           |
|-----------|----------------------------------------------------------------|
| 이름      | 굵은 텍스트 + 메이저 버전 (예: `Next.js 16`)                   |
| 용도      | 한 줄 한국어 설명                                              |
| 라이선스  | 모노폰트 컬러 뱃지 (MIT=초록, Apache-2.0=파랑, ISC=보라, Unlicense=회색) |
| 링크      | `ExternalLink` 아이콘 → 공식 홈페이지 또는 GitHub, `target="_blank" rel="noopener noreferrer"` |

### 외부 API 섹션 (6)

OSS 아니므로 "라이선스" 대신 "접근 방식" 컬럼 사용:

| 컬럼        | 내용                                                     |
|-------------|----------------------------------------------------------|
| 서비스      | 제공처 이름                                              |
| 용도        | 한 줄 한국어 설명                                        |
| 접근 방식   | 뱃지: `공식 API` / `비공식 API` / `웹 스크래핑`          |
| 링크        | 공식 홈페이지                                            |

섹션 상단에 안내 배너 1줄:
> ⚠️ 외부 서비스는 오픈소스가 아니며 각 제공처의 이용약관에 따릅니다.

## 데이터 정의

`app/(app)/tech-stack/page.tsx` 상단에 하드코딩:

```ts
type LicenseKey = 'MIT' | 'Apache-2.0' | 'ISC' | 'Unlicense'
type AccessKind = 'official' | 'unofficial' | 'scraping'

type OssItem = {
  name: string
  version?: string
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
```

### 섹션 1: 프레임워크 & 언어
- Next.js 16 · App Router 풀스택 프레임워크 · MIT · https://nextjs.org
- React 19 · UI 라이브러리 · MIT · https://react.dev
- TypeScript 5 · 정적 타입 시스템 · Apache-2.0 · https://www.typescriptlang.org

### 섹션 2: UI & 스타일링
- Tailwind CSS 4 · 유틸리티 퍼스트 CSS · MIT · https://tailwindcss.com
- shadcn/ui · 복사 가능한 React 컴포넌트 · MIT · https://ui.shadcn.com
- Base UI · 헤드리스 접근성 프리미티브 · MIT · https://base-ui.com
- Lucide · 아이콘 세트 · ISC · https://lucide.dev
- tw-animate-css · Tailwind 애니메이션 유틸 · MIT · https://github.com/Wombosvideo/tw-animate-css
- Sonner · 토스트 알림 · MIT · https://github.com/emilkowalski/sonner
- next-themes · 다크/라이트 모드 · MIT · https://github.com/pacocoursey/next-themes

### 섹션 3: 데이터 & 상태
- Supabase · Postgres + Auth 백엔드 · Apache-2.0 · https://supabase.com
- Drizzle ORM · TypeScript ORM · Apache-2.0 · https://orm.drizzle.team
- postgres.js · Postgres 드라이버 · Unlicense · https://github.com/porsager/postgres
- React Hook Form · 폼 상태 관리 · MIT · https://react-hook-form.com
- Zod · 런타임 스키마 검증 · MIT · https://zod.dev

### 섹션 4: 차트 & 시각화
- Recharts · 선언적 차트 라이브러리 · MIT · https://recharts.org
- D3 · 데이터 기반 DOM 조작 · ISC · https://d3js.org
- lightweight-charts · 금융 시계열 차트 · Apache-2.0 · https://tradingview.github.io/lightweight-charts
- canvas-confetti · 컨페티 이펙트 · ISC · https://github.com/catdad/canvas-confetti

### 섹션 5: AI & 마크다운
- Anthropic SDK · Claude API 클라이언트 · MIT · https://github.com/anthropics/anthropic-sdk-typescript
- react-markdown · Markdown 렌더링 · MIT · https://github.com/remarkjs/react-markdown

### 섹션 6: 외부 API & 데이터 소스
- 한국투자증권 Open API · 국내/해외 주식·ETF 실시간 시세 · 공식 API · https://apiportal.koreainvestment.com
- Finnhub · 암호화폐 시세 · 공식 API · https://finnhub.io
- BOK ECOS · 한국은행 공식 환율 · 공식 API · https://ecos.bok.or.kr
- Naver Finance · 국내 시장동향(외국인/기관/거래량) · 웹 스크래핑 · https://finance.naver.com
- Yahoo Finance · 환율 폴백, 미국 트렌딩 · 비공식 API · https://finance.yahoo.com
- FunETF · 펀드 기준가(NAV) · 웹 스크래핑 · https://www.funetf.co.kr

## 스타일 디테일

### 라이선스 뱃지 색 매핑

```ts
const LICENSE_BADGE_CLASS: Record<LicenseKey, string> = {
  'MIT':        'bg-green-500/20 text-green-300',
  'Apache-2.0': 'bg-blue-500/20 text-blue-300',
  'ISC':        'bg-purple-500/20 text-purple-300',
  'Unlicense':  'bg-zinc-500/20 text-zinc-300',
}
```

뱃지는 help 페이지의 기존 패턴과 동일:
```
<span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-semibold {...}">MIT</span>
```

### 접근 방식 뱃지 색 매핑

```ts
const ACCESS_BADGE: Record<AccessKind, { label: string; className: string }> = {
  official:   { label: '공식 API',    className: 'bg-green-500/20 text-green-300' },
  unofficial: { label: '비공식 API',  className: 'bg-blue-500/20 text-blue-300' },
  scraping:   { label: '웹 스크래핑', className: 'bg-amber-500/20 text-amber-300' },
}
```

### 반응형

테이블을 `overflow-x-auto` wrapper로 감싸서 모바일에서 가로 스크롤 허용(help 페이지와 동일 전략).

### 페이지 헤더

```tsx
<PageHeader
  icon={Package}
  title="기술스택 & 라이선스"
  description="이 앱을 구성하는 오픈소스와 외부 API"
/>
```

## help 페이지 수정

`app/(app)/help/page.tsx` FAQ 매핑 직후, `</div>` 바로 위에 진입 카드 추가:

```tsx
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

## 파일 변경

- **신규**: `app/(app)/tech-stack/page.tsx`
- **수정**: `app/(app)/help/page.tsx` — FAQ 아래 진입 카드 1개 추가, `Package`/`Link` import 추가

## 구현 순서

1. `app/(app)/tech-stack/page.tsx` 생성 — 타입/데이터 상수 + 페이지 본체
2. 공통 `LicenseBadge`, `AccessBadge` 컴포넌트 파일 내부에 정의 (별도 파일 분리 안 함)
3. OSS 섹션 렌더러 1개 + 외부 API 섹션 렌더러 1개 (서로 컬럼이 달라 별도)
4. `app/(app)/help/page.tsx`에 진입 카드 추가
5. 브라우저에서 `/help` → `/tech-stack` 흐름 확인, 모든 외부 링크 클릭 확인
6. 모바일 뷰포트에서 테이블 가로 스크롤 확인

## 에러 처리

- 외부 링크는 모두 하드코딩된 공식 URL. 404/deadlink 런타임 감지 불필요
- 정적 콘텐츠라 API 호출 없음 — 서버/클라이언트 에러 경로 없음
