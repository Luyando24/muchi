import { supabaseAdmin } from '../lib/supabase.js';
import { notifySystemAdmins } from './emailService.js';

// Calculate settings completion percentage
function calculateCompletion(schoolObj: any) {
  if (!schoolObj) return 0;
  const fields = [
    "name", "school_type", "academic_year", "current_term", "email", "phone",
    "province", "district", "logo_url", "headteacher_name", "signature_url",
    "ict_name", "ict_email", "ict_phone", "boarding_status", "gender_composition"
  ];
  let filledCount = 0;
  fields.forEach(key => {
    const value = schoolObj[key];
    if (value && typeof value === 'string' && value.trim() !== '') {
      filledCount++;
    }
  });
  return fields.length > 0 ? Math.round((filledCount / fields.length) * 100) : 100;
}

// Main check function
export async function checkIncompleteSchoolOnboardings() {
  try {
    console.log('[onboardingReminderService] Starting bi-weekly school onboarding status check...');

    // 1. Check if custom system notification emails are set in email_smtp_config
    const { data: smtpConfig } = await supabaseAdmin
      .from('email_smtp_config')
      .select('notification_emails')
      .limit(1)
      .single();

    if (!smtpConfig?.notification_emails || !smtpConfig.notification_emails.trim()) {
      console.log('[onboardingReminderService] System notification emails are not set. Skipping onboarding checks.');
      return;
    }

    // 2. Fetch all schools created at least 5 days ago
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const { data: schools, error: schoolsError } = await supabaseAdmin
      .from('schools')
      .select('*')
      .lte('created_at', fiveDaysAgo.toISOString());

    if (schoolsError) throw schoolsError;
    if (!schools || schools.length === 0) {
      console.log('[onboardingReminderService] No schools registered 5+ days ago.');
      return;
    }

    const schoolIds = schools.map(s => s.id);

    // --- BULK QUERIES FOR PERFORMANCE OPTIMIZATION ---
    // Fetch all classes for these schools in a single query
    const { data: allClasses, error: classesError } = await supabaseAdmin
      .from('classes')
      .select('id, school_id')
      .in('school_id', schoolIds);

    if (classesError) throw classesError;

    // Fetch all subjects for these schools in a single query
    const { data: allSubjects, error: subjectsError } = await supabaseAdmin
      .from('subjects')
      .select('id, school_id')
      .in('school_id', schoolIds);

    if (subjectsError) throw subjectsError;

    // Map class IDs to schools and get all class IDs
    const classIdToSchoolId: Record<string, string> = {};
    const allClassIds: string[] = [];
    const schoolClassesMap: Record<string, string[]> = {};

    schoolIds.forEach(id => {
      schoolClassesMap[id] = [];
    });

    if (allClasses) {
      allClasses.forEach(cls => {
        classIdToSchoolId[cls.id] = cls.school_id;
        allClassIds.push(cls.id);
        if (schoolClassesMap[cls.school_id]) {
          schoolClassesMap[cls.school_id].push(cls.id);
        }
      });
    }

    // Fetch all class subjects allocations for all relevant classes in a single query
    let allAllocations: any[] = [];
    if (allClassIds.length > 0) {
      const { data: allocationsData, error: allocationsError } = await supabaseAdmin
        .from('class_subjects')
        .select('id, class_id')
        .in('class_id', allClassIds);
      
      if (allocationsError) throw allocationsError;
      allAllocations = allocationsData || [];
    }

    // Map allocations count to schools
    const schoolAllocationsCountMap: Record<string, number> = {};
    schoolIds.forEach(id => {
      schoolAllocationsCountMap[id] = 0;
    });

    allAllocations.forEach(alloc => {
      const schoolId = classIdToSchoolId[alloc.class_id];
      if (schoolId && schoolAllocationsCountMap[schoolId] !== undefined) {
        schoolAllocationsCountMap[schoolId]++;
      }
    });

    // Map subjects count to schools
    const schoolSubjectsCountMap: Record<string, number> = {};
    schoolIds.forEach(id => {
      schoolSubjectsCountMap[id] = 0;
    });
    if (allSubjects) {
      allSubjects.forEach(sub => {
        if (schoolSubjectsCountMap[sub.school_id] !== undefined) {
          schoolSubjectsCountMap[sub.school_id]++;
        }
      });
    }

    // Process all metrics in-memory
    const incompleteSchools: any[] = [];

    for (const school of schools) {
      // A. Calculate profile settings completion
      const profilePercent = calculateCompletion(school);
      const isProfileComplete = profilePercent >= 90;

      // B. Retrieve counts from our pre-mapped objects
      const classesCount = schoolClassesMap[school.id]?.length || 0;
      const subjectsCount = schoolSubjectsCountMap[school.id] || 0;
      const allocationsCount = schoolAllocationsCountMap[school.id] || 0;

      const isDataUploadComplete = classesCount >= 5 && subjectsCount >= 5 && allocationsCount >= 10;

      if (!isProfileComplete || !isDataUploadComplete) {
        // Calculate days since registration
        const regDate = new Date(school.created_at);
        const diffTime = Math.abs(new Date().getTime() - regDate.getTime());
        const daysSinceReg = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        incompleteSchools.push({
          name: school.name,
          createdAt: school.created_at,
          daysSinceReg,
          profilePercent,
          classesCount,
          subjectsCount,
          allocationsCount,
          reasons: [
            !isProfileComplete ? `Profile incomplete (${profilePercent}%)` : null,
            !isDataUploadComplete ? `Data upload incomplete (Classes: ${classesCount}/5, Subjects: ${subjectsCount}/5, Allocations: ${allocationsCount}/10)` : null
          ].filter(Boolean)
        });
      }
    }

    if (incompleteSchools.length === 0) {
      console.log('[onboardingReminderService] All schools registered 5+ days ago have completed onboarding.');
      return;
    }

    console.log(`[onboardingReminderService] Found ${incompleteSchools.length} schools with incomplete onboarding. Sending alert...`);

    // 3. Build email content
    const subject = `⚠️ [MUCHI Onboarding] Bi-weekly Reminder: Incomplete School Setup Profiles`;
    
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 700px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="background: #e11d48; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 22px;">⚠️ Incomplete School Onboarding Reminder</h2>
          <p style="margin: 4px 0 0; opacity: 0.9;">Schools registered 5+ days ago that have not completed profile or data setup</p>
        </div>
        <div style="padding: 20px; font-size: 14px; line-height: 1.6;">
          <p>Dear System Admin,</p>
          <p>The following schools have been registered on the platform for 5 or more days but have not yet completed their onboarding setup (requires profile settings completion &ge; 90% and data upload of &ge; 5 classes, &ge; 5 subjects, and &ge; 10 allocations):</p>
          
          <div style="margin-top: 20px;">
    `;

    incompleteSchools.forEach((s) => {
      htmlContent += `
        <div style="padding: 16px; border: 1px solid #fda4af; border-left: 5px solid #e11d48; border-radius: 6px; background: #fff5f5; margin-bottom: 16px;">
          <h4 style="margin: 0 0 8px; font-size: 16px; color: #9f1239;">${s.name}</h4>
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <tr><td style="padding: 4px 0; font-weight: bold; width: 150px; color: #475569;">Registered:</td><td style="color: #0f172a;">${new Date(s.createdAt).toLocaleDateString()} (${s.daysSinceReg} days ago)</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold; color: #475569;">Profile Progress:</td><td style="color: #0f172a;">${s.profilePercent}%</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold; color: #475569;">Data Setup:</td><td style="color: #0f172a;">Classes: ${s.classesCount}/5 | Subjects: ${s.subjectsCount}/5 | Allocations: ${s.allocationsCount}/10</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold; vertical-align: top; color: #475569;">Incomplete Areas:</td><td style="color: #be123c; font-weight: 500;">${s.reasons.join(' & ')}</td></tr>
          </table>
        </div>
      `;
    });

    htmlContent += `
          </div>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <div style="text-align: center; color: #64748b; font-size: 11px;">
          Sent automatically by MUCHI Onboarding Monitor.
        </div>
      </div>
    `;

    const textContent = `Incomplete School Onboarding Reminder\n\nThe following schools have been registered 5+ days ago but have not completed setup:\n\n` + 
      incompleteSchools.map(s => `- ${s.name}: Registered ${s.daysSinceReg} days ago. Progress: ${s.profilePercent}%. Incomplete: ${s.reasons.join(', ')}`).join('\n');

    await notifySystemAdmins(subject, htmlContent, textContent, 'onboarding_reminder');
  } catch (err) {
    console.error('[onboardingReminderService] Error in onboarding reminder job:', err);
  }
}

// Scheduled loop: check every hour
export function startOnboardingCheckScheduler() {
  console.log('[onboardingReminderService] Initializing onboarding reminder scheduler...');

  // Set up checking interval: check every hour
  const CHECK_INTERVAL = 60 * 60 * 1000;

  // Run the checker
  const runCheck = async () => {
    try {
      const now = new Date();
      const day = now.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday

      // Only check on Tuesday (2) and Friday (5)
      if (day !== 2 && day !== 5) {
        return;
      }

      // Check if we already sent an email today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: sentToday, error } = await supabaseAdmin
        .from('email_logs')
        .select('id')
        .eq('template_key', 'onboarding_reminder')
        .gte('sent_at', todayStart.toISOString())
        .limit(1);

      if (error) {
        console.error('[onboardingReminderService] Error checking email logs:', error);
        return;
      }

      if (sentToday && sentToday.length > 0) {
        console.log('[onboardingReminderService] Onboarding reminders already sent today. Skipping.');
        return;
      }

      // If we got here, it's Tuesday or Friday and we haven't sent reminders today yet.
      await checkIncompleteSchoolOnboardings();
    } catch (checkErr) {
      console.error('[onboardingReminderService] Error in scheduler loop check:', checkErr);
    }
  };

  // Run check with a slight delay on startup
  setTimeout(() => {
    runCheck();
  }, 15000); // 15s delay on startup to let DB/services settle

  setInterval(runCheck, CHECK_INTERVAL);
}
