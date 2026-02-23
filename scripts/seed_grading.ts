
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const ECZ_SCALES = [
  { grade: '1', min: 75, max: 100, gpa: 0, desc: 'Distinction' },
  { grade: '2', min: 70, max: 74, gpa: 0, desc: 'Distinction' },
  { grade: '3', min: 65, max: 69, gpa: 0, desc: 'Merit' },
  { grade: '4', min: 60, max: 64, gpa: 0, desc: 'Merit' },
  { grade: '5', min: 55, max: 59, gpa: 0, desc: 'Credit' },
  { grade: '6', min: 50, max: 54, gpa: 0, desc: 'Credit' },
  { grade: '7', min: 45, max: 49, gpa: 0, desc: 'Satisfactory' },
  { grade: '8', min: 40, max: 44, gpa: 0, desc: 'Satisfactory' },
  { grade: '9', min: 0, max: 39, gpa: 0, desc: 'Unsatisfactory' },
];

async function seedGrading() {
  console.log('Checking schools...');
  const { data: schools, error } = await supabase.from('schools').select('id, name');

  if (error || !schools) {
    console.error('Error fetching schools:', error);
    return;
  }

  for (const school of schools) {
    console.log(`Checking grading scales for school: ${school.name} (${school.id})`);
    
    const { data: existingScales } = await supabase
      .from('grading_scales')
      .select('id')
      .eq('school_id', school.id)
      .limit(1);

    if (existingScales && existingScales.length > 0) {
      console.log(`Grading scales already exist for ${school.name}, skipping.`);
      continue;
    }

    console.log(`Seeding grading scales for ${school.name}...`);
    const scalesToInsert = ECZ_SCALES.map(s => ({
      school_id: school.id,
      grade: s.grade,
      min_percentage: s.min,
      max_percentage: s.max,
      description: s.desc
    }));

    const { error: insertError } = await supabase
      .from('grading_scales')
      .insert(scalesToInsert);

    if (insertError) {
      console.error(`Error seeding scales for ${school.name}:`, insertError);
    } else {
      console.log(`Successfully seeded grading scales for ${school.name}`);
    }
  }
}

seedGrading();
