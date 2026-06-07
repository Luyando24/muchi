-- Seed promotion and upgrade thresholds
INSERT INTO system_settings (key, value, updated_at) VALUES 
('gov_promotion_min_tenure', '3', NOW()),
('gov_promotion_min_qualification', 'Bachelor''s Degree', NOW()),
('gov_diploma_upgrade_years_threshold', '5', NOW())
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = EXCLUDED.updated_at;
