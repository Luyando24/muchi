
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('--- Schools ---');
  const { data: schools, error: schoolsError } = await supabase.from('schools').select('*');
  if (schoolsError) console.error(schoolsError);

  console.log('\n--- Counts per School ---');
  for (const school of schools || []) {
      const { count: subjectCount } = await supabase
          .from('subjects')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id);
          
      const { count: classCount } = await supabase
          .from('classes')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id);
          
      console.log(`School: ${school.name} (${school.id})`);
      console.log(`  - Subjects: ${subjectCount}`);
      console.log(`  - Classes: ${classCount}`);
  }
}

checkData();
