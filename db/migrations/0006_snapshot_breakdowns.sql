-- Migration: 0006_snapshot_breakdowns
-- 목적: portfolio_snapshots에 자산 유형별 breakdown 테이블 추가
-- 실행 방법: Supabase Dashboard → SQL Editor에서 아래 SQL 전체를 붙여넣어 실행

-- ============================================================
-- 1. portfolio_snapshot_breakdowns 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio_snapshot_breakdowns (
  snapshot_id uuid NOT NULL REFERENCES portfolio_snapshots(id) ON DELETE CASCADE,
  asset_type asset_type NOT NULL,
  total_value_krw bigint NOT NULL,
  total_cost_krw bigint NOT NULL,
  PRIMARY KEY (snapshot_id, asset_type)
);

-- ============================================================
-- 2. 인덱스 (snapshot_id → FK lookup 성능)
-- ============================================================
CREATE INDEX IF NOT EXISTS snapshot_breakdowns_snapshot_id_idx
  ON portfolio_snapshot_breakdowns(snapshot_id);

-- ============================================================
-- 3. RLS 활성화 + SELECT 정책
--    INSERT는 cron (superuser, RLS 우회)이 수행하므로 authenticated INSERT 정책 없음
-- ============================================================
ALTER TABLE portfolio_snapshot_breakdowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snapshot_breakdowns_select_own"
  ON portfolio_snapshot_breakdowns FOR SELECT TO authenticated
  USING (
    snapshot_id IN (
      SELECT id FROM portfolio_snapshots
      WHERE user_id = (SELECT auth.uid())
    )
  );
