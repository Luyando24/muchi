
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

async function listClasses() {
  const { data: schools } = await supabase.from('schools').select('id, name').ilike('name', '%Arakan Boys%').limit(1);
  if (!schools || schools.length === 0) { console.error('School not found'); return; }
  const school = schools[0];
  console.log(`Classes for ${school.name} (${school.id}):`);

  const { data: classes } = await supabase.from('classes').select('*').eq('school_id', school.id);
  if (classes) {
    classes.forEach(c => console.log(`- ${c.name} (${c.id})`));
  } else {
    console.log('No classes found.');
  }
}

listClasses();
