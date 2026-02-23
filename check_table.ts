
import { supabaseAdmin } from './server/lib/supabase';

async function checkTable() {
  const { error } = await supabaseAdmin.from('student_subjects').select('id').limit(1);
  if (error) {
    console.log('Error:', error.message);
    if (error.code === '42P01') {
      console.log('Table student_subjects does not exist.');
    }
  } else {
    console.log('Table student_subjects exists.');
  }
}

checkTable();
