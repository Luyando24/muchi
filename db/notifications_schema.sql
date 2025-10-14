-- Notifications Schema for MUCHI Platform
-- This schema handles system-wide notifications for all user types

-- System Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'error')),
  sender_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_system_generated BOOLEAN NOT NULL DEFAULT FALSE,
  is_global BOOLEAN NOT NULL DEFAULT FALSE,
  expiry_date TIMESTAMPTZ,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  category TEXT NOT NULL,
  action_url TEXT,
  action_text TEXT
);

-- User Notifications (for tracking read status per user)
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- School Notifications (for targeting specific schools)
CREATE TABLE IF NOT EXISTS school_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(notification_id, school_id)
);

-- Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'error')),
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification Events (for automatic notifications)
CREATE TABLE IF NOT EXISTS notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_global ON notifications(is_global) WHERE is_global = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_school_notifications_school ON school_notifications(school_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at_column();
CREATE TRIGGER update_notification_events_updated_at BEFORE UPDATE ON notification_events FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at_column();

-- Insert default notification templates
INSERT INTO notification_templates (name, title_template, message_template, type, category)
VALUES 
('subscription_expiring', 'Subscription Expiring Soon', 'Your subscription for {{school_name}} will expire on {{expiry_date}}. Please renew to avoid service interruption.', 'warning', 'subscription'),
('subscription_expired', 'Subscription Expired', 'Your subscription for {{school_name}} has expired. Please renew to restore full access.', 'error', 'subscription'),
('subscription_renewed', 'Subscription Renewed', 'Your subscription for {{school_name}} has been successfully renewed until {{expiry_date}}.', 'success', 'subscription'),
('new_school_registered', 'New School Registration', 'A new school "{{school_name}}" has registered on the platform.', 'info', 'system'),
('system_maintenance', 'Scheduled Maintenance', 'The system will be undergoing maintenance on {{maintenance_date}} from {{start_time}} to {{end_time}}.', 'info', 'system')
ON CONFLICT (name) DO NOTHING;

-- Insert default notification events
INSERT INTO notification_events (event_name, description)
VALUES 
('subscription_expiring_soon', 'Triggered when a school subscription is about to expire (7 days before)'),
('subscription_expired', 'Triggered when a school subscription expires'),
('subscription_renewed', 'Triggered when a school subscription is renewed'),
('new_school_registered', 'Triggered when a new school registers on the platform'),
('system_maintenance_scheduled', 'Triggered when system maintenance is scheduled')
ON CONFLICT (event_name) DO NOTHING;