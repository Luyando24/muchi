import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

// Set NODE_ENV to production to prevent server/index.ts from auto-starting
process.env.NODE_ENV = 'production';

// Import app after setting env var (dynamic import to ensure env var is set first)
// But dynamic import is async.
// Let's rely on the user running this script to set NODE_ENV or just handle the port conflict if it happens.
// Actually, in CommonJS 'require' works, but in ESM 'import' is hoisted.
// We'll use a dynamic import.

const PORT = 3002;
const BASE_URL = `http://localhost:${PORT}`;

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or Anon Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log('Importing server app...');
  // Dynamic import to allow setting NODE_ENV if we could, but here we just import
  const { default: app } = await import('../server/index');

  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    console.log('--- Starting Admin API Tests ---');

    // 1. Login as System Admin
    console.log('1. Logging in as System Admin...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: process.env.ADMIN_EMAIL || 'admin@muchi.com',
      password: process.env.ADMIN_PASSWORD || 'MuchiAdmin123!'
    });

    if (authError) {
        console.error('Login failed. Ensure you have run "npm run create-admin" first.');
        throw authError;
    }
    const token = authData.session?.access_token;
    console.log('   Login successful.');

    // 2. Test GET /api/admin/users
    console.log('2. Testing GET /api/admin/users...');
    const res1 = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res1.ok) {
        const text = await res1.text();
        throw new Error(`GET /users failed: ${res1.status} ${text}`);
    }
    const users = await res1.json();
    console.log(`   Success! Retrieved ${users.length} users.`);

    // 3. Test POST /api/admin/users (Create new admin)
    console.log('3. Testing POST /api/admin/users...');
    const newAdminEmail = `testadmin_${Date.now()}@muchi.com`;
    const res2 = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        email: newAdminEmail,
        password: 'TestPassword123!',
        full_name: 'Test Admin',
        role: 'school_admin',
        school_id: 'none'
      })
    });
    
    if (!res2.ok) {
        const err = await res2.text();
        throw new Error(`POST /users failed: ${res2.status} ${err}`);
    }
    const createdUserResponse = await res2.json();
    // The API returns { message, user: { ... } } or { message, user: { user: { ... } } } depending on supabase response structure
    // Let's check the structure in server/routes/admin.ts: res.status(201).json({ message: 'User created successfully', user });
    // And user is result of supabaseAdmin.auth.admin.createUser, which returns { user, ... }
    
    const createdUserId = createdUserResponse.user.user.id; 
    console.log('   Success! Created user:', createdUserResponse.user.user.email);
    
    // 4. Test DELETE /api/admin/users/:id
    console.log(`4. Testing DELETE /api/admin/users/${createdUserId}...`);
    const res3 = await fetch(`${BASE_URL}/api/admin/users/${createdUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res3.ok) {
         const err = await res3.text();
         throw new Error(`DELETE /users failed: ${res3.status} ${err}`);
    }
    console.log('   Success! Deleted user.');

    console.log('--- All Tests Passed ---');

  } catch (error: any) {
    console.error('Test Failed:', error);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
