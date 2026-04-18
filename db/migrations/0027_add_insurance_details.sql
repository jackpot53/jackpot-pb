-- insurance_details: 보험 전용 메타데이터 테이블 (1:1 FK on assets.id)
-- 납입주기/만기/보험가입금액 등 계약 속성 저장.
-- 납입액(원금)은 transactions 테이블에 저장 (savings_details 패턴과 동일).
CREATE TABLE IF NOT EXISTS insurance_details (
  asset_id uuid PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  -- 보장성/저축성 구분: 'protection'(종신/정기/실손/건강) | 'savings'(연금/변액/저축보험)
  category varchar(20) NOT NULL,
  -- 납입 주기: 'monthly' | 'quarterly' | 'yearly' | 'lump_sum'
  payment_cycle varchar(10) NOT NULL DEFAULT 'monthly',
  -- 주기당 납입액 KRW (원클릭 납입 버튼 기본값)
  premium_per_cycle_krw bigint,
  -- 계약일 (NULL이면 첫 buy tx의 transactionDate 사용)
  contract_date date,
  -- 납입 시작일
  payment_start_date date,
  -- 납입 만료일 (예: 20년납). NULL = 종신납
  payment_end_date date,
  -- 보장 만료일 / 만기일. NULL = 종신보장
  coverage_end_date date,
  -- 보험가입금액 (사망보험금 / 만기수령 기준액)
  sum_insured_krw bigint,
  -- 예상 공시이율 bp ×100 (저축성용, e.g. 3.5% = 35000). NULL 허용.
  expected_return_rate_bp integer,
  -- 납입 완료 여부
  is_paid_up boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insurance_details_coverage_end
  ON insurance_details(coverage_end_date)
  WHERE coverage_end_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_insurance_details_payment_end
  ON insurance_details(payment_end_date)
  WHERE payment_end_date IS NOT NULL;
