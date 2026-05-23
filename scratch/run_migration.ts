import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const sqlPath = './supabase/migrations/0088_create_business_transactions.sql';
  console.log('Reading SQL file:', sqlPath);
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log('Executing SQL in database via exec_sql...');
  
  // Try exec_sql with { sql }
  let res = await supabase.rpc('exec_sql', { sql });
  if (res.error) {
    console.log('exec_sql { sql } failed with:', res.error);
    console.log('Trying exec_sql { sql_query }...');
    res = await supabase.rpc('exec_sql', { sql_query: sql });
  }
  
  if (res.error) {
    console.error('Migration failed:', res.error);
  } else {
    console.log('Migration completed successfully:', res.data || 'Success');
  }
}

main();
