-- Add settings columns to schools table
ALTER TABLE IF EXISTS public.schools
ADD COLUMN IF NOT EXISTS academic_year TEXT,
ADD COLUMN IF NOT EXISTS current_term TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Ensure RLS allows updates
-- (Assuming RLS is enabled on schools, we need a policy for admins to update their own school)

CREATE POLICY "School admins can update their own school"
    ON public.schools
    FOR UPDATE
    USING (
        id IN (
            SELECT school_id 
            FROM public.profiles 
            WHERE id = auth.uid() AND role = 'school_admin'
        )
    )
    WITH CHECK (
        id IN (
            SELECT school_id 
            FROM public.profiles 
            WHERE id = auth.uid() AND role = 'school_admin'
        )
    );

-- Allow school admins to view their own school
CREATE POLICY "School admins can view their own school"
    ON public.schools
    FOR SELECT
    USING (
        id IN (
            SELECT school_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
    );
