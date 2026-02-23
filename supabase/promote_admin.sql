-- Step 1: Create a user manually in Supabase Authentication Dashboard (or via Client Signup)
-- Email: admin@muchi.com
-- Password: <your-secure-password>

-- Step 2: Run this SQL to promote that user to System Admin
UPDATE public.profiles
SET 
    role = 'system_admin',
    school_id = NULL -- System Admins are global
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'admin@muchi.com'
);

-- Step 3: Verify the update
SELECT * FROM public.profiles 
WHERE role = 'system_admin';
