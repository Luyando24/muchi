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
  
  if (govUser) {
    // 1. Update Auth user_metadata
    await supabaseAdmin.auth.admin.updateUserById(govUser.id, {
      user_metadata: {
        ...govUser.user_metadata,
        role: 'government'
      }
    });
    
    // 2. Update Profiles table
    const { error: pError } = await supabaseAdmin.from('profiles').update({ role: 'government' }).eq('id', govUser.id);
    if (pError) console.error("Profile update error:", pError);
    else console.log("Updated admin@gov.com to government role!");
  } else {
    console.log("Could not find admin@gov.com");
  }
}

check();
