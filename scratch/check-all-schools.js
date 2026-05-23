import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAll() {
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  console.log("Current time:", new Date().toISOString());
  console.log("5 days ago limit:", fiveDaysAgo.toISOString());

  // Fetch all schools
  const { data: schools, error } = await supabaseAdmin
    .from('schools')
    .select('id, name, created_at');

  if (error) {
    console.error("Error:", error);
    return;
  }

  // Fetch all profiles to count
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('school_id, role')
    .in('role', ['student', 'teacher']);

  const studentCount = {};
  const teacherCount = {};

  profiles.forEach(p => {
    if (!p.school_id) return;
    if (p.role === 'student') studentCount[p.school_id] = (studentCount[p.school_id] || 0) + 1;
    if (p.role === 'teacher') teacherCount[p.school_id] = (teacherCount[p.school_id] || 0) + 1;
  });

  const flaggedSchools = [];

  schools.forEach(school => {
    const isGracePeriodOver = new Date(school.created_at) < fiveDaysAgo;
    const students = studentCount[school.id] || 0;
    const teachers = teacherCount[school.id] || 0;

    const isLowEnrollment = isGracePeriodOver && students < 500;
    const isUnderstaffed = isGracePeriodOver && teachers < 20;

    console.log(`School: ${school.name} (Created: ${school.created_at})`);
    console.log(`- Age status: ${isGracePeriodOver ? 'Grace Period Over' : 'In Grace Period'}`);
    console.log(`- Students: ${students} (Low Enrollment: ${isLowEnrollment})`);
    console.log(`- Teachers: ${teachers} (Understaffed: ${isUnderstaffed})`);

    if (isLowEnrollment || isUnderstaffed) {
      flaggedSchools.push(school.name);
    }
  });

  console.log("\nFlagged schools:", flaggedSchools);
}

checkAll();
