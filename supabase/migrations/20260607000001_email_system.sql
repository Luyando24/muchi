-- ─────────────────────────────────────────────────────────────────────────────
-- MUCHI Email System — Database Schema
-- Migration: 20260607000001_email_system.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. SMTP Configuration (single-row settings) ─────────────────────────────
CREATE TABLE IF NOT EXISTS email_smtp_config (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host          text NOT NULL DEFAULT '',
  port          integer NOT NULL DEFAULT 587,
  secure        boolean NOT NULL DEFAULT false,   -- true = TLS/465, false = STARTTLS
  username      text NOT NULL DEFAULT '',
  password      text NOT NULL DEFAULT '',          -- stored as-is; server-side only
  from_name     text NOT NULL DEFAULT 'MUCHI',
  from_email    text NOT NULL DEFAULT '',
  is_active     boolean NOT NULL DEFAULT false,
  last_tested_at timestamptz,
  last_test_status text,                           -- 'success' | 'failed'
  last_test_error  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Ensure only one row ever exists
CREATE UNIQUE INDEX IF NOT EXISTS email_smtp_config_singleton
  ON email_smtp_config ((true));

-- Insert default empty row
INSERT INTO email_smtp_config (host, port, secure, username, password, from_name, from_email, is_active)
VALUES ('', 587, false, '', '', 'MUCHI', '', false)
ON CONFLICT DO NOTHING;

-- ─── 2. Email Templates ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,             -- e.g. 'welcome_student'
  name        text NOT NULL,
  audience    text NOT NULL,                    -- 'student' | 'school_admin' | 'teacher' | 'government' | 'system_admin' | 'parent'
  subject     text NOT NULL DEFAULT '',
  html_body   text NOT NULL DEFAULT '',
  text_body   text NOT NULL DEFAULT '',
  variables   jsonb NOT NULL DEFAULT '[]',      -- array of {name, description, example}
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── 3. Automation Rules ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_automation_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  trigger_event  text NOT NULL,                 -- see trigger event keys
  audience       text NOT NULL,
  template_id    uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  delay_hours    integer NOT NULL DEFAULT 0,    -- 0 = immediate
  conditions     jsonb NOT NULL DEFAULT '{}',   -- optional filter conditions
  is_active      boolean NOT NULL DEFAULT true,
  last_run_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ─── 4. Email Logs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient    text NOT NULL,
  subject      text NOT NULL,
  template_key text,
  rule_id      uuid REFERENCES email_automation_rules(id) ON DELETE SET NULL,
  status       text NOT NULL DEFAULT 'sent',    -- 'sent' | 'failed' | 'test'
  error        text,
  metadata     jsonb DEFAULT '{}',
  sent_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── 5. RLS Policies (service role only — server-side access) ─────────────────
ALTER TABLE email_smtp_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs             ENABLE ROW LEVEL SECURITY;

-- Deny all direct client access; only service_role (server) can read/write
CREATE POLICY "deny_all_smtp_config"      ON email_smtp_config      FOR ALL USING (false);
CREATE POLICY "deny_all_templates"        ON email_templates        FOR ALL USING (false);
CREATE POLICY "deny_all_automation_rules" ON email_automation_rules FOR ALL USING (false);
CREATE POLICY "deny_all_email_logs"       ON email_logs             FOR ALL USING (false);

-- ─── 6. Seed default email templates ────────────────────────────────────────
INSERT INTO email_templates (key, name, audience, subject, html_body, text_body, variables) VALUES

('welcome_student',
 'Welcome – Student',
 'student',
 'Welcome to {{school_name}}, {{student_name}}!',
 '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b">
<div style="background:#115ec3;padding:32px;border-radius:12px 12px 0 0;text-align:center">
  <h1 style="color:white;margin:0;font-size:28px">Welcome to {{school_name}}!</h1>
</div>
<div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
  <p style="font-size:16px">Dear <strong>{{student_name}}</strong>,</p>
  <p>Your student account has been created. You can now access the MUCHI student portal to view your academic results and reports.</p>
  <div style="background:#eff6ff;border-left:4px solid #115ec3;padding:16px;border-radius:4px;margin:20px 0">
    <p style="margin:0"><strong>Student ID:</strong> {{student_number}}</p>
    <p style="margin:8px 0 0"><strong>Class:</strong> {{class_name}}</p>
  </div>
  <a href="{{portal_url}}" style="display:inline-block;background:#115ec3;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">Access Student Portal</a>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 24px">
  <div style="text-align:center;color:#64748b;font-size:12px;line-height:1.6">
    <p style="margin:0 0 8px"><strong>MUCHI Education Analytics Platform</strong></p>
    <p style="margin:0 0 8px">Empowering schools through data and analytics.</p>
    <p style="margin:0">Need help? Contact us at <a href="mailto:info@muchiapp.com" style="color:#115ec3;text-decoration:none">info@muchiapp.com</a></p>
    <p style="margin:8px 0 0">&copy; 2026 MUCHI. All rights reserved.</p>
  </div>
</div></body></html>',
 'Welcome to {{school_name}}, {{student_name}}! Your student account is ready. Student ID: {{student_number}}, Class: {{class_name}}. Visit {{portal_url}} to access the portal.',
 '[{"name":"student_name","description":"Full name of the student","example":"Jane Doe"},{"name":"school_name","description":"Name of the school","example":"MUCHI Academy"},{"name":"student_number","description":"Student ID number","example":"20261234"},{"name":"class_name","description":"Student class","example":"Form 1 A"},{"name":"portal_url","description":"Link to student portal","example":"https://app.muchiapp.com"}]'
),

('welcome_school_admin',
 'Welcome – School Admin',
 'school_admin',
 'Your MUCHI School Account is Ready – {{school_name}}',
 '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b">
<div style="background:#115ec3;padding:32px;border-radius:12px 12px 0 0;text-align:center">
  <h1 style="color:white;margin:0;font-size:24px">{{school_name}}</h1>
  <p style="color:#93c5fd;margin:8px 0 0">School Administrator Account</p>
</div>
<div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
  <p>Hello <strong>{{admin_name}}</strong>,</p>
  <p>Your school has been registered on MUCHI and your administrator account is ready.</p>
  <a href="{{admin_portal_url}}" style="display:inline-block;background:#115ec3;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">Go to Admin Portal</a>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 24px">
  <div style="text-align:center;color:#64748b;font-size:12px;line-height:1.6">
    <p style="margin:0 0 8px"><strong>MUCHI Education Analytics Platform</strong></p>
    <p style="margin:0 0 8px">Empowering schools through data and analytics.</p>
    <p style="margin:0">Need help? Contact us at <a href="mailto:info@muchiapp.com" style="color:#115ec3;text-decoration:none">info@muchiapp.com</a></p>
    <p style="margin:8px 0 0">&copy; 2026 MUCHI. All rights reserved.</p>
  </div>
</div></body></html>',
 'Hello {{admin_name}}, your school {{school_name}} has been registered on MUCHI. Login at {{admin_portal_url}} to complete setup.',
 '[{"name":"admin_name","description":"Administrator full name","example":"John Smith"},{"name":"school_name","description":"Name of the school","example":"MUCHI Academy"},{"name":"admin_portal_url","description":"Link to admin portal","example":"https://app.muchiapp.com"}]'
),

('welcome_teacher',
 'Welcome – Teacher',
 'teacher',
 'Welcome to {{school_name}} – Teacher Account Ready',
 '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b">
<div style="background:#115ec3;padding:32px;border-radius:12px 12px 0 0;text-align:center">
  <h1 style="color:white;margin:0;font-size:24px">Welcome, {{teacher_name}}!</h1>
  <p style="color:#93c5fd;margin:8px 0 0">{{school_name}} — Teacher Portal</p>
</div>
<div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
  <p>Your teacher account has been created. Access the MUCHI Teacher Portal to manage gradebooks and publish results.</p>
  <div style="background:#eff6ff;border-left:4px solid #115ec3;padding:16px;border-radius:4px;margin:20px 0">
    <p style="margin:0"><strong>Staff Number:</strong> {{staff_number}}</p>
  </div>
  <a href="{{teacher_portal_url}}" style="display:inline-block;background:#115ec3;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">Access Teacher Portal</a>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 24px">
  <div style="text-align:center;color:#64748b;font-size:12px;line-height:1.6">
    <p style="margin:0 0 8px"><strong>MUCHI Education Analytics Platform</strong></p>
    <p style="margin:0 0 8px">Empowering schools through data and analytics.</p>
    <p style="margin:0">Need help? Contact us at <a href="mailto:info@muchiapp.com" style="color:#115ec3;text-decoration:none">info@muchiapp.com</a></p>
    <p style="margin:8px 0 0">&copy; 2026 MUCHI. All rights reserved.</p>
  </div>
</div></body></html>',
 'Welcome {{teacher_name}} to {{school_name}}. Your teacher account is ready. Staff Number: {{staff_number}}. Login at {{teacher_portal_url}}.',
 '[{"name":"teacher_name","description":"Teacher full name","example":"Mrs. Banda"},{"name":"school_name","description":"Name of the school","example":"MUCHI Academy"},{"name":"staff_number","description":"Staff ID number","example":"T-0042"},{"name":"teacher_portal_url","description":"Link to teacher portal","example":"https://app.muchiapp.com"}]'
),

('welcome_government',
 'Welcome – Government User',
 'government',
 'MUCHI Government Portal Access Granted',
 '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b">
<div style="background:#115ec3;padding:32px;border-radius:12px 12px 0 0;text-align:center">
  <h1 style="color:white;margin:0;font-size:24px">Government Portal Access</h1>
</div>
<div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
  <p>Dear <strong>{{user_name}}</strong>,</p>
  <p>Your government user account on MUCHI has been activated.</p>
  <a href="{{gov_portal_url}}" style="display:inline-block;background:#115ec3;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">Access Government Portal</a>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 24px">
  <div style="text-align:center;color:#64748b;font-size:12px;line-height:1.6">
    <p style="margin:0 0 8px"><strong>MUCHI Education Analytics Platform</strong></p>
    <p style="margin:0 0 8px">Empowering schools through data and analytics.</p>
    <p style="margin:0">Need help? Contact us at <a href="mailto:info@muchiapp.com" style="color:#115ec3;text-decoration:none">info@muchiapp.com</a></p>
    <p style="margin:8px 0 0">&copy; 2026 MUCHI. All rights reserved.</p>
  </div>
</div></body></html>',
 'Dear {{user_name}}, your MUCHI Government Portal access has been activated. Login at {{gov_portal_url}}.',
 '[{"name":"user_name","description":"Government user full name","example":"Dr. Mwansa"},{"name":"gov_portal_url","description":"Link to government portal","example":"https://app.muchiapp.com/gov"}]'
),

('results_ready_student',
 'Results Published – Student Notification',
 'student',
 'Your {{term}} Results Are Ready – {{school_name}}',
 '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b">
<div style="background:#115ec3;padding:32px;border-radius:12px 12px 0 0;text-align:center">
  <h1 style="color:white;margin:0;font-size:24px">Results Available!</h1>
  <p style="color:#93c5fd;margin:8px 0 0">{{term}} — {{academic_year}}</p>
</div>
<div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
  <p>Dear <strong>{{student_name}}</strong>,</p>
  <p>Your academic results for <strong>{{term}}</strong> have been published by <strong>{{school_name}}</strong>.</p>
  <div style="background:#eff6ff;border-left:4px solid #115ec3;padding:16px;border-radius:4px;margin:20px 0">
    <p style="margin:0"><strong>Overall Average:</strong> {{overall_average}}%</p>
    <p style="margin:8px 0 0"><strong>Grade:</strong> {{overall_grade}}</p>
  </div>
  <a href="{{results_url}}" style="display:inline-block;background:#115ec3;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">View Full Report Card</a>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 24px">
  <div style="text-align:center;color:#64748b;font-size:12px;line-height:1.6">
    <p style="margin:0 0 8px"><strong>MUCHI Education Analytics Platform</strong></p>
    <p style="margin:0 0 8px">Empowering schools through data and analytics.</p>
    <p style="margin:0">Need help? Contact us at <a href="mailto:info@muchiapp.com" style="color:#115ec3;text-decoration:none">info@muchiapp.com</a></p>
    <p style="margin:8px 0 0">&copy; 2026 MUCHI. All rights reserved.</p>
  </div>
</div></body></html>',
 'Dear {{student_name}}, your {{term}} results for {{academic_year}} are now available. Overall Average: {{overall_average}}%. View your report card at {{results_url}}.',
 '[{"name":"student_name","description":"Student full name","example":"Jane Doe"},{"name":"school_name","description":"School name","example":"MUCHI Academy"},{"name":"term","description":"Term name","example":"Term 1"},{"name":"academic_year","description":"Academic year","example":"2026"},{"name":"overall_average","description":"Student overall average percentage","example":"72.5"},{"name":"overall_grade","description":"Overall grade","example":"6"},{"name":"results_url","description":"Link to results/report card","example":"https://app.muchiapp.com/results"}]'
),

('school_setup_reminder',
 'School Setup Incomplete – Reminder',
 'school_admin',
 'Action Required: Complete Your School Setup on MUCHI',
 '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b">
<div style="background:#115ec3;padding:32px;border-radius:12px 12px 0 0;text-align:center">
  <h1 style="color:white;margin:0;font-size:24px">Setup Incomplete</h1>
  <p style="color:#93c5fd;margin:8px 0 0">Your school is not fully configured</p>
</div>
<div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
  <p>Hello <strong>{{admin_name}}</strong>,</p>
  <p>Your school <strong>{{school_name}}</strong> has been registered for {{days_since_registration}} days, but setup is only <strong>{{setup_percentage}}% complete</strong>.</p>
  <div style="background:#eff6ff;border-left:4px solid #115ec3;padding:16px;border-radius:4px;margin:20px 0">
    <p style="margin:0;font-weight:bold;color:#115ec3">Remaining Steps:</p>
    <p style="margin:8px 0 0;color:#1e3a8a">{{remaining_steps}}</p>
  </div>
  <a href="{{admin_portal_url}}" style="display:inline-block;background:#115ec3;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">Complete Setup Now</a>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 24px">
  <div style="text-align:center;color:#64748b;font-size:12px;line-height:1.6">
    <p style="margin:0 0 8px"><strong>MUCHI Education Analytics Platform</strong></p>
    <p style="margin:0 0 8px">Empowering schools through data and analytics.</p>
    <p style="margin:0">Need help? Contact us at <a href="mailto:info@muchiapp.com" style="color:#115ec3;text-decoration:none">info@muchiapp.com</a></p>
    <p style="margin:8px 0 0">&copy; 2026 MUCHI. All rights reserved.</p>
  </div>
</div></body></html>',
 'Hello {{admin_name}}, your school {{school_name}} setup is {{setup_percentage}}% complete. Please complete setup at {{admin_portal_url}}.',
 '[{"name":"admin_name","description":"Admin full name","example":"John Smith"},{"name":"school_name","description":"School name","example":"MUCHI Academy"},{"name":"days_since_registration","description":"Days since school was registered","example":"5"},{"name":"setup_percentage","description":"Setup completion percentage","example":"45"},{"name":"remaining_steps","description":"Description of remaining steps","example":"Add classes, Import students"},{"name":"admin_portal_url","description":"Admin portal URL","example":"https://app.muchiapp.com"}]'
),

('subscription_expiry_warning',
 'Subscription Expiring Soon',
 'school_admin',
 'Your MUCHI Subscription Expires in {{days_remaining}} Days',
 '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b">
<div style="background:#115ec3;padding:32px;border-radius:12px 12px 0 0;text-align:center">
  <h1 style="color:white;margin:0;font-size:24px">Subscription Expiring Soon</h1>
  <p style="color:#93c5fd;margin:8px 0 0">{{days_remaining}} days remaining</p>
</div>
<div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
  <p>Hello <strong>{{admin_name}}</strong>,</p>
  <p>The subscription for <strong>{{school_name}}</strong> ({{plan_name}}) expires on <strong>{{expiry_date}}</strong>.</p>
  <a href="{{renewal_url}}" style="display:inline-block;background:#115ec3;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">Renew Subscription</a>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 24px">
  <div style="text-align:center;color:#64748b;font-size:12px;line-height:1.6">
    <p style="margin:0 0 8px"><strong>MUCHI Education Analytics Platform</strong></p>
    <p style="margin:0 0 8px">Empowering schools through data and analytics.</p>
    <p style="margin:0">Need help? Contact us at <a href="mailto:info@muchiapp.com" style="color:#115ec3;text-decoration:none">info@muchiapp.com</a></p>
    <p style="margin:8px 0 0">&copy; 2026 MUCHI. All rights reserved.</p>
  </div>
</div></body></html>',
 'Hello {{admin_name}}, your MUCHI subscription for {{school_name}} expires on {{expiry_date}} ({{days_remaining}} days). Renew at {{renewal_url}}.',
 '[{"name":"admin_name","description":"Admin full name","example":"John Smith"},{"name":"school_name","description":"School name","example":"MUCHI Academy"},{"name":"plan_name","description":"Subscription plan name","example":"Standard"},{"name":"expiry_date","description":"Expiry date formatted","example":"June 30, 2026"},{"name":"days_remaining","description":"Days until expiry","example":"7"},{"name":"renewal_url","description":"Renewal/billing page URL","example":"https://app.muchiapp.com/billing"}]'
)

ON CONFLICT (key) DO UPDATE SET html_body = EXCLUDED.html_body, text_body = EXCLUDED.text_body, variables = EXCLUDED.variables;
