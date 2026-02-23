
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
  console.log('Inspecting tables...');
  
  const { data: tables, error } = await supabase
    .from('information_schema.columns')
    .select('table_name, column_name, data_type')
    .in('table_name', ['students', 'classes', 'enrollments', 'profiles', 'attendance'])
    .eq('table_schema', 'public');

  if (error) {
    // Try RPC if direct access to information_schema is blocked
    console.error('Error querying information_schema:', error);
    return;
  }

  const schema: any = {};
  tables.forEach((row: any) => {
    if (!schema[row.table_name]) schema[row.table_name] = [];
    schema[row.table_name].push(`${row.column_name} (${row.data_type})`);
  });

  console.log(JSON.stringify(schema, null, 2));
}

inspect();
