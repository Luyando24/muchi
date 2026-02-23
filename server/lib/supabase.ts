import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Missing Supabase Service Key. Admin operations will fail.');
}

// Create a dummy client if config is missing to prevent crash on import
// This allows the server to start, but requests will fail with a clear error
const dummyClient = {
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.reject(new Error('Supabase not configured: Missing VITE_SUPABASE_URL')),
        maybeSingle: () => Promise.reject(new Error('Supabase not configured: Missing VITE_SUPABASE_URL'))
      }),
      in: () => ({
        eq: () => Promise.reject(new Error('Supabase not configured: Missing VITE_SUPABASE_URL'))
      })
    }),
    insert: () => Promise.reject(new Error('Supabase not configured: Missing VITE_SUPABASE_URL')),
    update: () => Promise.reject(new Error('Supabase not configured: Missing VITE_SUPABASE_URL')),
    upsert: () => Promise.reject(new Error('Supabase not configured: Missing VITE_SUPABASE_URL')),
    delete: () => Promise.reject(new Error('Supabase not configured: Missing VITE_SUPABASE_URL'))
  }),
  auth: {
    getUser: () => Promise.reject(new Error('Supabase not configured: Missing VITE_SUPABASE_URL')),
    admin: {
      createUser: () => Promise.reject(new Error('Supabase not configured: Missing VITE_SUPABASE_URL')),
      deleteUser: () => Promise.reject(new Error('Supabase not configured: Missing VITE_SUPABASE_URL'))
    }
  }
};

// This client has full admin privileges - use with caution!
export const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : dummyClient as any;
