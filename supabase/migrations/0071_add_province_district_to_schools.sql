-- Add province and district columns to schools table without destroying existing data
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'province') THEN
        ALTER TABLE schools ADD COLUMN province TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'district') THEN
        ALTER TABLE schools ADD COLUMN district TEXT;
    END IF;
END $$;
