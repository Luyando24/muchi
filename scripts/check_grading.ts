
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''; // Or service role key if needed

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGrading() {
  console.log('Checking schools...');
  const { data: schools } = await supabase.from('schools').select('id, name');
  console.log('Schools:', schools);

  console.log('Checking grading_scales...');
  const { data: scales, error: scalesError } = await supabase
    .from('grading_scales')
    .select('*');

  if (scalesError) {
    console.error('Error fetching grading_scales:', scalesError);
  } else {
    console.log('Grading Scales:', scales);
  }
}

checkGrading();
