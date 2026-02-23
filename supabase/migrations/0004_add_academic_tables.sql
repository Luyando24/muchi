-- Create subjects table if not exists
CREATE TABLE IF NOT EXISTS subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  department TEXT,
  head_teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist for subjects
DO $$
BEGIN
    ALTER TABLE subjects ADD COLUMN IF NOT EXISTS code TEXT;
    ALTER TABLE subjects ADD COLUMN IF NOT EXISTS department TEXT;
    ALTER TABLE subjects ADD COLUMN IF NOT EXISTS head_teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
END $$;

-- Create classes table if not exists
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT,
  room TEXT,
  capacity INTEGER DEFAULT 40,
  class_teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist for classes
DO $$
BEGIN
    ALTER TABLE classes ADD COLUMN IF NOT EXISTS level TEXT;
    ALTER TABLE classes ADD COLUMN IF NOT EXISTS room TEXT;
    ALTER TABLE classes ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 40;
    ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
