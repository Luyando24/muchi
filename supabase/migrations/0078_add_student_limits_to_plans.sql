-- Add student limit columns to subscription_plans
ALTER TABLE subscription_plans
ADD COLUMN min_students INTEGER DEFAULT 0,
ADD COLUMN max_students INTEGER; -- NULL means unlimited

-- Update existing plans with default limits to avoid breaking logic
UPDATE subscription_plans SET min_students = 0, max_students = 500 WHERE name ILIKE '%Standard%';
UPDATE subscription_plans SET min_students = 501, max_students = 1500 WHERE name ILIKE '%Premium%';
UPDATE subscription_plans SET min_students = 1501 WHERE name ILIKE '%Enterprise%';

-- Seed new specific student-based plans for Zambia (ZMW)
-- Delete old ones first to avoid duplicates if they were names the same
DELETE FROM subscription_plans WHERE name IN ('Small School', 'Medium School', 'Large School');

INSERT INTO subscription_plans (name, description, price, currency, billing_cycle, min_students, max_students)
VALUES 
('Small School', 'Standard features for schools with up to 500 students.', 3000, 'ZMW', 'yearly', 0, 500),
('Medium School', 'Enhanced support for schools with 501 to 1500 students.', 7500, 'ZMW', 'yearly', 501, 1500),
('Large School', 'Ultimate power for schools with over 1500 students.', 15000, 'ZMW', 'yearly', 1501, NULL);
