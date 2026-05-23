-- Create prospects table for CRM sales pipeline
CREATE TABLE IF NOT EXISTS public.prospects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Demo Scheduled', 'Negotiation', 'Closed Won', 'Closed Lost')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "System Admins can manage all prospects" ON public.prospects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'system_admin'
    )
  );

-- Indexes for performance
CREATE INDEX idx_prospects_status ON public.prospects(status);
