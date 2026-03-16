import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function verifyCascade() {
  console.log('1. Creating test school...');
  const { data: school, error: schoolErr } = await supabaseAdmin.from('schools').insert({
    name: 'Test Delete School',
    slug: 'test-delete-school',
    plan: 'Standard'
  }).select().single();
  
  if (schoolErr) throw schoolErr;
  console.log('School Created ID:', school.id);

  console.log('2. Creating test user for school...');
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: 'test_delete_admin@example.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: { full_name: 'Test Admin', role: 'school_admin', school_id: school.id }
  });
  
  if (authErr) throw authErr;
  console.log('Test User Created ID:', authData.user.id);
  
  // Need to add row to profile
  const { error: profErr } = await supabaseAdmin.from('profiles').upsert({
    id: authData.user.id,
    school_id: school.id,
    role: 'school_admin',
    full_name: 'Test Admin',
    email: 'test_delete_admin@example.com'
  });
  if (profErr) throw profErr;

  console.log('3. Simulating Backend Delete Logic...');
  // Fetch profiles for school
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id').eq('school_id', school.id);
  
  // Delete from auth
  for (const prof of profiles || []) {
    console.log('Deleting Auth User:', prof.id);
    await supabaseAdmin.auth.admin.deleteUser(prof.id);
  }
  
  // Delete School
  console.log('Deleting School:', school.id);
  const { error: delErr } = await supabaseAdmin.from('schools').delete().eq('id', school.id);
  if (delErr) throw delErr;

  console.log('4. Verifying Cascade Deletes...');
  const { data: schoolCheck } = await supabaseAdmin.from('schools').select('id').eq('id', school.id).maybeSingle();
  const { data: profCheck } = await supabaseAdmin.from('profiles').select('id').eq('school_id', school.id);
  const { data: userCheck } = await supabaseAdmin.auth.admin.getUserById(authData.user.id).catch(() => ({ data: null }));

  console.log('School exists?', !!schoolCheck);
  console.log('Profiles remaining:', profCheck?.length || 0);
  console.log('Auth user exists?', userCheck?.user ? true : false);
  
  console.log('VERIFICATION COMPLETE');
}

verifyCascade().catch(console.error);
