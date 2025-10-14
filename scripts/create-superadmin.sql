-- Create a super admin user
-- This script will insert a super admin user with the following credentials:
-- Email: admin@system.com
-- Password: admin123 (hashed)

-- Check if the user already exists
DO $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM staff_users WHERE email = 'admin@system.com') INTO user_exists;
  
  IF NOT user_exists THEN
    -- Insert the super admin user
    -- Note: The password hash is for 'admin123' using bcrypt with 12 rounds
    -- You may want to generate a fresh hash for production use
    INSERT INTO staff_users (
      id, 
      hospital_id, 
      email, 
      password_hash, 
      role, 
      first_name, 
      last_name, 
      phone, 
      is_active
    ) VALUES (
      '00000000-0000-4000-a000-000000000001', -- UUID for super admin
      NULL, -- No school association for super admin
      'admin@system.com',
      '$2b$12$K3JNi5xUQEtGYQTqxEqO2.d9slT3HrjUY1Bf0GXxPGTGSjDlWCVHK', -- Hashed 'admin123'
      'superadmin',
      'System',
      'Administrator',
      '',
      TRUE
    );
    
    RAISE NOTICE 'Super admin user created successfully!';
  ELSE
    RAISE NOTICE 'Super admin user already exists!';
  END IF;
END $$;