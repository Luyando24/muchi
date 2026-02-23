import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TEST_EMAIL = 'schooladmin@test.com';
const TEST_PASSWORD = 'password123';
const BASE_URL = 'http://localhost:3000/api';

async function testSettingsUpdate() {
  console.log('🚀 Starting Settings Update Test...');

  try {
    // 1. Login as School Admin
    console.log('\n1. Logging in as School Admin...');
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (loginError || !session) {
      throw new Error(`Login failed: ${loginError?.message}`);
    }
    console.log('✅ Login successful');
    const token = session.access_token;

    // 2. Get Current Settings
    console.log('\n2. Fetching current settings...');
    const getRes = await fetch(`${BASE_URL}/school/settings`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!getRes.ok) {
      const err = await getRes.json();
      throw new Error(`Fetch failed: ${JSON.stringify(err)}`);
    }

    const currentSettings = await getRes.json();
    console.log('✅ Current School Name:', currentSettings.name);

    // 3. Update Settings
    console.log('\n3. Updating settings...');
    const newTerm = `Term ${Math.floor(Math.random() * 3) + 1}`;
    const updateData = {
      name: currentSettings.name, // Keep name same
      academic_year: '2025',
      current_term: newTerm,
      email: 'admin@updated-school.com',
      phone: '+260 999 000000',
      address: '123 Updated Lane',
      website: 'https://updated-school.com'
    };

    const updateRes = await fetch(`${BASE_URL}/school/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    if (!updateRes.ok) {
      const err = await updateRes.json();
      throw new Error(`Update failed: ${JSON.stringify(err)}`);
    }

    const updatedSettings = await updateRes.json();
    console.log('✅ Updated Settings:', updatedSettings);

    if (updatedSettings.current_term !== newTerm) {
      throw new Error('Update verification failed: term did not change');
    }
    console.log('✅ Verification successful');

    console.log('\n✨ All Settings tests passed!');

  } catch (error: any) {
    console.error('\n❌ Test Failed:', error.message);
    process.exit(1);
  }
}

testSettingsUpdate();
