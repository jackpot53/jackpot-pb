-- 0003_fund_valuation_nav_per_unit.sql
-- Fund valuation semantic change: value_krw was total value, now NAV per unit.
-- For each fund asset, insert a new corrected valuation record
-- that replaces the old total-value record with NAV = total_value / quantity.
-- Old records are left intact (append-only constraint, D-06).
-- The new records are dated the same as the original but with a later created_at
-- so ORDER BY valued_at DESC, created_at DESC will pick the new row as latest.

INSERT INTO manual_valuations (id, asset_id, value_krw, currency, exchange_rate_at_time, valued_at, notes, created_at)
SELECT
  gen_random_uuid(),
  mv.asset_id,
  -- NAV per unit = total_value_krw / (total_quantity / 1e8)
  ROUND(mv.value_krw::numeric / (h.total_quantity::numeric / 1e8))::bigint AS value_krw,
  mv.currency,
  mv.exchange_rate_at_time,
  mv.valued_at,
  COALESCE(mv.notes || ' [마이그레이션: 총값→단가]', '[마이그레이션: 총값→단가]') AS notes,
  NOW() AS created_at
FROM manual_valuations mv
JOIN assets a ON a.id = mv.asset_id
JOIN holdings h ON h.asset_id = mv.asset_id
WHERE a.asset_type = 'fund'
  AND h.total_quantity > 0
  -- Only migrate the latest record per asset (the one currently used for valuation)
  AND mv.id = (
    SELECT id FROM manual_valuations mv2
    WHERE mv2.asset_id = mv.asset_id
    ORDER BY mv2.valued_at DESC, mv2.created_at DESC
    LIMIT 1
  );
