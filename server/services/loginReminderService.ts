import { supabaseAdmin } from '../lib/supabase.js';
import { sendEmail } from './emailService.js';

export async function sendInactiveUserLoginReminders() {
  try {
    console.log('[loginReminderService] Starting inactive user login reminders check...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let page = 1;
    const batchSize = 1000;
    let processedCount = 0;
    let sentCount = 0;

    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: batchSize
      });

      if (error) throw error;
      const users = data?.users || [];
      if (users.length === 0) break;

      console.log(`[loginReminderService] Checking batch of ${users.length} users on page ${page}...`);

      for (const user of users) {
        processedCount++;
        const email = user.email;
        if (!email) continue;

        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
        
        // Check if last login was more than 30 days ago
        if (lastSignIn && lastSignIn < thirtyDaysAgo) {
          // Check if we already sent a reminder to this email in the last 30 days
          const { data: recentLogs, error: logError } = await supabaseAdmin
            .from('email_logs')
            .select('id')
            .eq('recipient', email)
            .eq('template_key', 'login_reminder')
            .gte('sent_at', thirtyDaysAgo.toISOString())
            .limit(1);

          if (logError) {
            console.error(`[loginReminderService] Error checking logs for ${email}:`, logError);
            continue;
          }

          if (recentLogs && recentLogs.length > 0) {
            // Already sent recently, skip to avoid spam
            continue;
          }

          // Fetch school details for ICT contact
          const schoolId = user.user_metadata?.school_id;
          let ictName = "Not Configured";
          let ictEmail = "Not Configured";
          let ictPhone = "Not Configured";
          if (schoolId) {
            const { data: school } = await supabaseAdmin
              .from('schools')
              .select('ict_name, ict_email, ict_phone')
              .eq('id', schoolId)
              .maybeSingle();
            
            if (school) {
              ictName = school.ict_name || ictName;
              ictEmail = school.ict_email || ictEmail;
              ictPhone = school.ict_phone || ictPhone;
            }
          }

          // Fetch full name if available in user metadata
          const fullName = user.user_metadata?.full_name || 'User';

          // Send welcome/login reminder email
          console.log(`[loginReminderService] Sending login reminder to ${email}...`);
          const result = await sendEmail({
            to: email,
            subject: `We miss you! Log back into your MUCHI Portal`,
            templateKey: 'login_reminder',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #1e293b;">
                <h2 style="color: #2563eb; margin-bottom: 20px;">We miss you on MUCHI!</h2>
                <p>Hello ${fullName},</p>
                <p>We noticed that you haven't logged into your MUCHI Portal for over 30 days. We wanted to reach out and make sure everything is going well.</p>
                <p>Your portal is active and ready for you. Log back in to catch up on assignments, view grades, track attendance, and stay updated with the latest school announcements.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://app.muchiapp.com/login" target="_blank" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Log In to MUCHI Portal</a>
                </div>
                
                <p style="margin-bottom: 25px;">If you've forgotten your password, you can easily reset it using the "Forgot Password" link on the login page.</p>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 20px 0;">
                  <h4 style="margin-top: 0; color: #475569; font-size: 13px;">School ICT Support Contact:</h4>
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Name:</strong> ${ictName}</p>
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Email:</strong> ${ictEmail}</p>
                  <p style="margin: 4px 0; font-size: 13px;"><strong>Phone:</strong> ${ictPhone}</p>
                </div>
                
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
                <p style="font-size: 12px; color: #64748b; text-align: center;">If you require technical support, please get in touch with your school's ICT support contact listed above or reply to this email.</p>
              </div>
            `,
            text: `Hello ${fullName},\n\nWe noticed that you haven't logged into your MUCHI Portal for over 30 days. Log back in here: https://app.muchiapp.com/login\n\nICT Support Contact Details:\nName: ${ictName}\nEmail: ${ictEmail}\nPhone: ${ictPhone}`
          });

          if (result.success) {
            sentCount++;
          }
        }
      }

      if (users.length < batchSize) break;
      page++;
    }

    console.log(`[loginReminderService] Completed login reminders run. Processed: ${processedCount}, Sent: ${sentCount}.`);
  } catch (err) {
    console.error('[loginReminderService] Error in login reminder job:', err);
  }
}

export function startLoginReminderScheduler() {
  console.log('[loginReminderService] Initializing login reminder scheduler...');

  const CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour

  const runCheck = async () => {
    try {
      const now = new Date();
      // Only run once a day, e.g., at 10:00 AM (hour 10)
      if (now.getHours() !== 10) {
        return;
      }

      // Check if we already sent any login reminder emails today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: sentToday, error } = await supabaseAdmin
        .from('email_logs')
        .select('id')
        .eq('template_key', 'login_reminder')
        .gte('sent_at', todayStart.toISOString())
        .limit(1);

      if (error) {
        console.error('[loginReminderService] Error checking email logs:', error);
        return;
      }

      if (sentToday && sentToday.length > 0) {
        console.log('[loginReminderService] Login reminders already sent today. Skipping.');
        return;
      }

      await sendInactiveUserLoginReminders();
    } catch (checkErr) {
      console.error('[loginReminderService] Error in scheduler loop check:', checkErr);
    }
  };

  // Run check with a slight delay on startup
  setTimeout(() => {
    runCheck();
  }, 20000); // 20s delay on startup

  setInterval(runCheck, CHECK_INTERVAL);
}
