
import { supabaseAdmin } from '../server/lib/supabase';

async function main() {
  console.log('Inspecting students table...');
  const { data: students, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .limit(5);
  
  if (error) {
    console.error('Error fetching students:', error);
  } else {
    console.log('Students table data:', students);
  }
}

main();
