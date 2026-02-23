
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('Inspecting school_licenses table...');
  const { data, error } = await supabase.from('school_licenses').select('*').limit(1);
  
  if (error) {
    console.error('Error fetching school_licenses:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('school_licenses columns:', Object.keys(data[0]));
    console.log('Sample row:', data[0]);
  } else {
    console.log('No school_licenses found.');
  }
}

main();
