
-- Comprehensive schema fix for seeding

-- 1. Schools
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'slug') THEN
        ALTER TABLE schools ADD COLUMN slug TEXT UNIQUE;
    END IF;
END $$;

-- 2. Profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'enrollment_status') THEN
        ALTER TABLE profiles ADD COLUMN enrollment_status TEXT DEFAULT 'Active';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'date_of_birth') THEN
        ALTER TABLE profiles ADD COLUMN date_of_birth DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'gender') THEN
        ALTER TABLE profiles ADD COLUMN gender TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'address') THEN
        ALTER TABLE profiles ADD COLUMN address TEXT;
    END IF;
END $$;

-- 3. Classes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'academic_year') THEN
        ALTER TABLE classes ADD COLUMN academic_year TEXT DEFAULT '2024';
    END IF;
END $$;

-- 4. Enrollments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'enrollment_date') THEN
        ALTER TABLE enrollments ADD COLUMN enrollment_date DATE DEFAULT CURRENT_DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'status') THEN
        ALTER TABLE enrollments ADD COLUMN status TEXT DEFAULT 'Active';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'school_id') THEN
        ALTER TABLE enrollments ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
    ELSE
        ALTER TABLE enrollments ALTER COLUMN school_id DROP NOT NULL; -- Make nullable just in case
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'academic_year') THEN
        ALTER TABLE enrollments ADD COLUMN academic_year TEXT DEFAULT '2024';
    ELSE
         ALTER TABLE enrollments ALTER COLUMN academic_year DROP NOT NULL; -- Make nullable just in case
    END IF;
END $$;

-- 5. Attendance
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'school_id') THEN
        ALTER TABLE attendance ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
    ELSE
        ALTER TABLE attendance ALTER COLUMN school_id DROP NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'class_id') THEN
        ALTER TABLE attendance ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'remarks') THEN
        ALTER TABLE attendance ADD COLUMN remarks TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'recorded_by') THEN
        ALTER TABLE attendance ADD COLUMN recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Assignments
DO $$
BEGIN
    -- assignment_number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'assignment_number') THEN
        ALTER TABLE assignments ADD COLUMN assignment_number INTEGER DEFAULT 1;
    ELSE
        ALTER TABLE assignments ALTER COLUMN assignment_number DROP NOT NULL;
    END IF;

    -- category
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'category') THEN
        ALTER TABLE assignments ADD COLUMN category TEXT DEFAULT 'Homework';
    ELSE
        ALTER TABLE assignments ALTER COLUMN category DROP NOT NULL;
    END IF;

    -- type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'type') THEN
        ALTER TABLE assignments ADD COLUMN type TEXT DEFAULT 'homework';
    ELSE
        ALTER TABLE assignments ALTER COLUMN type DROP NOT NULL;
    END IF;
    
    -- total_points
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'total_points') THEN
        ALTER TABLE assignments ADD COLUMN total_points INTEGER DEFAULT 100;
    END IF;
    
    -- school_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'school_id') THEN
        ALTER TABLE assignments ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
    ELSE
        ALTER TABLE assignments ALTER COLUMN school_id DROP NOT NULL;
    END IF;

    -- Make subject_id nullable since script might not provide it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'subject_id') THEN
        ALTER TABLE assignments ALTER COLUMN subject_id DROP NOT NULL;
    END IF;
END $$;

-- 7. Student Grades
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_grades' AND column_name = 'subject') THEN
        ALTER TABLE student_grades ADD COLUMN subject TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_grades' AND column_name = 'score') THEN
        ALTER TABLE student_grades ADD COLUMN score INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_grades' AND column_name = 'total_score') THEN
        ALTER TABLE student_grades ADD COLUMN total_score INTEGER;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_grades' AND column_name = 'subject_id') THEN
        ALTER TABLE student_grades ALTER COLUMN subject_id DROP NOT NULL;
    END IF;
END $$;
