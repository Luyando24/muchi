
import { supabaseAdmin } from '../server/lib/supabase';
import { randomUUID } from 'crypto';

async function main() {
  console.log('Starting debug-attendance-fk.ts...');

  // 1. Fetch a valid student profile
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, school_id')
    .limit(1);

  if (profileError || !profiles || profiles.length === 0) {
    console.error('Failed to fetch profiles:', profileError);
    return;
  }

  const validStudent = profiles[0];
  console.log('Valid Student ID:', validStudent.id);
  console.log('School ID:', validStudent.school_id);

  // 2. Test inserting valid attendance
  const validAttendance = {
    id: randomUUID(),
    school_id: validStudent.school_id,
    student_id: validStudent.id,
    date: '2025-01-01',
    status: 'present',
    recorded_by: validStudent.id // Assuming self-recording for test
  };

  console.log('Attempting valid insert...');
  const { error: validError } = await supabaseAdmin
    .from('attendance')
    .upsert([validAttendance], { onConflict: 'student_id,date' });
  
  if (validError) {
    console.error('Valid insert failed:', validError);
  } else {
    console.log('Valid insert successful!');
  }

  // 3. Test inserting invalid student_id (Random UUID)
  const invalidStudentId = randomUUID();
  const invalidAttendance = {
    id: randomUUID(),
    school_id: validStudent.school_id,
    student_id: invalidStudentId,
    date: '2025-01-02',
    status: 'present',
    recorded_by: validStudent.id
  };

  console.log(`Attempting invalid student_id insert (${invalidStudentId})...`);
  const { error: invalidError } = await supabaseAdmin
    .from('attendance')
    .upsert([invalidAttendance], { onConflict: 'student_id,date' });

  if (invalidError) {
    console.log('Invalid insert failed as expected:', invalidError.message);
    console.log('Error details:', invalidError);
  } else {
    console.error('Invalid insert SUCCEEDED! This is unexpected.');
  }

  // 4. Test validation logic with invalid ID
  console.log('Testing validation logic...');
  const studentIds = [validStudent.id, invalidStudentId];
  const { data: validProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .in('id', studentIds);
  
  const validIds = new Set(validProfiles?.map(p => p.id));
  const invalidIds = studentIds.filter(id => !validIds.has(id));

  console.log('Validation results:');
  console.log('Valid IDs found:', validIds.size);
  console.log('Invalid IDs detected:', invalidIds);

  if (invalidIds.includes(invalidStudentId)) {
    console.log('Validation correctly identified invalid ID.');
  } else {
    console.error('Validation FAILED to identify invalid ID.');
  }

}

main().catch(console.error);
