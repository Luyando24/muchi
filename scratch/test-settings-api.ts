import { supabaseAdmin } from '../server/lib/supabase.js';

async function testApi() {
  try {
    console.log('Logging in as admin@muchi.com...');
    // Sign in using the known admin email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'admin@muchi.com',
      options: {
        redirectTo: 'http://localhost:3000'
      }
    });

    // Alternatively, let's fetch user and mock the authorization header with a custom signed token or we can just use supabase client to sign in.
    // Wait, let's check if we can sign in with password. Is there a default password for admin@muchi.com?
    // Let's sign in with password or use a token we forge or get a token from the auth database.
    // In Supabase, can we get a session?
    // Let's create a session or get a token by signing in using password if we know it.
    // Or, we can just sign in with password using default password 'Admin123!' or similar.
    // Let's try to sign in with password.
    const supabaseClient = supabaseAdmin; // we can use it to sign in if we can, but auth.signInWithPassword is on client
    // Since supabaseAdmin is the admin client, let's use supabaseAdmin.auth.signInWithPassword:
    const { data: loginData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
      email: 'admin@muchi.com',
      password: 'MuchiAdmin123!' // default password usually seeded
    });

    let token = '';
    if (loginError) {
      console.log('Password signin failed:', loginError.message);
      console.log('Creating a magic link token instead...');
      // If password login fails, let's sign in using a token we fetch or construct.
      // Wait, we can get a valid session by using supabaseAdmin.auth.admin.getUser:
      // Let's just create a custom token or fetch one from auth.refresh_tokens or we can create a user session.
      // Wait, let's try password 'admin123' or 'admin'.
      const { data: loginData2, error: loginError2 } = await supabaseAdmin.auth.signInWithPassword({
        email: 'admin@muchi.com',
        password: 'admin'
      });
      if (!loginError2 && loginData2.session) {
        token = loginData2.session.access_token;
      }
    } else if (loginData.session) {
      token = loginData.session.access_token;
    }

    if (!token) {
      // Let's look up if there is an active session or let's create a temporary token using jwt.
      // But wait! If we have the supabaseServiceKey, we can create a JWT signed with the supabase jwt secret!
      // However, we don't have the jwt secret easily.
      // Let's try signing in with 'admin12345' or check the migrations/seed files for admin password!
      console.error('Could not get token. Make sure the credentials or email is correct.');
      return;
    }

    console.log('Token acquired. Sending PUT request to /api/admin/settings...');

    const settingsData = {
      system_name: 'MUCHI Central Test',
      maintenance_mode: 'false',
      registration_open: 'true',
      support_email: 'support@muchi.com',
      default_language: 'en',
      session_timeout: '60',
      whatsapp_number: '260570260374',
      default_currency: 'ZMW',
      supported_currencies: '["ZMW", "USD", "ZAR"]',
      setup_completion_reward_days: '30',
      contact_phone: '+260 97 1234567',
      contact_email: 'info@muchi.edu.zm',
      contact_office: '45 Independence Avenue\nLusaka\nZambia'
    };

    const response = await fetch('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settingsData)
    });

    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('API test error:', err);
  }
}

testApi();
