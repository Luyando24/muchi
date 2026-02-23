
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: schools, error } = await supabase.from('schools').select('id, name, slug');
  if (error) console.error(error);
  else console.table(schools);
}

main();
