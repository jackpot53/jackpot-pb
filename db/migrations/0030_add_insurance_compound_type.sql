-- Add compound_type column to insurance_details table
ALTER TABLE insurance_details ADD COLUMN IF NOT EXISTS compound_type varchar(10) NOT NULL DEFAULT 'simple';
