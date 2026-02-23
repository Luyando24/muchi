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
  console.log('Seeding Arakan Boys Secondary Grading System (ECZ Standard)...');

  // 1. Get School "Arakan Boys Secondary"
  const schoolName = 'Arakan Boys Secondary';
  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .select('id')
    .eq('name', schoolName)
    .single();

  if (schoolError || !school) {
    console.error(`Error: School '${schoolName}' not found. Please seed the school first.`);
    process.exit(1);
  }

  const schoolId = school.id;
  console.log(`Found school: ${schoolName} (${schoolId})`);

  // 2. Define ECZ Grading Scales
  const gradingScales = [
    { grade: '1', min_percentage: 75, max_percentage: 100, description: 'Distinction' },
    { grade: '2', min_percentage: 70, max_percentage: 74, description: 'Distinction' },
    { grade: '3', min_percentage: 65, max_percentage: 69, description: 'Merit' },
    { grade: '4', min_percentage: 60, max_percentage: 64, description: 'Merit' },
    { grade: '5', min_percentage: 55, max_percentage: 59, description: 'Credit' },
    { grade: '6', min_percentage: 50, max_percentage: 54, description: 'Credit' },
    { grade: '7', min_percentage: 45, max_percentage: 49, description: 'Satisfactory' },
    { grade: '8', min_percentage: 40, max_percentage: 44, description: 'Satisfactory' },
    { grade: '9', min_percentage: 0, max_percentage: 39, description: 'Unsatisfactory' }
  ];

  // 3. Insert Grading Scales
  let scalesInserted = 0;
  for (const scale of gradingScales) {
    const { data: existing } = await supabase
      .from('grading_scales')
      .select('id')
      .eq('school_id', schoolId)
      .eq('grade', scale.grade)
      .single();

    if (!existing) {
      const { error } = await supabase.from('grading_scales').insert({
        school_id: schoolId,
        ...scale
      });
      
      if (error) console.error(`Error inserting grade ${scale.grade}:`, error);
      else {
        console.log(`Inserted grade ${scale.grade} (${scale.description})`);
        scalesInserted++;
      }
    } else {
      console.log(`Grade ${scale.grade} already exists`);
    }
  }

  // 4. Define Default Assessment Weights
  const weights = [
    { assessment_type: 'Exam', weight_percentage: 60 },
    { assessment_type: 'Test', weight_percentage: 20 },
    { assessment_type: 'Assignment', weight_percentage: 10 },
    { assessment_type: 'Project', weight_percentage: 10 }
  ];

  // 5. Insert Weights
  let weightsInserted = 0;
  for (const weight of weights) {
    const { data: existing } = await supabase
      .from('grading_weights')
      .select('id')
      .eq('school_id', schoolId)
      .eq('assessment_type', weight.assessment_type)
      .single();

    if (!existing) {
      const { error } = await supabase.from('grading_weights').insert({
        school_id: schoolId,
        ...weight
      });

      if (error) console.error(`Error inserting weight ${weight.assessment_type}:`, error);
      else {
        console.log(`Inserted weight for ${weight.assessment_type}`);
        weightsInserted++;
      }
    } else {
      console.log(`Weight for ${weight.assessment_type} already exists`);
    }
  }

  console.log(`Seeding completed. Inserted ${scalesInserted} scales and ${weightsInserted} weights.`);
}

seed();
