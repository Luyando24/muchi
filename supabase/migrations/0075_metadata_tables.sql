-- Create school_categories table
CREATE TABLE IF NOT EXISTS school_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create countries table
CREATE TABLE IF NOT EXISTS countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE school_categories IS 'List of valid school categories (Private, Government, etc.)';
COMMENT ON TABLE countries IS 'List of valid countries for school registration';

-- Seed school_categories with initial data
INSERT INTO school_categories (name) VALUES 
('Government'),
('Private'),
('Mission'),
('Community'),
('International'),
('Other')
ON CONFLICT (name) DO NOTHING;

-- Seed countries with initial data
INSERT INTO countries (name, code) VALUES 
('Zambia', 'ZM'),
('South Africa', 'ZA'),
('Zimbabwe', 'ZW'),
('Malawi', 'MW'),
('Botswana', 'BW'),
('Namibia', 'NA'),
('Other', 'OT')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS (Read-only for public, Full access for admin)
ALTER TABLE school_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-only access to categories" ON school_categories
    FOR SELECT USING (true);

CREATE POLICY "Allow public read-only access to countries" ON countries
    FOR SELECT USING (true);
