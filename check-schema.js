import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: grades } = await supabaseAdmin.from('student_grades').select('school_id, percentage');
  const { data: schools } = await supabaseAdmin.from('schools').select('id, name, province, district');
  console.log("grades count:", grades?.length);
  console.log("schools count:", schools?.length);
}
check();
