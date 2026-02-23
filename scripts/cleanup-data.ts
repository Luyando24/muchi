
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const log = (msg: string) => console.log(`[CLEANUP] ${msg}`);

async function cleanup() {
  log('Starting cleanup process...');

  // 1. Delete Users (Auth & Profiles)
  // We'll search for users with @chongwe.edu.zm domain
  log('Deleting Users...');
  let hasMore = true;
  let page = 1;
  const perPage = 50;

  while (hasMore) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: perPage
    });

    if (error) {
      console.error('Error listing users:', error);
      break;
    }

    if (!users || users.length === 0) {
      hasMore = false;
      break;
    }

    const targetUsers = users.filter(u => u.email?.endsWith('@chongwe.edu.zm'));
    
    if (targetUsers.length === 0 && users.length < perPage) {
        hasMore = false; // No more users to check
    }

    for (const user of targetUsers) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(`Error deleting user ${user.email}:`, deleteError);
      } else {
        log(`Deleted user: ${user.email}`);
      }
    }
    
    page++;
  }

  // 2. Delete School (Cascading delete should handle related data)
  log('Deleting School...');
  const { data: school, error: schoolFetchError } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', 'chongwe-secondary-school')
    .single();

  if (schoolFetchError && schoolFetchError.code !== 'PGRST116') { // PGRST116 is "No rows found"
      console.error('Error fetching school:', schoolFetchError);
  }

  if (school) {
    // Before deleting school, let's try to clean up related tables just in case cascade is missing
    // or if we want to be explicit.
    // However, if we trust cascade, we can just delete the school.
    // Based on migration 0017_fix_schema_for_seeding.sql, we added ON DELETE CASCADE for:
    // enrollments, assignments, attendance
    // classes usually have cascade on school_id (checked in 0011/0004 but assumed)
    
    // Let's do explicit cleanup for some tables to be safe
    
    // Delete enrollments
    await supabase.from('enrollments').delete().eq('school_id', school.id);
    
    // Delete classes
    await supabase.from('classes').delete().eq('school_id', school.id);
    
    // Delete subjects
    await supabase.from('subjects').delete().eq('school_id', school.id);

    // Delete school
    const { error: deleteSchoolError } = await supabase
      .from('schools')
      .delete()
      .eq('id', school.id);

    if (deleteSchoolError) {
      console.error('Error deleting school:', deleteSchoolError);
    } else {
      log('Deleted school: Chongwe Secondary School');
    }
  } else {
      log('School not found.');
  }

  log('Cleanup completed!');
}

cleanup().catch(console.error);
