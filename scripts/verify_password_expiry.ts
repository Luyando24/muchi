
/**
 * Verification Script: Password Expiry Logic
 * This script simulates the logic in Login.tsx to verify that teachers 
 * are no longer blocked by the 72h password expiry limit.
 */

interface Profile {
  role: string;
  is_temp_password: boolean;
  temp_password_expires_at: string;
}

function checkPasswordExpiry(profile: Profile): { success: boolean; error?: string } {
  if (profile.is_temp_password) {
    const expiresAt = new Date(profile.temp_password_expires_at);
    const now = new Date();

    // The logic from Login.tsx:
    // if (now > expiresAt && profile.role !== 'teacher') {
    if (now > expiresAt && profile.role !== 'teacher') {
      return { 
        success: false, 
        error: "Your temporary password has expired (72h limit). Please contact your administrator to reset it." 
      };
    }
    return { success: true, message: "Use temporary password (Login Allowed)" } as any;
  }
  return { success: true };
}

// Test Cases
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

console.log("--- Running Password Expiry Tests ---");

// Case 1: Teacher with expired password (7 days ago)
const expiredTeacher: Profile = {
  role: 'teacher',
  is_temp_password: true,
  temp_password_expires_at: lastWeek
};
const teacherResult = checkPasswordExpiry(expiredTeacher);
console.log(`Test 1 (Expired Teacher): ${teacherResult.success ? "PASSED (Login allowed)" : "FAILED (" + teacherResult.error + ")"}`);

// Case 2: Student with expired password (7 days ago)
const expiredStudent: Profile = {
  role: 'student',
  is_temp_password: true,
  temp_password_expires_at: lastWeek
};
const studentResult = checkPasswordExpiry(expiredStudent);
console.log(`Test 2 (Expired Student): ${!studentResult.success ? "PASSED (Login blocked as expected)" : "FAILED (Login allowed for expired student!!)"}`);
if (!studentResult.success) console.log(`   Error: ${studentResult.error}`);

// Case 3: Student with valid password (expires in 7 days)
const validStudent: Profile = {
  role: 'student',
  is_temp_password: true,
  temp_password_expires_at: nextWeek
};
const validStudentResult = checkPasswordExpiry(validStudent);
console.log(`Test 3 (Valid Student): ${validStudentResult.success ? "PASSED (Login allowed)" : "FAILED (" + validStudentResult.error + ")"}`);

// Case 4: Admin with expired password
const expiredAdmin: Profile = {
  role: 'school_admin',
  is_temp_password: true,
  temp_password_expires_at: lastWeek
};
const adminResult = checkPasswordExpiry(expiredAdmin);
console.log(`Test 4 (Expired Admin): ${!adminResult.success ? "PASSED (Login blocked as expected)" : "FAILED (Login allowed for expired admin!!)"}`);

console.log("--- Tests Completed ---");
