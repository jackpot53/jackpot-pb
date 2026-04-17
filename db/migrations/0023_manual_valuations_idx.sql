-- Performance: correlated subquery in getAssetsWithHoldings uses this composite key
-- for every asset row; without the index each lookup is a full table scan.
CREATE INDEX CONCURRENTLY IF NOT EXISTS manual_valuations_asset_valued_at_idx
  ON manual_valuations (asset_id, valued_at DESC, created_at DESC);
