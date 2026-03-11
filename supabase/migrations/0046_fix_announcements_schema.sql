-- Fix announcements schema to match application expectations
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS author TEXT,
ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Normal' CHECK (priority IN ('High', 'Normal', 'Low'));

-- Update existing records if any (optional but good practice)
UPDATE announcements SET author = 'System' WHERE author IS NULL;
UPDATE announcements SET date = created_at::DATE WHERE date IS NULL;
UPDATE announcements SET priority = 'Normal' WHERE priority IS NULL;
