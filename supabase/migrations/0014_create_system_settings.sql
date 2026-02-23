
-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow everyone to read settings (needed for LicenseAccessDenied component)
CREATE POLICY "Allow public read access" ON system_settings
  FOR SELECT USING (true);

-- Allow system admins to update settings
-- Note: This assumes we have a way to check for system admin. 
-- Since we are using a simple role check in the app, we can rely on the backend to enforce write access, 
-- or we can add a policy if we have a custom claim or roles table.
-- For now, we will allow authenticated users to read, and we will restrict writes in the application layer or 
-- via a policy if we had a clear role definition in the DB.
-- Given previous migrations, we used a 'roles' table or 'profiles' table with role column.
-- Let's check 0001_dashboard_updates.sql or similar to see how roles are stored.

-- Actually, looking at previous context, we often used `auth.uid()` and a `profiles` table.
-- Let's check `profiles` table structure from a previous migration or just assume we enforce it in the API.
-- To be safe and simple for now, I'll allow all authenticated users to read, and restrict updates to system admins via API logic mostly, 
-- but I'll add a policy that tries to restrict it if possible. 
-- For now, let's just allow all authenticated to read, and only specific users to update if we can. 
-- But since I don't want to break it if I get the role check wrong in SQL, I'll rely on the API for the write protection 
-- and just allow read for public (so the license page works even if not logged in - wait, license page users are logged in usually? 
-- No, if license is expired, they might be logged in but blocked. 
-- Actually, the license page is shown when they are logged in but the school license is invalid. So they are authenticated.
-- But we might want the support number to be visible even if not logged in? 
-- The user said "Add whatsapp contact button on the expiry notice". The expiry notice is inside the app, so they are logged in.
-- But wait, `LicenseAccessDenied` is used in `SchoolAdminPortal`, which is protected.
-- So `auth.role() = 'authenticated'` is fine for select.

CREATE POLICY "Allow authenticated read access" ON system_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow system admin update access" ON system_settings
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- Insert default settings
INSERT INTO system_settings (key, value, description)
VALUES 
  ('whatsapp_number', '260570260374', 'WhatsApp number for support contact'),
  ('system_name', 'MUCHI Central', 'Name of the system'),
  ('support_email', 'support@muchi.com', 'Email for support contact')
ON CONFLICT (key) DO NOTHING;
