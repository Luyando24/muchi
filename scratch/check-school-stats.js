import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  console.log("Current time:", new Date().toISOString());
  console.log("5 days ago:", fiveDaysAgo.toISOString());

  // Fetch schools created in the last 5 days (or future, since database has future dates)
  const { data: schools, error } = await supabaseAdmin
    .from('schools')
    .select('id, name, created_at');

  if (error) {
    console.error("Error fetching schools:", error);
    return;
  }

  console.log("Total schools in DB:", schools.length);

  const recentSchools = schools.filter(s => new Date(s.created_at) >= fiveDaysAgo);
  console.log("Recent schools (>= 5 days ago):", recentSchools.length);

  for (const school of recentSchools) {
    // Count students
    const { count: studentCount } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', school.id)
      .eq('role', 'student');

    // Count teachers
    const { count: teacherCount } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'teacher'); // wait, we should filter by school_id!
      
    // Wait, let's do correct filter by school_id
    const { count: teacherCountCorrect } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', school.id)
      .eq('role', 'teacher');

    console.log(`School: ${school.name}`);
    console.log(`- Created At: ${school.created_at}`);
    console.log(`- Students: ${studentCount}`);
    console.log(`- Teachers: ${teacherCountCorrect}`);
  }
}

check();
