import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const API_URL = 'http://localhost:8080/api';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  try {
    console.log('Starting License Vulnerability Check...');

    // 1. Create a Test School (Unlicensed)
    console.log('\nCreating Unlicensed Test School...');
    const schoolSlug = `unlicensed-school-${Math.floor(Math.random() * 10000)}`;
    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .insert({
        name: 'Unlicensed Test School',
        slug: schoolSlug,
        plan: 'Standard'
      })
      .select()
      .single();

    if (schoolError) throw new Error(`Failed to create school: ${schoolError.message}`);
    console.log(`✓ Created school: ${school.name} (${school.id})`);

    // 2. Create a School Admin User
    console.log('\nCreating School Admin User...');
    const email = `admin-${schoolSlug}@test.com`;
    const password = 'password123';
    
    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Unlicensed Admin' }
    });

    if (authError) throw new Error(`Failed to create user: ${authError.message}`);
    const userId = authData.user.id;

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: 'Unlicensed Admin',
        role: 'school_admin',
        school_id: school.id
      });

    if (profileError) throw new Error(`Failed to create profile: ${profileError.message}`);
    console.log(`✓ Created admin user: ${email}`);

    // Login to get token
    const { data: loginData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });
    
    if (loginError) throw new Error(`Login failed: ${loginError.message}`);
    const token = loginData.session.access_token;

    // 3. Test Access without License (Should Fail)
    console.log('\nTesting Access WITHOUT License (Expect Failure)...');
    const res1 = await fetch(`${API_URL}/school/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res1.status === 403) {
      const body = await res1.json();
      console.log('Response body:', body);
      if (body.code === 'LICENSE_EXPIRED' || body.message.includes('License Expired')) {
        console.log('✓ Access correctly denied: License Expired/Missing');
      } else {
        console.log(`? Access denied but unexpected message: ${body.message}`);
      }
    } else if (res1.status === 200) {
      console.log('X SECURITY VULNERABILITY: Access allowed without license!');
      console.log('Status: 200 OK');
    } else {
      console.log(`X Unexpected status: ${res1.status}`);
      const text = await res1.text();
      console.log('Response:', text);
    }

    // Cleanup
    console.log('\nCleaning up...');
    await supabaseAdmin.from('schools').delete().eq('id', school.id);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    console.log('✓ Cleanup complete');

  } catch (error: any) {
    console.error('\nVerification Failed:', error.message);
  }
}

main();
