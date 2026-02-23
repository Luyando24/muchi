
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const log = (msg: string) => console.log(`[SEED] ${msg}`);

async function seed() {
  log('Starting seed process...');

  // 1. Create a School
  log('Creating School...');
  let school;
  const { data: existingSchool } = await supabase
    .from('schools')
    .select()
    .eq('name', 'Chongwe Secondary School')
    .single();

  if (existingSchool) {
    school = existingSchool;
    log(`School already exists: ${school.name} (${school.id})`);
  } else {
    const { data: newSchool, error: schoolError } = await supabase
      .from('schools')
      .insert({
        name: 'Chongwe Secondary School',
        slug: 'chongwe-secondary-school',
        address: 'Chongwe, Lusaka',
        email: 'info@chongwe.edu.zm',
        phone: '+260977123456',
      })
      .select()
      .single();

    if (schoolError) {
      console.error('Error creating school:', schoolError);
      return;
    }
    school = newSchool;
    log(`School created: ${school.name} (${school.id})`);
  }

  // 2. Create School License
  log('Creating License...');
  const { error: licenseError } = await supabase
    .from('school_licenses')
    .upsert({
      school_id: school.id,
      license_key: 'LIC-CHONGWE-2024',
      status: 'active',
      plan: 'Premium',
      start_date: new Date().toISOString(),
      end_date: '2025-12-31'
    }, { onConflict: 'license_key' });

  if (licenseError) console.error('Error creating license:', licenseError);

  // Helper to create user
  const createUser = async (email: string, role: string, firstName: string, lastName: string, metadata: any = {}) => {
    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let user = existingUsers.users.find(u => u.email === email);

    if (!user) {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true,
        user_metadata: { ...metadata, first_name: firstName, last_name: lastName }
      });
      if (error) {
        console.error(`Error creating user ${email}:`, error);
        return null;
      }
      user = data.user;
    }

    // Update Profile
    const profileUpdates: any = {
        id: user.id,
        full_name: `${firstName} ${lastName}`,
        role,
        school_id: school.id,
        enrollment_status: 'Active', // REQUIRED
    };
    
    // Only add fields if we are sure they exist or handle errors gracefully
    // We'll rely on defaults for most things now

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileUpdates);

    if (profileError) console.error(`Error updating profile for ${email}:`, profileError);

    return user;
  };

  // 3. Create Users
  log('Creating Users...');
  
  // School Admin
  const adminUser = await createUser('admin@chongwe.edu.zm', 'school_admin', 'Admin', 'User');
  
  // Teachers
  const teachers = [];
  const subjectNames = ['Mathematics', 'Physics', 'English', 'Biology', 'History'];
  const subjectMap: Record<string, string> = {}; // Name -> ID

  // Create Subjects first
  log('Creating Subjects...');
  for (const subjectName of subjectNames) {
      // Create teacher for subject
      const teacher = await createUser(
        `teacher_${subjectName.toLowerCase()}@chongwe.edu.zm`, 
        'teacher', 
        `Teacher`, 
        subjectName,
        { department: subjectName }
      );
      if (teacher) teachers.push(teacher);

      // Create subject record
      const { data: subjectData, error: subjectError } = await supabase
          .from('subjects')
          .upsert({
              name: subjectName,
              school_id: school.id,
              department: subjectName,
              head_teacher_id: teacher?.id
          }, { onConflict: 'school_id, name' } as any) // Assuming constraint exists or hoping upsert works
          .select()
          .single();
      
      if (subjectData) {
          subjectMap[subjectName] = subjectData.id;
      } else {
          // Fallback: try to select if upsert failed due to missing constraint
          const { data: existingSubject } = await supabase.from('subjects').select().eq('name', subjectName).eq('school_id', school.id).single();
          if (existingSubject) subjectMap[subjectName] = existingSubject.id;
          else console.error(`Error creating subject ${subjectName}:`, subjectError);
      }
  }

  // Students
  const students = [];
  for (let i = 0; i < 20; i++) {
    const studentId = `ST${String(i+1).padStart(4, '0')}`; // ST0001 format
    const student = await createUser(
      `student${i+1}@chongwe.edu.zm`, 
      'student', 
      `Student${i+1}`, 
      `Surname${i+1}`,
      { student_id: studentId }
    );
    
    if (student) {
        students.push(student);
        // Create/Update Student Record
        const { error: studentError } = await supabase
            .from('students')
            .upsert({
                id: student.id,
                school_id: school.id,
                student_card_id: studentId,
            }, { onConflict: 'student_card_id' });

        if (studentError) {
             console.error(`Error creating student record for ${student.email}:`, studentError);
        }
    }
  }

  // 4. Create Classes
  log('Creating Classes...');
  const classesData = [
    { name: '10A', grade_level: '10', teacher_idx: 0 },
    { name: '10B', grade_level: '10', teacher_idx: 1 },
    { name: '11A', grade_level: '11', teacher_idx: 0 },
    { name: '11B', grade_level: '11', teacher_idx: 2 },
  ];

  const createdClasses = [];
  for (const cls of classesData) {
    const teacher = teachers[cls.teacher_idx];
    if (!teacher) continue;

    const { data: existingClass } = await supabase
        .from('classes')
        .select()
        .eq('name', cls.name)
        .eq('school_id', school.id)
        .single();
    
    if (existingClass) {
        createdClasses.push(existingClass);
    } else {
        const { data: newClass, error } = await supabase
        .from('classes')
        .insert({
            name: cls.name,
            school_id: school.id,
            class_teacher_id: teacher.id,
            level: cls.grade_level,
        })
        .select()
        .single();

        if (error) console.error(`Error creating class ${cls.name}:`, error);
        else createdClasses.push(newClass);
    }
  }

  // 5. Enroll Students
  log('Enrolling Students...');
  for (const cls of createdClasses) {
    // Enroll 10 random students in each class
    const shuffled = students.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);

    for (const student of selected) {
      const { error } = await supabase
        .from('enrollments')
        .upsert({
          student_id: student.id,
          class_id: cls.id,
          school_id: school.id, // REQUIRED
          academic_year: '2024', // REQUIRED for unique constraint
        }, { onConflict: 'student_id, academic_year' }); 
        
      if (error) console.error(`Error enrolling ${student.email} in ${cls.name}:`, error);
    }
  }

  // 6. Create Attendance Records (Past 30 days)
  log('Creating Attendance...');
  const statuses = ['present', 'present', 'present', 'present', 'absent', 'late'];
  const today = new Date();
  
  for (const cls of createdClasses) {
    // Get enrolled students
    const { data: enrollments } = await supabase.from('enrollments').select('student_id').eq('class_id', cls.id);
    if (!enrollments) continue;

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      for (const enrollment of enrollments) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        await supabase
          .from('attendance')
          .upsert({
            student_id: enrollment.student_id,
            class_id: cls.id,
            school_id: school.id, // REQUIRED
            date: dateStr,
            status: status,
            recorded_by: cls.class_teacher_id,
            remarks: status === 'late' ? 'Bus delayed' : ''
          }, { onConflict: 'student_id, date' });
      }
    }
  }

  // 7. Create Assignments & Submissions
  log('Creating Assignments & Grades...');
  for (const cls of createdClasses) {
      // Find a subject for this class (simplified: use Math or first available)
      const subjectName = cls.name.includes('10') ? 'Mathematics' : 'Physics';
      const subjectId = subjectMap[subjectName];

      // Create 2 assignments
      for (let i=1; i<=2; i++) {
          const { data: assignment, error: assignmentError } = await supabase.from('assignments').insert({
              title: `Assignment ${i} - ${cls.name}`,
              description: 'Complete the attached exercises',
              class_id: cls.id,
              school_id: school.id, // REQUIRED
              subject_id: subjectId,
              due_date: new Date(Date.now() + 86400000 * 7).toISOString(), // 1 week from now
              type: 'homework', // REQUIRED (enum)
               category: 'Homework', // REQUIRED
              teacher_id: cls.class_teacher_id,
              assignment_number: i, // Add assignment_number
          }).select().single();

          if (assignmentError) console.error('Error creating assignment:', assignmentError);

          if (assignment) {
               // Create submissions/grades for enrolled students
               const { data: enrollments } = await supabase.from('enrollments').select('student_id').eq('class_id', cls.id);
               if (enrollments) {
                   for (const enrollment of enrollments) {
                       const score = Math.floor(Math.random() * 40) + 60; // 60-100
                       await supabase.from('submissions').insert({
                           assignment_id: assignment.id,
                           student_id: enrollment.student_id,
                           status: 'submitted', // enum
                           score: score, // integer
                           // grade: 'A', // text
                           submitted_at: new Date().toISOString()
                       });
                       
                       // Also add to student_grades table
                       if (subjectId) {
                           await supabase.from('student_grades').upsert({
                               student_id: enrollment.student_id,
                               school_id: school.id, // REQUIRED
                               subject_id: subjectId,
                               term: 'Term 1',
                               academic_year: '2024',
                               grade: score >= 90 ? 'A' : score >= 80 ? 'B' : 'C',
                               percentage: score,
                           }, { onConflict: 'student_id, subject_id, term, academic_year' });
                       }
                   }
               }
          }
      }
  }

  log('Seed completed successfully!');
}

seed().catch(console.error);
