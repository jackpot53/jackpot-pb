-- Migration: 0007_price_cache_change_bps
-- 목적: price_cache 테이블에 일일 변동률(basis points) 컬럼 추가
-- 실행 방법: Supabase Dashboard → SQL Editor에서 아래 SQL 전체를 붙여넣어 실행
-- 인코딩: changeBps = changePercent × 100, e.g. +1.5% → 150, -0.11% → -11

ALTER TABLE price_cache ADD COLUMN IF NOT EXISTS change_bps integer;
