import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Key');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkOnboarding() {
  console.log('Fetching school data...');
  const { data: allSchools, error: schoolsErr } = await supabaseAdmin
    .from('schools')
    .select('id, name, onboarding_status, status');

  if (schoolsErr) {
    console.error('Error fetching schools:', schoolsErr);
    return;
  }

  console.log('Fetching profiles...');
  const { data: allProfiles, error: profilesErr } = await supabaseAdmin
    .from('profiles')
    .select('school_id, role')
    .in('role', ['student', 'teacher']);

  if (profilesErr) {
    console.error('Error fetching profiles:', profilesErr);
    return;
  }

  const schoolStudentCount: Record<string, number> = {};
  const schoolTeacherCount: Record<string, number> = {};

  if (allProfiles) {
    allProfiles.forEach((p: any) => {
      if (!p.school_id) return;
      if (p.role === 'student') {
        schoolStudentCount[p.school_id] = (schoolStudentCount[p.school_id] || 0) + 1;
      } else if (p.role === 'teacher') {
        schoolTeacherCount[p.school_id] = (schoolTeacherCount[p.school_id] || 0) + 1;
      }
    });
  }

  console.log('\n--- School Stats ---');
  for (const s of allSchools) {
    const tc = schoolTeacherCount[s.id] || 0;
    const sc = schoolStudentCount[s.id] || 0;
    
    // UI calculation logic:
    let computedStatus = 'Pending';
    if (s.onboarding_status === 'Active & Onboarded' || (tc > 20 && sc > 500)) {
      computedStatus = 'Active & Onboarded';
    } else if (s.onboarding_status === 'In Progress' || (tc >= 5 && sc >= 100)) {
      computedStatus = 'In Progress';
    }

    console.log(`School: ${s.name}`);
    console.log(`  ID: ${s.id}`);
    console.log(`  Database Status (status/onboarding_status): ${s.status} / ${s.onboarding_status}`);
    console.log(`  Counts: Teachers = ${tc}, Students = ${sc}`);
    console.log(`  Computed UI Onboarding Status: ${computedStatus}`);
    console.log('--------------------');
  }
}

checkOnboarding();
