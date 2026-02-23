
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTables() {
  const tables = ['classes', 'enrollments'];
  
  for (const table of tables) {
    console.log(`Checking for ${table} table...`);
    const { error } = await supabaseAdmin.from(table).select('id').limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log(`Table ${table} DOES NOT exist (42P01).`);
      } else {
        console.log(`Error checking table ${table}:`, error.message);
      }
    } else {
      console.log(`Table ${table} EXISTS.`);
    }
  }
}

checkTables();
