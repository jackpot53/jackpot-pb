'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { BarChart2, Bitcoin, BookOpen, Building2, PiggyBank, TrendingUp, ShieldCheck, Gem, CreditCard, type LucideIcon } from 'lucide-react';

type AssetType = 'stock_kr' | 'stock_us' | 'etf_kr' | 'etf_us' | 'crypto' | 'savings' | 'real_estate' | 'fund' | 'insurance' | 'precious_metal' | 'cma';

const TYPE_ICON: Record<AssetType, LucideIcon> = {
  stock_kr: TrendingUp, stock_us: TrendingUp,
  etf_kr: BarChart2,    etf_us: BarChart2,
  crypto: Bitcoin,
  fund: BookOpen,
  savings: PiggyBank,
  real_estate: Building2,
  insurance: ShieldCheck,
  precious_metal: Gem,
  cma: CreditCard,
};

// 펀드명 접두사 → 운용사 도메인 매핑 (긴 접두사 우선 매칭)
const FUND_NAME_PREFIX_DOMAIN: [string, string][] = [
  ['미래에셋',         'miraeasset.com'],
  ['한국투자',         'koreainvestment.com'],
  ['한국밸류',         'koreavalue.co.kr'],
  ['삼성',             'samsungfund.com'],
  ['신한',             'shinhan.com'],
  ['NH아문디',         'nhca.com'],
  ['NH',               'nhca.com'],
  ['KB',               'kbam.co.kr'],
  ['IBK',              'ibkfund.co.kr'],
  ['KDB',              'kdbam.co.kr'],
  ['BNK',              'bnkfund.com'],
  ['한화',             'hanwhafund.co.kr'],
  ['키움',             'kiwoom.com'],
  ['교보악사',         'kyoboaxafund.co.kr'],
  ['교보',             'kyobo.co.kr'],
  ['하나',             'hanamutual.com'],
  ['흥국',             'heungkukfund.com'],
  ['이스트스프링',     'eastspring.co.kr'],
  ['우리',             'wooriasset.com'],
  ['대신',             'daishinam.com'],
  ['유진',             'uginasset.com'],
  ['타임폴리오',       'timefolio.co.kr'],
  ['트러스톤',         'truston.co.kr'],
  ['브이아이',         'vifund.co.kr'],
]

function getFundDomain(name: string): string | null {
  // 긴 접두사부터 순서대로 매칭 (배열 정의 순서대로)
  for (const [prefix, domain] of FUND_NAME_PREFIX_DOMAIN) {
    if (name.startsWith(prefix)) return domain
  }
  return null
}

// 예적금 기관명 접두사 → 도메인 매핑 (긴 접두사 우선)
const SAVINGS_PREFIX_DOMAIN: [string, string][] = [
  ['카카오뱅크',   'kakaobank.com'],
  ['케이뱅크',     'kbank.co.kr'],
  ['토스뱅크',     'tossbank.com'],
  ['MG새마을금고', 'kfcc.co.kr'],
  ['새마을금고',   'kfcc.co.kr'],
  ['KB국민',       'kbstar.com'],
  ['KB',           'kbstar.com'],
  ['NH농협',       'nonghyup.com'],
  ['NH',           'nonghyup.com'],
  ['농협',         'nonghyup.com'],
  ['OK저축',       'oksavingsbank.com'],
  ['신한',         'shinhan.com'],
  ['하나',         'hanabank.com'],
  ['우리',         'wooribank.com'],
  ['IBK기업',      'ibk.co.kr'],
  ['IBK',          'ibk.co.kr'],
  ['SC제일',       'sc.com'],
  ['씨티',         'citibank.co.kr'],
  ['신협',         'cu.co.kr'],
  ['수협',         'suhyup-bank.com'],
  ['DGB대구',      'dgb.co.kr'],
  ['DGB',          'dgb.co.kr'],
  ['대구',         'dgb.co.kr'],
  ['BNK부산',      'busanbank.co.kr'],
  ['BNK',          'busanbank.co.kr'],
  ['부산',         'busanbank.co.kr'],
  ['광주',         'kjbank.com'],
  ['전북',         'jbbank.co.kr'],
  ['경남',         'knbank.co.kr'],
  ['제주',         'jejubank.co.kr'],
];

