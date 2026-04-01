-- Safely add missing asset columns to schools table

DO $$
BEGIN
    -- Add seal_url if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'seal_url') THEN
        ALTER TABLE schools ADD COLUMN seal_url TEXT;
    END IF;

    -- Add signature_url if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'signature_url') THEN
        ALTER TABLE schools ADD COLUMN signature_url TEXT;
    END IF;
END $$;
