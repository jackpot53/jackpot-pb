/**
 * 예적금 이자 계산 순수 유틸리티 (DB 접근 없음, 단위 테스트 가능)
 *
 * 한국 은행 실무(중도해지 이율, 우대조건 세부 판정 등)는 범위 밖.
 * 표준 단리/월복리 공식으로 근사 계산한다.
 *
 * 이자율 단위: interest_rate_bp = 연이자율 × 10000 (basis point ×100)
 *   예: 5.25% → 52500
 *   계산 시: annualRate = rateBp / 1_000_000  (0.0525)
 */

export type CompoundType = 'simple' | 'monthly'
export type TaxType = 'taxable' | 'tax_free' | 'preferential'

/** 단일 납입건 정보 (transactions에서 추출) */
export interface SavingsBuy {
  transactionDate: string  // 'YYYY-MM-DD'
  amountKrw: number        // pricePerUnit (원금/납입액, KRW)
}

/** savings_details 테이블의 메타데이터 */
export interface SavingsDetails {
  kind: 'term' | 'recurring' | 'free'
  interestRateBp: number | null     // NULL이면 자동계산 불가
  depositStartDate: string | null   // 'YYYY-MM-DD', term용 기준점
  maturityDate: string | null       // 'YYYY-MM-DD', NULL=만기 미정
  compoundType: CompoundType
  taxType: TaxType
  autoRenew: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// 세금 적용 세율 (2025 기준)
// ─────────────────────────────────────────────────────────────────────────────
const TAX_RATE: Record<TaxType, number> = {
  taxable: 0.154,       // 이자소득세 14% + 지방소득세 1.4%
  preferential: 0.095,  // 농특세 포함 우대세율 (비과세종합저축 한도 초과분 등)
  tax_free: 0,
}

/**
 * 세후 이자 계산
 * @param interestKrw 세전 이자 (원)
 * @param taxType 세금 유형
 * @returns 세후 이자 (원, 소수점 버림)
 */
export function applyTax(interestKrw: number, taxType: TaxType): number {
  return Math.floor(interestKrw * (1 - TAX_RATE[taxType]))
}

// ─────────────────────────────────────────────────────────────────────────────
// 단일 납입건 이자 계산
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 단일 납입건의 세전 이자 계산 (단리 또는 월복리)
 * @param principal 납입 원금 (KRW)
 * @param annualRateBp 연이자율 basis point ×100 (e.g. 5.25% = 52500)
 * @param daysElapsed 이자 적용 경과일수 (0 이하면 0 반환)
 * @param compoundType 'simple' 단리 | 'monthly' 월복리
 * @returns 세전 이자 (KRW, 소수점 버림)
 */
export function computeAccruedInterestKrw({
  principal,
  annualRateBp,
  daysElapsed,
  compoundType,
}: {
  principal: number
  annualRateBp: number
  daysElapsed: number
  compoundType: CompoundType
}): number {
  if (daysElapsed <= 0 || principal <= 0 || annualRateBp <= 0) return 0

  const annualRate = annualRateBp / 1_000_000

  if (compoundType === 'simple') {
    // 단리: principal × rate × days / 365
    return Math.floor(principal * annualRate * (daysElapsed / 365))
  } else {
    // 월복리: principal × (1 + monthlyRate)^months - principal
    // 월수는 일수 / (365/12) ≈ 일수 / 30.4167
    const monthlyRate = annualRate / 12
    const months = daysElapsed / (365 / 12)
    return Math.floor(principal * (Math.pow(1 + monthlyRate, months) - 1))
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 현재 평가액 계산 (포트폴리오 계산에서 호출)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 경과일수 계산 (startDate → asOf, 일 단위 정수)
 */
function daysBetween(startDateStr: string, asOf: Date): number {
  const start = new Date(startDateStr)
  start.setHours(0, 0, 0, 0)
  const end = new Date(asOf)
  end.setHours(0, 0, 0, 0)
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * 단일 납입건의 이자 계산 기준 종료일 결정
 * - 만기 이전: asOf
 * - 만기 이후 + autoRenew=false: maturityDate (만기일 고정)
 * - 만기 이후 + autoRenew=true: asOf (계속 이자 계산)
 */
function effectiveEndDate(asOf: Date, maturityDateStr: string | null, autoRenew: boolean): Date {
  if (!maturityDateStr) return asOf
  const maturity = new Date(maturityDateStr)
  maturity.setHours(0, 0, 0, 0)
  const today = new Date(asOf)
  today.setHours(0, 0, 0, 0)
  if (today <= maturity) return asOf
  return autoRenew ? asOf : maturity
}

/**
 * 예적금 현재 평가액 계산 (원금 + 세후 누적이자)
 *
 * - 각 buy tx(납입건)의 transactionDate를 이자 기산일로 사용
 * - 만기일 지난 납입건: autoRenew=false면 만기일까지만 이자, true면 계속
 * - latestManualValuationKrw가 있으면 호출자가 이 값을 덮어쓴다 (여기서는 순수 자동계산만)
 *
 * @returns 현재 추정 평가액 (KRW, 원금 포함)
 */
export function computeCurrentSavingsValueKrw({
  buys,
  interestRateBp,
  maturityDate,
  compoundType,
  taxType,
  autoRenew,
  asOf = new Date(),
}: {
  buys: SavingsBuy[]
  interestRateBp: number
  maturityDate: string | null
  compoundType: CompoundType
  taxType: TaxType
  autoRenew: boolean
  asOf?: Date
}): number {
  if (buys.length === 0 || interestRateBp <= 0) {
    return buys.reduce((sum, b) => sum + b.amountKrw, 0)
  }

  let totalValue = 0
  for (const buy of buys) {
    const endDate = effectiveEndDate(asOf, maturityDate, autoRenew)
    const days = daysBetween(buy.transactionDate, endDate)
    const grossInterest = computeAccruedInterestKrw({
      principal: buy.amountKrw,
      annualRateBp: interestRateBp,
      daysElapsed: days,
      compoundType,
    })
    const netInterest = applyTax(grossInterest, taxType)
    totalValue += buy.amountKrw + netInterest
  }
  return totalValue
}

// ─────────────────────────────────────────────────────────────────────────────
// 예상 만기 수령액 계산 (파생 표시용)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 예상 만기 수령액 계산
 * - 정기예금: 전체 원금 × 이자율 × (시작일→만기일)
 * - 정기적금/자유적금: 각 납입건별로 만기일까지 남은 기간 이자 계산
 *
 * 미래 납입건(asOf 이후 transactionDate)은 아직 납입 안 된 것이므로 제외.
 *
 * @returns 예상 만기 수령액 (KRW)
 */
export function computeExpectedMaturityValueKrw({
  buys,
  interestRateBp,
  maturityDate,
  compoundType,
  taxType,
  asOf = new Date(),
}: {
  buys: SavingsBuy[]
  interestRateBp: number
  maturityDate: string | null
  compoundType: CompoundType
  taxType: TaxType
  asOf?: Date
}): number | null {
  if (!maturityDate || interestRateBp <= 0 || buys.length === 0) return null

  const maturityAsDate = new Date(maturityDate)
  maturityAsDate.setHours(0, 0, 0, 0)

  let totalValue = 0
  for (const buy of buys) {
    const buyDate = new Date(buy.transactionDate)
    buyDate.setHours(0, 0, 0, 0)
    // 아직 납입 안 된 미래 건은 스킵
    if (buyDate > asOf) continue

    const days = daysBetween(buy.transactionDate, maturityAsDate)
    if (days <= 0) {
      // 만기일이 납입일보다 이전 — 이자 없이 원금만
      totalValue += buy.amountKrw
      continue
    }
    const grossInterest = computeAccruedInterestKrw({
      principal: buy.amountKrw,
      annualRateBp: interestRateBp,
      daysElapsed: days,
      compoundType,
    })
    const netInterest = applyTax(grossInterest, taxType)
    totalValue += buy.amountKrw + netInterest
  }
  return totalValue
}

// ─────────────────────────────────────────────────────────────────────────────
// UI 파생 표시용 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 만기까지 남은 일수 (음수 = 만기 지남, 0 = 오늘 만기)
 */
export function remainingDays(maturityDateStr: string, asOf: Date = new Date()): number {
  const maturity = new Date(maturityDateStr)
  maturity.setHours(0, 0, 0, 0)
  const today = new Date(asOf)
  today.setHours(0, 0, 0, 0)
  return Math.floor((maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * 연환산 수익률 (%)
 * returnPct: 누적 수익률 (%), daysElapsed: 경과일수
 */
export function annualizedReturnPct(returnPct: number, daysElapsed: number): number {
  if (daysElapsed <= 0) return 0
  return (returnPct / daysElapsed) * 365
}
