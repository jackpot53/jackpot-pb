import type { NextRequest } from 'next/server'
import { getAuthUser } from '@/utils/supabase/server'
import { getAssetById } from '@/db/queries/assets'
import { getFundNavHistory } from '@/db/queries/fund-nav-history'
import { getFundManualNavHistory } from '@/db/queries/manual-valuations'
import { getSavingsDetailsByAsset } from '@/db/queries/savings'
import { getSavingsBuys } from '@/db/queries/savings'
import { buildSavingsCurvePoints } from '@/lib/savings-curve'
import { getInsuranceDetails, getInsuranceBuys } from '@/db/queries/insurance'
import { buildInsuranceCurvePoints } from '@/lib/insurance-curve'
import type { AssetHistoryPoint, AssetHistoryResponse } from '@/lib/asset-history-types'
import type { CompoundType } from '@/lib/savings'

export type { AssetHistoryPoint, AssetHistoryResponse }

/**
 * GET /api/asset-history?assetId=<uuid>
 * fund   → NAV per unit 이력 (fund_nav_history + manual_valuations 병합)
 * savings → 예적금 평가금 곡선 (과거 실선 + 미래 점선)
 *
 * Cache: 역사적 데이터 — 오늘 갱신 후 내일 cron까지는 변경 없음 → 1h 캐시
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const assetId = request.nextUrl.searchParams.get('assetId')
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!assetId || !UUID_RE.test(assetId)) return Response.json({ error: 'invalid assetId' }, { status: 400 })

  const asset = await getAssetById(assetId, user.id)
  if (!asset) return Response.json({ error: 'not found' }, { status: 404 })

  if (asset.assetType === 'fund') {
    const [liveHistory, manualHistory] = await Promise.all([
      asset.ticker ? getFundNavHistory(asset.ticker) : Promise.resolve([]),
      getFundManualNavHistory(assetId, user.id),
    ])

    // 두 소스를 날짜 기준 병합 — manual이 있으면 같은 날짜의 live를 덮어씀
    const navByDate = new Map<string, number>()
    for (const r of liveHistory) navByDate.set(r.recordedAt, r.navKrw)
    for (const r of manualHistory) navByDate.set(r.date, r.navKrw)

    const points: AssetHistoryPoint[] = Array.from(navByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }))

    return Response.json(
      { assetId, points, kind: 'line-nav' } satisfies AssetHistoryResponse,
      { headers: { 'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400' } },
    )
  }

  if (asset.assetType === 'savings') {
    const [details, buysMap] = await Promise.all([
      getSavingsDetailsByAsset(assetId),
      getSavingsBuys([assetId]),
    ])
    if (!details) return Response.json({ assetId, points: [], kind: 'line-projected' } satisfies AssetHistoryResponse)

    const buys = buysMap.get(assetId) ?? []
    const points = buildSavingsCurvePoints({ buys, details })

    return Response.json(
      { assetId, points, kind: 'line-projected' } satisfies AssetHistoryResponse,
      { headers: { 'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400' } },
    )
  }

  if (asset.assetType === 'insurance') {
    const [detailsMap, buysMap] = await Promise.all([
      getInsuranceDetails([assetId]),
      getInsuranceBuys([assetId]),
    ])
    const details = detailsMap.get(assetId)
    if (!details) return Response.json({ assetId, points: [], kind: 'line-projected' } satisfies AssetHistoryResponse)

    const buys = buysMap.get(assetId) ?? []

    const formatDate = (date: Date | string | null): string | null => {
      if (!date) return null
      if (typeof date === 'string') return date
      // 로컬 날짜 기준 (UTC 변환 없음)
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }

    // 일시납 보험: buys가 없으면 paymentStartDate에 premiumPerCycleKrw 만큼의 거래 생성
    const effectiveBuys =
      buys.length === 0 &&
      details.paymentCycle === 'lump_sum' &&
      details.paymentStartDate &&
      details.premiumPerCycleKrw &&
      details.premiumPerCycleKrw > 0
        ? [{ transactionDate: formatDate(details.paymentStartDate)!, amountKrw: details.premiumPerCycleKrw }]
        : buys

    // paymentEndDate가 없으면 coverageEndDate 사용 (미래값 표시)
    // 타입 안전성: coverageEndDate가 null이 아닌지 확인
    const endDate = formatDate(details.paymentEndDate) || (details.coverageEndDate ? formatDate(details.coverageEndDate) : null)

    const points = buildInsuranceCurvePoints({
      buys: effectiveBuys,
      expectedReturnRateBp: details.expectedReturnRateBp ?? null,
      paymentStartDate: formatDate(details.paymentStartDate),
      paymentEndDate: endDate,
      compoundType: details.compoundType as CompoundType,
      paymentCycle: details.paymentCycle as 'monthly' | 'quarterly' | 'yearly' | 'lump_sum',
      premiumPerCycleKrw: details.premiumPerCycleKrw ?? null,
    })

    return Response.json(
      { assetId, points: points.map(p => ({ date: p.date, value: p.value, projected: p.projected })), kind: 'line-projected' } satisfies AssetHistoryResponse,
      { headers: { 'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400' } },
    )
  }

  return Response.json({ error: 'unsupported asset type' }, { status: 422 })
}
