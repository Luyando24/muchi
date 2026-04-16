-- Remove the existing hardcoded check constraint on schools table
DO $$ 
BEGIN 
    ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS schools_school_type_check; 
EXCEPTION 
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Create school_types table for dynamic management
CREATE TABLE IF NOT EXISTS public.school_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Seed initial school types
INSERT INTO public.school_types (name, description) VALUES 
('Primary School', '(Grades 1-7)'),
('Secondary School', '(Grades 8-12)'),
('Basic School', '(Grades 1-9)'),
('Combined School', '(Grades 1-12)')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;


-- Enable RLS
ALTER TABLE public.school_types ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read-only access to school types" ON public.school_types
    FOR SELECT USING (true);

CREATE POLICY "System Admins can manage all school types" ON public.school_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'system_admin'
        )
    );

-- Add comment for documentation
COMMENT ON TABLE public.school_types IS 'List of valid school types managed by system admins';
