-- Remove redundant payment_status column from schools table
-- as licensing is now the single source of truth for payment status.
ALTER TABLE public.schools DROP COLUMN IF EXISTS payment_status;
