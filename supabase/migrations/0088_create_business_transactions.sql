-- Create business_transactions table to track platform level revenue/expenses
CREATE TABLE IF NOT EXISTS business_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'ZMW' NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE business_transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "System Admins can manage all business transactions" ON business_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'system_admin'
    )
  );

-- Seed some mock transactions to make it look premium and real immediately!
-- Incomes (e.g. custom setups, offline cash subscription collections) and Expenses (marketing, servers, salaries)
INSERT INTO business_transactions (type, category, amount, description, date)
VALUES
  ('expense', 'Server Hosting', 1200.00, 'AWS Production infrastructure and DB backups hosting', CURRENT_DATE - INTERVAL '15 days'),
  ('expense', 'Marketing', 2500.00, 'Social media ad campaigns for school registration drive', CURRENT_DATE - INTERVAL '12 days'),
  ('income', 'Setup Assistance', 1500.00, 'Onsite data entry and configuration assistance for Lusaka Primary School', CURRENT_DATE - INTERVAL '10 days'),
  ('expense', 'Software Licenses', 450.00, 'SendGrid email delivery service subscription', CURRENT_DATE - INTERVAL '5 days'),
  ('income', 'Consulting', 3000.00, 'Custom dashboard integration consultation with network schools', CURRENT_DATE - INTERVAL '2 days'),
  ('expense', 'Office Supplies', 350.00, 'Printing paper and folders for support team', CURRENT_DATE - INTERVAL '1 days')
ON CONFLICT DO NOTHING;
