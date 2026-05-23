
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
  const migrationPath = path.join(__dirname, '../supabase/migrations/0086_add_teacher_location_type.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying migration via RPC...');
  
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  
  if (error) {
      console.error('RPC execute_sql failed:', error);
      console.log('Could not apply migration automatically. Please run the SQL file manually in Supabase SQL Editor.');
  } else {
      console.log('Migration applied successfully via execute_sql!', data);
  }
}

applyMigration();
