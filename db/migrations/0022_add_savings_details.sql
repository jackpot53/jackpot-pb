-- savings_details: 예적금 전용 메타데이터 테이블 (1:1 FK on assets.id)
-- 이자율/만기/납입주기/복리/세금 등 고정수익 상품 속성 저장.
-- 원금·납입액은 transactions 테이블에 그대로 저장 (insurance 패턴과 동일).
CREATE TABLE IF NOT EXISTS savings_details (
  asset_id uuid PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  -- 예금 종류: 'term'(정기예금) | 'recurring'(정기적금) | 'free'(자유적금)
  kind varchar(20) NOT NULL,
  -- 연이자율 (basis point ×100, e.g. 5.25% = 52500). NULL이면 자동계산 불가.
  interest_rate_bp integer,
  -- 가입일 (이자 계산 기준점. recurring/free는 각 buy tx의 transactionDate 사용)
  deposit_start_date date,
  -- 만기일 (NULL 허용 — 자유적금 등 만기 미정)
  maturity_date date,
  -- 계획 월납입액 KRW (recurring/free만. 원클릭 납입 버튼의 기본값으로 사용)
  monthly_contribution_krw bigint,
  -- 이자 복리 방식: 'simple'(단리) | 'monthly'(월복리)
  compound_type varchar(10) NOT NULL DEFAULT 'simple',
  -- 세금 유형: 'taxable'(일반 15.4%) | 'tax_free'(비과세) | 'preferential'(우대 9.5%)
  tax_type varchar(10) NOT NULL DEFAULT 'taxable',
  -- 만기 자동갱신 여부
  auto_renew boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_savings_details_maturity
  ON savings_details(maturity_date)
  WHERE maturity_date IS NOT NULL;
