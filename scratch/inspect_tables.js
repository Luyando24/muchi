import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.rpc('get_tables_list');
  if (error) {
    // If RPC doesn't exist, we can run a SQL command or query schemas if we have pg_graphql or others,
    // but a direct SQL execution can be done by calling a query, or simply querying a known table.
    // Let's try querying information_schema via a generic SQL endpoint if we have one, or just try to
    // select from system_settings.
    console.log("RPC get_tables_list failed, attempting direct queries on potential settings tables...");
  } else {
    console.log('Tables:', data);
  }

  // Let's test if we can select from system_settings
  const { data: settingsData, error: settingsError } = await supabase.from('system_settings').select('*');
  console.log('system_settings error:', settingsError?.message || 'None');
  console.log('system_settings data:', settingsData);

  // Let's check school_settings
  const { data: schoolSettingsData, error: schoolSettingsError } = await supabase.from('school_settings').select('*');
  console.log('school_settings error:', schoolSettingsError?.message || 'None');
  console.log('school_settings data:', schoolSettingsData);
}

main();
