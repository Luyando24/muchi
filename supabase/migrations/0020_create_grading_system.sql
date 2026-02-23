
-- Create grading_scales table
CREATE TABLE IF NOT EXISTS grading_scales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  grade TEXT NOT NULL, -- e.g. 'A', 'B'
  min_percentage INTEGER NOT NULL,
  max_percentage INTEGER NOT NULL,
  gpa_point DECIMAL(3, 2), -- e.g. 4.0
  description TEXT, -- e.g. 'Excellent'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, grade)
);

-- Create grading_weights table
CREATE TABLE IF NOT EXISTS grading_weights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL, -- 'homework', 'quiz', 'exam', etc.
  weight_percentage INTEGER NOT NULL, -- e.g. 40
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, assessment_type)
);

-- Enable RLS
ALTER TABLE grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_weights ENABLE ROW LEVEL SECURITY;

-- Policies for grading_scales
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'grading_scales' 
        AND policyname = 'School staff can view grading scales'
    ) THEN
        CREATE POLICY "School staff can view grading scales" ON grading_scales
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE id = auth.uid() AND school_id = grading_scales.school_id AND role IN ('school_admin', 'teacher', 'student')
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'grading_scales' 
        AND policyname = 'School admins can manage grading scales'
    ) THEN
        CREATE POLICY "School admins can manage grading scales" ON grading_scales
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE id = auth.uid() AND school_id = grading_scales.school_id AND role = 'school_admin'
            )
          );
    END IF;
END $$;

-- Policies for grading_weights
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'grading_weights' 
        AND policyname = 'School staff can view grading weights'
    ) THEN
        CREATE POLICY "School staff can view grading weights" ON grading_weights
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE id = auth.uid() AND school_id = grading_weights.school_id AND role IN ('school_admin', 'teacher', 'student')
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'grading_weights' 
        AND policyname = 'School admins can manage grading weights'
    ) THEN
        CREATE POLICY "School admins can manage grading weights" ON grading_weights
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE id = auth.uid() AND school_id = grading_weights.school_id AND role = 'school_admin'
            )
          );
    END IF;
END $$;
