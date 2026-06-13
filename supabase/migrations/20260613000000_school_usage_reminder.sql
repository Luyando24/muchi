-- ─────────────────────────────────────────────────────────────────────────────
-- MUCHI Email System — School Usage & Subscription Reminder Template and Rule
-- Migration: 20260613000000_school_usage_reminder.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Insert/Update the email template
INSERT INTO email_templates (key, name, audience, subject, html_body, text_body, variables)
VALUES (
  'school_usage_subscription_reminder',
  'School System Usage & Subscription Summary',
  'school_admin',
  'MUCHI Platform: System Usage and Subscription Summary for {{school_name}}',
  '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b"><div style="background:#115ec3;padding:32px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:white;margin:0;font-size:24px">{{school_name}}</h1><p style="color:#93c5fd;margin:8px 0 0">System Usage & Subscription Summary</p></div><div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0"><p>Hello <strong>{{admin_name}}</strong>,</p><p>Here is your regular summary of your school''s system usage, subscription status, and registered IT support contact details on the MUCHI Education Analytics Platform.</p><div style="background:#eff6ff;border-left:4px solid #115ec3;padding:16px;border-radius:4px;margin:20px 0"><h3 style="margin:0 0 8px;color:#115ec3;font-size:16px">🛠️ IT Support Contact Details</h3><p style="margin:4px 0"><strong>Name:</strong> {{ict_name}}</p><p style="margin:4px 0"><strong>Email:</strong> {{ict_email}}</p><p style="margin:4px 0"><strong>Phone:</strong> {{ict_phone}}</p></div><div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:16px;border-radius:4px;margin:20px 0"><h3 style="margin:0 0 8px;color:#16a34a;font-size:16px">💳 Subscription Details</h3><p style="margin:4px 0"><strong>Plan:</strong> {{plan_name}}</p><p style="margin:4px 0"><strong>Status:</strong> <span style="text-transform: capitalize;">{{subscription_status}}</span></p>{{#if expiry_date}}<p style="margin:4px 0"><strong>Expiry Date:</strong> {{expiry_date}} ({{days_remaining}} days remaining)</p>{{else}}<p style="margin:4px 0"><strong>Expiry Date:</strong> N/A</p>{{/if}}</div><div style="background:#fff7ed;border-left:4px solid #ea580c;padding:16px;border-radius:4px;margin:20px 0"><h3 style="margin:0 0 8px;color:#ea580c;font-size:16px">📊 System Usage Metrics</h3><p style="margin:4px 0"><strong>Registered Students:</strong> {{students_count}}</p><p style="margin:4px 0"><strong>Registered Teachers:</strong> {{teachers_count}}</p><p style="margin:4px 0"><strong>Active Classes:</strong> {{classes_count}}</p><p style="margin:4px 0"><strong>Active Subjects:</strong> {{subjects_count}}</p></div><a href="{{portal_url}}" style="display:inline-block;background:#115ec3;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">Go to Admin Portal</a><hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 24px"><div style="text-align:center;color:#64748b;font-size:12px;line-height:1.6"><p style="margin:0 0 8px"><strong>MUCHI Education Analytics Platform</strong></p><p style="margin:0 0 8px">Empowering schools through data and analytics.</p><p style="margin:0">Need help? Contact us at <a href="mailto:{{support_email}}" style="color:#115ec3;text-decoration:none">{{support_email}}</a></p><p style="margin:8px 0 0">&copy; 2026 MUCHI. All rights reserved.</p></div></div></body></html>',
  'Hello {{admin_name}},\n\nHere is your regular summary of {{school_name}}''s system usage, subscription status, and registered IT support contact details on the MUCHI Education Analytics Platform.\n\n🛠️ IT Support Contact Details:\n- Name: {{ict_name}}\n- Email: {{ict_email}}\n- Phone: {{ict_phone}}\n\n💳 Subscription Details:\n- Plan: {{plan_name}}\n- Status: {{subscription_status}}\n- Expiry: {{expiry_date}} ({{days_remaining}} days remaining)\n\n📊 System Usage Metrics:\n- Registered Students: {{students_count}}\n- Registered Teachers: {{teachers_count}}\n- Active Classes: {{classes_count}}\n- Active Subjects: {{subjects_count}}\n\nAccess your portal at: {{portal_url}}\n\nBest regards,\nMUCHI Support ({{support_email}})',
  '[{"name":"admin_name","description":"School Admin Name","example":"John Smith"},{"name":"school_name","description":"School Name","example":"MUCHI Academy"},{"name":"ict_name","description":"ICT Support Name","example":"ICT Support"},{"name":"ict_email","description":"ICT Support Email","example":"ict@school.com"},{"name":"ict_phone","description":"ICT Support Phone","example":"+260977123456"},{"name":"plan_name","description":"Subscription Plan Name","example":"Standard"},{"name":"subscription_status","description":"Subscription Status","example":"active"},{"name":"expiry_date","description":"License Expiry Date","example":"June 30, 2026"},{"name":"days_remaining","description":"Days until subscription expires","example":"30"},{"name":"students_count","description":"Total Students","example":"150"},{"name":"teachers_count","description":"Total Teachers","example":"12"},{"name":"classes_count","description":"Total Classes","example":"6"},{"name":"subjects_count","description":"Total Subjects","example":"10"},{"name":"portal_url","description":"Portal URL","example":"https://app.muchiapp.com"},{"name":"support_email","description":"Support Email","example":"info@muchiapp.com"}]'
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  audience = EXCLUDED.audience,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  updated_at = now();

-- 2. Insert the automation rule if it doesn't exist
INSERT INTO email_automation_rules (name, trigger_event, audience, template_id, delay_hours, conditions, is_active, frequency)
SELECT 
  'School Usage & Subscription Summary Reminder',
  'school_usage_subscription_reminder',
  'school_admin',
  id,
  0,
  '{}'::jsonb,
  true,
  'weekly'
FROM email_templates
WHERE key = 'school_usage_subscription_reminder'
AND NOT EXISTS (
  SELECT 1 FROM email_automation_rules WHERE trigger_event = 'school_usage_subscription_reminder'
);
