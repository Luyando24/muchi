
-- Helper Functions (Ensure they exist)
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

-- Dashboard Tables

-- 1. Announcements (CRUD)
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Activity Logs (Read Only usually, but created by system)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL, -- e.g., "Created Student", "Posted Announcement"
  details JSONB, -- specific details
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Finance Records (For Financial Summary)
CREATE TABLE IF NOT EXISTS finance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL, -- e.g., "Tuition", "Donations", "Salaries"
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Approvals (For Pending Approvals)
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  requester_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT NOT NULL, -- e.g., "Leave Request", "Expense Claim"
  details JSONB,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies

-- Announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School Admins manage announcements"
ON announcements FOR ALL USING (
  is_school_admin() AND school_id = get_my_school_id()
);

CREATE POLICY "Everyone in school view announcements"
ON announcements FOR SELECT USING (
  (auth.uid() IN (SELECT id FROM profiles WHERE school_id = announcements.school_id))
);

-- Activity Logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School Admins view logs"
ON activity_logs FOR SELECT USING (
  is_school_admin() AND school_id = get_my_school_id()
);

-- Finance Records
ALTER TABLE finance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School Admins manage finance"
ON finance_records FOR ALL USING (
  is_school_admin() AND school_id = get_my_school_id()
);

-- Approvals
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School Admins manage approvals"
ON approvals FOR ALL USING (
  is_school_admin() AND school_id = get_my_school_id()
);

CREATE POLICY "Users view own approvals"
ON approvals FOR SELECT USING (
  auth.uid() = requester_id
);
