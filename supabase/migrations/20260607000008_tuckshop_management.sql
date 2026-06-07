-- Migration to add tuckshop management module features

-- 1. Alter schools table
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS enable_tuckshop BOOLEAN DEFAULT true;

-- 2. Create tuckshop_products table
CREATE TABLE IF NOT EXISTS tuckshop_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  cost_price NUMERIC(10, 2) NOT NULL CHECK (cost_price >= 0),
  selling_price NUMERIC(10, 2) NOT NULL CHECK (selling_price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 5 CHECK (reorder_level >= 0),
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create tuckshop_sales table
CREATE TABLE IF NOT EXISTS tuckshop_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  buyer_type TEXT CHECK (buyer_type IN ('student', 'staff', 'civilian', 'other')) NOT NULL,
  buyer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  buyer_name TEXT,
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Mobile Money', 'School Wallet', 'Other')) DEFAULT 'Cash',
  sold_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create tuckshop_sale_items table
CREATE TABLE IF NOT EXISTS tuckshop_sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES tuckshop_sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES tuckshop_products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0)
);

-- 5. Create tuckshop_staff table
CREATE TABLE IF NOT EXISTS tuckshop_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Manager', 'Seller', 'Assistant')) DEFAULT 'Seller',
  status TEXT NOT NULL CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, user_id)
);

-- 6. Enable RLS
ALTER TABLE tuckshop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuckshop_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuckshop_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuckshop_staff ENABLE ROW LEVEL SECURITY;

-- 7. Policies for tuckshop_products
DROP POLICY IF EXISTS "Select products" ON tuckshop_products;
CREATE POLICY "Select products" ON tuckshop_products
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND (profiles.role = 'system_admin' OR profiles.school_id = tuckshop_products.school_id)
  )
);

DROP POLICY IF EXISTS "Manage products" ON tuckshop_products;
CREATE POLICY "Manage products" ON tuckshop_products
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'system_admin'
        OR (profiles.role IN ('school_admin', 'bursar', 'accounts') AND profiles.school_id = tuckshop_products.school_id)
      )
  )
);

-- 8. Policies for tuckshop_sales
DROP POLICY IF EXISTS "Select sales" ON tuckshop_sales;
CREATE POLICY "Select sales" ON tuckshop_sales
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'system_admin'
        OR (profiles.role IN ('school_admin', 'bursar', 'accounts') AND profiles.school_id = tuckshop_sales.school_id)
        OR (profiles.school_id = tuckshop_sales.school_id AND EXISTS (
          SELECT 1 FROM tuckshop_staff
          WHERE tuckshop_staff.user_id = auth.uid()
            AND tuckshop_staff.school_id = tuckshop_sales.school_id
            AND tuckshop_staff.status = 'Active'
        ))
      )
  )
);

DROP POLICY IF EXISTS "Insert sales" ON tuckshop_sales;
CREATE POLICY "Insert sales" ON tuckshop_sales
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'system_admin'
        OR (profiles.role IN ('school_admin', 'bursar', 'accounts') AND profiles.school_id = tuckshop_sales.school_id)
        OR (profiles.school_id = tuckshop_sales.school_id AND EXISTS (
          SELECT 1 FROM tuckshop_staff
          WHERE tuckshop_staff.user_id = auth.uid()
            AND tuckshop_staff.school_id = tuckshop_sales.school_id
            AND tuckshop_staff.status = 'Active'
        ))
      )
  )
);

DROP POLICY IF EXISTS "Manage sales" ON tuckshop_sales;
CREATE POLICY "Manage sales" ON tuckshop_sales
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'system_admin'
        OR (profiles.role IN ('school_admin', 'bursar', 'accounts') AND profiles.school_id = tuckshop_sales.school_id)
      )
  )
);

-- 9. Policies for tuckshop_sale_items
DROP POLICY IF EXISTS "Select sale items" ON tuckshop_sale_items;
CREATE POLICY "Select sale items" ON tuckshop_sale_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tuckshop_sales s
    WHERE s.id = tuckshop_sale_items.sale_id
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND (p.role = 'system_admin' OR p.school_id = s.school_id)
      )
  )
);

DROP POLICY IF EXISTS "Insert sale items" ON tuckshop_sale_items;
CREATE POLICY "Insert sale items" ON tuckshop_sale_items
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM tuckshop_sales s
    WHERE s.id = tuckshop_sale_items.sale_id
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND (
            p.role = 'system_admin'
            OR (p.role IN ('school_admin', 'bursar', 'accounts') AND p.school_id = s.school_id)
            OR (p.school_id = s.school_id AND EXISTS (
              SELECT 1 FROM tuckshop_staff ts
              WHERE ts.user_id = auth.uid()
                AND ts.school_id = s.school_id
                AND ts.status = 'Active'
            ))
          )
      )
  )
);

-- 10. Policies for tuckshop_staff
DROP POLICY IF EXISTS "Select staff" ON tuckshop_staff;
CREATE POLICY "Select staff" ON tuckshop_staff
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND (profiles.role = 'system_admin' OR profiles.school_id = tuckshop_staff.school_id)
  )
);

DROP POLICY IF EXISTS "Manage staff" ON tuckshop_staff;
CREATE POLICY "Manage staff" ON tuckshop_staff
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'system_admin'
        OR (profiles.role IN ('school_admin', 'bursar', 'accounts') AND profiles.school_id = tuckshop_staff.school_id)
      )
  )
);
