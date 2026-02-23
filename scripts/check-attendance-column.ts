
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking attendance table updated_at column...');
  
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('updated_at')
      .limit(1);

    if (error) {
      console.error('Error selecting updated_at:', error);
      if (error.message.includes('updated_at')) {
          console.log('CONFIRMED: updated_at column is missing.');
      }
    } else {
      console.log('Success: updated_at column exists.');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

check();
