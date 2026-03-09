
-- Combined migration to create missing tables
-- Includes: Dashboard tables (0001), Class Subjects (0030), Student Subjects (0031)

-- ==========================================
-- 1. Dashboard Tables & Helpers (from 0001)
-- ==========================================

-- Helper Functions
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

-- Announcements
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

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance Records
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

-- Approvals
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  requester_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT NOT NULL,
  details JSONB,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for Dashboard Tables

-- Announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "School Admins manage announcements"
  ON announcements FOR ALL USING (
    is_school_admin() AND school_id = get_my_school_id()
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Everyone in school view announcements"
  ON announcements FOR SELECT USING (
    (auth.uid() IN (SELECT id FROM profiles WHERE school_id = announcements.school_id))
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Activity Logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "School Admins view logs"
  ON activity_logs FOR SELECT USING (
    is_school_admin() AND school_id = get_my_school_id()
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Finance Records
ALTER TABLE finance_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "School Admins manage finance"
  ON finance_records FOR ALL USING (
    is_school_admin() AND school_id = get_my_school_id()
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Approvals
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "School Admins manage approvals"
  ON approvals FOR ALL USING (
    is_school_admin() AND school_id = get_my_school_id()
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users view own approvals"
  ON approvals FOR SELECT USING (
    auth.uid() = requester_id
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ==========================================
-- 2. Class Subjects (from 0030)
-- ==========================================

CREATE TABLE IF NOT EXISTS class_subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, subject_id)
);

ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "School staff can view class subjects" ON class_subjects
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = class_subjects.class_id
        AND classes.school_id IN (
          SELECT school_id FROM profiles
          WHERE id = auth.uid() AND role IN ('school_admin', 'teacher', 'student')
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "School admins can manage class subjects" ON class_subjects
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = class_subjects.class_id
        AND classes.school_id IN (
          SELECT school_id FROM profiles
          WHERE id = auth.uid() AND role = 'school_admin'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ==========================================
-- 3. Student Subjects (from 0031)
-- ==========================================

CREATE TABLE IF NOT EXISTS student_subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  academic_year TEXT,
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, academic_year)
);

ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "School staff can manage student subjects" ON student_subjects
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() 
        AND school_id = (SELECT school_id FROM profiles WHERE id = student_subjects.student_id)
        AND role IN ('school_admin', 'teacher')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Students can view their own subjects" ON student_subjects
    FOR SELECT USING (auth.uid() = student_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
