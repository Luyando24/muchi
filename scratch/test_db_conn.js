import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('schools').select('id, name, location_type').limit(2);
  if (error) {
    console.error('Error fetching schools:', error);
  } else {
    console.log('Schools data:', data);
  }

  const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, role, location_type').limit(2);
  if (profileError) {
    console.error('Error fetching profiles:', profileError);
  } else {
    console.log('Profiles data:', profiles);
  }
}

run();
