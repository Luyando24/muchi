import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  // 1. Fetch schools
  const { data: schools, error: schoolsError } = await supabaseAdmin
    .from('schools')
    .select('id, name, slug, created_at');

  if (schoolsError) {
    console.error("schoolsError:", schoolsError);
    return;
  }

  // 2. Fetch profiles to count students/teachers
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('school_id, role')
    .in('role', ['student', 'teacher']);

  const schoolStudentCount = {};
  const schoolTeacherCount = {};

  if (profiles) {
    profiles.forEach(p => {
      if (!p.school_id) return;
      if (p.role === 'student') schoolStudentCount[p.school_id] = (schoolStudentCount[p.school_id] || 0) + 1;
      if (p.role === 'teacher') schoolTeacherCount[p.school_id] = (schoolTeacherCount[p.school_id] || 0) + 1;
    });
  }

  // 3. Fetch auth users and calculate sign-ins
  let allUsers = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000
    });

    if (error) {
      console.error(error);
      break;
    }

    if (!users || users.length === 0) {
      hasMore = false;
    } else {
      allUsers.push(...users);
      if (users.length < 1000) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const schoolSignIns7d = {};
  const schoolSignIns30d = {};

  allUsers.forEach(u => {
    const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : null;
    const schoolId = u.user_metadata?.school_id;

    if (!schoolId) return;

    if (lastSignIn) {
      if (lastSignIn >= sevenDaysAgo) {
        schoolSignIns7d[schoolId] = (schoolSignIns7d[schoolId] || 0) + 1;
      }
      if (lastSignIn >= thirtyDaysAgo) {
        schoolSignIns30d[schoolId] = (schoolSignIns30d[schoolId] || 0) + 1;
      }
    }
  });

  // 4. Map schools with stats
  const schoolsWithStats = schools.map(s => {
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      created_at: s.created_at,
      student_count: schoolStudentCount[s.id] || 0,
      teacher_count: schoolTeacherCount[s.id] || 0,
      sign_ins_7d: schoolSignIns7d[s.id] || 0,
      sign_ins_30d: schoolSignIns30d[s.id] || 0
    };
  });

  // 5. Inactive schools: no user signed in in past 7 days OR less than 20 users signed in in past 30 days
  const inactiveSchools = schoolsWithStats.filter(s => {
    return s.sign_ins_7d === 0 || s.sign_ins_30d < 20;
  });

  // Sort inactive: by 30 days sign ins ascending, then by name
  inactiveSchools.sort((a, b) => a.sign_ins_30d - b.sign_ins_30d);

  // 6. Top performing schools: sorted by 30 days usage descending
  const topPerformingSchools = [...schoolsWithStats];
  topPerformingSchools.sort((a, b) => b.sign_ins_30d - a.sign_ins_30d);

  console.log("\n--- INACTIVE SCHOOLS ---");
  inactiveSchools.forEach(s => {
    console.log(`- ${s.name}: 7d logins: ${s.sign_ins_7d}, 30d logins: ${s.sign_ins_30d}`);
  });

  console.log("\n--- TOP PERFORMING SCHOOLS ---");
  topPerformingSchools.forEach(s => {
    console.log(`- ${s.name}: 7d logins: ${s.sign_ins_7d}, 30d logins: ${s.sign_ins_30d}`);
  });
}

test();
