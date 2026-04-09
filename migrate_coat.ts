import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function test() {
  const query = `ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS coat_of_arms_url TEXT;`;
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: query });
  console.log('Result:', error || 'Success');
}
test();
