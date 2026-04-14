-- Migration: 0005_add_user_id
-- Phase: 01-foundation Plan 04 — 멀티 유저 아키텍처
-- 실행 방법: Supabase Dashboard → SQL Editor에서 아래 SQL 전체를 붙여넣어 실행
-- 사전 조건: Supabase Dashboard → Authentication → Users에서 관리자 UUID 확인 후
--            아래 '8ace9bf2-31fe-462d-88d4-307975ee018b' 자리를 실제 UUID로 교체
--
-- IMPORTANT: '8ace9bf2-31fe-462d-88d4-307975ee018b'를 실제 UUID로 교체하지 않으면 실행 실패

-- ============================================================
-- 1. NULLABLE user_id 컬럼 추가 (기존 데이터가 있으므로 nullable first)
-- ============================================================
ALTER TABLE assets ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE manual_valuations ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE portfolio_snapshots ADD COLUMN IF NOT EXISTS user_id uuid;

-- ============================================================
-- 2. 기존 행 백필 — '8ace9bf2-31fe-462d-88d4-307975ee018b'를 실제 UUID로 교체 후 실행
-- ============================================================
UPDATE assets SET user_id = '8ace9bf2-31fe-462d-88d4-307975ee018b' WHERE user_id IS NULL;
UPDATE transactions SET user_id = '8ace9bf2-31fe-462d-88d4-307975ee018b' WHERE user_id IS NULL;
UPDATE manual_valuations SET user_id = '8ace9bf2-31fe-462d-88d4-307975ee018b' WHERE user_id IS NULL;
UPDATE holdings SET user_id = '8ace9bf2-31fe-462d-88d4-307975ee018b' WHERE user_id IS NULL;
UPDATE goals SET user_id = '8ace9bf2-31fe-462d-88d4-307975ee018b' WHERE user_id IS NULL;
UPDATE portfolio_snapshots SET user_id = '8ace9bf2-31fe-462d-88d4-307975ee018b' WHERE user_id IS NULL;

-- ============================================================
-- 3. NOT NULL 제약 추가
-- ============================================================
ALTER TABLE assets ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE manual_valuations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE holdings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE goals ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE portfolio_snapshots ALTER COLUMN user_id SET NOT NULL;

-- ============================================================
-- 4. FK 제약 추가 (auth.users 참조, ON DELETE CASCADE)
-- ============================================================
ALTER TABLE assets ADD CONSTRAINT assets_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE transactions ADD CONSTRAINT transactions_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE manual_valuations ADD CONSTRAINT manual_valuations_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE holdings ADD CONSTRAINT holdings_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE goals ADD CONSTRAINT goals_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE portfolio_snapshots ADD CONSTRAINT portfolio_snapshots_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================
-- 5. portfolio_snapshots UNIQUE 제약 변경
--    snapshot_date 단독 UNIQUE → (user_id, snapshot_date) 복합 UNIQUE
-- ============================================================
ALTER TABLE portfolio_snapshots DROP CONSTRAINT IF EXISTS portfolio_snapshots_snapshot_date_unique;
ALTER TABLE portfolio_snapshots ADD CONSTRAINT portfolio_snapshots_user_snapshot_unique
  UNIQUE (user_id, snapshot_date);

-- ============================================================
-- 6. user_id 인덱스 추가 (RLS 정책 + 쿼리 성능)
-- ============================================================
CREATE INDEX IF NOT EXISTS assets_user_id_idx ON assets(user_id);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS manual_valuations_user_id_idx ON manual_valuations(user_id);
CREATE INDEX IF NOT EXISTS holdings_user_id_idx ON holdings(user_id);
CREATE INDEX IF NOT EXISTS goals_user_id_idx ON goals(user_id);
CREATE INDEX IF NOT EXISTS portfolio_snapshots_user_id_idx ON portfolio_snapshots(user_id);

-- ============================================================
-- 7. RLS 활성화 + 정책 추가 (D-12 심층 방어)
--    Drizzle DATABASE_URL = superuser → RLS 우회하므로 실질 방어는 앱 레이어 필터
--    RLS는 Supabase Dashboard, PostgREST, anon key 노출 시 방어
--    성능: auth.uid() 대신 (select auth.uid()) 사용 (상수로 최적화됨)
-- ============================================================

-- assets
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets_select_own" ON assets FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE POLICY "assets_insert_own" ON assets FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "assets_update_own" ON assets FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "assets_delete_own" ON assets FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE POLICY "transactions_insert_own" ON transactions FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "transactions_update_own" ON transactions FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "transactions_delete_own" ON transactions FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- manual_valuations (append-only: SELECT + INSERT만)
ALTER TABLE manual_valuations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manual_valuations_select_own" ON manual_valuations FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE POLICY "manual_valuations_insert_own" ON manual_valuations FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
-- UPDATE는 cron superuser가 수행하므로 authenticated 정책 없음

-- holdings
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "holdings_select_own" ON holdings FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE POLICY "holdings_insert_own" ON holdings FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "holdings_update_own" ON holdings FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "holdings_delete_own" ON holdings FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals_select_own" ON goals FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE POLICY "goals_insert_own" ON goals FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "goals_update_own" ON goals FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "goals_delete_own" ON goals FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- portfolio_snapshots (cron이 INSERT하므로 INSERT 정책 없음 — superuser가 RLS 우회)
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "snapshots_select_own" ON portfolio_snapshots FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
