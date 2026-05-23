import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectProfiles() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .limit(1);

  if (error) {
    console.error(error);
  } else {
    console.log("Profile columns:", Object.keys(data[0] || {}));
    console.log("Sample profile:", data[0]);
  }
}

inspectProfiles();
