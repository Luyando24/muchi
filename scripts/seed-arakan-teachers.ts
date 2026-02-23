
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

const teachers = [
  {
    firstName: 'Mulenga',
    lastName: 'Banda',
    email: 'mulenga.banda@arakan.edu.zm',
    department: 'Science',
    subjects: ['Mathematics', 'Physics'],
    password: 'Password123!'
  },
  {
    firstName: 'Thandiwe',
    lastName: 'Phiri',
    email: 'thandiwe.phiri@arakan.edu.zm',
    department: 'Languages',
    subjects: ['English', 'Literature'],
    password: 'Password123!'
  },
  {
    firstName: 'Kondwani',
    lastName: 'Sakala',
    email: 'kondwani.sakala@arakan.edu.zm',
    department: 'Science',
    subjects: ['Biology', 'Chemistry'],
    password: 'Password123!'
  },
  {
    firstName: 'Musonda',
    lastName: 'Lungu',
    email: 'musonda.lungu@arakan.edu.zm',
    department: 'Humanities',
    subjects: ['History', 'Geography'],
    password: 'Password123!'
  },
  {
    firstName: 'Chanda',
    lastName: 'Mwila',
    email: 'chanda.mwila@arakan.edu.zm',
    department: 'ICT',
    subjects: ['Computer Science'],
    password: 'Password123!'
  },
  {
    firstName: 'Luyando',
    lastName: 'Zulu',
    email: 'luyando.zulu@arakan.edu.zm',
    department: 'Mathematics',
    subjects: ['Mathematics'],
    password: 'Password123!'
  },
  {
    firstName: 'Mwape',
    lastName: "Ng'onga",
    email: 'mwape.ngonga@arakan.edu.zm',
    department: 'Physical Education',
    subjects: ['Physical Education'],
    password: 'Password123!'
  },
  {
    firstName: 'Chileshe',
    lastName: 'Tembo',
    email: 'chileshe.tembo@arakan.edu.zm',
    department: 'Arts',
    subjects: ['Art', 'Music'],
    password: 'Password123!'
  },
  {
    firstName: 'Bwalya',
    lastName: 'Mwale',
    email: 'bwalya.mwale@arakan.edu.zm',
    department: 'Humanities',
    subjects: ['Civic Education'],
    password: 'Password123!'
  },
  {
    firstName: 'Chilufya',
    lastName: 'Chama',
    email: 'chilufya.chama@arakan.edu.zm',
    department: 'Vocational',
    subjects: ['Home Economics'],
    password: 'Password123!'
  }
];

async function seed() {
  console.log('Seeding Arakan Boys Secondary Teachers with Zambian names...');

  // 1. Get School ID
  const { data: schools, error: schoolError } = await supabase
    .from('schools')
    .select('id')
    .ilike('name', '%Arakan Boys%') // Use ilike for case-insensitive partial match to be safe
    .limit(1);

  if (schoolError || !schools || schools.length === 0) {
    console.error('Error fetching school or school not found:', schoolError);
    process.exit(1);
  }

  const schoolId = schools[0].id;
  console.log(`Found School ID: ${schoolId}`);

  // 2. Create Teachers
  for (const teacher of teachers) {
    const fullName = `${teacher.firstName} ${teacher.lastName}`;
    console.log(`Processing teacher: ${fullName} (${teacher.email})`);

    // Check if user exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
      continue;
    }

    const existingUser = users.find(u => u.email === teacher.email);
    let userId;

    if (existingUser) {
      console.log(`User ${teacher.email} already exists. Updating profile...`);
      userId = existingUser.id;
      
      // Update password just in case
      await supabase.auth.admin.updateUserById(userId, {
        password: teacher.password,
        user_metadata: {
          full_name: fullName,
          role: 'teacher',
          school_id: schoolId
        },
        email_confirm: true
      });

    } else {
      console.log(`Creating new user for ${teacher.email}...`);
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: teacher.email,
        password: teacher.password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: 'teacher',
          school_id: schoolId
        }
      });

      if (createError) {
        console.error(`Error creating user ${teacher.email}:`, createError);
        continue;
      }
      userId = newUser.user.id;
    }

    // Upsert Profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        school_id: schoolId,
        role: 'teacher',
        full_name: fullName,
        email: teacher.email, // Now this should work!
        department: teacher.department,
        subjects: teacher.subjects,
        employment_status: 'Active',
        join_date: new Date().toISOString()
      });

    if (profileError) {
      console.error(`Error updating profile for ${fullName}:`, profileError);
    } else {
      console.log(`Successfully seeded teacher: ${fullName}`);
    }
  }

  console.log('Teacher seeding completed!');
}

seed().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
