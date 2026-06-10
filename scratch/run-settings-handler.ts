import { supabaseAdmin } from '../server/lib/supabase.js';

const handler = async (reqBody: any, userId: string) => {
  try {
    const settings = reqBody;
    console.log('1. Starting mapping updates...');
    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
      updated_by: userId
    }));
    console.log('2. updates list mapped:', updates);

    if (updates.length === 0) {
      console.log('No updates.');
      return;
    }

    console.log('3. Running database upsert...');
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .upsert(updates)
      .select();

    if (error) {
      console.error('Database error in handler:', error);
      throw error;
    }

    console.log('4. Succeeded! Data:', data);
  } catch (err: any) {
    console.error('Caught error in handler:', err.message, err.stack);
  }
};

handler({
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
}, '8a7ca257-1d11-4992-b7e4-b5bd9a85b110');
