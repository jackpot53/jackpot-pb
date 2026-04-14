/**
 * Portfolio computation library — public API entry point.
 * Re-exports all functions and types from lib/portfolio/portfolio.ts.
 * Dashboard and server components import from '@/lib/portfolio'.
 */
export {
  computeAssetPerformance,
  computePortfolio,
  aggregateByType,
  formatKrw,
  formatUsd,
  formatReturn,
  formatQty,
} from './portfolio/portfolio'

export type {
  AssetHoldingInput,
  AssetPerformance,
  PortfolioSummary,
  TypeAllocation,
} from './portfolio/portfolio'
