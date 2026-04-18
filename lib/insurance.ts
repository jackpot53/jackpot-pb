/**
 * 저축성 보험 이자 계산 순수 유틸리티 (DB 접근 없음)
 * 단리/월복리/연복리 공식으로 이자를 자동 계산한다.
 *
 * 이자율 단위: expected_return_rate_bp = 연이자율 × 10000 (basis point ×100)
 *   예: 3.5% → 35000
 *   계산 시: annualRate = rateBp / 1_000_000  (0.035)
 */

export type CompoundType = 'simple' | 'monthly' | 'yearly'

/** 단일 보험료 납입건 (transactions에서 추출) */
export interface InsuranceBuy {
  transactionDate: string  // 'YYYY-MM-DD'
  amountKrw: number        // 납입액 (KRW)
}

/**
 * 단일 납입건의 세전 이자 계산 (단리 또는 월복리 또는 연복리)
 * @param principal 납입 보험료 (KRW)
 * @param annualRateBp 연이자율 basis point ×100 (e.g. 3.5% = 35000)
 * @param daysElapsed 이자 적용 경과일수 (0 이하면 0 반환)
 * @param compoundType 'simple' 단리 | 'monthly' 월복리 | 'yearly' 연복리
 * @returns 이자 (KRW, 소수점 버림)
 */
export function computeAccruedInsuranceInterestKrw({
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
  } else if (compoundType === 'monthly') {
    // 월복리: principal × (1 + monthlyRate)^months - principal
    const monthlyRate = annualRate / 12
    const months = daysElapsed / (365 / 12)
    return Math.floor(principal * (Math.pow(1 + monthlyRate, months) - 1))
  } else {
    // 연복리: principal × (1 + annualRate)^years - principal
    const years = daysElapsed / 365
    return Math.floor(principal * (Math.pow(1 + annualRate, years) - 1))
  }
}

/**
 * 정기보험료 납입 가상 내역 생성
 * paymentStartDate부터 asOf까지 납입 주기별로 납입 내역을 생성한다.
 * 실제 거래 내역이 없을 때 성과 계산에 사용한다.
 */
export function generateVirtualInsurancePayments({
  paymentStartDate,
  paymentCycle,
  premiumPerCycleKrw,
  paymentEndDate = null,
  asOf = new Date(),
}: {
  paymentStartDate: string  // 'YYYY-MM-DD'
  paymentCycle: 'monthly' | 'quarterly' | 'yearly' | 'lump_sum'
  premiumPerCycleKrw: number
  paymentEndDate?: string | null
  asOf?: Date
}): InsuranceBuy[] {
  if (paymentCycle === 'lump_sum' || premiumPerCycleKrw <= 0) return []

  const [sy, sm, sd] = paymentStartDate.split('-').map(Number)
  const todayLocal = new Date(asOf)
  todayLocal.setHours(0, 0, 0, 0)

  const maxDate = paymentEndDate ? new Date(paymentEndDate) : todayLocal
  maxDate.setHours(0, 0, 0, 0)

  if (new Date(sy, sm - 1, sd) > todayLocal) return []

  const payments: InsuranceBuy[] = []
  const interval = paymentCycle === 'monthly' ? 1 : paymentCycle === 'quarterly' ? 3 : 12
  let year = sy
  let month = sm - 1  // 0-indexed

  while (true) {
    const lastDay = new Date(year, month + 1, 0).getDate()
    const day = Math.min(sd, lastDay)
    const cur = new Date(year, month, day)
    if (cur > todayLocal || cur > maxDate) break

    const mm = String(month + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    payments.push({
      transactionDate: `${year}-${mm}-${dd}`,
      amountKrw: premiumPerCycleKrw,
    })

    month += interval
    while (month > 11) {
      month -= 12
      year++
    }
  }

  return payments
}

/**
 * 현재 보험료 평가액 계산 (원금 + 누적이자)
 *
 * - 각 buy tx(납입건)의 transactionDate를 이자 기산일로 사용
 * - 정기납입형: paymentStartDate 기준으로 가상 납입 생성
 * - 일시납형: 실제 거래 내역 또는 단일 납입
 *
 * @returns 현재 추정 평가액 (KRW, 원금 포함)
 */
export function computeCurrentInsuranceValueKrw({
  buys,
  expectedReturnRateBp,
  paymentStartDate,
  paymentEndDate,
  compoundType,
  paymentCycle,
  premiumPerCycleKrw,
  asOf = new Date(),
}: {
  buys: InsuranceBuy[]
  expectedReturnRateBp: number | null
  paymentStartDate: string | null
  paymentEndDate: string | null
  compoundType: CompoundType
  paymentCycle: 'monthly' | 'quarterly' | 'yearly' | 'lump_sum'
  premiumPerCycleKrw: number | null
  asOf?: Date
}): number {
  // 예상수익률이 없으면 원금만 반환
  if (!expectedReturnRateBp || expectedReturnRateBp <= 0) {
    return buys.reduce((sum, b) => sum + b.amountKrw, 0)
  }

  // 정기납입: 가상 납입 생성
  const effectiveBuys = (() => {
    if (
      paymentCycle !== 'lump_sum' &&
      paymentStartDate &&
      premiumPerCycleKrw &&
      premiumPerCycleKrw > 0
    ) {
      return generateVirtualInsurancePayments({
        paymentStartDate,
        paymentCycle,
        premiumPerCycleKrw,
        paymentEndDate,
        asOf,
      })
    }
    return buys
  })()

  if (effectiveBuys.length === 0) return 0

  // 각 납입건별 이자 계산
  let totalValue = 0
  for (const buy of effectiveBuys) {
    const buyDate = new Date(buy.transactionDate)
    buyDate.setHours(0, 0, 0, 0)
    const endDate = new Date(asOf)
    endDate.setHours(0, 0, 0, 0)

    if (buyDate > endDate) continue

    const days = Math.floor((endDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24))
    const interest = computeAccruedInsuranceInterestKrw({
      principal: buy.amountKrw,
      annualRateBp: expectedReturnRateBp,
      daysElapsed: days,
      compoundType,
    })
    totalValue += buy.amountKrw + interest
  }

  return totalValue
}
