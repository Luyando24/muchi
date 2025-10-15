-- Migration script to add classes tables
-- This script safely adds the classes and class_enrollments tables without affecting existing data

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_name VARCHAR(100) NOT NULL,
    grade_level INTEGER NOT NULL,
    section VARCHAR(10),
    subject VARCHAR(100),
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
    room_number VARCHAR(20),
    capacity INTEGER NOT NULL DEFAULT 30,
    current_enrollment INTEGER DEFAULT 0,
    academic_year VARCHAR(20) NOT NULL,
    term VARCHAR(20),
    schedule TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create class_enrollments table for many-to-many relationship between students and classes
CREATE TABLE IF NOT EXISTS class_enrollments (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(class_id, student_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_grade_level ON classes(grade_level);
CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON classes(academic_year);
CREATE INDEX IF NOT EXISTS idx_classes_is_active ON classes(is_active);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_is_active ON class_enrollments(is_active);

-- Create unique constraint to prevent duplicate class names within the same school and academic year
CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_unique_name 
ON classes(school_id, class_name, grade_level, section, academic_year) 
WHERE is_active = true;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_classes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_classes_updated_at ON classes;
CREATE TRIGGER trigger_update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION update_classes_updated_at();

-- Insert some sample data for testing (optional)
-- You can comment out this section if you don't want sample data
INSERT INTO classes (school_id, class_name, grade_level, section, subject, capacity, academic_year, term, description) 
SELECT 
    s.id,
    'Grade ' || generate_series(1, 12) || ' - Section A',
    generate_series(1, 12),
    'A',
    CASE 
        WHEN generate_series(1, 12) <= 6 THEN 'General Studies'
        ELSE 'Science'
    END,
    30,
    '2024-2025',
    'Term 1',
    'Standard class for grade level'
FROM schools s
WHERE EXISTS (SELECT 1 FROM schools LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM classes LIMIT 1)
LIMIT 12;

COMMIT;