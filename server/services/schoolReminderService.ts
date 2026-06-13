import { supabaseAdmin } from '../lib/supabase.js';
import { sendTemplatedEmail } from './emailService.js';

export async function sendSchoolUsageSubscriptionReminders(ruleId?: string) {
  try {
    console.log('[schoolReminderService] Starting school usage & subscription reminders...');

    // 1. Fetch all schools
    const { data: schools, error: schoolsError } = await supabaseAdmin
      .from('schools')
      .select('*');

    if (schoolsError) throw schoolsError;
    if (!schools || schools.length === 0) {
      console.log('[schoolReminderService] No schools found.');
      return;
    }

    console.log(`[schoolReminderService] Processing ${schools.length} schools...`);

    // Resolve the rule ID if not passed, by looking up trigger_event = 'school_usage_subscription_reminder'
    let resolvedRuleId = ruleId;
    if (!resolvedRuleId) {
      const { data: rule } = await supabaseAdmin
        .from('email_automation_rules')
        .select('id')
        .eq('trigger_event', 'school_usage_subscription_reminder')
        .limit(1)
        .maybeSingle();
      if (rule) {
        resolvedRuleId = rule.id;
      }
    }

    for (const school of schools) {
      try {
        // Fetch active license for subscription info
        const { data: license } = await supabaseAdmin
          .from('school_licenses')
          .select('*')
          .eq('school_id', school.id)
          .eq('status', 'active')
          .order('end_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Query counts for usage metrics
        // 1. Students count
        const { count: studentsCount } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id)
          .eq('role', 'student');

        // 2. Teachers count
        const { count: teachersCount } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id)
          .eq('role', 'teacher');

        // 3. Classes count
        const { count: classesCount } = await supabaseAdmin
          .from('classes')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id);

        // 4. Subjects count
        const { count: subjectsCount } = await supabaseAdmin
          .from('subjects')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id);

        // Fetch school admins emails
        const { data: admins } = await supabaseAdmin
          .from('profiles')
          .select('email, full_name')
          .eq('school_id', school.id)
          .eq('role', 'school_admin');

        // Compile unique, valid emails
        const emailsToNotify = new Set<string>();
        if (school.email && school.email.includes('@')) emailsToNotify.add(school.email.trim());
        if (school.contact_email && school.contact_email.includes('@')) emailsToNotify.add(school.contact_email.trim());
        if (school.ict_email && school.ict_email.includes('@')) emailsToNotify.add(school.ict_email.trim());

        if (admins) {
          admins.forEach((admin: any) => {
            if (admin.email && admin.email.includes('@')) {
              emailsToNotify.add(admin.email.trim());
            }
          });
        }

        if (emailsToNotify.size === 0) {
          console.warn(`[schoolReminderService] Skipping ${school.name}: No valid contact or admin emails found.`);
          continue;
        }

        // Calculate subscription remaining days
        let daysRemaining = '';
        let expiryDateStr = '';
        if (license && license.end_date) {
          const endDate = new Date(license.end_date);
          const diffTime = endDate.getTime() - new Date().getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          daysRemaining = String(Math.max(0, diffDays));
          expiryDateStr = endDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }

        const adminName = admins && admins[0]?.full_name 
          ? admins[0].full_name 
          : (school.headteacher_name || 'School Administrator');

        const variables = {
          admin_name: adminName,
          school_name: school.name,
          ict_name: school.ict_name || 'Not Configured',
          ict_email: school.ict_email || 'Not Configured',
          ict_phone: school.ict_phone || 'Not Configured',
          plan_name: license?.plan || school.plan || 'Free Trial',
          subscription_status: license?.status || school.status || 'active',
          expiry_date: expiryDateStr,
          days_remaining: daysRemaining,
          students_count: String(studentsCount || 0),
          teachers_count: String(teachersCount || 0),
          classes_count: String(classesCount || 0),
          subjects_count: String(subjectsCount || 0),
          portal_url: 'https://app.muchiapp.com/admin',
          support_email: 'info@muchiapp.com'
        };

        const recipients = Array.from(emailsToNotify);
        console.log(`[schoolReminderService] Sending usage & subscription summary for ${school.name} to ${recipients.join(', ')}`);

        const result = await sendTemplatedEmail({
          to: recipients,
          templateKey: 'school_usage_subscription_reminder',
          variables,
          ruleId: resolvedRuleId
        });

        if (!result.success) {
          console.error(`[schoolReminderService] Failed to send email for ${school.name}:`, result.error);
        }
      } catch (schoolErr) {
        console.error(`[schoolReminderService] Error processing school ${school.name}:`, schoolErr);
      }
    }

    // Update last_run_at for the automation rule
    if (resolvedRuleId) {
      await supabaseAdmin
        .from('email_automation_rules')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', resolvedRuleId);
    }

    console.log('[schoolReminderService] Completed school usage & subscription reminders.');
  } catch (err) {
    console.error('[schoolReminderService] Error in school reminder service:', err);
  }
}

// Scheduled loop checking
export function startSchoolReminderScheduler() {
  console.log('[schoolReminderService] Initializing weekly school usage & subscription reminder scheduler...');

  const CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour

  const runCheck = async () => {
    try {
      const now = new Date();
      // Only check on Monday (1)
      if (now.getDay() !== 1) {
        return;
      }

      // Check if we already sent the reminder this week (within last 6 days)
      const sixDaysAgo = new Date();
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

      const { data: sentRecently, error } = await supabaseAdmin
        .from('email_logs')
        .select('id')
        .eq('template_key', 'school_usage_subscription_reminder')
        .gte('sent_at', sixDaysAgo.toISOString())
        .limit(1);

      if (error) {
        console.error('[schoolReminderService] Error checking email logs:', error);
        return;
      }

      if (sentRecently && sentRecently.length > 0) {
        console.log('[schoolReminderService] Weekly school reminders already sent recently. Skipping.');
        return;
      }

      // If we got here, it is Monday and we have not sent weekly reminders recently.
      await sendSchoolUsageSubscriptionReminders();
    } catch (checkErr) {
      console.error('[schoolReminderService] Error in scheduler loop check:', checkErr);
    }
  };

  // Run check with a slight delay on startup
  setTimeout(() => {
    runCheck();
  }, 30000); // 30s delay on startup

  setInterval(runCheck, CHECK_INTERVAL);
}
