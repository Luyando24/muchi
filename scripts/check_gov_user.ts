import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
  
  if (error) {
     console.error("Auth DB Error:", error);
     return;
  }

  const govUser = users.users.find(u => u.email === 'admin@gov.com');
  console.log('Gov User in Auth:', govUser);

  if (govUser) {
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', govUser.id).single();
    console.log('Gov User in Profiles:', profile);
  }
}

check();
