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
  },
  global: {
    fetch: (url, options) => {
      return fetch(url, { ...options, signal: AbortSignal.timeout(60000) });
    }
  }
});

async function seed() {
  console.log('Seeding Arakan Boys Secondary Subjects...');

  // 1. Get or Create School
  let schoolId;
  const schoolName = 'Arakan Boys Secondary';
  
  const { data: schools, error: schoolError } = await supabase
    .from('schools')
    .select('id')
    .eq('name', schoolName)
    .limit(1);

  if (schoolError) {
    console.error('Error fetching school:', schoolError);
    process.exit(1);
  }

  if (schools && schools.length > 0) {
    schoolId = schools[0].id;
    console.log('Found existing school:', schoolId);
  } else {
    const { data: newSchool, error: createError } = await supabase
      .from('schools')
      .insert({
        name: schoolName,
        slug: 'arakan-boys-secondary',
        plan: 'Standard'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating school:', createError);
      process.exit(1);
    }
    schoolId = newSchool.id;
    console.log('Created new school:', schoolId);
  }

  // 2. Define Subjects
  const subjects = [
    { name: 'Mathematics', department: 'Mathematics', code: 'MATH' },
    { name: 'English Language', department: 'Languages', code: 'ENG' },
    { name: 'Integrated Science', department: 'Science', code: 'SCI' },
    { name: 'Physics', department: 'Science', code: 'PHY' },
    { name: 'Chemistry', department: 'Science', code: 'CHEM' },
    { name: 'Biology', department: 'Science', code: 'BIO' },
    { name: 'Geography', department: 'Humanities', code: 'GEO' },
    { name: 'History', department: 'Humanities', code: 'HIS' },
    { name: 'Computer Studies', department: 'ICT', code: 'COMP' },
    { name: 'Physical Education', department: 'Sports', code: 'PE' }
  ];

  // 3. Insert Subjects
  let insertedCount = 0;
  for (const subject of subjects) {
    const { data: existingSubject } = await supabase
        .from('subjects')
        .select('id')
        .eq('school_id', schoolId)
        .eq('name', subject.name)
        .single();

    if (!existingSubject) {
        const { error } = await supabase.from('subjects').insert({
            school_id: schoolId,
            ...subject
        });
        if (error) console.error(`Error creating ${subject.name}:`, error);
        else {
            console.log(`Created ${subject.name}`);
            insertedCount++;
        }
    } else {
        console.log(`Subject ${subject.name} already exists`);
    }
  }

  console.log(`Seeding completed. Inserted ${insertedCount} new subjects.`);
}

seed();
