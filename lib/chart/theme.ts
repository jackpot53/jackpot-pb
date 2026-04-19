// 한국식 주식 차트 색상 컨벤션: 상승=빨강, 하락=파랑.
// 시장 표현 관례라 UI 테마 토큰과 분리해 모듈 상수로 둔다.
export const CHART_UP = '#ef4444'
export const CHART_DOWN = '#3b82f6'

export interface ChartPalette {
  text: string
  mutedText: string
  border: string
  grid: string
  background: string
}

// lightweight-charts 내부 파서는 hex/rgb(a)/hsl(a)/named 만 이해하는데,
// shadcn 토큰은 oklch() 로 선언되고 최신 브라우저는 oklch/lab 을 원 색공간 그대로
// 보존한 채 직렬화하므로 canvas fillStyle 트릭만으로는 rgb 로 내려가지 않는다.
// 1×1 픽셀을 실제로 칠하고 imageData 로 읽으면 강제 sRGB 8-bit 로 변환된다.
function normalizeColor(color: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) return fallback
  try {
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 1, 1)
    const { data } = ctx.getImageData(0, 0, 1, 1)
    const [r, g, b, a] = data
    if (a === 0) return fallback
    return a === 255
      ? `rgb(${r}, ${g}, ${b})`
      : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
  } catch {
    return fallback
  }
}

function readVar(el: Element, name: string, fallback: string): string {
  const raw = getComputedStyle(el).getPropertyValue(name).trim()
  if (!raw) return fallback
  return normalizeColor(raw, fallback)
}

// shadcn 토큰을 lightweight-charts가 받아들이는 rgba/hex 문자열로 변환.
export function resolvePalette(el: Element): ChartPalette {
  return {
    text: readVar(el, '--foreground', '#111827'),
    mutedText: readVar(el, '--muted-foreground', '#6b7280'),
    border: readVar(el, '--border', '#e5e7eb'),
    grid: readVar(el, '--border', '#f0f0f0'),
    background: readVar(el, '--background', '#ffffff'),
  }
}

// 툴팁/영역 배경에 살짝 흐린 표면이 필요할 때 사용.
export function surfaceColor(el: Element): string {
  return readVar(el, '--popover', '#ffffff')
}
