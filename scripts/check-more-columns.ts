
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  try {
    const tables = ['attendance', 'reports'];
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('academic_year, term')
        .limit(1);

      if (error) {
        console.log(`Table ${table}: Columns MISSING or error: ${error.message}`);
      } else {
        console.log(`Table ${table}: Columns exist!`);
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkColumns();
