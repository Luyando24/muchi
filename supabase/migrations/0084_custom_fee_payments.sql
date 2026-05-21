-- 0084_custom_fee_payments.sql

-- Drop the restrictive unique constraint
DO $$ 
BEGIN 
    ALTER TABLE public.fee_structures DROP CONSTRAINT IF EXISTS fee_structures_school_id_grade_term_academic_year_key;
EXCEPTION 
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Add new columns for custom fees
ALTER TABLE public.fee_structures ADD COLUMN fee_type TEXT DEFAULT 'tuition' NOT NULL CHECK (fee_type IN ('tuition', 'custom'));
ALTER TABLE public.fee_structures ADD COLUMN applicable_to TEXT DEFAULT 'grade' NOT NULL CHECK (applicable_to IN ('school', 'grade', 'class'));

-- Update comments
COMMENT ON COLUMN public.fee_structures.fee_type IS 'Distinguishes between regular tuition and custom once-off payments';
COMMENT ON COLUMN public.fee_structures.applicable_to IS 'Defines if this fee targets the whole school, a specific grade, or a specific class';
