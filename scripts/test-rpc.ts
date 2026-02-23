
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('Testing exec_sql RPC...');
  
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
  
  if (error) {
    console.log('RPC exec_sql failed:', error.message);
  } else {
    console.log('RPC exec_sql success:', data);
  }
}

main();
