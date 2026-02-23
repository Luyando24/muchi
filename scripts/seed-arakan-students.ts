
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

async function seedArakan() {
  log('Starting Arakan Boys Secondary seed process...');

  // 1. Get or Create School
  let schoolId;
  const schoolName = 'Arakan Boys Secondary';
  
  const { data: existingSchool } = await supabase
    .from('schools')
    .select('id')
    .eq('name', schoolName)
    .single();

  if (existingSchool) {
    schoolId = existingSchool.id;
    log(`Found existing school: ${schoolName} (${schoolId})`);
  } else {
    log(`Creating school: ${schoolName}...`);
    const { data: newSchool, error } = await supabase
      .from('schools')
      .insert({
        name: schoolName,
        slug: 'arakan-boys-secondary',
        address: 'Arakan Barracks, Lusaka',
        email: 'info@arakan.edu.zm',
        phone: '+260977000000',
        logo_url: 'https://via.placeholder.com/150',
        website: 'https://arakan.edu.zm',
        academic_year: new Date().getFullYear().toString(),
        current_term: 'Term 1'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating school:', error);
      return;
    }
    schoolId = newSchool.id;
    log(`Created school: ${schoolName} (${schoolId})`);

    // Create License for new school
    await supabase.from('school_licenses').insert({
      school_id: schoolId,
      license_key: `LIC-ARAKAN-${new Date().getFullYear()}`,
      status: 'active',
      plan: 'Premium',
      start_date: new Date().toISOString(),
      end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
    });
  }

  // 2. Ensure Classes Exist
  const classNames = ['8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B'];
  const classMap = new Map();

  for (const className of classNames) {
    const level = className.replace(/[A-B]/g, '');
    
    // Check if class exists
    const { data: existingClass } = await supabase
      .from('classes')
      .select('id')
      .eq('school_id', schoolId)
      .eq('name', className)
      .single();

    if (existingClass) {
      classMap.set(className, existingClass.id);
    } else {
      log(`Creating class: ${className}`);
      const { data: newClass, error } = await supabase
        .from('classes')
        .insert({
          school_id: schoolId,
          name: className,
          level: level,
          capacity: 40,
          room: `Rm ${className}`
        })
        .select('id')
        .single();
      
      if (error) {
        console.error(`Error creating class ${className}:`, error);
      } else {
        classMap.set(className, newClass.id);
      }
    }
  }

  // 3. Seed Students
  const students = [
    { firstName: 'John', lastName: 'Banda', grade: '8', className: '8A' },
    { firstName: 'Peter', lastName: 'Phiri', grade: '8', className: '8B' },
    { firstName: 'Michael', lastName: 'Zulu', grade: '9', className: '9A' },
    { firstName: 'David', lastName: 'Tembo', grade: '9', className: '9B' },
    { firstName: 'James', lastName: 'Mulenga', grade: '10', className: '10A' },
    { firstName: 'Joseph', lastName: 'Lungu', grade: '10', className: '10B' },
    { firstName: 'Moses', lastName: 'Sakala', grade: '11', className: '11A' },
    { firstName: 'Daniel', lastName: 'Mwape', grade: '11', className: '11B' },
    { firstName: 'Samuel', lastName: 'Chibwe', grade: '12', className: '12A' },
    { firstName: 'Elijah', lastName: 'Kangwa', grade: '12', className: '12B' },
    { firstName: 'Isaac', lastName: 'Mwanza', grade: '8', className: '8A' },
    { firstName: 'Abraham', lastName: 'Chama', grade: '9', className: '9B' },
    { firstName: 'Jacob', lastName: 'Sampa', grade: '10', className: '10A' },
    { firstName: 'Joshua', lastName: 'Bwalya', grade: '11', className: '11B' },
    { firstName: 'Caleb', lastName: 'Simfukwe', grade: '12', className: '12A' },
    { firstName: 'Nathan', lastName: 'Chilufya', grade: '8', className: '8B' },
    { firstName: 'Aaron', lastName: 'Musonda', grade: '9', className: '9A' },
    { firstName: 'Gideon', lastName: 'Kunda', grade: '10', className: '10B' },
    { firstName: 'Samson', lastName: 'Chola', grade: '11', className: '11A' },
    { firstName: 'Solomon', lastName: 'Ngoma', grade: '12', className: '12B' }
  ];

  log(`Seeding ${students.length} students...`);

  for (const student of students) {
    const email = `${student.firstName.toLowerCase()}.${student.lastName.toLowerCase()}@arakan.edu.zm`;
    const password = 'password123';
    const studentNumber = `${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${Math.floor(1000 + Math.random() * 9000)}`;

    // Check if user exists
    let userId;
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === email);

    if (existingUser) {
      userId = existingUser.id;
      // log(`User exists: ${email}`);
    } else {
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: `${student.firstName} ${student.lastName}`,
          role: 'student',
          school_id: schoolId
        }
      });

      if (error) {
        console.error(`Error creating user ${email}:`, error);
        continue;
      }
      userId = newUser.user.id;
      log(`Created user: ${email}`);
    }

    // Update Profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        school_id: schoolId,
        full_name: `${student.firstName} ${student.lastName}`,
        role: 'student',
        grade: student.grade,
        student_number: studentNumber,
        gender: 'Male', // Boys school
        enrollment_status: 'Active',
        fees_status: 'Pending',
        guardian_name: 'Parent/Guardian',
        updated_at: new Date()
      });

    if (profileError) {
      console.error(`Error updating profile for ${email}:`, profileError);
    }

    // Assign to Class
    const classId = classMap.get(student.className);
    if (classId) {
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', userId)
        .eq('academic_year', new Date().getFullYear().toString())
        .single();

      if (!existingEnrollment) {
        const { error: enrollError } = await supabase
          .from('enrollments')
          .insert({
             student_id: userId,
             class_id: classId,
             school_id: schoolId,
             academic_year: new Date().getFullYear().toString()
          });
          
        if (enrollError) {
            console.error(`Error enrolling ${email}:`, enrollError.message);
        } else {
          // log(`Enrolled ${student.firstName} in ${student.className}`);
        }
      }
    }
  }

  log('Seed complete!');
}

seedArakan().catch(console.error);
