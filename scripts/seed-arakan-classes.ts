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
  console.log('Seeding Arakan Boys Classes (Grade 8-12)...');

  // 1. Get or Create School
  let schoolId;
  const schoolName = 'Arakan Boys';
  
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
        slug: 'arakan-boys',
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

  // 2. Define Classes
  const classes = [
    { name: 'Grade 8A', level: 'Grade 8', room: 'Room 801', capacity: 40 },
    { name: 'Grade 8B', level: 'Grade 8', room: 'Room 802', capacity: 40 },
    { name: 'Grade 9A', level: 'Grade 9', room: 'Room 901', capacity: 40 },
    { name: 'Grade 9B', level: 'Grade 9', room: 'Room 902', capacity: 40 },
    { name: 'Grade 10A', level: 'Grade 10', room: 'Room 1001', capacity: 40 },
    { name: 'Grade 10B', level: 'Grade 10', room: 'Room 1002', capacity: 40 },
    { name: 'Grade 11A', level: 'Grade 11', room: 'Room 1101', capacity: 40 },
    { name: 'Grade 11B', level: 'Grade 11', room: 'Room 1102', capacity: 40 },
    { name: 'Grade 12A', level: 'Grade 12', room: 'Room 1201', capacity: 40 },
    { name: 'Grade 12B', level: 'Grade 12', room: 'Room 1202', capacity: 40 },
  ];

  // 3. Insert Classes
  for (const cls of classes) {
    const { data: existingClass } = await supabase
        .from('classes')
        .select('id')
        .eq('school_id', schoolId)
        .eq('name', cls.name)
        .single();

    if (!existingClass) {
        const { error } = await supabase.from('classes').insert({
            school_id: schoolId,
            ...cls,
            academic_year: '2024'
        });
        if (error) console.error(`Error creating ${cls.name}:`, error);
        else console.log(`Created ${cls.name}`);
    } else {
        console.log(`Class ${cls.name} already exists`);
    }
  }

  console.log('Seeding completed.');
}

seed();
