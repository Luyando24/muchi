-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view active subscription plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "System Admins can manage all subscription plans" ON subscription_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'system_admin'
    )
  );

-- Seed initial plans
INSERT INTO subscription_plans (name, description, price, billing_cycle)
VALUES 
  ('Standard Plan', 'Essential features for growing schools', 500, 'monthly'),
  ('Premium Plan', 'Advanced tools for larger institutions', 1000, 'monthly'),
  ('Enterprise Plan', 'Custom solutions for education networks', 2500, 'monthly')
ON CONFLICT (name) DO NOTHING;
