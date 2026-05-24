-- Create trigger function to delete license income from business_transactions
CREATE OR REPLACE FUNCTION delete_license_income()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM business_transactions
  WHERE description LIKE '%' || OLD.id || '%'
     OR description LIKE '%' || OLD.license_key || '%';
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Register trigger
DROP TRIGGER IF EXISTS trigger_delete_license_income ON school_licenses;
CREATE TRIGGER trigger_delete_license_income
AFTER DELETE ON school_licenses
FOR EACH ROW
EXECUTE FUNCTION delete_license_income();
