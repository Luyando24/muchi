-- ─────────────────────────────────────────────────────────────────────────────
-- Seed Public Contact Details into system_settings
-- Migration: 20260610000000_public_contact_settings.sql
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO system_settings (key, value, description)
VALUES 
  ('contact_phone', '+260 97 1234567', 'Public contact phone number'),
  ('contact_email', 'info@muchi.edu.zm', 'Public contact email address'),
  ('contact_office', '45 Independence Avenue' || chr(10) || 'Lusaka' || chr(10) || 'Zambia', 'Public office address')
ON CONFLICT (key) DO NOTHING;
