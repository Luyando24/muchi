import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { supabaseAdmin } from '../lib/supabase.js';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from_name: string;
  from_email: string;
  is_active: boolean;
  notification_emails?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  templateKey?: string;
  ruleId?: string;
  metadata?: Record<string, any>;
}

// ─── Fetch SMTP config from DB ────────────────────────────────────────────────
export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const { data, error } = await supabaseAdmin
    .from('email_smtp_config')
    .select('*')
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as SmtpConfig;
}

// ─── Build a nodemailer transporter from DB config ────────────────────────────
export async function getTransport() {
  const config = await getSmtpConfig();

  if (!config || !config.is_active || !config.host || !config.username) {
    throw new Error('SMTP is not configured or not active. Please configure SMTP settings in System Admin → Email Settings.');
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,   // true for port 465 (TLS), false for STARTTLS
    auth: {
      user: config.username,
      pass: config.password,
    },
    tls: {
      // Allow self-signed certs in dev; remove in strict prod
      rejectUnauthorized: false,
    },
  });

  return { transporter, config };
}

// ─── Render a Handlebars template ─────────────────────────────────────────────
export function renderTemplate(templateStr: string, variables: Record<string, any>): string {
  try {
    const compiled = Handlebars.compile(templateStr, { noEscape: false });
    return compiled(variables);
  } catch (err) {
    console.error('[emailService] Template render error:', err);
    return templateStr; // Fallback to raw string
  }
}

// ─── Core send function ───────────────────────────────────────────────────────
export async function sendEmail(opts: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { transporter, config } = await getTransport();

    const toAddresses = Array.isArray(opts.to) ? opts.to.join(', ') : opts.to;

    const info = await transporter.sendMail({
      from: `"${config.from_name}" <${config.from_email}>`,
      to: toAddresses,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });

    // Log success
    await logEmail({
      recipient: toAddresses,
      subject: opts.subject,
      templateKey: opts.templateKey,
      ruleId: opts.ruleId,
      status: 'sent',
      metadata: opts.metadata,
    });

    console.log(`[emailService] Email sent to ${toAddresses}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (err: any) {
    const errorMsg = err?.message || 'Unknown email error';
    console.error('[emailService] Send failed:', errorMsg);

    // Log failure
    await logEmail({
      recipient: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
      subject: opts.subject,
      templateKey: opts.templateKey,
      ruleId: opts.ruleId,
      status: 'failed',
      error: errorMsg,
      metadata: opts.metadata,
    });

    return { success: false, error: errorMsg };
  }
}

// ─── Send using a saved template ─────────────────────────────────────────────
export async function sendTemplatedEmail(opts: {
  to: string | string[];
  templateKey: string;
  variables: Record<string, any>;
  ruleId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { data: template, error } = await supabaseAdmin
    .from('email_templates')
    .select('*')
    .eq('key', opts.templateKey)
    .eq('is_active', true)
    .single();

  if (error || !template) {
    return { success: false, error: `Template '${opts.templateKey}' not found or inactive.` };
  }

  const subject = renderTemplate(template.subject, opts.variables);
  const html = renderTemplate(template.html_body, opts.variables);
  const text = renderTemplate(template.text_body, opts.variables);

  return sendEmail({
    to: opts.to,
    subject,
    html,
    text,
    templateKey: opts.templateKey,
    ruleId: opts.ruleId,
    metadata: opts.variables,
  });
}

// ─── Test SMTP connection (sends a test email) ────────────────────────────────
export async function testSmtpConnection(targetEmail: string): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const { transporter, config } = await getTransport();

    // First verify the connection
    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"${config.from_name}" <${config.from_email}>`,
      to: targetEmail,
      subject: '✅ MUCHI SMTP Test — Connection Successful',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;color:#1e293b">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px">
            <h2 style="color:#166534;margin:0 0 12px">✅ SMTP Configuration Working</h2>
            <p style="margin:0;color:#15803d">Your MUCHI email system is correctly configured and can send emails.</p>
          </div>
          <div style="margin-top:20px;font-size:13px;color:#64748b">
            <p><strong>Host:</strong> ${config.host}:${config.port}</p>
            <p><strong>From:</strong> ${config.from_name} &lt;${config.from_email}&gt;</p>
            <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
          </div>
        </div>
      `,
      text: `MUCHI SMTP Test — Connection Successful. Host: ${config.host}:${config.port}. Sent at: ${new Date().toISOString()}`,
    });

    // Update last test status in DB
    await supabaseAdmin
      .from('email_smtp_config')
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_status: 'success',
        last_test_error: null,
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // update the singleton row

    await logEmail({
      recipient: targetEmail,
      subject: '✅ MUCHI SMTP Test',
      templateKey: 'smtp_test',
      status: 'test',
    });

    return { success: true, messageId: info.messageId };

  } catch (err: any) {
    const errorMsg = err?.message || 'SMTP test failed';

    // Update failure status
    await supabaseAdmin
      .from('email_smtp_config')
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_status: 'failed',
        last_test_error: errorMsg,
      })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    return { success: false, error: errorMsg };
  }
}

// ─── Internal: log email to DB ────────────────────────────────────────────────
async function logEmail(opts: {
  recipient: string;
  subject: string;
  templateKey?: string;
  ruleId?: string;
  status: 'sent' | 'failed' | 'test';
  error?: string;
  metadata?: Record<string, any>;
}) {
  try {
    await supabaseAdmin.from('email_logs').insert({
      recipient: opts.recipient,
      subject: opts.subject,
      template_key: opts.templateKey || null,
      rule_id: opts.ruleId || null,
      status: opts.status,
      error: opts.error || null,
      metadata: opts.metadata || {},
    });
  } catch (err) {
    // Non-critical, don't throw
    console.error('[emailService] Failed to log email:', err);
  }
}

// ─── Notify all System Admins ────────────────────────────────────────────────
export async function notifySystemAdmins(subject: string, html: string, text: string, templateKey?: string): Promise<{ success: boolean; count: number }> {
  try {
    const { data: admins, error } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('role', 'system_admin');

    if (error) throw error;

    const adminEmails = admins
      ?.map((a: any) => a.email?.trim())
      .filter((email: any) => email && email.includes('@') && email.includes('.')) || [];

    // Also fetch custom notification emails from SMTP settings
    let customEmails: string[] = [];
    try {
      const { data: smtpConfig } = await supabaseAdmin
        .from('email_smtp_config')
        .select('notification_emails')
        .limit(1)
        .single();
      
      if (smtpConfig?.notification_emails) {
        customEmails = smtpConfig.notification_emails
          .split(',')
          .map((e: string) => e.trim())
          .filter((e: string) => e && e.includes('@') && e.includes('.'));
      }
    } catch (smtpErr) {
      console.error('[emailService] Failed to fetch custom notification emails:', smtpErr);
    }

    // Merge and de-duplicate emails
    const allEmails = Array.from(new Set([...adminEmails, ...customEmails]));

    if (allEmails.length === 0) {
      console.log('[emailService] No system admins or custom notification emails found to notify.');
      return { success: false, count: 0 };
    }

    console.log(`[emailService] Sending system admin notifications to: ${allEmails.join(', ')}`);

    // Send to all admins in parallel
    await Promise.allSettled(
      allEmails.map((email: string) => 
        sendEmail({
          to: email,
          subject,
          html,
          text,
          templateKey,
        })
      )
    );

    return { success: true, count: allEmails.length };
  } catch (err) {
    console.error('[emailService] Failed to notify system admins:', err);
    return { success: false, count: 0 };
  }
}
