-- Create a trigger function to automatically record license income in business_transactions
CREATE OR REPLACE FUNCTION record_license_income()
RETURNS TRIGGER AS $$
DECLARE
  plan_price NUMERIC;
  plan_currency TEXT;
  duration_months INT;
  school_name TEXT;
  total_cost NUMERIC;
BEGIN
  -- Get plan price and currency from subscription_plans
  SELECT price, COALESCE(currency, 'ZMW') INTO plan_price, plan_currency
  FROM subscription_plans
  WHERE LOWER(name) = LOWER(NEW.plan)
     OR LOWER(name) LIKE '%' || LOWER(NEW.plan) || '%'
     OR LOWER(NEW.plan) LIKE '%' || LOWER(name) || '%';

  -- Default values if plan not found
  IF plan_price IS NULL THEN
    plan_price := 500;
    plan_currency := 'ZMW';
  END IF;

  -- Calculate months duration between start_date and end_date
  duration_months := ROUND(EXTRACT(EPOCH FROM (NEW.end_date - NEW.start_date)) / (30 * 24 * 60 * 60));
  IF duration_months < 1 THEN
    duration_months := 1;
  END IF;

  -- Calculate total cost
  total_cost := plan_price * duration_months;

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

-- Register the trigger on school_licenses
DROP TRIGGER IF EXISTS trigger_record_license_income ON school_licenses;
CREATE TRIGGER trigger_record_license_income
AFTER INSERT OR UPDATE ON school_licenses
FOR EACH ROW
EXECUTE FUNCTION record_license_income();

-- Backfill existing active licenses that do not have a transaction recorded
INSERT INTO business_transactions (type, category, amount, currency, description, date, created_by)
SELECT 
  'income' AS type,
  'Subscription' AS category,
  (
    COALESCE(
      (SELECT price FROM subscription_plans WHERE LOWER(name) = LOWER(l.plan) OR LOWER(name) LIKE '%' || LOWER(l.plan) || '%' OR LOWER(l.plan) LIKE '%' || LOWER(name) || '%' LIMIT 1),
      500
    ) * GREATEST(1, ROUND(EXTRACT(EPOCH FROM (l.end_date - l.start_date)) / (30 * 24 * 60 * 60)))
  ) AS amount,
  COALESCE(
    (SELECT currency FROM subscription_plans WHERE LOWER(name) = LOWER(l.plan) OR LOWER(name) LIKE '%' || LOWER(l.plan) || '%' OR LOWER(l.plan) LIKE '%' || LOWER(name) || '%' LIMIT 1),
    'ZMW'
  ) AS currency,
  'Auto-recorded subscription for ' || COALESCE(s.name, 'School') || ' (License Key: ' || l.license_key || ', Plan: ' || l.plan || ', ID: ' || l.id || ')' AS description,
  l.start_date::DATE AS date,
  (SELECT id FROM profiles WHERE role = 'system_admin' ORDER BY created_at LIMIT 1) AS created_by
FROM school_licenses l
JOIN schools s ON l.school_id = s.id
WHERE l.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM business_transactions bt 
    WHERE bt.description LIKE '%' || l.id || '%'
  )
ON CONFLICT DO NOTHING;
