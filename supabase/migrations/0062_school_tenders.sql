
-- 0062_school_tenders.sql
-- Migration to add school tenders table for supply opportunities

CREATE TABLE IF NOT EXISTS school_tenders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g., 'Food Supplies', 'Stationery', 'Infrastructure'
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Closed', 'Awarded', 'Cancelled')),
  deadline TIMESTAMPTZ NOT NULL,
  contact_info TEXT,
  document_url TEXT, -- Link to full tender document
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE school_tenders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "School staff can manage tenders" ON school_tenders
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() 
    AND school_id = school_tenders.school_id 
    AND role IN ('school_admin', 'content_manager')
  )
);

CREATE POLICY "Public can view tenders" ON school_tenders
FOR SELECT USING (true); -- Publicly visible on school website

-- Add index
CREATE INDEX IF NOT EXISTS idx_school_tenders_school_id ON school_tenders(school_id);
