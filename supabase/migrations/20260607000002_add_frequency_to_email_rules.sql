ALTER TABLE email_automation_rules
ADD COLUMN frequency text NOT NULL DEFAULT 'once';
