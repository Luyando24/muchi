-- 0083_school_fees_payments.sql

-- Insert currency settings into system_settings
INSERT INTO system_settings (key, value, description)
VALUES 
  ('default_currency', 'ZMW', 'Default currency for the system'),
  ('supported_currencies', '["ZMW", "USD", "ZAR"]', 'JSON array of supported currencies')
ON CONFLICT (key) DO NOTHING;

-- Create fee_structures table
CREATE TABLE IF NOT EXISTS fee_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  grade TEXT NOT NULL,
  term TEXT NOT NULL,
  academic_year INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'ZMW' NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, grade, term, academic_year)
);

-- Create student_invoices table
CREATE TABLE IF NOT EXISTS student_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE SET NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  currency TEXT DEFAULT 'ZMW' NOT NULL,
  status TEXT CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')) DEFAULT 'pending' NOT NULL,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create fee_payments table
CREATE TABLE IF NOT EXISTS fee_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES student_invoices(id) ON DELETE CASCADE NOT NULL,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  convenience_fee DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  total_paid DECIMAL(10, 2) NOT NULL, -- amount + convenience_fee
  currency TEXT DEFAULT 'ZMW' NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('momo', 'card', 'bank_transfer', 'cash')) NOT NULL,
  provider TEXT, -- e.g., 'MTN', 'Airtel', 'Manual'
  provider_reference TEXT UNIQUE, -- transaction ID from provider
  status TEXT CHECK (status IN ('pending', 'successful', 'failed', 'refunded')) DEFAULT 'pending' NOT NULL,
  paid_at TIMESTAMPTZ,
  receipt_number TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;

-- Fee Structures Policies
CREATE POLICY "Public read fee_structures" ON fee_structures FOR SELECT USING (true);
CREATE POLICY "School Admins manage fee_structures" ON fee_structures FOR ALL USING (
  is_school_admin() AND school_id = get_my_school_id()
);

-- Student Invoices Policies
CREATE POLICY "School Admins manage student_invoices" ON student_invoices FOR ALL USING (
  is_school_admin() AND school_id = get_my_school_id()
);
CREATE POLICY "Students read own invoices" ON student_invoices FOR SELECT USING (
  student_id = auth.uid()
);

-- Fee Payments Policies
CREATE POLICY "School Admins manage fee_payments" ON fee_payments FOR ALL USING (
  is_school_admin() AND school_id = get_my_school_id()
);
CREATE POLICY "Students read own payments" ON fee_payments FOR SELECT USING (
  student_id = auth.uid()
);

-- Function to update invoice status based on payments
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
  inv_total DECIMAL;
  inv_paid DECIMAL;
BEGIN
  -- Re-calculate total paid for the invoice (only successful payments)
  SELECT COALESCE(SUM(amount), 0) INTO inv_paid 
  FROM fee_payments 
  WHERE invoice_id = NEW.invoice_id AND status = 'successful';
  
  -- Get invoice total
  SELECT total_amount INTO inv_total
  FROM student_invoices
  WHERE id = NEW.invoice_id;
  
  -- Update invoice
  UPDATE student_invoices
  SET 
    amount_paid = inv_paid,
    status = CASE 
      WHEN inv_paid >= inv_total THEN 'paid'
      WHEN inv_paid > 0 THEN 'partial'
      ELSE status -- Keep existing status (e.g. pending/overdue) if 0
    END,
    updated_at = NOW()
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run after a payment status changes
CREATE TRIGGER trigger_update_invoice_status
AFTER INSERT OR UPDATE OF status, amount
ON fee_payments
FOR EACH ROW
EXECUTE FUNCTION update_invoice_status();
