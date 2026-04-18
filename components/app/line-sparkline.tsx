'use client'

import type { AssetHistoryPoint } from '@/lib/asset-history-types'

interface LineSparklineProps {
  data: AssetHistoryPoint[]
  width?: number
  height?: number
  positive?: boolean  // 수익 여부 → 색상 결정
}

export function LineSparkline({
  data,
  width = 200,
  height = 40,
  positive = true,
}: LineSparklineProps) {
  if (data.length < 2) return null

  const pad = 2
  const iW = width - pad * 2
  const iH = height - pad * 2

  const values = data.map(d => d.value)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1

  const toX = (i: number) => pad + (i / (data.length - 1)) * iW
  const toY = (v: number) => pad + iH - ((v - minV) / range) * iH

  const color = positive ? '#ef4444' : '#3b82f6'

  // 실선 구간과 점선 구간을 분리해 path 생성
  const solidPts: [number, number][] = []
  const dashedPts: [number, number][] = []

  data.forEach((d, i) => {
    const pt: [number, number] = [toX(i), toY(d.value)]
    if (d.projected) {
      // 점선 시작점은 마지막 실선 포인트에서 이어져야 자연스러움
      if (dashedPts.length === 0 && solidPts.length > 0) {
        dashedPts.push(solidPts[solidPts.length - 1])
      }
      dashedPts.push(pt)
    } else {
      solidPts.push(pt)
    }
  })

  const toPath = (pts: [number, number][]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      {solidPts.length >= 2 && (
        <path d={toPath(solidPts)} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      )}
      {dashedPts.length >= 2 && (
        <path d={toPath(dashedPts)} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3 3" strokeLinejoin="round" opacity={0.6} />
      )}
    </svg>
  )
}
