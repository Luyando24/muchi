-- Create school_licenses table
CREATE TABLE IF NOT EXISTS school_licenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'suspended', 'pending')),
  license_key TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'Standard',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE school_licenses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "System Admins can manage all licenses" ON school_licenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'system_admin'
    )
  );

CREATE POLICY "School Admins can view own school license" ON school_licenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND school_id = school_licenses.school_id AND role = 'school_admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_school_licenses_school_id ON school_licenses(school_id);
CREATE INDEX idx_school_licenses_status ON school_licenses(status);
