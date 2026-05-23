-- Add Teacher Extensions to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS marital_status TEXT,
ADD COLUMN IF NOT EXISTS housing_status TEXT,
ADD COLUMN IF NOT EXISTS living_with_spouse BOOLEAN,
ADD COLUMN IF NOT EXISTS disability_status TEXT,
ADD COLUMN IF NOT EXISTS accommodation_provided TEXT,
ADD COLUMN IF NOT EXISTS highest_qualification TEXT,
ADD COLUMN IF NOT EXISTS institution_name TEXT,
ADD COLUMN IF NOT EXISTS completion_year INTEGER,
ADD COLUMN IF NOT EXISTS field_of_study TEXT,
ADD COLUMN IF NOT EXISTS current_role TEXT;

-- Add Student Extensions to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS disability_type TEXT,
ADD COLUMN IF NOT EXISTS special_support TEXT,
ADD COLUMN IF NOT EXISTS iep_on_file BOOLEAN,
ADD COLUMN IF NOT EXISTS poverty_flag TEXT,
ADD COLUMN IF NOT EXISTS orphan_status TEXT,
ADD COLUMN IF NOT EXISTS bursary_recipient BOOLEAN,
ADD COLUMN IF NOT EXISTS distance_from_school NUMERIC;

-- Create teacher_mortality table
CREATE TABLE IF NOT EXISTS teacher_mortality (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date_of_death DATE NOT NULL,
  cause_category TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create school_vacancies table
CREATE TABLE IF NOT EXISTS school_vacancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  role_title TEXT NOT NULL,
  planned_positions INTEGER DEFAULT 0,
  filled_positions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, role_title)
);

-- Create teacher_transfers table
CREATE TABLE IF NOT EXISTS teacher_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  origin_school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  destination_school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  date_requested DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create couple_reunion_applications table
CREATE TABLE IF NOT EXISTS couple_reunion_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  spouse_name TEXT NOT NULL,
  spouse_employer_school TEXT NOT NULL,
  current_separation_distance NUMERIC,
  duration_of_separation_months INTEGER,
  supporting_statement TEXT,
  status TEXT DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Under Review', 'Approved', 'Rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create school_infrastructure_scores table
CREATE TABLE IF NOT EXISTS school_infrastructure_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  classrooms_score NUMERIC DEFAULT 0,
  toilets_score NUMERIC DEFAULT 0,
  internet_score NUMERIC DEFAULT 0,
  overall_infrastructure_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id)
);

-- Apply RLS
ALTER TABLE teacher_mortality ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_reunion_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_infrastructure_scores ENABLE ROW LEVEL SECURITY;

-- Base Policies (System Admins can do anything, School Admins can manage their school's data)
CREATE POLICY "System Admins manage teacher_mortality" ON teacher_mortality FOR ALL USING (is_system_admin());
CREATE POLICY "System Admins manage school_vacancies" ON school_vacancies FOR ALL USING (is_system_admin());
CREATE POLICY "System Admins manage teacher_transfers" ON teacher_transfers FOR ALL USING (is_system_admin());
CREATE POLICY "System Admins manage couple_reunion_applications" ON couple_reunion_applications FOR ALL USING (is_system_admin());
CREATE POLICY "System Admins manage school_infrastructure_scores" ON school_infrastructure_scores FOR ALL USING (is_system_admin());

-- Additional Policies can be added as needed for school_admins, government, etc.
