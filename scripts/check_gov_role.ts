import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role');

  if (error) {
     console.error("DB Error:", error);
     return;
  }
  
  const govProfiles = profiles.filter(p => !p.role || p.role.includes('gov') || p.role === 'government');
  console.log("Gov Profiles found:");
  console.dir(govProfiles, { depth: null });

  const adminProfile = profiles.find(p => p.full_name?.toLowerCase().includes('admin'));
  console.log("Admin checking:");
  console.dir(adminProfile, { depth: null });
}

check();
