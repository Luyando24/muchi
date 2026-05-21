-- 0084_finance_records_fee_trigger.sql

-- Function to record successful fee payment into general finance_records
CREATE OR REPLACE FUNCTION record_fee_payment_to_finance()
RETURNS TRIGGER AS $$
DECLARE
  fs_term TEXT;
  fs_year TEXT;
BEGIN
  -- Only proceed if status is 'successful' and it changed to successful
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status != 'successful' OR OLD.status = 'successful' THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.status != 'successful' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Get the term and year from the related invoice/fee_structure
  SELECT fs.term, fs.academic_year::text INTO fs_term, fs_year
  FROM student_invoices si
  JOIN fee_structures fs ON fs.id = si.fee_structure_id
  WHERE si.id = NEW.invoice_id;

  -- Insert a new income record into finance_records
  INSERT INTO finance_records (
    school_id,
    type,
    category,
    amount,
    date,
    description,
    term,
    academic_year,
    created_by
  ) VALUES (
    NEW.school_id,
    'income',
    'Tuition Fees',
    NEW.amount, -- Excluding convenience fee as it goes to provider
    COALESCE(NEW.paid_at, NOW())::date,
    'Fee Payment - ' || NEW.provider || ' Ref: ' || COALESCE(NEW.provider_reference, 'N/A'),
    COALESCE(fs_term, 'Term 1'),
    COALESCE(fs_year, extract(year from NOW())::text),
    (SELECT id FROM profiles WHERE role = 'school_admin' AND school_id = NEW.school_id LIMIT 1) -- Attribute to an admin
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run after a payment status changes to 'successful'
DROP TRIGGER IF EXISTS trigger_record_fee_payment_to_finance ON fee_payments;
CREATE TRIGGER trigger_record_fee_payment_to_finance
AFTER INSERT OR UPDATE OF status
ON fee_payments
FOR EACH ROW
EXECUTE FUNCTION record_fee_payment_to_finance();
