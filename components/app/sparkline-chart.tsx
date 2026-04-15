'use client'

interface SparklineChartProps {
  data: number[]
  width?: number
  height?: number
  positive?: boolean // true = red (Korean convention: up=red), false = blue
}

export function SparklineChart({
  data,
  width = 80,
  height = 36,
  positive,
}: SparklineChartProps) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const pad = 2
  const innerW = width - pad * 2
  const innerH = height - pad * 2

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * innerW
    const y = pad + innerH - ((v - min) / range) * innerH
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  // Determine color from trend if positive not explicitly provided
  const isUp = positive !== undefined ? positive : data[data.length - 1] >= data[0]
  // Korean convention: up = red, down = blue
  const strokeColor = isUp ? '#ef4444' : '#3b82f6'
  const fillColor = isUp ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.08)'

  // Area fill path
  const lastX = (pad + innerW).toFixed(1)
  const baseY = (pad + innerH).toFixed(1)
  const firstX = pad.toFixed(1)
  const areaPath = `M${firstX},${baseY} L${points.join(' L')} L${lastX},${baseY} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <path d={areaPath} fill={fillColor} />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      <circle
        cx={points[points.length - 1].split(',')[0]}
        cy={points[points.length - 1].split(',')[1]}
        r="2"
        fill={strokeColor}
      />
    </svg>
  )
}
