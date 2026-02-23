
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../server/lib/supabase';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Anon Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSchoolDashboard() {
  console.log('--- Starting School Dashboard Test ---');

  try {
    // 1. Get a School ID
    const { data: schools, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('id, name')
      .limit(1);

    if (schoolError || !schools || schools.length === 0) {
      console.error('No schools found. Cannot create school admin.');
      // Create a dummy school if none exists?
      console.log('Creating a test school...');
      const { data: newSchool, error: createSchoolError } = await supabaseAdmin
        .from('schools')
        .insert({ name: 'Test School', address: '123 Test St', email: 'test@school.com', phone: '1234567890' })
        .select()
        .single();
      
      if (createSchoolError) throw createSchoolError;
      console.log('Created school:', newSchool.name);
      schools.push(newSchool);
    }

    const school = schools[0];
    console.log(`Using School: ${school.name} (${school.id})`);

    // 2. Create/Update Test User
    const email = 'schooladmin@test.com';
    const password = 'password123';
    
    console.log(`Ensuring user ${email} exists...`);
    
    // Check if user exists (by listing, or just try creating)
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users?.find(u => u.email === email);
    
    let userId;

    if (existingUser) {
      console.log('User exists. Updating password...');
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: password });
      userId = existingUser.id;
    } else {
      console.log('Creating new user...');
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Test School Admin' }
      });
      if (createError) throw createError;
      userId = newUser.user.id;
    }

    // 3. Ensure Profile has correct role and school_id
    console.log('Updating profile role and school_id...');
    // Remove email from upsert as it might not be in profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        role: 'school_admin',
        school_id: school.id,
        full_name: 'Test School Admin'
        // email: email // Removed to avoid error if column missing
      });

    if (profileError) throw profileError;

    // 4. Login as the user to get a token
    console.log('Logging in...');
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (loginError || !session) throw loginError || new Error('No session');
    console.log('Login successful.');

    // 5. Fetch Dashboard Data from API
    console.log('Fetching /api/school/dashboard...');
    const response = await fetch('http://localhost:3000/api/school/dashboard', {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${text}`);
    }

    const data = await response.json();
    console.log('--- Dashboard Data Received ---');
    console.log(JSON.stringify(data, null, 2));
    console.log('--- Test Passed ---');

  } catch (error: any) {
    console.error('Test Failed:', error.message || error);
    process.exit(1);
  }
}

testSchoolDashboard();
