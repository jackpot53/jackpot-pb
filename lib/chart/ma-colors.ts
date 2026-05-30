export const MA_COLORS: Record<number, string> = {
  5:   '#f59e0b',
  10:  '#8b5cf6',
  20:  '#ec4899',
  60:  '#14b8a6',
  120: '#6366f1',
}

export const MA_PERIODS = [5, 10, 20, 60, 120] as const
export type MAPeriod = typeof MA_PERIODS[number]
