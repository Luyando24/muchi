
import { supabaseAdmin } from '../server/lib/supabase';

async function checkTables() {
  const tables = ['announcements', 'activity_logs', 'finance_records', 'approvals'];
  const missing: string[] = [];
  const existing: string[] = [];

  console.log('Checking for required tables...');

  for (const table of tables) {
    try {
      // Try to select 1 record, just to check if table exists
      // We use limit(0) so we don't actually fetch data, just check existence
      const { error } = await supabaseAdmin.from(table).select('*').limit(1);
      
      if (error) {
        // specific error code for "relation does not exist" is 42P01 in Postgres, 
        // but Supabase client might wrap it. 
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          missing.push(table);
        } else {
          console.error(`Error checking ${table}:`, error.message);
          // If it's another error (like permission), we might assume it exists or needs attention
          // But for now treat as missing/problematic
          missing.push(`${table} (Error: ${error.message})`);
        }
      } else {
        existing.push(table);
      }
    } catch (err: any) {
      console.error(`Exception checking ${table}:`, err.message);
      missing.push(table);
    }
  }

  console.log('\n--- Status Report ---');
  if (existing.length > 0) {
    console.log('✅ Existing tables:', existing.join(', '));
  }
  
  if (missing.length > 0) {
    console.log('❌ Missing tables:', missing.join(', '));
    console.log('\nPlease run the migration "supabase/migrations/0001_dashboard_updates.sql" to create these tables.');
  } else {
    console.log('✨ All dashboard tables exist!');
  }
  
  // Also check if we have schools and profiles to verify basic setup
  const { count: schoolCount } = await supabaseAdmin.from('schools').select('*', { count: 'exact', head: true });
  console.log(`\nBasic DB Info: Schools count: ${schoolCount}`);

  console.log('\nChecking Profiles structure...');
  const { data: profiles, error: profileError } = await supabaseAdmin.from('profiles').select('*').limit(1);
  if (profileError) {
    console.error('Error fetching profiles:', profileError.message);
  } else if (profiles && profiles.length > 0) {
    console.log('Sample profile keys:', Object.keys(profiles[0]).join(', '));
    console.log('Sample profile data:', profiles[0]);
  } else {
    console.log('No profiles found to inspect.');
  }

  console.log('\nChecking for student-specific fields in profiles...');
  const { error: fieldError } = await supabaseAdmin
    .from('profiles')
    .select('grade, guardian_name, enrollment_status')
    .limit(1);

  if (fieldError) {
    console.log(`❌ Student fields missing: ${fieldError.message}`);
    console.log('Please run the migration "supabase/migrations/0002_add_student_fields.sql"');
  } else {
    console.log('✅ Student fields present in profiles table.');
  }

  console.log('\nChecking for teacher-specific fields in profiles...');
  const { error: teacherFieldError } = await supabaseAdmin
    .from('profiles')
    .select('department, subjects, join_date, employment_status')
    .limit(1);

  if (teacherFieldError) {
    console.log(`❌ Teacher fields missing: ${teacherFieldError.message}`);
    console.log('Please run the migration "supabase/migrations/0003_add_teacher_fields.sql"');
  } else {
    console.log('✅ Teacher fields present in profiles table.');
  }

  console.log('\nChecking for academic tables...');
  const { error: subjectsError } = await supabaseAdmin
    .from('subjects')
    .select('id, name, department, code, head_teacher_id')
    .limit(1);

  if (subjectsError) {
    console.log(`❌ Subjects table missing or columns missing: ${subjectsError.message}`);
    console.log('Please run the migration "supabase/migrations/0004_add_academic_tables.sql"');
  } else {
    console.log('✅ Subjects table present with required columns.');
  }

  const { error: classesError } = await supabaseAdmin
    .from('classes')
    .select('id, name, level, room, capacity, class_teacher_id')
    .limit(1);

  if (classesError) {
    console.log(`❌ Classes table missing or columns missing: ${classesError.message}`);
    console.log('Please run the migration "supabase/migrations/0004_add_academic_tables.sql"');
  } else {
    console.log('✅ Classes table present with required columns.');
  }
}

checkTables();
