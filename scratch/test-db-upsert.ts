import { supabaseAdmin } from '../server/lib/supabase.js';

async function testUpsert() {
  const updates = [
    {
      key: 'contact_phone',
      value: '+260 97 1234567',
      updated_at: new Date().toISOString(),
      updated_by: '8a7ca257-1d11-4992-b7e4-b5bd9a85b110' // actual system admin uuid
    }
  ];

  try {
    console.log('Attempting upsert...');
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .upsert(updates)
      .select();

    if (error) {
      console.error('Upsert returned error:', error);
    } else {
      console.log('Upsert succeeded! Data:', data);
    }
  } catch (err) {
    console.error('Catch error during upsert:', err);
  }
}

testUpsert();
