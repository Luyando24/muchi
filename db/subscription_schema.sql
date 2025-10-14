-- Subscription Management Schema
-- This file contains all tables needed for the subscription management module

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  yearly_price DECIMAL(10,2) NOT NULL,
  max_users INTEGER NOT NULL DEFAULT 50,
  features JSONB NOT NULL DEFAULT '[]',
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'trial', 'expired', 'cancelled')) DEFAULT 'trial',
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')) DEFAULT 'monthly',
  users_count INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  next_billing_date DATE,
  trial_end_date DATE,
  auto_renewal BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('card', 'bank', 'mobile_money')),
  provider TEXT, -- visa, mastercard, mtn, airtel, etc.
  last4 TEXT NOT NULL,
  expiry_month INTEGER,
  expiry_year INTEGER,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB, -- store additional payment method details
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Billing History / Invoices
CREATE TABLE IF NOT EXISTS billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  status TEXT NOT NULL CHECK (status IN ('paid', 'pending', 'failed', 'cancelled', 'refunded')) DEFAULT 'pending',
  billing_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  plan_name TEXT NOT NULL, -- snapshot of plan name at time of billing
  plan_type TEXT NOT NULL, -- snapshot of plan type at time of billing
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  notes TEXT,
  metadata JSONB, -- store additional billing details
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscription Changes Log (for tracking upgrades, downgrades, etc.)
CREATE TABLE IF NOT EXISTS subscription_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'upgraded', 'downgraded', 'cancelled', 'renewed', 'trial_started', 'trial_ended')),
  old_plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  new_plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  old_status TEXT,
  new_status TEXT,
  reason TEXT,
  changed_by UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_school_id ON subscriptions(school_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_payment_methods_school_id ON payment_methods(school_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(school_id, is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_billing_records_subscription ON billing_records(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_school ON billing_records(school_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_status ON billing_records(status);
CREATE INDEX IF NOT EXISTS idx_billing_records_date ON billing_records(billing_date DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_subscription ON subscription_changes(subscription_id);

-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, description, price, yearly_price, max_users, features, is_popular) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Basic', 'Perfect for small schools getting started', 99.00, 999.00, 50, 
   '["Student Management", "Basic Reports", "Attendance Tracking", "Grade Management", "Email Support"]', false),
  ('550e8400-e29b-41d4-a716-446655440002', 'Premium', 'Ideal for growing schools with advanced needs', 299.00, 2999.00, 200, 
   '["All Basic Features", "Parent Portal", "Advanced Reports", "SMS Notifications", "Priority Support", "Custom Branding"]', true),
  ('550e8400-e29b-41d4-a716-446655440003', 'Enterprise', 'Complete solution for large educational institutions', 599.00, 5999.00, 1000, 
   '["All Premium Features", "Custom Integrations", "API Access", "Dedicated Support", "Training Sessions", "Multi-Campus Support"]', false)
ON CONFLICT (id) DO NOTHING;

-- Function to automatically generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  invoice_number TEXT;
BEGIN
  -- Get the next invoice number (simple sequential numbering)
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM billing_records
  WHERE invoice_number ~ '^INV-\d+$';
  
  invoice_number := 'INV-' || LPAD(next_number::TEXT, 6, '0');
  
  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON billing_records
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- Function to update subscription status based on billing and dates
CREATE OR REPLACE FUNCTION update_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update subscription status based on various conditions
  IF NEW.end_date < CURRENT_DATE THEN
    NEW.status := 'expired';
  ELSIF NEW.trial_end_date IS NOT NULL AND NEW.trial_end_date < CURRENT_DATE AND NEW.status = 'trial' THEN
    NEW.status := 'expired';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_status
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_status();