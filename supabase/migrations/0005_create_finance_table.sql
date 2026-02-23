
-- Create Helper Functions if they don't exist
CREATE OR REPLACE FUNCTION is_school_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'school_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS UUID AS $$
DECLARE
  sid UUID;
BEGIN
  SELECT school_id INTO sid
  FROM profiles
  WHERE id = auth.uid() AND role = 'school_admin';
  RETURN sid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Finance Records Table
CREATE TABLE IF NOT EXISTS finance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE finance_records ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists to avoid conflicts
DROP POLICY IF EXISTS "School Admins manage finance" ON finance_records;

-- Create Policy
CREATE POLICY "School Admins manage finance"
ON finance_records FOR ALL USING (
  is_school_admin() AND school_id = get_my_school_id()
);
