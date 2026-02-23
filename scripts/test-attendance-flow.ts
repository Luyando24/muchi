
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BASE_URL = 'http://localhost:3000/api';

async function main() {
  console.log('Starting Attendance Flow Test...');

  // 1. Setup Data
  console.log('Setting up test data...');
  
  // Create School
  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .insert({ name: 'Attendance Test School', slug: 'attendance-test-school' })
    .select()
    .single();

  if (schoolError && schoolError.code !== '23505') throw schoolError;
  const schoolId = school?.id || (await supabase.from('schools').select('id').eq('slug', 'attendance-test-school').single()).data?.id;
  console.log('School ID:', schoolId);

  // Clear existing licenses for this school to avoid multiple active licenses error
  await supabase.from('school_licenses').delete().eq('school_id', schoolId);

  // Create License
  const { error: licenseError } = await supabase.from('school_licenses').insert({
    school_id: schoolId,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    plan: 'Standard',
    license_key: `LIC-${Date.now()}`
  });
  if (licenseError) {
    console.log('License creation error (might already exist):', licenseError.message);
  } else {
    console.log('License created for school:', schoolId);
  }

  // Create Teacher User & Profile
  const teacherEmail = `teacher_${Date.now()}@test.com`;
  const teacherPassword = 'password123';
  const { data: teacherAuth, error: teacherAuthError } = await supabase.auth.admin.createUser({
    email: teacherEmail,
    password: teacherPassword,
    email_confirm: true
  });
  if (teacherAuthError) throw teacherAuthError;
  const teacherId = teacherAuth.user.id;

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: teacherId,
    // email: teacherEmail, // email is in auth.users, not profiles?
    role: 'teacher',
    school_id: schoolId,
    full_name: 'Test Teacher'
  });
  if (profileError) {
    console.error('Error creating teacher profile:', profileError);
    throw profileError;
  }
  console.log('Teacher created:', teacherEmail);

  // Create Class
  const { data: cls, error: clsError } = await supabase
    .from('classes')
    .insert({ 
      school_id: schoolId, 
      name: '10A Math', 
      class_teacher_id: teacherId,
      level: '10'
    })
    .select()
    .single();
  if (clsError) throw clsError;
  const classId = cls.id;
  console.log('Class created:', classId);

  // Create Student User & Profile
  const studentEmail = `student_${Date.now()}@test.com`;
  const studentPassword = 'password123';

  // Valid format: ST + 4 digits seems to be the constraint based on inspection.
   const randomSuffix = Math.floor(1000 + Math.random() * 9000);
   const studentCardId = `ST${randomSuffix}`;
   const nrcHash = `hash-${Date.now()}-${Math.random()}`; // Unique hash

  console.log(`Creating student: ${studentEmail} (Card: ${studentCardId})`);

  const { data: studentAuth, error: studentAuthError } = await supabase.auth.admin.createUser({
    email: studentEmail,
    password: studentPassword,
    email_confirm: true
  });
  if (studentAuthError) throw studentAuthError;
  const studentId = studentAuth.user.id;

  const { error: studentProfileError } = await supabase.from('profiles').upsert({
    id: studentId,
    role: 'student',
    school_id: schoolId,
    full_name: 'Test Student',
    grade: '10'
  });
  if (studentProfileError) {
    console.error('Error creating student profile:', studentProfileError);
    throw studentProfileError;
  }

  // Manually create 'students' record because attendance table requires it (foreign key)
  // and the app doesn't create it automatically yet.
  console.log('Creating student record in "students" table...');
  const { error: studentRecordError } = await supabase.from('students').insert({
    id: studentId,
    student_card_id: studentCardId,
    nrc_hash: nrcHash,
    nrc_salt: 'dummy-salt',
    card_id: `CID${Date.now()}`,
    card_qr_signature: 'dummy-signature'
  });

  if (studentRecordError) {
    console.error('Error creating student record:', studentRecordError);
    // Continue anyway to see if it fails later
  } else {
    console.log('Student record created successfully.');
  }

  // Enroll Student
  await supabase.from('enrollments').insert({
    // school_id: schoolId, // school_id not in enrollments
    student_id: studentId,
    class_id: classId,
    academic_year: '2024',
    status: 'Active'
  });
  console.log('Student created and enrolled:', studentEmail);

  // 2. Teacher Flow
  console.log('\n--- Testing Teacher Flow ---');
  
  // Login as Teacher
  const { data: teacherLogin } = await supabase.auth.signInWithPassword({
    email: teacherEmail,
    password: teacherPassword
  });
  const teacherToken = teacherLogin.session?.access_token;
  const teacherHeaders = { 'Authorization': `Bearer ${teacherToken}`, 'Content-Type': 'application/json' };

  // Fetch Classes
  const classesRes = await fetch(`${BASE_URL}/teacher/classes`, { headers: teacherHeaders });
  if (!classesRes.ok) {
    const text = await classesRes.text();
    console.error(`Fetch Classes Failed: ${classesRes.status} ${classesRes.statusText}`);
    console.error(text);
    throw new Error(`Fetch Classes Failed: ${classesRes.status}`);
  }
  const classesData = await classesRes.json();
  console.log('Fetched Classes:', classesData.length);
  if (classesData.length === 0) throw new Error('No classes found for teacher');

  // Fetch Students
  const studentsRes = await fetch(`${BASE_URL}/teacher/classes/${classId}/students`, { headers: teacherHeaders });
  const studentsData = await studentsRes.json();
  console.log('Fetched Students:', studentsData.length);
  if (studentsData.length === 0) throw new Error('No students found in class');

  // Mark Attendance
  const date = new Date().toISOString().split('T')[0];
  const attendancePayload = {
    classId,
    date,
    records: [{
      student_id: studentId,
      status: 'present',
      remarks: 'On time'
    }]
  };

  const saveRes = await fetch(`${BASE_URL}/teacher/attendance`, {
    method: 'POST',
    headers: teacherHeaders,
    body: JSON.stringify(attendancePayload)
  });
  const saveData = await saveRes.json();
  console.log('Save Attendance Response:', saveData);

  // Verify Attendance Saved
  const verifyRes = await fetch(`${BASE_URL}/teacher/attendance/${classId}/${date}`, { headers: teacherHeaders });
  const verifyData = await verifyRes.json();
  console.log('Verified Attendance Records:', verifyData.length);
  if (verifyData[0].status !== 'present') throw new Error('Attendance status mismatch');

  // 3. Student Flow
  console.log('\n--- Testing Student Flow ---');

  // Login as Student
  const { data: studentLogin } = await supabase.auth.signInWithPassword({
    email: studentEmail,
    password: studentPassword
  });
  const studentToken = studentLogin.session?.access_token;
  const studentHeaders = { 'Authorization': `Bearer ${studentToken}`, 'Content-Type': 'application/json' };

  // Fetch Attendance History
  const historyRes = await fetch(`${BASE_URL}/student/attendance`, { headers: studentHeaders });
  const historyData = await historyRes.json();
  console.log('Student Attendance Stats:', historyData.stats);
  console.log('Student Attendance Records:', historyData.records.length);
  
  if (historyData.records.length === 0) throw new Error('No attendance records found for student');
  if (historyData.records[0].status !== 'present') throw new Error('Student attendance record mismatch');

  console.log('\nSUCCESS: All attendance tests passed!');

  // Cleanup
  await supabase.from('enrollments').delete().eq('student_id', studentId);
  await supabase.from('attendance').delete().eq('student_id', studentId);
  await supabase.from('classes').delete().eq('id', classId);
  await supabase.from('profiles').delete().in('id', [teacherId, studentId]);
  await supabase.auth.admin.deleteUser(teacherId);
  await supabase.auth.admin.deleteUser(studentId);
  console.log('Cleanup complete.');
}

main().catch(console.error);