function getSavingsDomain(name: string): string | null {
  const trimmed = name.trim();
  for (const [prefix, domain] of SAVINGS_PREFIX_DOMAIN) {
    if (trimmed.startsWith(prefix)) return domain;
  }
  return null;
}

// 국내 ETF 브랜드 → 운용사 도메인 매핑 (logo.dev domain API 사용)
const ETF_KR_BRAND_DOMAIN: Record<string, string> = {
  TIGER:   'miraeasset.com',       // 미래에셋자산운용
  KODEX:   'samsungfund.com',      // 삼성자산운용
  KINDEX:  'koreainvestment.com',  // 한국투자신탁운용
  ACE:     'koreainvestment.com',  // 한국투자신탁운용
  KOSEF:   'kiwoom.com',           // 키움투자자산운용
  ARIRANG: 'hanwhafund.co.kr',     // 한화자산운용
  PLUS:    'hanwhafund.co.kr',     // 한화자산운용
  HANARO:  'nhca.com',             // NH아문디자산운용
  SOL:     'shinhan.com',          // 신한자산운용
  RISE:    'kbam.co.kr',            // KB자산운용
  '1Q':    'hanaam.com',           // 한아름자산운용
};

function buildLogoUrl(ticker: string | null, type: AssetType, name?: string): string | null {
  const token = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;
  if (!token) return null;

  // 국내 ETF: 이름 첫 단어로 운용사 브랜드 판별 → domain API
  if (type === 'etf_kr') {
    const brand = name?.trim().split(/\s+/)[0]?.toUpperCase();
    const domain = brand ? ETF_KR_BRAND_DOMAIN[brand] : undefined;
    if (!domain) return null;
    return `https://img.logo.dev/${domain}?token=${token}`;
  }

  // 예적금: 이름 첫 단어로 금융기관 도메인 판별
  if (type === 'savings') {
    const domain = name ? getSavingsDomain(name) : null;
    if (!domain) return null;
    return `https://img.logo.dev/${domain}?token=${token}`;
  }

  // 펀드: 이름 접두사로 운용사 도메인 판별
  if (type === 'fund') {
    const domain = name ? getFundDomain(name.trim()) : null;
    if (!domain) return null;
    return `https://img.logo.dev/${domain}?token=${token}`;
  }

  // 국내 주식: .KS/.KQ suffix 그대로 전달
  // 미국 주식·ETF·코인: 대문자 정규화
  const norm =
    type === 'stock_kr' ? ticker :
    ticker ? ticker.toUpperCase() : null;

  const supported = type === 'stock_kr' || type === 'stock_us' || type === 'etf_us' || type === 'crypto';
  if (!norm || !supported) return null;
  return `https://img.logo.dev/ticker/${encodeURIComponent(norm)}?token=${token}`;
}

type Props = {
  ticker: string | null | undefined;
  name?: string;
  assetType: AssetType;
  size?: number;
  className?: string;
};

export function AssetLogo({ ticker, name, assetType, size = 24, className }: Props) {
  const [failed, setFailed] = useState(false);
  const url = buildLogoUrl(ticker ?? null, assetType, name);
  const Icon = TYPE_ICON[assetType] ?? TrendingUp;

  const wrapperCls = cn(
    'inline-flex shrink-0 items-center justify-center rounded-full bg-muted overflow-hidden ring-1 ring-border',
    className,
  );

  if (!url || failed) {
    return (
      <span className={wrapperCls} style={{ width: size, height: size }} aria-hidden>
        <Icon className="text-muted-foreground" style={{ width: size * 0.6, height: size * 0.6 }} />
      </span>
    );
  }

  return (
    <span className={wrapperCls} style={{ width: size, height: size }}>
      <Image
        src={url}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
        loading="lazy"
        className="object-cover w-full h-full"
      />
    </span>
  );
}
