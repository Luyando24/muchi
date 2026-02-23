
-- Add remaining system settings
INSERT INTO system_settings (key, value, description)
VALUES 
  ('maintenance_mode', 'false', 'System maintenance mode'),
  ('registration_open', 'true', 'Allow new registrations'),
  ('default_language', 'en', 'Default system language'),
  ('session_timeout', '60', 'Session timeout in minutes')
ON CONFLICT (key) DO NOTHING;
