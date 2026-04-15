import { pgTable, uuid, bigint, primaryKey } from 'drizzle-orm/pg-core'
import { portfolioSnapshots } from './portfolio-snapshots'
import { assetTypeEnum } from './assets'

export const portfolioSnapshotBreakdowns = pgTable(
  'portfolio_snapshot_breakdowns',
  {
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => portfolioSnapshots.id, { onDelete: 'cascade' }),
    assetType: assetTypeEnum('asset_type').notNull(),
    totalValueKrw: bigint('total_value_krw', { mode: 'number' }).notNull(),
    totalCostKrw: bigint('total_cost_krw', { mode: 'number' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.snapshotId, t.assetType] })]
)
