import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    console.log("Logging in...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@muchi.com',
      password: 'MuchiAdmin123!'
    });

    if (authError) {
      console.error("Login failed:", authError);
      return;
    }

    const token = authData.session?.access_token;
    console.log("Token retrieved successfully.");

    console.log("Fetching stats from local server...");
    const res = await fetch('http://localhost:8080/api/admin/finances/stats', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log("Response Status:", res.status);
    const body = await res.text();
    console.log("Response Body:", body);
  } catch (err) {
    console.error("HTTP Fetch failed:", err);
  }
}
run();
