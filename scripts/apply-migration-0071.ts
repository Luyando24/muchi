import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  const migrationPath = path.join(__dirname, '../supabase/migrations/0071_add_head_of_department.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying migration via RPC...');
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
      console.error('RPC exec_sql failed:', error);
      const { error: error2 } = await supabase.rpc('execute_sql', { sql });
      if (error2) {
          console.error('RPC execute_sql failed:', error2);
      } else {
          console.log('Migration applied successfully via execute_sql!');
      }
  } else {
      console.log('Migration applied successfully via exec_sql!');
  }
}

applyMigration();