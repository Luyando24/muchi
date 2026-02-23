
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function main() {
  console.log('Applying GPA removal migration using exec_sql RPC...');

  const migrationPath = path.join(__dirname, '../supabase/migrations/0024_remove_gpa_column.sql');
  if (!fs.existsSync(migrationPath)) {
      console.error(`Migration file not found at: ${migrationPath}`);
      process.exit(1);
  }
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  // Execute using exec_sql RPC
  const { error } = await supabase.rpc('exec_sql', { sql: migrationSql });
  
  if (error) {
    console.error('Error applying migration via RPC:', error);
    
    // Fallback: Check if the error is because the function doesn't exist
    if (error.message.includes('function "exec_sql" does not exist')) {
        console.error('Please create the exec_sql function in your database first.');
    }
  } else {
    console.log('Migration 0024_remove_gpa_column.sql applied successfully!');
  }
}

main();
