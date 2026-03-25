import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStaff() {
  const staffNumber = 'T20265998';
  console.log(`Checking staff number: ${staffNumber}`);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, staff_number')
    .eq('staff_number', staffNumber);

  if (error) {
    console.error('Error fetching staff member:', error);
    return;
  }

  if (data && data.length > 0) {
    const teacher = data[0];
    console.log('Found staff member:', teacher);
    
    // Check if Auth user exists
    const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(teacher.id);
    if (authUserError) {
      console.log('Auth user not found for ID:', teacher.id, authUserError.message);
    } else {
      console.log('Auth user found:', authUserData.user.email);
    }

    // Try to find a user in Auth by email pattern if email was missing
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
    } else {
      const matchByName = users.find(u => u.user_metadata?.full_name?.includes('Kennedy') && u.user_metadata?.full_name?.includes('Kabwe'));
      if (matchByName) {
        console.log('Found potential Auth match by name:', matchByName.email, matchByName.id);
      } else {
        console.log('No potential Auth match found by name.');
      }
    }
    
    // Test the RAW SQL logic
    const { data: sqlData, error: sqlError } = await supabase.rpc('get_email_by_identifier', { p_identifier: staffNumber });
    console.log('RPC Result (via rpc call):', sqlData);

    // Run a raw SQL test via another RPC or just local logic if I had a way.
    // Since I can only call RPCs, I'll try to call get_email_by_staff_number which was already there in 0063.
    const { data: staffRpcData, error: staffRpcError } = await supabase.rpc('get_email_by_staff_number', {
      p_staff_number: staffNumber
    });
    console.log('get_email_by_staff_number Result:', staffRpcData);
    if (staffRpcError) console.error('get_email_by_staff_number Error:', staffRpcError);

    // Let's check if the identifier lookup works for email itself
    const { data: emailRpcData } = await supabase.rpc('get_email_by_identifier', {
      p_identifier: 'k3nn3d7kabw3@gmail.com'
    });
    console.log('get_email_by_identifier with email Result:', emailRpcData);
  } else {
    console.log('Staff member not found with exact match.');
    
    // Check with ilike
    const { data: ilikeData } = await supabase
      .from('profiles')
      .select('id, full_name, email, staff_number')
      .ilike('staff_number', staffNumber);
      
    if (ilikeData && ilikeData.length > 0) {
      console.log('Found with ilike (case insensitive):', ilikeData[0]);
    } else {
      console.log('Staff member not found even with ilike.');
      
      // List a few staff numbers for reference
      const { data: listData } = await supabase
        .from('profiles')
        .select('staff_number')
        .not('staff_number', 'is', null)
        .limit(5);
      console.log('Sample of existing staff numbers:', listData);
    }
  }
}

checkStaff();
