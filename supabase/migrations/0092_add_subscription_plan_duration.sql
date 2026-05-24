-- Add duration value and unit columns to subscription_plans
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS duration_value INTEGER DEFAULT 1;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS duration_unit TEXT DEFAULT 'months';

-- Update existing records to reflect their billing cycles
UPDATE subscription_plans 
SET 
  duration_value = CASE 
    WHEN billing_cycle = 'yearly' THEN 12
    WHEN billing_cycle = 'termly' THEN 4
    ELSE 1
  END,
  duration_unit = 'months';

-- Update trigger function to calculate total license cost dynamically based on plan duration
CREATE OR REPLACE FUNCTION record_license_income()
RETURNS TRIGGER AS $$
DECLARE
  plan_price NUMERIC;
  plan_currency TEXT;
  plan_duration_val INT;
  plan_duration_unit TEXT;
  license_duration_days INT;
  license_duration_months INT;
  number_of_cycles NUMERIC;
  school_name TEXT;
  total_cost NUMERIC;
BEGIN
  -- Get plan price, currency, and duration details from subscription_plans
  SELECT price, COALESCE(currency, 'ZMW'), COALESCE(duration_value, 1), COALESCE(duration_unit, 'months')
  INTO plan_price, plan_currency, plan_duration_val, plan_duration_unit
  FROM subscription_plans
  WHERE LOWER(name) = LOWER(NEW.plan)
     OR LOWER(name) LIKE '%' || LOWER(NEW.plan) || '%'
     OR LOWER(NEW.plan) LIKE '%' || LOWER(name) || '%';

  -- Default values if plan not found
  IF plan_price IS NULL THEN
    plan_price := 500;
    plan_currency := 'ZMW';
    plan_duration_val := 1;
    plan_duration_unit := 'months';
  END IF;

  -- Calculate duration based on plan's duration unit
  IF plan_duration_unit = 'days' THEN
    license_duration_days := ROUND(EXTRACT(EPOCH FROM (NEW.end_date - NEW.start_date)) / (24 * 60 * 60));
    IF license_duration_days < 1 THEN
      license_duration_days := 1;
    END IF;
    number_of_cycles := license_duration_days::NUMERIC / plan_duration_val::NUMERIC;
  ELSE
    license_duration_months := ROUND(EXTRACT(EPOCH FROM (NEW.end_date - NEW.start_date)) / (30 * 24 * 60 * 60));
    IF license_duration_months < 1 THEN
      license_duration_months := 1;
    END IF;
    number_of_cycles := license_duration_months::NUMERIC / plan_duration_val::NUMERIC;
  END IF;

  -- Calculate total cost (ensure at least 1 cycle is charged if duration is very small)
  IF number_of_cycles < 0.1 THEN
    number_of_cycles := 1;
  END IF;
  
  total_cost := plan_price * number_of_cycles;

  -- Get school name
  SELECT name INTO school_name
  FROM schools
  WHERE id = NEW.school_id;

  -- Record the transaction if status is active
  IF NEW.status = 'active' THEN
    -- Check if we already recorded a transaction for this license ID to avoid duplicates
    IF NOT EXISTS (
      SELECT 1 FROM business_transactions
      WHERE description LIKE '%' || NEW.id || '%' OR description LIKE '%' || NEW.license_key || '%'
    ) THEN
      INSERT INTO business_transactions (type, category, amount, currency, description, date, created_by)
      VALUES (
        'income',
        'Subscription',
        total_cost,
        plan_currency,
        'Auto-recorded subscription for ' || COALESCE(school_name, 'School') || ' (License Key: ' || NEW.license_key || ', Plan: ' || NEW.plan || ', ID: ' || NEW.id || ')',
        NEW.start_date::DATE,
        (SELECT id FROM profiles WHERE role = 'system_admin' ORDER BY created_at LIMIT 1) -- default creator if not set
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
