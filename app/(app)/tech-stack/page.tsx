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
  { name: 'Naver Finance',        purpose: '국내 시장동향(외국인/기관/거래량)', access: 'scraping',   url: 'https://finance.naver.com' },
  { name: 'Yahoo Finance',        purpose: '환율 폴백, 미국 트렌딩',          access: 'unofficial', url: 'https://finance.yahoo.com' },
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
