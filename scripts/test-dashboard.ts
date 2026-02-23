
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// import fetch from 'node-fetch';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Anon Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDashboard() {
  console.log('Logging in as system admin...');
  const { data: { session }, error } = await supabase.auth.signInWithPassword({
    email: 'admin@system.local',
    password: 'password123'
  });

  if (error || !session) {
    console.error('Login failed:', error);
    return;
  }

  console.log('Login successful. Token:', session.access_token.substring(0, 10) + '...');

  console.log('Fetching dashboard data...');
  try {
    const response = await fetch('http://localhost:3000/api/admin/dashboard', {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Dashboard fetch failed: ${response.status} ${response.statusText}`, text);
    } else {
      const data = await response.json();
      console.log('Dashboard data:', data);
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testDashboard();
