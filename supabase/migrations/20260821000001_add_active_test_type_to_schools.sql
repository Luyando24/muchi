-- Add active_test_type column to schools table if not exists
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS active_test_type TEXT DEFAULT 'Test 1';
