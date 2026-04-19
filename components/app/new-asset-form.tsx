'use client'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTransition, useState, useRef, useEffect } from 'react'
import {
  Loader2, Save, ArrowLeft, ArrowRight, Search, X,
  TrendingUp, Globe, BarChart2, BarChart3, Bitcoin, Briefcase, Landmark, Building2,
  Layers, Tag, Hash, Wallet, MessageSquare, Package, Receipt, Calendar,
  Coins, Info, Shield, PiggyBank, Heart, Store, Banknote, DollarSign, ArrowLeftRight, CreditCard, ShieldCheck, Gem,
  Check, Users, Percent, Star, Leaf, RefreshCw, Minus, Lock, Repeat, Shuffle, Home, ParkingCircle, Globe2, Clock, Zap, ScrollText,
  type LucideIcon,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'
import type { AssetFormValues } from '@/app/actions/assets'
import { AssetLogo } from '@/components/app/asset-logo'

// ── Constants ──────────────────────────────────────────────────────────────

const TRADEABLE_TYPES = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'real_estate', 'savings', 'cma']
const SEARCHABLE_TYPES = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'fund', 'crypto']
const ACCOUNT_TYPE_TYPES = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'fund', 'real_estate', 'crypto', 'savings', 'insurance', 'cma', 'contribution']

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  isa: 'ISA', irp: 'IRP', pension: '연금저축', dc: 'DC', brokerage: '위탁', spot: '현물', cma: 'CMA', insurance: '보험',
  upbit: '업비트', bithumb: '빗썸', coinone: '코인원', korbit: '코빗',
  binance: '바이낸스', coinbase: '코인베이스', kraken: '크라켄', okx: 'OKX',
  fund_mirae: '미래에셋', fund_samsung: '삼성', fund_kb: 'KB', fund_shinhan: '신한', fund_hanwha: '한화',
  fund_nh: 'NH아문디', fund_korea: '한국투자', fund_kiwoom: '키움', fund_hana: '하나', fund_woori: '우리',
  fund_ibk: 'IBK', fund_daishin: '대신', fund_timefolio: '타임폴리오', fund_truston: '트러스톤',
  bank_kb: 'KB국민', bank_shinhan: '신한', bank_woori: '우리', bank_hana: '하나', bank_nh: 'NH농협',
  bank_kakao: '카카오', bank_toss: '토스', bank_k: '케이뱅크',
  bank_ibk: 'IBK기업', bank_kdb: 'KDB산업',
  bank_busan: '부산', bank_daegu: '대구', bank_gwangju: '광주', bank_jeonbuk: '전북', bank_jeju: '제주',
  bank_sbi: 'SBI저축', bank_ok: 'OK저축', bank_welcome: '웰컴저축', bank_pepper: '페퍼저축',
  bank_shincom: '신협', bank_saemaul: '새마을금고',
  coop_shincom: '신협', coop_saemaul: '새마을금고', coop_suhyup: '수협', coop_nh: '농협', coop_nfcf: '산림조합',
  ins_samsung_life: '삼성생명', ins_hanwha_life: '한화생명', ins_kyobo: '교보생명',
  ins_shinhan_life: '신한라이프', ins_nh_life: 'NH농협생명', ins_kb_life: 'KB라이프',
  ins_aia: 'AIA생명', ins_metlife: '메트라이프', ins_prudential: '푸르덴셜',
  ins_samsung_fire: '삼성화재', ins_hyundai: '현대해상', ins_db_fire: 'DB손보',
  ins_kb_fire: 'KB손보', ins_meritz: '메리츠화재', ins_hanwha_fire: '한화손보',
  ins_lotte_fire: '롯데손보', ins_im_life: 'IM라이프',
}
const ACCOUNT_TYPE_ICONS: Record<string, LucideIcon> = {
  isa: Shield, irp: PiggyBank, pension: Heart, dc: Building2, brokerage: Store, spot: Banknote, cma: CreditCard, insurance: ShieldCheck,
  upbit: Coins, bithumb: Coins, coinone: Coins, korbit: Coins,
  binance: Globe, coinbase: Globe, kraken: Globe, okx: Globe,
  fund_mirae: Briefcase, fund_samsung: Briefcase, fund_kb: Briefcase, fund_shinhan: Briefcase, fund_hanwha: Briefcase,
  fund_nh: Briefcase, fund_korea: Briefcase, fund_kiwoom: Briefcase, fund_hana: Briefcase, fund_woori: Briefcase,
  fund_ibk: Briefcase, fund_daishin: Briefcase, fund_timefolio: Briefcase, fund_truston: Briefcase,
  bank_kb: Landmark, bank_shinhan: Landmark, bank_woori: Landmark, bank_hana: Landmark, bank_nh: Landmark,
  bank_kakao: Landmark, bank_toss: Landmark, bank_k: Landmark,
  bank_ibk: Landmark, bank_kdb: Landmark,
  bank_busan: Landmark, bank_daegu: Landmark, bank_gwangju: Landmark, bank_jeonbuk: Landmark, bank_jeju: Landmark,
  bank_sbi: Landmark, bank_ok: Landmark, bank_welcome: Landmark, bank_pepper: Landmark,
  bank_shincom: Landmark, bank_saemaul: Landmark,
  coop_shincom: Users, coop_saemaul: Users, coop_suhyup: Users, coop_nh: Users, coop_nfcf: Users,
  ins_samsung_life: Heart, ins_hanwha_life: Heart, ins_kyobo: Heart,
  ins_shinhan_life: Heart, ins_nh_life: Heart, ins_kb_life: Heart,
  ins_aia: Heart, ins_metlife: Heart, ins_prudential: Heart,
  ins_samsung_fire: ShieldCheck, ins_hyundai: ShieldCheck, ins_db_fire: ShieldCheck,
  ins_kb_fire: ShieldCheck, ins_meritz: ShieldCheck, ins_hanwha_fire: ShieldCheck,
  ins_lotte_fire: ShieldCheck, ins_im_life: Heart,
}
const ACCOUNT_TYPE_COLORS: Record<string, { icon: string; bg: string }> = {
  isa:       { icon: 'text-blue-400',    bg: 'bg-blue-500/10' },
  irp:       { icon: 'text-violet-400',  bg: 'bg-violet-500/10' },
  pension:   { icon: 'text-rose-400',    bg: 'bg-rose-500/10' },
  dc:        { icon: 'text-slate-400',   bg: 'bg-slate-500/10' },
  brokerage: { icon: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  spot:      { icon: 'text-amber-400',   bg: 'bg-amber-500/10' },
  cma:       { icon: 'text-teal-400',    bg: 'bg-teal-500/10' },
  insurance: { icon: 'text-cyan-400',    bg: 'bg-cyan-500/10' },
  coop_shincom: { icon: 'text-green-400', bg: 'bg-green-500/10' },
  coop_saemaul: { icon: 'text-green-400', bg: 'bg-green-500/10' },
  coop_suhyup:  { icon: 'text-blue-400',  bg: 'bg-blue-500/10' },
  coop_nh:      { icon: 'text-green-400', bg: 'bg-green-500/10' },
  coop_nfcf:    { icon: 'text-emerald-400', bg: 'bg-emerald-500/10' },
}
const ACCOUNT_TYPE_BY_ASSET: Record<string, string[]> = {
  real_estate: ['spot'],
  stock_kr: ['isa', 'irp', 'pension', 'dc', 'brokerage'],
  stock_us: ['isa', 'irp', 'pension', 'dc', 'brokerage'],
  etf_kr: ['isa', 'irp', 'pension', 'dc', 'brokerage'],
  etf_us: ['isa', 'irp', 'pension', 'dc', 'brokerage'],
  fund: ['fund_mirae', 'fund_samsung', 'fund_kb', 'fund_shinhan', 'fund_hanwha', 'fund_nh', 'fund_korea', 'fund_kiwoom', 'fund_hana', 'fund_woori', 'fund_ibk', 'fund_daishin', 'fund_timefolio', 'fund_truston'],
  crypto: ['upbit', 'bithumb', 'coinone', 'korbit', 'binance', 'coinbase', 'kraken', 'okx'],
  savings: ['bank_kb', 'bank_shinhan', 'bank_woori', 'bank_hana', 'bank_nh', 'bank_kakao', 'bank_toss', 'bank_k', 'bank_ibk', 'bank_kdb', 'bank_busan', 'bank_daegu', 'bank_gwangju', 'bank_jeonbuk', 'bank_jeju', 'bank_sbi', 'bank_ok', 'bank_welcome', 'bank_pepper', 'bank_shincom', 'bank_saemaul'],
  cma: ['bank_kb', 'bank_shinhan', 'bank_woori', 'bank_hana', 'bank_nh', 'bank_kakao', 'bank_toss', 'bank_k', 'bank_ibk', 'bank_kdb'],
  insurance: ['ins_samsung_life', 'ins_hanwha_life', 'ins_kyobo', 'ins_shinhan_life', 'ins_nh_life', 'ins_kb_life', 'ins_aia', 'ins_metlife', 'ins_prudential', 'ins_im_life', 'ins_samsung_fire', 'ins_hyundai', 'ins_db_fire', 'ins_kb_fire', 'ins_meritz', 'ins_hanwha_fire', 'ins_lotte_fire'],
  contribution: ['coop_shincom', 'coop_saemaul', 'coop_suhyup', 'coop_nh', 'coop_nfcf'],
}
const EXCHANGE_GROUPS = [
  { label: '국내', items: ['upbit', 'bithumb', 'coinone', 'korbit'] },
  { label: '해외', items: ['binance', 'coinbase', 'kraken', 'okx'] },
]
const FUND_COMPANY_GROUPS = [
  { label: '대형사', items: ['fund_mirae', 'fund_samsung', 'fund_kb', 'fund_shinhan', 'fund_hanwha'] },
  { label: '중형사', items: ['fund_nh', 'fund_korea', 'fund_kiwoom', 'fund_hana', 'fund_woori', 'fund_ibk', 'fund_daishin'] },
  { label: '부티크', items: ['fund_timefolio', 'fund_truston'] },
]
const BANK_GROUPS = [
  { label: '시중은행', items: ['bank_kb', 'bank_shinhan', 'bank_woori', 'bank_hana', 'bank_nh'] },
  { label: '인터넷은행', items: ['bank_kakao', 'bank_toss', 'bank_k'] },
  { label: '특수은행', items: ['bank_ibk', 'bank_kdb'] },
  { label: '지방은행', items: ['bank_busan', 'bank_daegu', 'bank_gwangju', 'bank_jeonbuk', 'bank_jeju'] },
  { label: '저축은행', items: ['bank_sbi', 'bank_ok', 'bank_welcome', 'bank_pepper'] },
  { label: '협동조합', items: ['bank_shincom', 'bank_saemaul'] },
]
const INSURANCE_GROUPS = [
  { label: '생명보험', items: ['ins_samsung_life', 'ins_hanwha_life', 'ins_kyobo', 'ins_shinhan_life', 'ins_nh_life', 'ins_kb_life', 'ins_aia', 'ins_metlife', 'ins_prudential', 'ins_im_life'] },
  { label: '손해보험', items: ['ins_samsung_fire', 'ins_hyundai', 'ins_db_fire', 'ins_kb_fire', 'ins_meritz', 'ins_hanwha_fire', 'ins_lotte_fire'] },
]
const COOP_GROUPS = [
  { label: '상호금융', items: ['coop_shincom', 'coop_saemaul', 'coop_suhyup', 'coop_nh', 'coop_nfcf'] },
]
const DOMAIN_LOGO_MAP: Record<string, string> = {
  upbit: 'upbit.com', bithumb: 'bithumb.com', coinone: 'coinone.co.kr', korbit: 'korbit.co.kr',
  binance: 'binance.com', coinbase: 'coinbase.com', kraken: 'kraken.com', okx: 'okx.com',
  fund_mirae: 'miraeasset.com', fund_samsung: 'samsungfund.com', fund_kb: 'kbam.co.kr',
  fund_shinhan: 'shinhan.com', fund_hanwha: 'hanwhafund.co.kr', fund_nh: 'nhca.com',
  fund_korea: 'koreainvestment.com', fund_kiwoom: 'kiwoom.com', fund_hana: 'hanamutual.com',
  fund_woori: 'wooriasset.com', fund_ibk: 'ibkfund.co.kr', fund_daishin: 'daishinam.com',
  fund_timefolio: 'timefolio.co.kr', fund_truston: 'truston.co.kr',
  bank_kb: 'kbstar.com', bank_shinhan: 'shinhanbank.com', bank_woori: 'wooribank.com',
  bank_hana: 'hanabank.com', bank_nh: 'nonghyup.com',
  bank_kakao: 'kakaobank.com', bank_toss: 'tossbank.com', bank_k: 'kbanknow.com',
  bank_ibk: 'ibk.co.kr', bank_kdb: 'kdb.co.kr',
  bank_busan: 'busanbank.co.kr', bank_daegu: 'dgb.co.kr', bank_gwangju: 'kjbank.com',
  bank_jeonbuk: 'jbbank.co.kr', bank_jeju: 'jejubank.co.kr',
  bank_sbi: 'sbi.co.kr', bank_ok: 'oksavingsbank.com', bank_welcome: 'welcomebank.co.kr', bank_pepper: 'pepperbank.co.kr',
  bank_shincom: 'cu.co.kr', bank_saemaul: 'kfcc.co.kr',
  coop_shincom: 'cu.co.kr', coop_saemaul: 'kfcc.co.kr', coop_suhyup: 'suhyup.co.kr', coop_nh: 'nonghyup.com', coop_nfcf: 'nfcf.or.kr',
  ins_samsung_life: 'samsunglife.com', ins_hanwha_life: 'hanwhalife.com', ins_kyobo: 'kyobo.co.kr',
  ins_shinhan_life: 'shinhanlife.co.kr', ins_nh_life: 'nhlife.co.kr', ins_kb_life: 'kblife.co.kr',
  ins_aia: 'aia.co.kr', ins_metlife: 'metlife.co.kr', ins_prudential: 'prudential.co.kr',
  ins_samsung_fire: 'samsungfire.com', ins_hyundai: 'hi.co.kr', ins_db_fire: 'db-ins.com',
  ins_kb_fire: 'kbinsure.co.kr', ins_meritz: 'meritzfire.com', ins_hanwha_fire: 'hanwhainsurance.com',
  ins_lotte_fire: 'lotteins.co.kr', ins_im_life: 'imlife.co.kr',
  sec_mirae: 'miraeasset.com', sec_samsung: 'samsungpop.com', sec_korea: 'truefriend.com',
  sec_kb: 'kbsec.com', sec_nh: 'nhqv.com', sec_shinhan: 'shinhaninvest.com',
  sec_kiwoom: 'kiwoom.com', sec_daishin: 'daishin.com', sec_hana: 'hanaw.com',
  sec_meritz: 'meritzsecurities.com', sec_toss: 'tossinvest.com', sec_kakao: 'kakaopaysec.com',
  sec_hyundai: 'hmsec.com', sec_kyobo: 'kyobosec.com', sec_ibk: 'ibks.com',
}

const BROKERAGE_LABELS: Record<string, string> = {
  sec_mirae: '미래에셋', sec_samsung: '삼성', sec_korea: '한국투자',
  sec_kb: 'KB', sec_nh: 'NH투자', sec_shinhan: '신한투자',
  sec_kiwoom: '키움', sec_daishin: '대신', sec_hana: '하나',
  sec_meritz: '메리츠', sec_toss: '토스', sec_kakao: '카카오페이',
  sec_hyundai: '현대차', sec_kyobo: '교보', sec_ibk: 'IBK',
}
const BROKERAGE_GROUPS = [
  { label: '대형사', items: ['sec_mirae', 'sec_samsung', 'sec_korea', 'sec_kb', 'sec_nh', 'sec_shinhan', 'sec_kiwoom'] },
  { label: '중형사/핀테크', items: ['sec_meritz', 'sec_hana', 'sec_daishin', 'sec_toss', 'sec_kakao', 'sec_hyundai', 'sec_kyobo', 'sec_ibk'] },
]
const STOCK_ETF_TYPES = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us']
const OWNER_OPTIONS = ['개인', '엄마', '아빠', '동생', '누나', '형', '아내', '남편', '딸', '아들']
const OWNER_ICONS: Record<string, string> = {
  개인: '👤', 엄마: '👩', 아빠: '👨', 동생: '🧒', 누나: '👱‍♀️',
  형: '👱‍♂️', 아내: '👰', 남편: '🤵', 딸: '👧', 아들: '👦',
}

function DomainLogo({ value, size = 28 }: { value: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const token = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN
  const domain = DOMAIN_LOGO_MAP[value]
  const url = token && domain ? `https://img.logo.dev/${domain}?token=${token}` : null
  const FallbackIcon = ACCOUNT_TYPE_ICONS[value] ?? Briefcase

  const cls = 'inline-flex shrink-0 items-center justify-center rounded-full bg-muted overflow-hidden ring-1 ring-border'
  if (!url || failed) {
    return <span className={cls} style={{ width: size, height: size }}><FallbackIcon className="text-muted-foreground" style={{ width: size * 0.6, height: size * 0.6 }} /></span>
  }
  return (
    <span className={cls} style={{ width: size, height: size }}>
      <Image src={url} alt="" width={size} height={size} onError={() => setFailed(true)} className="object-cover w-full h-full" />
    </span>
  )
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  stock_kr: '주식 (국내)', stock_us: '주식 (미국)', etf_kr: 'ETF (국내)', etf_us: 'ETF (미국)',
  crypto: '코인', fund: '펀드', savings: '예적금', real_estate: '부동산', insurance: '보험', precious_metal: '금/은', cma: 'CMA', contribution: '출자금', bond: '채권',
}
const ASSET_TYPE_ICONS: Record<string, LucideIcon> = {
  stock_kr: TrendingUp, stock_us: Globe, etf_kr: BarChart2, etf_us: BarChart3,
  crypto: Bitcoin, fund: Briefcase, savings: Landmark, real_estate: Building2, insurance: ShieldCheck, precious_metal: Gem, cma: CreditCard, contribution: Users, bond: ScrollText,
}
const ASSET_TYPE_COLORS: Record<string, { icon: string; bg: string }> = {
  stock_kr:      { icon: 'text-blue-400',   bg: 'bg-blue-500/10' },
  stock_us:      { icon: 'text-sky-400',    bg: 'bg-sky-500/10' },
  etf_kr:        { icon: 'text-emerald-400',bg: 'bg-emerald-500/10' },
  etf_us:        { icon: 'text-teal-400',   bg: 'bg-teal-500/10' },
  crypto:        { icon: 'text-orange-400', bg: 'bg-orange-500/10' },
  fund:          { icon: 'text-violet-400', bg: 'bg-violet-500/10' },
  savings:       { icon: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  real_estate:   { icon: 'text-rose-400',   bg: 'bg-rose-500/10' },
  insurance:     { icon: 'text-cyan-400',   bg: 'bg-cyan-500/10' },
  precious_metal:{ icon: 'text-amber-400',  bg: 'bg-amber-500/10' },
  cma:           { icon: 'text-cyan-400',   bg: 'bg-cyan-500/10' },
  contribution:  { icon: 'text-green-400',  bg: 'bg-green-500/10' },
  bond:          { icon: 'text-indigo-400', bg: 'bg-indigo-500/10' },
}
const ASSET_TYPE_ACTIVE: Record<string, { border: string; bg: string; text: string; iconBg: string }> = {
  stock_kr:      { border: 'border-blue-400',    bg: 'bg-blue-500/10',    text: 'text-blue-400',    iconBg: 'bg-blue-500/15' },
  stock_us:      { border: 'border-sky-400',     bg: 'bg-sky-500/10',     text: 'text-sky-400',     iconBg: 'bg-sky-500/15' },
  etf_kr:        { border: 'border-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400', iconBg: 'bg-emerald-500/15' },
  etf_us:        { border: 'border-teal-400',    bg: 'bg-teal-500/10',    text: 'text-teal-400',    iconBg: 'bg-teal-500/15' },
  crypto:        { border: 'border-orange-400',  bg: 'bg-orange-500/10',  text: 'text-orange-400',  iconBg: 'bg-orange-500/15' },
  fund:          { border: 'border-violet-400',  bg: 'bg-violet-500/10',  text: 'text-violet-400',  iconBg: 'bg-violet-500/15' },
  savings:       { border: 'border-yellow-400',  bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  iconBg: 'bg-yellow-500/15' },
  real_estate:   { border: 'border-rose-400',    bg: 'bg-rose-500/10',    text: 'text-rose-400',    iconBg: 'bg-rose-500/15' },
  insurance:     { border: 'border-cyan-400',    bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    iconBg: 'bg-cyan-500/15' },
  precious_metal:{ border: 'border-amber-400',   bg: 'bg-amber-500/10',   text: 'text-amber-400',   iconBg: 'bg-amber-500/15' },
  cma:           { border: 'border-cyan-500',    bg: 'bg-cyan-500/10',    text: 'text-cyan-300',    iconBg: 'bg-cyan-500/15' },
  contribution:  { border: 'border-green-400',   bg: 'bg-green-500/10',   text: 'text-green-400',   iconBg: 'bg-green-500/15' },
  bond:          { border: 'border-indigo-400',  bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  iconBg: 'bg-indigo-500/15' },
}
const TICKER_HINTS: Record<string, { placeholder: string; hint: string }> = {
  stock_kr: { placeholder: '예: 005930.KS', hint: 'KOSPI는 {종목코드}.KS, KOSDAQ는 {종목코드}.KQ\n예) 삼성전자 005930.KS · 카카오 035720.KQ' },
  etf_kr:   { placeholder: '예: 069500.KS', hint: 'KOSPI 상장 ETF는 {종목코드}.KS\n예) KODEX 200 069500.KS · TIGER 미국S&P500 360750.KS' },
  stock_us: { placeholder: '예: AAPL',      hint: '예) AAPL · MSFT · TSLA · NVDA' },
  etf_us:   { placeholder: '예: VOO',       hint: '예) VOO · QQQ · SPY · SCHD' },
  crypto:   { placeholder: '예: BTC-USD', hint: 'Yahoo Finance 형식: {심볼}-{통화}\n예) BTC-USD · ETH-USD · SOL-USD' },
  fund:     { placeholder: '예: KR5236A93166', hint: 'funetf.co.kr에서 펀드 상품 페이지 접속 후\nURL 주소창 마지막 코드 입력\n예) .../view/KR5236A93166 → KR5236A93166' },
}

// ── Label helpers ───────────────────────────────────────────────────────────

function getNameLabel(assetType: string): string {
  if (assetType === 'insurance') return '보험 상품명'
  if (assetType === 'fund') return '펀드명'
  if (assetType === 'etf_kr' || assetType === 'etf_us') return 'ETF 상품명'
  if (assetType === 'savings') return '예적금 유형'
  if (assetType === 'real_estate') return '주소'
  return '종목명'
}

function getNamePlaceholder(assetType: string): string {
  if (assetType === 'real_estate') return '예: 서울시 강남구 압구정동 000-0'
  return ''
}
function getTickerLabel(assetType: string): string {
  if (assetType === 'etf_kr' || assetType === 'etf_us') return 'ETF 코드'
  if (assetType === 'crypto') return '심볼'
  if (assetType === 'fund') return '펀드 코드'
  return '종목코드'
}

// ── Schema ─────────────────────────────────────────────────────────────────

const assetSchema = z.object({
  name: z.string().max(255),
  assetType: z.enum(['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'savings', 'real_estate', 'insurance', 'precious_metal', 'cma', 'contribution', 'bond']),
  priceType: z.enum(['live', 'manual']),
  currency: z.enum(['KRW', 'USD']),
  accountType: z.enum(['isa', 'irp', 'pension', 'dc', 'brokerage', 'spot', 'cma', 'insurance', 'upbit', 'bithumb', 'coinone', 'korbit', 'binance', 'coinbase', 'kraken', 'okx', 'fund_mirae', 'fund_samsung', 'fund_kb', 'fund_shinhan', 'fund_hanwha', 'fund_nh', 'fund_korea', 'fund_kiwoom', 'fund_hana', 'fund_woori', 'fund_ibk', 'fund_daishin', 'fund_timefolio', 'fund_truston', 'bank_kb', 'bank_shinhan', 'bank_woori', 'bank_hana', 'bank_nh', 'bank_kakao', 'bank_toss', 'bank_k', 'bank_ibk', 'bank_kdb', 'bank_busan', 'bank_daegu', 'bank_gwangju', 'bank_jeonbuk', 'bank_jeju', 'bank_sbi', 'bank_ok', 'bank_welcome', 'bank_pepper', 'bank_shincom', 'bank_saemaul', 'coop_shincom', 'coop_saemaul', 'coop_suhyup', 'coop_nh', 'coop_nfcf', 'ins_samsung_life', 'ins_hanwha_life', 'ins_kyobo', 'ins_shinhan_life', 'ins_nh_life', 'ins_kb_life', 'ins_aia', 'ins_metlife', 'ins_prudential', 'ins_im_life', 'ins_samsung_fire', 'ins_hyundai', 'ins_db_fire', 'ins_kb_fire', 'ins_meritz', 'ins_hanwha_fire', 'ins_lotte_fire']).optional().nullable(),
  brokerageId: z.string().max(50).optional().nullable(),
  withdrawalBankId: z.string().max(50).optional().nullable(),
  owner: z.string().max(20).optional().nullable(),
  ticker: z.string().max(20).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  initialQuantity: z.string().optional().nullable(),
  initialPricePerUnit: z.string().optional().nullable(),
  initialTransactionDate: z.string().optional().nullable(),
  initialExchangeRate: z.string().optional().nullable(),
  initialSurrenderValue: z.string().optional().nullable(),
  // Insurance-specific fields
  insuranceType: z.string().max(50).optional().nullable(),
  insuranceCategory: z.enum(['protection', 'savings']).optional().nullable(),
  paymentCycle: z.enum(['monthly', 'quarterly', 'yearly', 'lump_sum']).optional().nullable(),
  premiumPerCycleKrw: z.string().optional().nullable(),
  contractDate: z.string().optional().nullable(),
  paymentEndDate: z.string().optional().nullable(),
  coverageEndDate: z.string().optional().nullable(),
  sumInsuredKrw: z.string().optional().nullable(),
  expectedReturnRatePct: z.string().optional().nullable(),
  // Savings-specific fields
  savingsKind: z.enum(['term', 'recurring', 'free']).optional().nullable(),
  interestRatePct: z.string().optional().nullable(),
  depositStartDate: z.string().optional().nullable(),
  maturityDate: z.string().optional().nullable(),
  monthlyContributionKrw: z.string().optional().nullable(),
  compoundType: z.enum(['simple', 'monthly', 'yearly']).optional().nullable(),
  taxType: z.enum(['taxable', 'tax_free', 'preferential']).optional().nullable(),
  autoRenew: z.boolean().optional().nullable(),
}).superRefine((data, ctx) => {
  // 종목명 필수값 (자산유형별 메시지)
  if (!data.name || data.name.trim() === '') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${getNameLabel(data.assetType)}을 입력해주세요.`, path: ['name'] })
  }
  // 금융회사 step 필수값
  if (!data.owner) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: '실소유주를 선택해주세요.', path: ['owner'] })
  }
  const ACCOUNT_TYPE_REQUIRED = ['stock_kr', 'stock_us', 'etf_kr', 'etf_us', 'crypto', 'fund', 'savings', 'insurance']
  if (ACCOUNT_TYPE_REQUIRED.includes(data.assetType) && !data.accountType) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: '계좌 유형을 선택해주세요.', path: ['accountType'] })
  }
  if ((STOCK_ETF_TYPES as readonly string[]).includes(data.assetType) && !data.brokerageId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: '증권사를 선택해주세요.', path: ['brokerageId'] })
  }
  if (data.assetType === 'crypto' && !data.withdrawalBankId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: '실명확인 입출금계좌 은행을 선택해주세요.', path: ['withdrawalBankId'] })
  }
  // 적금 가입일·만기일 필수
  if (data.assetType === 'savings') {
    if (!data.depositStartDate || data.depositStartDate.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '가입일을 입력해주세요.', path: ['depositStartDate'] })
    }
    if (!data.maturityDate || data.maturityDate.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '만기일을 입력해주세요.', path: ['maturityDate'] })
    }
  }
  // 초기 매수 필수값 (insurance/savings는 수량·단가 쌍 검증 skip)
  if (data.assetType !== 'insurance' && data.assetType !== 'savings' && (TRADEABLE_TYPES as readonly string[]).includes(data.assetType)) {
    if (!data.initialQuantity || data.initialQuantity.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '수량을 입력해주세요.', path: ['initialQuantity'] })
    } else if (isNaN(parseFloat(data.initialQuantity)) || parseFloat(data.initialQuantity) <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '유효한 수량을 입력해주세요.', path: ['initialQuantity'] })
    }
    if (!data.initialPricePerUnit || data.initialPricePerUnit.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '매수 단가를 입력해주세요.', path: ['initialPricePerUnit'] })
    } else if (isNaN(parseFloat(data.initialPricePerUnit)) || parseFloat(data.initialPricePerUnit) < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '유효한 단가를 입력해주세요.', path: ['initialPricePerUnit'] })
    }
  }
})

interface TickerSuggestion { name: string; ticker: string }

const INSURANCE_COMPANY_KEY: [string, string][] = [
  ['삼성생명', 'ins_samsung_life'], ['한화생명', 'ins_hanwha_life'], ['교보생명', 'ins_kyobo'],
  ['신한라이프', 'ins_shinhan_life'], ['NH농협생명', 'ins_nh_life'], ['KB라이프', 'ins_kb_life'],
  ['AIA생명', 'ins_aia'], ['메트라이프', 'ins_metlife'], ['푸르덴셜', 'ins_prudential'],
  ['삼성화재', 'ins_samsung_fire'], ['현대해상', 'ins_hyundai'], ['DB손보', 'ins_db_fire'],
  ['KB손보', 'ins_kb_fire'], ['메리츠화재', 'ins_meritz'], ['한화손보', 'ins_hanwha_fire'],
  ['롯데손보', 'ins_lotte_fire'], ['IM라이프', 'ins_im_life'],
]

function getInsuranceCompanyKey(name: string): string | null {
  for (const [prefix, key] of INSURANCE_COMPANY_KEY) {
    if (name.startsWith(prefix)) return key
  }
  return null
}

const STEPS = [
  { label: '자산 유형' },
  { label: '금융회사' },
  { label: '실소유주' },
  { label: '종목 정보' },
  { label: '초기 매수' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function getDividendYears(depositDateStr: string | null | undefined): number[] {
  if (!depositDateStr) return []
  const depositYear = new Date(depositDateStr).getFullYear()
  if (isNaN(depositYear)) return []
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = depositYear + 1; y <= currentYear; y++) {
    years.push(y)
  }
  return years
}

// ── Component ──────────────────────────────────────────────────────────────

export function NewAssetForm({ onSubmit }: {
  onSubmit: (data: AssetFormValues) => Promise<{ error: string } | void>
}) {
  const [step, setStep] = useState(0)
  const [navDir, setNavDir] = useState<'forward' | 'back'>('forward')
  const [isPending, startTransition] = useTransition()

  // Ticker autocomplete state
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const isComposingRef = useRef(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const searchAbortRef = useRef<AbortController | null>(null)
  const MIN_SEARCH_LEN = 2

  // FX rate auto-fetch state
  const [isFetchingFx, setIsFetchingFx] = useState(false)
  const [fxFetchedDate, setFxFetchedDate] = useState<string | null>(null)

  // 출자금 연도별 배당률 state: { [year]: ratePct }
  const [dividendRateMap, setDividendRateMap] = useState<Record<number, string>>({})

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: '', assetType: 'stock_kr', priceType: 'live', currency: 'KRW',
      accountType: null, brokerageId: null, withdrawalBankId: null, owner: null, ticker: null, notes: null,
      initialQuantity: null, initialPricePerUnit: null,
      initialTransactionDate: new Date().toISOString().split('T')[0],
      initialExchangeRate: null, initialSurrenderValue: null,
      insuranceType: null, insuranceCategory: null,
      paymentCycle: null, premiumPerCycleKrw: null, contractDate: null,
      paymentEndDate: null, coverageEndDate: null, sumInsuredKrw: null, expectedReturnRatePct: null,
      savingsKind: null, interestRatePct: null, depositStartDate: null,
      maturityDate: null, monthlyContributionKrw: null,
      compoundType: null, taxType: null, autoRenew: null,
    },
    mode: 'onBlur',
  })

  const assetType = form.watch('assetType')
  const priceType = form.watch('priceType')
  const currency = form.watch('currency')
  const accountType = form.watch('accountType')
  const brokerageId = form.watch('brokerageId')
  const owner = form.watch('owner')
  const name = form.watch('name')
  const ticker = form.watch('ticker')
  const notes = form.watch('notes')
  const savingsKind = form.watch('savingsKind')
  const insuranceType = form.watch('insuranceType')
  const insuranceCategory = form.watch('insuranceCategory')
  const depositStartDate = form.watch('depositStartDate')

  // contribution: accountType 선택 시 종목명 자동 세팅
  useEffect(() => {
    if (assetType !== 'contribution' || !accountType) return
    const label = ACCOUNT_TYPE_LABELS[accountType]
    if (label) form.setValue('name', `${label} 출자금`)
  }, [accountType, assetType])

  // insuranceType → insuranceCategory 자동 세팅
  useEffect(() => {
    if (!insuranceType) return
    const SAVINGS_TYPES = ['annuity', 'variable', 'savings_ins']
    const derived = SAVINGS_TYPES.includes(insuranceType) ? 'savings' : 'protection'
    if (insuranceCategory !== derived) {
      form.setValue('insuranceCategory', derived)
    }
  }, [insuranceType])

  const isSearchable = (SEARCHABLE_TYPES.includes(assetType) && priceType === 'live') || assetType === 'insurance'
  const isAccountTypeable = ACCOUNT_TYPE_TYPES.includes(assetType)
  const showBrokerage = STOCK_ETF_TYPES.includes(assetType) && !!accountType
  const availableAccountTypes = ACCOUNT_TYPE_BY_ASSET[assetType] ?? Object.keys(ACCOUNT_TYPE_LABELS)
  const isUSD = currency === 'USD'
  const isUsAsset = assetType === 'stock_us' || assetType === 'etf_us'

  useEffect(() => {
    if (assetType === 'real_estate') {
      form.setValue('accountType', 'spot')
    } else {
      const current = form.getValues('accountType')
      if (current === 'spot') form.setValue('accountType', null)
    }
    if (!STOCK_ETF_TYPES.includes(assetType)) {
      form.setValue('brokerageId', null)
    }
    form.setValue('priceType', ['savings', 'real_estate', 'insurance', 'precious_metal', 'cma', 'contribution', 'bond'].includes(assetType) ? 'manual' : 'live')
    if (['stock_kr', 'etf_kr', 'fund'].includes(assetType)) {
      form.setValue('currency', 'KRW')
    }
    if (assetType !== 'contribution') {
      setDividendRateMap({})
    }
  }, [assetType])

  // ── FX rate auto-fetch (US 자산 매수일 기준, 원화/달러 무관) ───────────
  const initialTransactionDate = form.watch('initialTransactionDate')
  useEffect(() => {
    if (!isUsAsset || !initialTransactionDate) return
    if (fxFetchedDate === initialTransactionDate) return
    setIsFetchingFx(true)
    fetch(`/api/fx-rate?date=${initialTransactionDate}`)
      .then(r => r.json())
      .then(data => {
        if (data.rate) {
          form.setValue('initialExchangeRate', String(data.rate))
          setFxFetchedDate(initialTransactionDate)
        }
      })
      .catch(() => {})
      .finally(() => setIsFetchingFx(false))
  }, [isUsAsset, initialTransactionDate])

  // ── Ticker search ────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearTimeout(searchTimeout.current)
      searchAbortRef.current?.abort()
    }
  }, [])

  function handleNameInput(value: string, fieldOnChange: (val: string) => void) {
    fieldOnChange(value)
    if (!isSearchable) return
    clearTimeout(searchTimeout.current)
    searchAbortRef.current?.abort()

    if (value.length < MIN_SEARCH_LEN) {
      setSuggestions([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    searchTimeout.current = setTimeout(async () => {
      const controller = new AbortController()
      searchAbortRef.current = controller
      try {
        const res = await fetch(
          `/api/ticker-search?q=${encodeURIComponent(value)}&type=${assetType}`,
          { signal: controller.signal },
        )
        const data = await res.json()
        if (!controller.signal.aborted) setSuggestions(data.results ?? [])
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setSuggestions([])
      } finally {
        if (!controller.signal.aborted) setIsSearching(false)
      }
    }, 400)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return
    if (e.key === 'Enter') {
      if (isComposingRef.current || e.nativeEvent.isComposing) return
      e.preventDefault()
      selectSuggestion(suggestions[0])
    } else if (e.key === 'Escape') {
      setSuggestions([])
    }
  }

  function selectSuggestion(s: TickerSuggestion) {
    form.setValue('name', s.name, { shouldValidate: true })
    if (assetType !== 'insurance') {
      form.setValue('ticker', s.ticker, { shouldValidate: true })
    }
    setSuggestions([])
  }

  // ── Step navigation ──────────────────────────────────────────────────────

  const skipFinancial = assetType === 'real_estate'

  async function goNext() {
    setNavDir('forward')
    if (step === 0) {
      const ok = await form.trigger(['assetType'])
      if (ok) setStep(skipFinancial ? 2 : 1)
    } else if (step === 1) {
      const ok = await form.trigger(['accountType', 'brokerageId'])
      if (ok) setStep(2)
    } else if (step === 2) {
      const ok = await form.trigger(['owner'])
      if (ok) setStep(3)
    } else if (step === 3) {
      const ok = await form.trigger(['name', 'ticker'])
      if (ok) setStep(4)
    }
  }

  function goBack() {
    setNavDir('back')
    if (step === 0) window.history.back()
    else if (step === 2 && skipFinancial) setStep(0)
    else setStep(step - 1)
  }

  function handleSubmit(data: AssetFormValues) {
    startTransition(async () => {
      const submitValues = { ...data } as AssetFormValues
      if (data.assetType === 'contribution') {
        submitValues.contributionDividendRates = Object.entries(dividendRateMap)
          .map(([year, ratePct]) => ({ year: parseInt(year, 10), ratePct }))
          .filter(r => r.ratePct.trim() !== '')
      }
      const result = await onSubmit(submitValues)
      if (result?.error) form.setError('root', { message: result.error })
    })
  }

  // ── Style helpers ────────────────────────────────────────────────────────

  const tileClass = (active: boolean) =>
    `rounded-md border py-2.5 px-1.5 text-[11px] text-center leading-snug transition-colors duration-150 cursor-pointer flex flex-col items-center gap-1.5 ${
      active
        ? 'bg-foreground text-background border-foreground font-semibold'
        : 'text-foreground/55 border-border hover:border-foreground/35 hover:text-foreground/90'
    }`

  const pillClass = (active: boolean) =>
    `px-3 py-1 rounded-full text-xs border transition-colors duration-150 inline-flex items-center gap-1.5 ${
      active
        ? 'bg-foreground text-background border-foreground font-medium'
        : 'text-muted-foreground border-border hover:border-foreground/35 hover:text-foreground'
    }`

  const lbl = 'py-3 pr-4 flex items-center justify-center gap-1.5 text-sm font-medium text-foreground border-b border-r border-border/50'
  const cell = 'py-3 pl-4 min-w-0 border-b border-border/50'
  const row = 'contents'

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Form data-component="NewAssetForm" {...form}>
      <div className="max-w-[860px]">
      {/* Step Header */}
      <div className="mb-7">
        {/* Progress segments */}
        <div className="flex gap-1 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-[3px] flex-1 rounded-full transition-all duration-500 ease-out',
                i < step  ? 'bg-foreground' :
                i === step ? 'bg-foreground/45' :
                             'bg-border/40'
              )}
            />
          ))}
        </div>

        {/* Step info */}
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight leading-none">{STEPS[step].label}</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 select-none shrink-0">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background leading-none">
              {step + 1}
            </span>
            <span className="text-[11px] text-muted-foreground">/ {STEPS.length}</span>
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={isPending}
              className="w-9 h-9 rounded-full border-2 border-border bg-muted hover:bg-muted/60 hover:border-foreground/30 flex items-center justify-center transition-colors disabled:opacity-40"
            >
              {step === 0 ? <X className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={step < 4 ? goNext : () => form.handleSubmit(handleSubmit)()}
              disabled={isPending}
              className="w-9 h-9 rounded-full bg-foreground text-background border-2 border-foreground flex items-center justify-center hover:bg-foreground/85 transition-colors disabled:opacity-40"
            >
              {step === 4
                ? isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />
                : <ArrowRight className="h-4 w-4" />
              }
            </button>
          </div>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.preventDefault() }}
        className="space-y-4"
      >
        <div key={step} className={navDir === 'forward' ? 'step-enter-forward' : 'step-enter-back'}>
        {/* ── Step 1: 자산 유형 ────────────────────────────────────────── */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            {/* 자산 유형 카드 */}
            <FormField
              control={form.control}
              name="assetType"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground pb-2.5 mb-3 border-b border-border">
                    <Layers className="h-4 w-4" />자산 유형
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-border bg-muted/50 p-2">
                      {Object.entries(ASSET_TYPE_LABELS).map(([val, label]) => {
                        const Icon = ASSET_TYPE_ICONS[val]
                        const color = ASSET_TYPE_COLORS[val]
                        const active = field.value === val
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => field.onChange(val)}
                            className={cn(
                              'flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-xl border-2 transition-colors duration-150 cursor-pointer',
                              active
                                ? cn(ASSET_TYPE_ACTIVE[val]?.border, ASSET_TYPE_ACTIVE[val]?.bg, 'shadow-sm ring-1 ring-inset ring-border')
                                : 'border-border bg-muted/50 hover:border-foreground/30 hover:bg-muted'
                            )}
                          >
                            <span className={cn('flex items-center justify-center rounded-lg p-1.5', active ? ASSET_TYPE_ACTIVE[val]?.iconBg : color?.bg)}>
                              <Icon className={cn('h-4 w-4 shrink-0', active ? ASSET_TYPE_ACTIVE[val]?.text : color?.icon)} />
                            </span>
                            <span className={cn('text-[11px] font-medium leading-tight text-center', active ? ASSET_TYPE_ACTIVE[val]?.text : 'text-foreground')}>{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 자산유형 비교 테이블 */}
            <div className="overflow-x-auto rounded-xl border border-border bg-muted/30">
              <table className="w-full text-[11px] min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-muted/60">
                    <th className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">자산 유형</th>
                    <th className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">법적 성격</th>
                    <th className="px-3 py-2 text-center font-semibold text-foreground whitespace-nowrap">원금 보장</th>
                    <th className="px-3 py-2 text-center font-semibold text-foreground whitespace-nowrap">기대 수익</th>
                    <th className="px-3 py-2 text-center font-semibold text-foreground whitespace-nowrap">리스크</th>
                    <th className="px-3 py-2 text-center font-semibold text-foreground whitespace-nowrap">유동성</th>
                    <th className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">세금</th>
                    <th className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">특징</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { type: 'stock_kr',      label: '주식 (국내)',  legal: '지분증권',      protect: '❌', return: '높음',    risk: '높음',    liquidity: '높음',      tax: '양도소득세 (대주주), 배당소득세 15.4%',      note: '코스피/코스닥, 거래세 0.18%' },
                    { type: 'stock_us',      label: '주식 (미국)',  legal: '지분증권',      protect: '❌', return: '높음',    risk: '높음',    liquidity: '높음',      tax: '양도소득세 22% (250만원 공제)',               note: '환율 리스크, 서학개미' },
                    { type: 'etf_kr',        label: 'ETF (국내)',   legal: '수익증권',      protect: '❌', return: '중~높음', risk: '중~높음', liquidity: '높음',      tax: '매매차익 비과세 (일부), 배당소득세 15.4%',    note: '분산투자, 낮은 비용' },
                    { type: 'etf_us',        label: 'ETF (미국)',   legal: '수익증권',      protect: '❌', return: '중~높음', risk: '중~높음', liquidity: '높음',      tax: '양도소득세 22% (250만원 공제)',               note: '환율 리스크, 다양한 섹터' },
                    { type: 'crypto',        label: '코인',         legal: '가상자산',      protect: '❌', return: '매우 높음', risk: '매우 높음', liquidity: '높음 (24h)', tax: '2025년 과세 예정',                        note: '변동성 극심, 규제 불확실' },
                    { type: 'fund',          label: '펀드',         legal: '수익증권',      protect: '❌', return: '중간',    risk: '중간',    liquidity: '중간',      tax: '배당소득세 15.4%',                           note: '전문가 운용, 운용보수 발생' },
                    { type: 'savings',       label: '예적금',       legal: '채권',          protect: '✅ (5천만원)', return: '낮음', risk: '낮음', liquidity: '중간',   tax: '이자소득세 15.4%',                           note: '확정 이자, 예금자 보호' },
                    { type: 'real_estate',   label: '부동산',       legal: '실물자산',      protect: '△', return: '중~높음', risk: '중간',    liquidity: '낮음',      tax: '취득세, 재산세, 양도소득세',                 note: '레버리지 가능, 거래 비용 높음' },
                    { type: 'insurance',     label: '보험',         legal: '계약상 권리',   protect: '△', return: '낮음',    risk: '낮음',    liquidity: '낮음',      tax: '보험차익 비과세 (일부)',                      note: '보장 기능 겸용, 중도 해지 손실' },
                    { type: 'precious_metal',label: '금/은',        legal: '실물자산',      protect: '❌', return: '중간',    risk: '중간',    liquidity: '중간',      tax: '매매차익 비과세 (실물), 통장형 배당소득세',  note: '인플레이션 헤지, 안전자산' },
                    { type: 'cma',           label: 'CMA',          legal: '단기금융상품',  protect: '△', return: '낮음',    risk: '낮음',    liquidity: '매우 높음', tax: '이자소득세 15.4%',                           note: '수시 입출금, 하루짜리 이자' },
                    { type: 'contribution',  label: '출자금',       legal: '지분 (조합원)', protect: '❌', return: '낮음',    risk: '낮음',    liquidity: '낮음',      tax: '배당소득세',                                 note: '신협·새마을금고, 탈퇴 시 반환' },
                    { type: 'bond',          label: '채권',         legal: '채권',          protect: '△ (만기 시)', return: '낮~중간', risk: '낮~중간', liquidity: '중간', tax: '이자소득세 15.4%, 매매차익 비과세 (국내)',  note: '확정 이자, 만기 원금 상환' },
                  ].map((row) => {
                    const isSelected = assetType === row.type
                    return (
                      <tr
                        key={row.type}
                        className={cn('transition-colors', isSelected ? 'bg-primary/10' : 'hover:bg-muted/40')}
                      >
                        <td className={cn('px-3 py-2 font-medium whitespace-nowrap', isSelected ? 'text-primary' : 'text-foreground')}>{row.label}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{row.legal}</td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">{row.protect}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground whitespace-nowrap">{row.return}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground whitespace-nowrap">{row.risk}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground whitespace-nowrap">{row.liquidity}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.tax}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.note}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border">
                ⚠️ 세율은 2025년 4월 기준이며, 금융투자소득세·가상자산 과세 등은 변동 가능성이 있습니다. 세부 세금은 세무사 확인을 권장합니다.
              </p>
            </div>

          </div>
        )}

        {/* ── Step 2: 금융회사 ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex gap-3 items-start">

            {/* LEFT: 금융회사 */}
            {STOCK_ETF_TYPES.includes(assetType) ? (
              <FormField
                control={form.control}
                name="brokerageId"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-0">
                    <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground pb-2.5 mb-3 border-b border-border">
                      <Briefcase className="h-4 w-4" />증권사
                    </FormLabel>
                    <FormControl>
                      <div className="rounded-xl border border-border bg-muted/50 p-2">
                        {BROKERAGE_GROUPS.map((group) => (
                          <div key={group.label} className="mb-1.5 last:mb-0">
                            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{group.label}</p>
                            <div className="grid grid-cols-4 gap-1.5">
                              {group.items.map((val) => {
                                const active = field.value === val
                                return (
                                  <button key={val} type="button" onClick={() => field.onChange(active ? null : val)}
                                    className={cn('flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-xl border-2 transition-colors duration-150 cursor-pointer',
                                      active ? 'border-indigo-400 bg-indigo-500/10 text-indigo-300 shadow-sm' : 'border-border bg-muted/50 text-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted'
                                    )}>
                                    <DomainLogo value={val} size={26} />
                                    <span className="text-[11px] font-medium leading-tight text-center">{BROKERAGE_LABELS[val]}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : isAccountTypeable ? (
              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-0">
                    <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground pb-2.5 mb-3 border-b border-border">
                      <Wallet className="h-4 w-4" />
                      {assetType === 'crypto' ? '거래소' : assetType === 'fund' ? '운용사' : assetType === 'savings' ? '은행' : assetType === 'insurance' ? '보험사' : assetType === 'contribution' ? '조합' : '금융회사'}
                    </FormLabel>
                    <FormControl>
                      <div className="rounded-xl border border-border bg-muted/50 p-2">
                        {(assetType === 'crypto' ? EXCHANGE_GROUPS : assetType === 'fund' ? FUND_COMPANY_GROUPS : assetType === 'insurance' ? INSURANCE_GROUPS : assetType === 'contribution' ? COOP_GROUPS : BANK_GROUPS).map((group) => (
                          <div key={group.label} className="mb-1.5 last:mb-0">
                            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{group.label}</p>
                            <div className={cn('grid gap-1.5', assetType === 'savings' ? 'grid-cols-5' : 'grid-cols-4')}>
                              {group.items.map((val) => {
                                const active = field.value === val
                                return (
                                  <button key={val} type="button" onClick={() => field.onChange(active ? null : val)}
                                    className={cn('flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-xl border-2 transition-colors duration-150 cursor-pointer',
                                      active ? 'border-indigo-400 bg-indigo-500/10 text-indigo-300 shadow-sm' : 'border-border bg-muted/50 text-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted'
                                    )}>
                                    <DomainLogo value={val} size={26} />
                                    <span className="text-[11px] font-medium leading-tight text-center">{ACCOUNT_TYPE_LABELS[val]}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="flex-1 min-w-0 rounded-xl border border-border bg-muted/50 p-6 flex items-center justify-center text-sm text-foreground/50">
                해당 자산은 금융회사 정보가 없습니다
              </div>
            )}

            {/* RIGHT: 계좌 유형 */}
            {(STOCK_ETF_TYPES.includes(assetType) || assetType === 'crypto') && (
            <div className="flex-1 min-w-0 flex flex-col gap-4">
              {STOCK_ETF_TYPES.includes(assetType) && (
                <FormField
                  control={form.control}
                  name="accountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground pb-2.5 mb-3 border-b border-border">
                        <Wallet className="h-4 w-4" />계좌 유형
                      </FormLabel>
                      <FormControl>
                        <div className="rounded-xl border border-border bg-muted/50 p-2">
                          <div className={cn('grid gap-1.5', availableAccountTypes.length > 4 ? 'grid-cols-4' : 'grid-cols-2')}>
                            {availableAccountTypes.map((val) => {
                              const Icon = ACCOUNT_TYPE_ICONS[val]
                              const color = ACCOUNT_TYPE_COLORS[val]
                              const active = field.value === val
                              return (
                                <button key={val} type="button" onClick={() => field.onChange(active ? null : val)}
                                  className={cn('flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-xl border-2 transition-colors duration-150 cursor-pointer',
                                    active ? 'border-indigo-400 bg-indigo-500/10 text-indigo-300 shadow-sm' : 'border-border bg-muted/50 text-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted'
                                  )}>
                                  <span className={cn('flex items-center justify-center rounded-lg p-1.5', active ? 'bg-indigo-500/15' : color?.bg)}>
                                    <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-indigo-400' : color?.icon)} />
                                  </span>
                                  <span className="text-[11px] font-medium leading-tight text-center">{ACCOUNT_TYPE_LABELS[val]}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {assetType === 'crypto' && (
                <FormField
                  control={form.control}
                  name="withdrawalBankId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground pb-2.5 mb-3 border-b border-border">
                        <Landmark className="h-4 w-4" />실명확인 입출금계좌
                      </FormLabel>
                      <FormControl>
                        <div className="rounded-xl border border-border bg-muted/50 p-2">
                          {BANK_GROUPS.map((group) => (
                            <div key={group.label} className="mb-1.5 last:mb-0">
                              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{group.label}</p>
                              <div className="grid grid-cols-4 gap-1.5">
                                {group.items.map((val) => {
                                  const active = field.value === val
                                  return (
                                    <button key={val} type="button" onClick={() => field.onChange(active ? null : val)}
                                      className={cn('flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-xl border-2 transition-colors duration-150 cursor-pointer',
                                        active ? 'border-indigo-400 bg-indigo-500/10 text-indigo-300 shadow-sm' : 'border-border bg-muted/50 text-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted'
                                      )}>
                                      <DomainLogo value={val} size={26} />
                                      <span className="text-[11px] font-medium leading-tight text-center">{ACCOUNT_TYPE_LABELS[val]}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              </div>
          )}
          </div>
        )}

        {/* ── Step 3: 실소유주 ────────────────────────────────────────── */}
        {step === 2 && (
          <FormField
            control={form.control}
            name="owner"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground pb-2.5 mb-3 border-b border-border">
                  <Users className="h-4 w-4" />실소유주
                </FormLabel>
                <FormControl>
                  <div className="rounded-xl border border-border bg-muted/50 p-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      {OWNER_OPTIONS.map((val) => {
                        const active = field.value === val
                        return (
                          <button key={val} type="button" onClick={() => field.onChange(active ? null : val)}
                            className={cn('flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-colors duration-150 cursor-pointer',
                              active ? 'border-indigo-400 bg-indigo-500/10 text-indigo-300 shadow-sm' : 'border-border bg-muted/50 text-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted'
                            )}>
                            <span className="text-xl leading-none">{OWNER_ICONS[val]}</span>
                            <span>{val}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* ── Step 4: 종목 정보 ────────────────────────────────────────── */}
        {step === 3 && (
          <div className="flex flex-col gap-3">

            {/* 상: 종목명 검색 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field: { value, onChange: fieldOnChange, ...restField } }) => (
                <FormItem className="rounded-xl border border-border bg-muted/50 p-4 space-y-3">
                  <FormLabel className="flex items-center gap-1.5 text-sm font-semibold text-foreground pb-2.5 border-b border-border">
                    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-muted">
                      <Tag className="h-3.5 w-3.5 shrink-0" />
                    </span>
                    {getNameLabel(assetType)}
                  </FormLabel>
                  {/* 보험 유형 카드 선택 */}
                  {assetType === 'insurance' && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {([
                        ['종신보험', Shield,      'text-violet-400', 'bg-violet-500/20', 'whole_life' ],
                        ['정기보험', Calendar,    'text-blue-400',   'bg-blue-500/20',   'term_life'  ],
                        ['연금보험', TrendingUp,  'text-emerald-400','bg-emerald-500/20','annuity'    ],
                        ['변액보험', BarChart2,   'text-orange-400', 'bg-orange-500/20', 'variable'   ],
                        ['저축보험', Banknote,    'text-cyan-400',   'bg-cyan-500/20',   'savings_ins'],
                        ['실손보험', Heart,       'text-rose-400',   'bg-rose-500/20',   'actual_loss'],
                        ['건강보험', ShieldCheck, 'text-pink-400',   'bg-pink-500/20',   'health'     ],
                      ] as const).map(([label, Icon, iconColor, iconBg, typeVal]) => {
                        const active = form.watch('insuranceType') === typeVal
                        return (
                          <button
                            key={typeVal}
                            type="button"
                            onClick={() => form.setValue('insuranceType', active ? null : typeVal)}
                            className={cn(
                              'flex flex-col items-center gap-2 rounded-lg border py-3 px-2 text-xs font-medium transition-colors duration-100 cursor-pointer',
                              active
                                ? 'bg-indigo-500/20 border-indigo-400/60 text-indigo-300'
                                : 'border-border bg-muted/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted/50',
                            )}
                          >
                            <div className={cn(
                              'flex items-center justify-center rounded-lg w-9 h-9 transition-colors',
                              active ? 'bg-indigo-400/30 text-indigo-300' : `${iconBg} ${iconColor}`
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* 예적금 상품 유형 카드 선택 */}
                  {assetType === 'savings' && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        ['정기예금', Lock,          'text-blue-400',   'term'      ],
                        ['정기적금', Repeat,        'text-violet-400', 'recurring' ],
                        ['자유적금', Shuffle,       'text-emerald-400','free'      ],
                        ['청약저축', Home,          'text-orange-400', 'recurring' ],
                        ['파킹통장', ParkingCircle, 'text-cyan-400',   'free'      ],
                        ['외화예금', Globe2,        'text-rose-400',   'term'      ],
                      ] as const).map(([product, Icon, iconColor, kind]) => (
                        <button
                          key={product}
                          type="button"
                          onClick={() => {
                            const bankLabel = accountType ? ACCOUNT_TYPE_LABELS[accountType] ?? '' : ''
                            fieldOnChange(bankLabel ? `${bankLabel} ${product}` : product)
                            form.setValue('savingsKind', kind)
                          }}
                          className={cn(
                            'flex flex-col items-center gap-1.5 rounded-lg border py-2.5 text-xs font-medium transition-colors duration-100 cursor-pointer',
                            value?.endsWith(product)
                              ? 'bg-indigo-500/20 border-indigo-400/60 text-indigo-300'
                              : 'border-border bg-muted/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted/50',
                          )}
                        >
                          <Icon className={cn('h-3.5 w-3.5', value?.endsWith(product) ? 'text-indigo-300' : iconColor)} />
                          {product}
                        </button>
                      ))}
                    </div>
                  )}

                  <FormControl>
                    <div className="relative">
                      <Input
                        {...restField}
                        value={value ?? ''}
                        autoComplete="off"
                        placeholder={getNamePlaceholder(assetType)}
                        readOnly={assetType === 'savings'}
                        className={cn(isSearchable ? 'pr-8' : undefined, assetType === 'savings' ? 'cursor-default' : undefined)}
                        onChange={(e) => handleNameInput(e.target.value, fieldOnChange)}
                        onKeyDown={handleKeyDown}
                        onCompositionStart={() => { isComposingRef.current = true }}
                        onCompositionEnd={() => { isComposingRef.current = false }}
                        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                      />
                      {isSearchable && (
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {isSearching
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Search className="h-4 w-4" />}
                        </span>
                      )}

                      {/* 검색 결과 오버레이 */}
                      {suggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-border bg-card shadow-lg shadow-black/10 p-1.5 flex flex-col gap-0.5">
                          {suggestions.map((s) => {
                            const isSelected = value === s.name
                            return (
                              <button
                                key={s.ticker || s.name}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectSuggestion(s)}
                                className={cn(
                                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-100 cursor-pointer',
                                  isSelected
                                    ? 'bg-indigo-500/10 text-indigo-700'
                                    : 'hover:bg-muted/60 text-foreground'
                                )}
                              >
                                <div className="relative shrink-0">
                                  {assetType === 'insurance'
                                    ? <DomainLogo value={getInsuranceCompanyKey(s.name) ?? 'ins_samsung_life'} size={30} />
                                    : <AssetLogo ticker={s.ticker} name={s.name} assetType={assetType as Parameters<typeof AssetLogo>[0]['assetType']} size={30} />
                                  }
                                  {isSelected && (
                                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-500">
                                      <Check className="h-2 w-2 text-white" strokeWidth={3} />
                                    </span>
                                  )}
                                </div>
                                <span className="flex-1 text-sm font-medium truncate">{s.name}</span>
                                {s.ticker && (
                                  <span className={cn(
                                    'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-mono font-medium',
                                    isSelected ? 'bg-indigo-500/10 text-indigo-700' : 'bg-muted/50 text-muted-foreground'
                                  )}>{s.ticker}</span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />

                  {/* 검색 도움말 */}
                  {isSearchable && (assetType === 'stock_kr' || assetType === 'etf_kr' || assetType === 'stock_us' || assetType === 'etf_us') && (
                    <div className="flex items-start gap-2 rounded-lg bg-card border border-border px-3 py-2.5">
                      <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {getNameLabel(assetType)}을 입력하면 연관 상품을 추천해드려요.
                        {(assetType === 'stock_us' || assetType === 'etf_us') && (
                          <> 한글 입력 시 연관 {assetType === 'etf_us' ? 'ETF가' : '종목이'} 추천되지 않는 경우 영어로 입력해 보세요.</>
                        )}
                      </p>
                    </div>
                  )}

                </FormItem>
              )}
            />

            {/* 세금 유형 + 이자 계산 방식 */}
            {assetType === 'savings' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground pb-2.5 border-b border-border">
                    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-muted">
                      <Receipt className="h-3.5 w-3.5 shrink-0" />
                    </span>
                    세금 유형
                  </p>
                  <div className="flex gap-1.5">
                    {([
                      ['taxable',     '일반 (15.4%)', Percent,    'text-slate-400'],
                      ['preferential','우대 (9.5%)',  Star,       'text-blue-400'],
                      ['tax_free',    '비과세',        Leaf,       'text-emerald-400'],
                    ] as const).map(([val, label, Icon, iconColor]) => (
                      <button key={val} type="button"
                        onClick={() => form.setValue('taxType', val)}
                        className={cn('flex-1 flex flex-col items-center gap-1.5 rounded-lg border py-2.5 text-xs font-medium transition-colors duration-100 cursor-pointer',
                          form.watch('taxType') === val
                            ? 'bg-indigo-500/20 border-indigo-400/60 text-indigo-300'
                            : 'border-border bg-muted/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted/50'
                        )}>
                        <Icon className={cn('h-3.5 w-3.5', form.watch('taxType') === val ? 'text-indigo-300' : iconColor)} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground pb-2.5 border-b border-border">
                    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-muted">
                      <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                    </span>
                    이자 계산 방식
                  </p>
                  <div className="flex gap-1.5">
                    {([
                      ['simple',  '단리',  Minus,      'text-orange-400'],
                      ['monthly', '월복리', RefreshCw,  'text-violet-400'],
                    ] as const).map(([val, label, Icon, iconColor]) => (
                      <button key={val} type="button"
                        onClick={() => form.setValue('compoundType', val)}
                        className={cn('flex-1 flex flex-col items-center gap-1.5 rounded-lg border py-2.5 text-xs font-medium transition-colors duration-100 cursor-pointer',
                          form.watch('compoundType') === val
                            ? 'bg-indigo-500/20 border-indigo-400/60 text-indigo-300'
                            : 'border-border bg-muted/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted/50'
                        )}>
                        <Icon className={cn('h-3.5 w-3.5', form.watch('compoundType') === val ? 'text-indigo-300' : iconColor)} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 하: 종목코드 + 메모 */}
            {/* 좌: 종목코드 */}
              {assetType !== 'insurance' && assetType !== 'contribution' && assetType !== 'bond' && priceType !== 'manual' && <FormField
                control={form.control}
                name="ticker"
                render={({ field }) => {
                  const hint = TICKER_HINTS[assetType]
                  const disabled = priceType !== 'live'
                  return (
                    <FormItem className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
                      <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground pb-2.5 border-b border-border">
                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-muted/50">
                          <Hash className="h-3.5 w-3.5 shrink-0" />
                        </span>
                        {getTickerLabel(assetType)}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder={hint?.placeholder ?? '예: AAPL'} disabled={disabled} />
                      </FormControl>
                      {hint && !disabled && (
                        <div className="flex gap-2 rounded-md border border-border bg-card px-3 py-2.5">
                          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-500" />
                          <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{hint.hint}</p>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />}

            {/* 메모 */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                  <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground pb-2.5 border-b border-border">
                    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-muted/50">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    </span>
                    메모
                    <span className="ml-auto text-[11px] font-normal text-muted-foreground/60 bg-muted/50 rounded-full px-2 py-0.5">선택</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} placeholder="예: 물타기" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 보험 도움말 */}
            {assetType === 'insurance' && (
              <div className="rounded-xl border border-border overflow-hidden text-xs text-foreground/80">
                <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="font-semibold text-sm">보험 유형별 비교</span>
                </div>

                {/* 연금보험 */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="mb-2 leading-relaxed flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-400" /><span className="font-semibold text-foreground/80">연금보험</span><span className="text-muted-foreground"> — 노후를 대비해 일정 기간 보험료를 납입한 후, 일정 나이가 되면 매달 연금 형태로 받는 보험입니다.</span></p>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 pr-4 font-medium text-muted-foreground w-28">항목</th>
                        <th className="text-left py-1.5 font-medium text-muted-foreground">내용</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {([
                        ['목적', '노후 생활비 마련'],
                        ['납입 방식', '매월 일정 보험료 납입'],
                        ['수령 방식', '연금 개시 후 매달 수령'],
                        ['원금 보장', '△ (공시이율 기준, 원금 보장형 상품 있음)'],
                        ['세금 혜택', '10년 이상 유지 시 이자 비과세'],
                        ['중도 해지', '손실 발생 (납입 보험료보다 적게 돌려받음)'],
                        ['단점', '장기 유지 필수, 중도 해지 시 손해 큼'],
                      ] as [string, string][]).map(([item, content]) => (
                        <tr key={item}>
                          <td className="py-1.5 pr-4 text-muted-foreground">{item}</td>
                          <td className="py-1.5">{content}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 변액보험 */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="mb-2 leading-relaxed flex items-center gap-1.5"><BarChart2 className="h-3.5 w-3.5 shrink-0 text-orange-400" /><span className="font-semibold text-foreground/80">변액보험</span><span className="text-muted-foreground"> — 납입 보험료를 펀드에 투자하여 운용 실적에 따라 수익이 달라지는 보험입니다.</span></p>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 pr-4 font-medium text-muted-foreground w-28">항목</th>
                        <th className="text-left py-1.5 font-medium text-muted-foreground">내용</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {([
                        ['목적', '보장 + 투자 수익'],
                        ['납입 방식', '매월 보험료 납입'],
                        ['수령 방식', '만기 수령 또는 연금 전환'],
                        ['원금 보장', '❌ 투자 실적에 따라 원금 손실 가능'],
                        ['세금 혜택', '10년 이상 유지 시 이자 비과세'],
                        ['중도 해지', '손실 발생 (초기 해지 시 손실 매우 큼)'],
                        ['단점', '펀드 운용 수수료 발생, 원금 손실 위험'],
                      ] as [string, string][]).map(([item, content]) => (
                        <tr key={item}>
                          <td className="py-1.5 pr-4 text-muted-foreground">{item}</td>
                          <td className="py-1.5">{content}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 저축보험 */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="mb-2 leading-relaxed flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5 shrink-0 text-cyan-400" /><span className="font-semibold text-foreground/80">저축보험</span><span className="text-muted-foreground"> — 은행 적금처럼 일정 기간 납입 후 만기에 목돈을 받는 보험입니다.</span></p>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 pr-4 font-medium text-muted-foreground w-28">항목</th>
                        <th className="text-left py-1.5 font-medium text-muted-foreground">내용</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {([
                        ['목적', '목돈 마련'],
                        ['납입 방식', '매월 일정 보험료 납입'],
                        ['수령 방식', '만기 일시 수령'],
                        ['원금 보장', '△ (공시이율 기준, 장기 유지 시 원금 보장)'],
                        ['세금 혜택', '10년 이상 유지 시 이자 비과세'],
                        ['중도 해지', '손실 발생 (특히 초기 1~3년 내 해지 시 손실 큼)'],
                        ['단점', '은행 적금보다 수익률 낮을 수 있음, 사업비 발생'],
                      ] as [string, string][]).map(([item, content]) => (
                        <tr key={item}>
                          <td className="py-1.5 pr-4 text-muted-foreground">{item}</td>
                          <td className="py-1.5">{content}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 세 가지 비교 */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-semibold mb-2 text-foreground/70 tracking-wide uppercase text-[10px]">세 가지 비교</p>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        {['구분', '연금보험', '변액보험', '저축보험'].map((h) => (
                          <th key={h} className="text-left py-1.5 pr-3 last:pr-0 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {([
                        ['목적', '노후 연금', '투자 + 보장', '목돈 마련'],
                        ['원금 보장', '△', '❌', '△'],
                        ['수익률', '낮음~중간', '낮음~높음', '낮음~중간'],
                        ['리스크', '낮음', '높음', '낮음'],
                        ['비과세', '10년 이상', '10년 이상', '10년 이상'],
                        ['적합한 사람', '노후 준비', '장기 투자 선호', '목돈 필요'],
                      ] as string[][]).map((r) => (
                        <tr key={r[0]}>
                          {r.map((c, i) => (
                            <td key={i} className="py-1.5 pr-3 last:pr-0 text-muted-foreground first:font-medium first:text-foreground/70">{c}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-3 text-muted-foreground leading-relaxed">
                  ⚠️ 세 상품 모두 <strong className="text-foreground">초기 해지 시 납입 보험료보다 적게 돌려받는 구조</strong>입니다. 가입 전 최소 유지 기간과 해지환급금 시뮬레이션을 반드시 확인하세요.
                </div>
              </div>
            )}

            {/* 출자금 도움말 */}
            {assetType === 'contribution' && (
              <div className="rounded-xl border border-border overflow-hidden text-xs text-foreground/80">
                <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="font-semibold text-sm">출자금이란?</span>
                </div>
                <div className="px-4 py-3 leading-relaxed border-b border-border text-muted-foreground">
                  조합(신협, 새마을금고, 농협 등)에 조합원으로 가입하면서 납입하는 돈으로, 예금이 아닌 <strong className="text-foreground">조합의 주인(조합원)이 되는 지분</strong> 성격의 자산입니다.
                </div>
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-semibold mb-2 text-foreground/70 tracking-wide uppercase text-[10px]">핵심 정보 한눈에 보기</p>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 pr-4 font-medium text-muted-foreground w-32">항목</th>
                        <th className="text-left py-1.5 font-medium text-muted-foreground">내용</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {([
                        ['법적 성격', '지분 (조합원 자격)'],
                        ['원금 보장', '❌ 비보장 (조합 부실 시 손실 가능)'],
                        ['예금자보호', '❌ 적용 안 됨'],
                        ['수익 방식', '연 1회 배당 (조합 결산 후)'],
                        ['배당률', '매년 조합 실적에 따라 변동 (0원 가능)'],
                        ['중도 인출', '❌ 불가 (탈퇴 신청 후 처리 기간 필요)'],
                        ['비과세 한도', '출자금 1,000만원 이하 배당소득 비과세'],
                        ['초과 시 세금', '1,000만원 초과분 배당에 15.4% 부과'],
                      ] as [string, string][]).map(([item, content]) => (
                        <tr key={item}>
                          <td className="py-1.5 pr-4 text-muted-foreground">{item}</td>
                          <td className="py-1.5">{content}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-semibold mb-2 text-foreground/70 tracking-wide uppercase text-[10px]">비과세 예시</p>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        {['출자금', '배당률', '배당금', '비과세', '과세', '실수령'].map((h) => (
                          <th key={h} className="text-left py-1.5 pr-3 last:pr-0 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {([
                        ['500만원', '3%', '15만원', '15만원 전액', '없음', '15만원'],
                        ['1,000만원', '3%', '30만원', '30만원 전액', '없음', '30만원'],
                        ['1,500만원', '3%', '45만원', '30만원', '15만원 × 15.4% = 2.3만원', '42.7만원'],
                        ['2,000만원', '3%', '60만원', '30만원', '30만원 × 15.4% = 4.6만원', '55.4만원'],
                      ] as string[][]).map((r) => (
                        <tr key={r[0]}>
                          {r.map((c, i) => (
                            <td key={i} className="py-1.5 pr-3 last:pr-0 whitespace-nowrap">{c}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 text-muted-foreground leading-relaxed">
                  ⚠️ 비과세 한도 및 적용 조건은 변경될 수 있으며, 여러 조합에 분산 출자 시 합산 기준 적용 여부는 가입 전 해당 조합에 직접 확인하세요.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 5: 초기 매수 내역 ──────────────────────────────────── */}
        {step === 4 && (
          <div className="flex flex-col gap-4">

          {/* RIGHT: 입력 요약 (AssetCard 스타일) */}
          {(() => {
            const finId = brokerageId || accountType
            const finName = brokerageId ? BROKERAGE_LABELS[brokerageId]
              : accountType ? ACCOUNT_TYPE_LABELS[accountType] : null
            const acctLabel = STOCK_ETF_TYPES.includes(assetType) && accountType
              ? ACCOUNT_TYPE_LABELS[accountType] : null
            const color = ASSET_TYPE_ACTIVE[assetType]
            const TypeIcon = ASSET_TYPE_ICONS[assetType]
            return (
              <div className="flex flex-col gap-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-0.5">입력 요약</p>
                <div className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-xl border-2",
                  color?.border ?? 'border-border',
                  color?.bg ?? 'bg-card'
                )}>
                  {/* 로고 */}
                  <div className="shrink-0">
                    {name
                      ? assetType === 'insurance'
                        ? <DomainLogo value={getInsuranceCompanyKey(name) ?? 'ins_samsung_life'} size={40} />
                        : <AssetLogo ticker={ticker ?? ''} name={name} assetType={assetType as Parameters<typeof AssetLogo>[0]['assetType']} size={40} />
                      : (
                          <span className={cn('flex items-center justify-center rounded-xl w-10 h-10', color?.iconBg)}>
                            <TypeIcon className={cn('h-5 w-5', color?.text)} />
                          </span>
                        )
                    }
                  </div>
                  {/* 이름 + 서브 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('font-semibold text-sm leading-tight truncate', color?.text)}>
                        {name || <span className="text-muted-foreground/50 italic text-xs font-normal">종목명 미입력</span>}
                      </span>
                      {acctLabel && (
                        <span className={cn('text-xs rounded-full px-2 py-0.5 font-medium shrink-0', color?.iconBg, color?.text)}>
                          {acctLabel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {ticker && <span className="font-mono">{ticker}</span>}
                      {ticker && (finName || owner) && <span className="opacity-30">·</span>}
                      {finName && <span>{finName}</span>}
                      {finName && owner && <span className="opacity-30">·</span>}
                      {owner && <span>{OWNER_ICONS[owner]} {owner}</span>}
                    </div>
                    {notes && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">{notes}</p>
                    )}
                  </div>
                  {/* 자산유형 badge */}
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    <span className={cn('flex items-center justify-center rounded-lg p-1.5', color?.iconBg)}>
                      <TypeIcon className={cn('h-4 w-4', color?.text)} />
                    </span>
                    <span className={cn('text-[9px] font-medium text-center leading-tight w-12', color?.text)}>
                      {ASSET_TYPE_LABELS[assetType]}
                    </span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* 초기 매수 폼 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {assetType === 'insurance' ? '보험 납입 내역' : assetType === 'savings' ? '예적금 정보' : assetType === 'contribution' ? '출자 정보' : '초기 매수 내역'}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {assetType === 'savings' ? (
              <div className="flex flex-col gap-3">
                {/* 초기 원금 | 연이자율 (recurring: 월납입계획액 | 연이자율) */}
                <div className="grid grid-cols-2 gap-3">
                  {savingsKind === 'recurring' && !['정기예금', '파킹통장', '외화예금'].some(t => name?.endsWith(t)) ? (
                    <FormField control={form.control} name="monthlyContributionKrw"
                      render={({ field }) => (
                        <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                          <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            <Banknote className="h-3.5 w-3.5 shrink-0" />월납입 계획액 (₩)
                          </FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} inputMode="decimal" placeholder="예: 500000" />
                          </FormControl>
  
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : savingsKind !== 'recurring' ? (
                    <FormField control={form.control} name="initialPricePerUnit"
                      render={({ field }) => (
                        <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                          <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            <Receipt className="h-3.5 w-3.5 shrink-0" />초기 원금 (₩)
                          </FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} inputMode="decimal" placeholder="예: 10000000" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}
                  <FormField control={form.control} name="interestRatePct"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                        <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <TrendingUp className="h-3.5 w-3.5 shrink-0" />연이자율 (%)
                        </FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} inputMode="decimal" placeholder="예: 3.5" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 가입일 | 만기일 */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="depositStartDate"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                        <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />가입일
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="maturityDate"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                        <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />만기일
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 월납입액 — 정기적금 외 적립식 (이미 위에 배치된 recurring 제외) */}
                {savingsKind !== 'recurring' && !['정기예금', '파킹통장', '외화예금'].some(t => name?.endsWith(t)) && (
                  <FormField control={form.control} name="monthlyContributionKrw"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                        <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Banknote className="h-3.5 w-3.5 shrink-0" />월납입 계획액 (₩)
                        </FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} inputMode="decimal" placeholder="예: 500000" />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

              </div>
            ) : assetType === 'contribution' ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="initialPricePerUnit"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                        <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Banknote className="h-3.5 w-3.5 shrink-0" />출자금액 (₩)
                        </FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} inputMode="numeric" placeholder="예: 1000000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="depositStartDate"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                        <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />출자일자
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ''}
                            onChange={e => {
                              field.onChange(e)
                              // 날짜 변경 시 연도 목록 재계산, 없어진 연도의 값은 제거
                              const newYears = new Set(getDividendYears(e.target.value))
                              setDividendRateMap(prev => {
                                const next: Record<number, string> = {}
                                newYears.forEach(y => { if (prev[y] !== undefined) next[y] = prev[y] })
                                return next
                              })
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 연도별 배당률 */}
                <div className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <TrendingUp className="h-3.5 w-3.5 shrink-0" />연도별 배당률
                    <span className="ml-auto text-xs font-normal text-muted-foreground">선택</span>
                  </p>
                  {(() => {
                    const years = getDividendYears(depositStartDate)
                    if (years.length === 0) {
                      return (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          출자일자를 입력하면 연도 행이 자동 생성됩니다
                        </p>
                      )
                    }
                    return (
                      <div className="flex flex-col gap-2">
                        {years.map(year => (
                          <div key={year} className="flex items-center gap-3">
                            <span className="text-sm font-medium w-14 shrink-0">{year}년</span>
                            <div className="flex-1 relative">
                              <Input
                                type="number"
                                step="0.01"
                                value={dividendRateMap[year] ?? ''}
                                onChange={e => setDividendRateMap(prev => ({ ...prev, [year]: e.target.value }))}
                                placeholder="예: 3.5"
                                className="pr-8"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>
            ) : assetType === 'insurance' ? (
              <div className="flex flex-col gap-3">
                {/* 보장성 / 저축성 분기 표시 (자동 세팅, 수동 오버라이드 가능) */}
                <FormField
                  control={form.control}
                  name="insuranceCategory"
                  render={({ field }) => (
                    <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                      <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <Shield className="h-3.5 w-3.5 shrink-0" />보험 성격
                      </FormLabel>
                      <div className="flex gap-2">
                        {([['protection', '보장성', '종신/정기/실손/건강', ShieldCheck], ['savings', '저축성', '연금/변액/저축보험', PiggyBank]] as const).map(([val, label, desc, Icon]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => field.onChange(val)}
                            className={cn(
                              'flex-1 rounded-lg border px-3 py-2.5 transition-colors flex flex-col items-center text-center',
                              field.value === val
                                ? 'bg-indigo-500/20 border-indigo-400/60'
                                : 'border-border bg-muted/50 hover:border-foreground/30 hover:bg-muted/50',
                            )}
                          >
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <Icon className={cn(
                                'h-4 w-4 shrink-0',
                                field.value === val ? 'text-indigo-300' : 'text-muted-foreground'
                              )} />
                              <div className={cn(
                                'text-xs font-semibold',
                                field.value === val ? 'text-indigo-300' : 'text-muted-foreground'
                              )}>{label}</div>
                            </div>
                            <div className={cn(
                              'text-[11px] opacity-70',
                              field.value === val && 'opacity-100'
                            )}>{desc}</div>
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 납입 주기 */}
                <FormField
                  control={form.control}
                  name="paymentCycle"
                  render={({ field }) => (
                    <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                      <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <Repeat className="h-3.5 w-3.5 shrink-0" />납입 주기
                      </FormLabel>
                      <div className="grid grid-cols-4 gap-1">
                        {([
                          ['monthly', '월납', Calendar, 'text-blue-400'],
                          ['quarterly', '분기납', Repeat, 'text-emerald-400'],
                          ['yearly', '연납', Clock, 'text-orange-400'],
                          ['lump_sum', '일시납', Zap, 'text-yellow-400'],
                        ] as const).map(([val, label, Icon, iconColor]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => field.onChange(val)}
                            className={cn(
                              'rounded-md border py-1.5 text-xs font-medium transition-colors flex items-center justify-center gap-1',
                              field.value === val
                                ? 'bg-indigo-500/20 border-indigo-400/60 text-indigo-300'
                                : 'border-border bg-muted/50 text-muted-foreground hover:text-muted-foreground hover:bg-muted/50',
                            )}
                          >
                            <Icon className={cn('h-3 w-3 shrink-0', field.value === val ? 'text-indigo-300' : iconColor)} />
                            {label}
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 계약일 + 납입 시작일 */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="contractDate"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                        <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />계약일
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="initialTransactionDate"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                        <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />납입 시작일
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 보장성 전용: 납입만료 + 보장만료 + 보험가입금액 */}
                {insuranceCategory === 'protection' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="paymentEndDate"
                        render={({ field }) => (
                          <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                            <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />납입 만료일
                            </FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <p className="text-[11px] text-muted-foreground/60">비우면 종신납</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="coverageEndDate"
                        render={({ field }) => (
                          <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                            <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />보장 만료일
                            </FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <p className="text-[11px] text-muted-foreground/60">비우면 종신보장</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="sumInsuredKrw"
                      render={({ field }) => (
                        <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                          <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />보험가입금액 (선택)
                          </FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} inputMode="decimal" placeholder="예: 100000000 (사망보험금/진단금 등)" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* 저축성 전용: 만기일 + 납입만료 + 예상수익률 */}
                {insuranceCategory === 'savings' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="coverageEndDate"
                        render={({ field }) => (
                          <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                            <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />만기일
                            </FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="paymentEndDate"
                        render={({ field }) => (
                          <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                            <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />납입 만료일 (선택)
                            </FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {/* 일시납: 일시 납입액 / 주기적 납부: 주기당 납입액 */}
                      {form.watch('paymentCycle') === 'lump_sum' ? (
                        <FormField
                          control={form.control}
                          name="initialPricePerUnit"
                          render={({ field }) => (
                            <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                              <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                <Receipt className="h-3.5 w-3.5 shrink-0" />일시 납입액
                              </FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ''} inputMode="decimal" placeholder="예: 50000000" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name="premiumPerCycleKrw"
                          render={({ field }) => (
                            <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                              <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                <Banknote className="h-3.5 w-3.5 shrink-0" />주기당 납입액
                              </FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? ''} inputMode="decimal" placeholder="예: 300000" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      {/* 예상 공시이율 */}
                      <FormField
                        control={form.control}
                        name="expectedReturnRatePct"
                        render={({ field }) => (
                          <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                            <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                              <TrendingUp className="h-3.5 w-3.5 shrink-0" />예상 공시이율 (%)
                            </FormLabel>
                            <FormControl>
                              <div className="flex gap-2 items-center">
                                <Input {...field} value={field.value ?? ''} inputMode="decimal" placeholder="예: 3.5" className="flex-1" />
                                <div className="flex gap-1 shrink-0">
                                  {([
                                    ['simple', '단리', Minus, 'text-orange-400'],
                                    ['monthly', '월복리', TrendingUp, 'text-emerald-400'],
                                    ['yearly', '연복리', Repeat, 'text-blue-400'],
                                  ] as const).map(([type, label, Icon, iconColor]) => {
                                    const active = form.watch('compoundType') === type
                                    return (
                                      <button
                                        key={type}
                                        type="button"
                                        onClick={() => form.setValue('compoundType', active ? null : type)}
                                        className={cn(
                                          'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1',
                                          active
                                            ? 'bg-indigo-500/20 border-indigo-400/60 text-indigo-300'
                                            : 'border-border bg-muted/50 text-muted-foreground hover:text-muted-foreground hover:bg-muted/50',
                                        )}
                                      >
                                        <Icon className={cn('h-3 w-3 shrink-0', active ? 'text-indigo-300' : iconColor)} />
                                        {label}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* 현재 해지환급금 */}
                      <FormField
                        control={form.control}
                        name="initialSurrenderValue"
                        render={({ field }) => (
                          <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                            <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                              <Wallet className="h-3.5 w-3.5 shrink-0" />현재 해지환급금 (선택)
                            </FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ''} inputMode="decimal" placeholder="예: 10500000" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="initialQuantity"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                        <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Package className="h-3.5 w-3.5 shrink-0" />수량
                        </FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} inputMode="decimal" placeholder={assetType === 'crypto' ? '예: 0.5' : '예: 10'} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="initialPricePerUnit"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                        <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Receipt className="h-3.5 w-3.5 shrink-0" />매수 단가
                        </FormLabel>
                        <div className="flex items-center gap-1.5">
                          <FormControl className="flex-1 min-w-0">
                            <Input {...field} value={field.value ?? ''} inputMode="decimal" placeholder="예: 75000" className="w-full" />
                          </FormControl>
                          {!['stock_kr', 'etf_kr', 'fund'].includes(assetType) && (
                            <div className="flex gap-1 shrink-0">
                              {([['KRW', '₩'], ['USD', '$']] as const).map(([val, label]) => {
                                const Icon = val === 'KRW' ? Banknote : DollarSign
                                return (
                                  <button key={val} type="button" onClick={() => form.setValue('currency', val)} className={pillClass(currency === val)}>
                                    <Icon className="h-3 w-3 shrink-0" />{label}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                        <FormMessage />
                    </FormItem>
                  )}
                />
                  <FormField
                    control={form.control}
                    name="initialTransactionDate"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                        <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />{(assetType as string) === 'savings' ? '가입날짜' : '매수일'}
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* 환율 (US 자산인 경우, 원화/달러 무관) */}
            {isUsAsset && (
              <FormField
                control={form.control}
                name="initialExchangeRate"
                render={({ field }) => (
                  <FormItem className="rounded-xl border border-border bg-muted/50 p-4 flex flex-col gap-2">
                    <FormLabel className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />환율 (원/달러)
                    </FormLabel>
                    <div className="flex items-center gap-2">
                      {isFetchingFx ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>환율 조회 중…</span>
                        </div>
                      ) : field.value ? (
                        <span className="text-sm font-mono font-medium">₩{field.value}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">매수일 선택 후 자동 입력됩니다</span>
                      )}
                      <input type="hidden" {...field} value={field.value ?? ''} />
                    </div>
                    {fxFetchedDate && !isFetchingFx && (
                      <div className="flex items-center gap-1.5">
                        <Info className="h-3 w-3 text-muted-foreground shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          {fxFetchedDate} 한국은행 기준 환율로 자동 입력됩니다.
                        </p>
                      </div>
                    )}
                    {(assetType === 'stock_us' || assetType === 'etf_us') && (
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3.5 py-3 space-y-2.5">
                        <p className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5 shrink-0" />원화 매수 vs 달러 매수
                        </p>
                        <div className="space-y-1.5 text-[11.5px] leading-relaxed text-blue-300/80">
                          <p><span className="font-medium text-blue-200">원화(₩) 매수</span> — 매수 시점의 환율이 기준가로 고정되며, 이후 환율 변동에 따른 환차익·환차손이 손익에 반영됩니다.</p>
                          <p><span className="font-medium text-blue-200">달러($) 매수</span> — 달러 기준으로 손익이 계산되며, 원화 환산 시 현재 환율이 적용되어 평가금액이 달라질 수 있습니다.</p>
                        </div>
                        <p className="text-[11px] text-blue-400/70 pt-0.5 border-t border-blue-500/20">
                          💡 표시된 수익률과 평가금액은 현재 환율 기준으로 계산되어 환율 변동에 따라 실시간으로 바뀔 수 있습니다.
                        </p>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* hidden fields */}
            <FormField control={form.control} name="currency" render={({ field }) => <input type="hidden" {...field} />} />
            <FormField control={form.control} name="priceType" render={({ field }) => <input type="hidden" {...field} />} />
          </div>
          </div>
        )}

        </div>{/* end step animated wrapper */}

        {/* Root error */}
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}

      </form>
      </div>
    </Form>
  )
}
