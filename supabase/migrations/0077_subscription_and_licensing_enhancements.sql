-- Add country_ids to subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS country_ids UUID[] DEFAULT '{}';

-- Create license_codes table
CREATE TABLE IF NOT EXISTS license_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  plan_name TEXT NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 12,
  is_active BOOLEAN DEFAULT true,
  is_used BOOLEAN DEFAULT false,
  redeemed_by_school_id UUID REFERENCES schools(id),
  redeemed_at TIMESTAMPTZ,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE license_codes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "System Admins can manage all license codes" ON license_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'system_admin'
    )
  );

-- Create index for faster redemptions
CREATE INDEX idx_license_codes_code ON license_codes(code);
CREATE INDEX idx_license_codes_is_used ON license_codes(is_used);
