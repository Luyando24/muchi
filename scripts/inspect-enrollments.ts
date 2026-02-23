
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('Inspecting enrollments table...');
  const { data, error } = await supabase.from('enrollments').select('*').limit(1);
  
  if (error) {
    console.error('Error fetching enrollments:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('enrollments columns:', Object.keys(data[0]));
    console.log('Sample row:', data[0]);
  } else {
    console.log('No enrollments found.');
  }
}

main();
