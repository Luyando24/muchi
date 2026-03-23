
-- 0061_feeding_program.sql
-- Migration to add Feeding Program module and support Government Portal monitoring

-- 1. Add geographic fields to schools table
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS district TEXT;

-- 2. Feeding Program Inventory (Stock)
CREATE TABLE IF NOT EXISTS feeding_program_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL, -- e.g., 'Maize', 'Beans', 'Cooking Oil'
  quantity DECIMAL(10, 2) DEFAULT 0,
  unit TEXT NOT NULL, -- e.g., 'bags', 'liters', 'kg'
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, item_name)
);

-- 3. Feeding Program Deliveries
CREATE TABLE IF NOT EXISTS feeding_program_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  delivery_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Dispatched', 'Received', 'Cancelled')),
  received_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Feeding Program Procurements (Digital Procurement System)
CREATE TABLE IF NOT EXISTS feeding_program_procurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  estimated_cost DECIMAL(10, 2),
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Fulfilled')),
  requested_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Feeding Program Meals (Beneficiaries tracking)
CREATE TABLE IF NOT EXISTS feeding_program_meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL, -- e.g., 'Lunch', 'Breakfast'
  beneficiaries_count INTEGER NOT NULL DEFAULT 0,
  items_used JSONB, -- e.g., {"Maize": "5kg", "Beans": "1kg"}
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable RLS
ALTER TABLE feeding_program_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_program_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_program_procurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_program_meals ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies

-- Inventory
CREATE POLICY "Admins manage inventory" ON feeding_program_inventory
FOR ALL USING (is_school_admin() AND school_id = get_my_school_id());

CREATE POLICY "Gov portal view inventory" ON feeding_program_inventory
FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'system_admin'));

-- Deliveries
CREATE POLICY "Admins manage deliveries" ON feeding_program_deliveries
FOR ALL USING (is_school_admin() AND school_id = get_my_school_id());

CREATE POLICY "Gov portal view deliveries" ON feeding_program_deliveries
FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'system_admin'));

-- Procurements
CREATE POLICY "Admins manage procurements" ON feeding_program_procurements
FOR ALL USING (is_school_admin() AND school_id = get_my_school_id());

CREATE POLICY "Gov portal manage procurements" ON feeding_program_procurements
FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'system_admin'));

-- Meals
CREATE POLICY "Admins manage meals" ON feeding_program_meals
FOR ALL USING (is_school_admin() AND school_id = get_my_school_id());

CREATE POLICY "Gov portal view meals" ON feeding_program_meals
FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'system_admin'));

-- 8. Trigger for stock update when delivery is received
CREATE OR REPLACE FUNCTION update_inventory_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Received' AND (OLD.status IS NULL OR OLD.status != 'Received') THEN
    INSERT INTO feeding_program_inventory (school_id, item_name, quantity, unit, last_updated)
    VALUES (NEW.school_id, NEW.item_name, NEW.quantity, NEW.unit, NOW())
    ON CONFLICT (school_id, item_name) 
    DO UPDATE SET 
      quantity = feeding_program_inventory.quantity + EXCLUDED.quantity,
      last_updated = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_update_inventory_on_delivery
AFTER UPDATE ON feeding_program_deliveries
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_delivery();
