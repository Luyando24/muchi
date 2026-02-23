import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../server/lib/supabase';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Anon Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFinanceCRUD() {
  console.log('--- Starting Finance CRUD Test ---');

  try {
    // Login
    const email = 'schooladmin@test.com';
    const password = 'password123';
    
    console.log(`Logging in as ${email}...`);
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (loginError || !session) throw loginError || new Error('No session');
    const token = session.access_token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 1. CREATE
    console.log('1. Creating Finance Record...');
    const newRecord = {
      category: 'Tuition Fees',
      amount: 1500.50,
      type: 'income',
      description: 'Test Student Fee',
      date: new Date().toISOString().split('T')[0]
    };

    const createRes = await fetch('http://localhost:3000/api/school/finance', {
      method: 'POST',
      headers,
      body: JSON.stringify(newRecord)
    });

    if (!createRes.ok) throw new Error(`Create Failed: ${await createRes.text()}`);
    const createdRecord = await createRes.json();
    console.log('Created:', createdRecord);

    if (createdRecord.amount != 1500.50) throw new Error('Amount mismatch');

    // 2. READ (List)
    console.log('2. Fetching Finance Records...');
    const listRes = await fetch('http://localhost:3000/api/school/finance', { headers });
    if (!listRes.ok) throw new Error(`List Failed: ${await listRes.text()}`);
    const records = await listRes.json();
    console.log(`Fetched ${records.length} records.`);
    
    const found = records.find((r: any) => r.id === createdRecord.id);
    if (!found) throw new Error('Created record not found in list');

    // 3. READ (Stats)
    console.log('3. Fetching Stats...');
    const statsRes = await fetch('http://localhost:3000/api/school/finance/stats', { headers });
    if (!statsRes.ok) throw new Error(`Stats Failed: ${await statsRes.text()}`);
    const stats = await statsRes.json();
    console.log('Stats:', stats);

    // 4. UPDATE
    console.log('4. Updating Record...');
    const updateRes = await fetch(`http://localhost:3000/api/school/finance/${createdRecord.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ...newRecord,
        amount: 2000.00,
        description: 'Updated Fee'
      })
    });

    if (!updateRes.ok) throw new Error(`Update Failed: ${await updateRes.text()}`);
    const updatedRecord = await updateRes.json();
    console.log('Updated:', updatedRecord);
    if (updatedRecord.amount != 2000.00) throw new Error('Update amount mismatch');

    // 5. DELETE
    console.log('5. Deleting Record...');
    const deleteRes = await fetch(`http://localhost:3000/api/school/finance/${createdRecord.id}`, {
      method: 'DELETE',
      headers
    });

    if (!deleteRes.ok) throw new Error(`Delete Failed: ${await deleteRes.text()}`);
    console.log('Deleted successfully.');

    console.log('--- Test Passed ---');

  } catch (error: any) {
    console.error('Test Failed:', error.message || error);
    process.exit(1);
  }
}

testFinanceCRUD();
