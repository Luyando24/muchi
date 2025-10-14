-- System Settings Schema for MUCHI Platform
-- This schema handles system-wide configuration, settings, and administrative controls

-- System Configuration Settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(255) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type VARCHAR(50) NOT NULL CHECK (setting_type IN ('string', 'number', 'boolean', 'json', 'encrypted')),
  category VARCHAR(100) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE, -- Whether setting can be accessed by non-admin users
  is_editable BOOLEAN DEFAULT TRUE, -- Whether setting can be modified through UI
  validation_rules JSONB, -- JSON schema for validation
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES staff_users(id),
  updated_by UUID REFERENCES staff_users(id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_public ON system_settings(is_public);

-- System Settings Audit Log
CREATE TABLE IF NOT EXISTS system_settings_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_id UUID NOT NULL REFERENCES system_settings(id) ON DELETE CASCADE,
  setting_key VARCHAR(255) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  action VARCHAR(50) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  changed_by UUID REFERENCES staff_users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_settings_audit_setting ON system_settings_audit(setting_id);
CREATE INDEX IF NOT EXISTS idx_settings_audit_user ON system_settings_audit(changed_by);
CREATE INDEX IF NOT EXISTS idx_settings_audit_date ON system_settings_audit(changed_at DESC);

-- Email Configuration
CREATE TABLE IF NOT EXISTS email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('smtp', 'sendgrid', 'mailgun', 'ses')),
  host VARCHAR(255),
  port INTEGER,
  username VARCHAR(255),
  password_encrypted BYTEA, -- Encrypted password
  use_tls BOOLEAN DEFAULT TRUE,
  use_ssl BOOLEAN DEFAULT FALSE,
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  reply_to VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  test_email VARCHAR(255), -- Email for testing configuration
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification Settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT TRUE,
  template_subject TEXT,
  template_body TEXT,
  template_sms TEXT,
  recipients JSONB, -- JSON array of default recipients
  conditions JSONB, -- JSON conditions for when to send
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System Maintenance Settings
CREATE TABLE IF NOT EXISTS maintenance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_mode BOOLEAN DEFAULT FALSE,
  maintenance_message TEXT,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  allowed_ips JSONB, -- JSON array of IPs allowed during maintenance
  bypass_roles JSONB, -- JSON array of roles that can bypass maintenance
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES staff_users(id)
);

-- Security Settings
CREATE TABLE IF NOT EXISTS security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  password_min_length INTEGER DEFAULT 8,
  password_require_uppercase BOOLEAN DEFAULT TRUE,
  password_require_lowercase BOOLEAN DEFAULT TRUE,
  password_require_numbers BOOLEAN DEFAULT TRUE,
  password_require_symbols BOOLEAN DEFAULT FALSE,
  password_expiry_days INTEGER DEFAULT 90,
  max_login_attempts INTEGER DEFAULT 5,
  lockout_duration_minutes INTEGER DEFAULT 30,
  session_timeout_minutes INTEGER DEFAULT 60,
  two_factor_required BOOLEAN DEFAULT FALSE,
  ip_whitelist JSONB, -- JSON array of allowed IP ranges
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backup Settings
CREATE TABLE IF NOT EXISTS backup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_backup_enabled BOOLEAN DEFAULT TRUE,
  backup_frequency VARCHAR(20) DEFAULT 'daily' CHECK (backup_frequency IN ('hourly', 'daily', 'weekly', 'monthly')),
  backup_time TIME DEFAULT '02:00:00',
  retention_days INTEGER DEFAULT 30,
  backup_location VARCHAR(500),
  encryption_enabled BOOLEAN DEFAULT TRUE,
  notification_emails JSONB, -- JSON array of emails to notify on backup completion/failure
  last_backup_at TIMESTAMPTZ,
  last_backup_status VARCHAR(20) CHECK (last_backup_status IN ('success', 'failed', 'in_progress')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System Logs Configuration
CREATE TABLE IF NOT EXISTS log_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_level VARCHAR(20) DEFAULT 'info' CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'fatal')),
  log_retention_days INTEGER DEFAULT 90,
  log_to_file BOOLEAN DEFAULT TRUE,
  log_to_database BOOLEAN DEFAULT TRUE,
  log_to_external BOOLEAN DEFAULT FALSE,
  external_log_endpoint VARCHAR(500),
  sensitive_data_logging BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_public) VALUES
('app_name', 'MUCHI School Management System', 'string', 'general', 'Application name displayed throughout the system', true),
('app_version', '1.0.0', 'string', 'general', 'Current application version', true),
('timezone', 'Africa/Lusaka', 'string', 'general', 'Default system timezone', false),
('date_format', 'DD/MM/YYYY', 'string', 'general', 'Default date format for display', true),
('currency', 'ZMW', 'string', 'general', 'Default currency code', true),
('language', 'en', 'string', 'general', 'Default system language', true),
('max_file_upload_size', '10485760', 'number', 'files', 'Maximum file upload size in bytes (10MB)', false),
('allowed_file_types', '["jpg", "jpeg", "png", "pdf", "doc", "docx", "xls", "xlsx"]', 'json', 'files', 'Allowed file extensions for uploads', false),
('enable_registration', 'true', 'boolean', 'auth', 'Allow new user registration', false),
('require_email_verification', 'true', 'boolean', 'auth', 'Require email verification for new accounts', false),
('enable_sms_notifications', 'false', 'boolean', 'notifications', 'Enable SMS notifications', false),
('enable_email_notifications', 'true', 'boolean', 'notifications', 'Enable email notifications', false),
('maintenance_mode', 'false', 'boolean', 'system', 'System maintenance mode status', false),
('backup_enabled', 'true', 'boolean', 'backup', 'Enable automatic backups', false),
('debug_mode', 'false', 'boolean', 'system', 'Enable debug mode for development', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default security settings
INSERT INTO security_settings DEFAULT VALUES ON CONFLICT DO NOTHING;

-- Insert default backup settings
INSERT INTO backup_settings DEFAULT VALUES ON CONFLICT DO NOTHING;

-- Insert default log settings
INSERT INTO log_settings DEFAULT VALUES ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all settings tables
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_settings_updated_at BEFORE UPDATE ON email_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_settings_updated_at BEFORE UPDATE ON maintenance_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_security_settings_updated_at BEFORE UPDATE ON security_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_backup_settings_updated_at BEFORE UPDATE ON backup_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_log_settings_updated_at BEFORE UPDATE ON log_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();