-- Migration to add dynamic departments table and seed default data

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Ensure unique department names per school
    UNIQUE(school_id, name)
);

-- RLS Policies
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Allow school admins to do everything with their school's departments
CREATE POLICY "Admins can manage their school's departments" 
ON departments FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.school_id = departments.school_id 
        AND profiles.role = 'school_admin'
    )
);

-- Allow teachers to view departments
CREATE POLICY "Teachers can view their school's departments" 
ON departments FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.school_id = departments.school_id 
        AND (profiles.role = 'teacher' OR profiles.role = 'school_admin')
    )
);

-- Insert default popular departments for all existing schools
DO $$
DECLARE
    school_record RECORD;
    dept_name TEXT;
    default_departments TEXT[] := ARRAY['Science', 'Mathematics', 'Languages', 'Humanities', 'Business Studies', 'Arts', 'Sports', 'Computer Science'];
BEGIN
    FOR school_record IN SELECT id FROM schools LOOP
        FOREACH dept_name IN ARRAY default_departments LOOP
            -- Use INSERT ON CONFLICT DO NOTHING to avoid duplicate errors if some somehow exist
            INSERT INTO departments (school_id, name)
            VALUES (school_record.id, dept_name)
            ON CONFLICT (school_id, name) DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$;
