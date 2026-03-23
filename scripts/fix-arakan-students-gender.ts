
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

const log = (msg: string) => console.log(`[FIX] ${msg}`);

async function main() {
  const schoolName = 'Arakan Boys Secondary';
  log(`Starting gender fix for: ${schoolName}`);

  // 1. Find the school
  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .select('id')
    .eq('name', schoolName)
    .single();

  if (schoolError || !school) {
    console.error(`Error finding school ${schoolName}:`, schoolError?.message || 'School not found');
    return;
  }

  const schoolId = school.id;
  log(`Found school ID: ${schoolId}`);

  // 2. Update all students in this school to 'Male'
  const { data, error: updateError, count } = await supabase
    .from('profiles')
    .update({ gender: 'Male' })
    .eq('school_id', schoolId)
    .eq('role', 'student')
    .select('*', { count: 'estimated' });

  if (updateError) {
    console.error('Error updating student genders:', updateError.message);
  } else {
    log(`Successfully updated gender to 'Male' for ${data?.length || 0} students.`);
    
    // Double check if there are any students left with non-male gender
    const { count: remainingCount, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('role', 'student')
        .neq('gender', 'Male');
        
    if (countError) {
        log(`Warning: Could not verify remaining students: ${countError.message}`);
    } else if (remainingCount && remainingCount > 0) {
        log(`Warning: There are still ${remainingCount} students whose gender is not 'Male'.`);
    } else {
        log('Verification successful: All students in this school now have gender set to Male.');
    }
  }
}

main().catch(console.error);
