-- Migration to add student accommodation and boarding management features

-- 1. Alter schools table
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS boarding_status TEXT CHECK (boarding_status IN ('Day', 'Boarding', 'Both')) DEFAULT 'Day',
ADD COLUMN IF NOT EXISTS gender_composition TEXT CHECK (gender_composition IN ('Co-educational', 'Boys only', 'Girls only')) DEFAULT 'Co-educational';

-- 2. Alter profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS boarding_type TEXT CHECK (boarding_type IN ('Day', 'Boarder')) DEFAULT 'Day';

-- 3. Create accommodation_blocks table
CREATE TABLE IF NOT EXISTS accommodation_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gender_policy TEXT CHECK (gender_policy IN ('Male', 'Female', 'Mixed')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create accommodation_rooms table
CREATE TABLE IF NOT EXISTS accommodation_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_id UUID REFERENCES accommodation_blocks(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create accommodation_allocations table
CREATE TABLE IF NOT EXISTS accommodation_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES accommodation_rooms(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  check_in_date DATE DEFAULT CURRENT_DATE,
  status TEXT CHECK (status IN ('Active', 'Vacated')) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, academic_year, status)
);

-- 6. Create accommodation_applications table
CREATE TABLE IF NOT EXISTS accommodation_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  preferred_block_id UUID REFERENCES accommodation_blocks(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Waitlisted')) DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE accommodation_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodation_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodation_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodation_applications ENABLE ROW LEVEL SECURITY;

-- 7. Policies for accommodation_blocks
DROP POLICY IF EXISTS "Select blocks" ON accommodation_blocks;
CREATE POLICY "Select blocks" ON accommodation_blocks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'system_admin'
        OR profiles.role = 'government'
        OR profiles.secondary_role = 'government'
        OR profiles.school_id = accommodation_blocks.school_id
      )
  )
);

DROP POLICY IF EXISTS "Manage blocks" ON accommodation_blocks;
CREATE POLICY "Manage blocks" ON accommodation_blocks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'system_admin'
        OR (profiles.role = 'school_admin' AND profiles.school_id = accommodation_blocks.school_id)
      )
  )
);

-- 8. Policies for accommodation_rooms
DROP POLICY IF EXISTS "Select rooms" ON accommodation_rooms;
CREATE POLICY "Select rooms" ON accommodation_rooms
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'system_admin'
        OR profiles.role = 'government'
        OR profiles.secondary_role = 'government'
        OR profiles.school_id = (SELECT school_id FROM accommodation_blocks WHERE id = accommodation_rooms.block_id)
      )
  )
);

DROP POLICY IF EXISTS "Manage rooms" ON accommodation_rooms;
CREATE POLICY "Manage rooms" ON accommodation_rooms
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'system_admin'
        OR (profiles.role = 'school_admin' AND profiles.school_id = (SELECT school_id FROM accommodation_blocks WHERE id = accommodation_rooms.block_id))
      )
  )
);

-- 9. Policies for accommodation_allocations
DROP POLICY IF EXISTS "Select allocations" ON accommodation_allocations;
CREATE POLICY "Select allocations" ON accommodation_allocations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'system_admin'
        OR profiles.role = 'government'
        OR profiles.secondary_role = 'government'
        OR profiles.id = accommodation_allocations.student_id
        OR profiles.school_id = (
          SELECT school_id FROM accommodation_blocks b
          JOIN accommodation_rooms r ON r.block_id = b.id
          WHERE r.id = accommodation_allocations.room_id
        )
      )
  )
);

DROP POLICY IF EXISTS "Manage allocations" ON accommodation_allocations;
CREATE POLICY "Manage allocations" ON accommodation_allocations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'system_admin'
        OR (
          profiles.role = 'school_admin'
          AND profiles.school_id = (
            SELECT school_id FROM accommodation_blocks b
            JOIN accommodation_rooms r ON r.block_id = b.id
            WHERE r.id = accommodation_allocations.room_id
          )
        )
      )
  )
);

-- 10. Policies for accommodation_applications
DROP POLICY IF EXISTS "Select applications" ON accommodation_applications;
CREATE POLICY "Select applications" ON accommodation_applications
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'system_admin'
        OR profiles.role = 'government'
        OR profiles.secondary_role = 'government'
        OR profiles.id = accommodation_applications.student_id
        OR profiles.school_id = accommodation_applications.school_id
      )
  )
);

DROP POLICY IF EXISTS "Insert applications" ON accommodation_applications;
CREATE POLICY "Insert applications" ON accommodation_applications
FOR INSERT WITH CHECK (
  auth.uid() = student_id
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.school_id = accommodation_applications.school_id
  )
);

DROP POLICY IF EXISTS "Update applications" ON accommodation_applications;
CREATE POLICY "Update applications" ON accommodation_applications
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'system_admin'
        OR (profiles.role = 'school_admin' AND profiles.school_id = accommodation_applications.school_id)
      )
  )
);
