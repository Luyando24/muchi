
import { supabaseAdmin } from '../server/lib/supabase';

async function main() {
  console.log('Inspecting profiles table schema...');
  
  // Get one profile to see columns
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .limit(1)
    .single();
  
  if (error) {
    console.error('Error fetching profile:', error);
  } else {
    console.log('Profile columns:', Object.keys(profile));
    console.log('Sample profile data:', profile);
  }
}

main();
