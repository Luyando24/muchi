const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env manually since we might not have dotenv installed in the scratch env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const query = `
    INSERT INTO public.school_types (name, description) VALUES 
    ('Lower Primary', '(Grades 1-4)'),
    ('Upper Primary', '(Grades 5-7)'),
    ('Combined Primary', '(Grades 1-7) - Auto-selects format based on grade')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;
  `;

  // Use the admin functionality to execute SQL if the project has it enabled
  // Otherwise, we might need to use another method.
  // Note: execute_sql is often a custom RPC for agents.
  console.log('Attempting to apply migration to:', supabaseUrl);
  
  try {
    const { data, error } = await supabase.from('school_types').upsert([
      { name: 'Lower Primary', description: '(Grades 1-4)' },
      { name: 'Upper Primary', description: '(Grades 5-7)' },
      { name: 'Combined Primary', description: '(Grades 1-7) - Auto-selects format based on grade' }
    ], { onConflict: 'name' });

    if (error) {
      console.error('Error applying migration:', error);
    } else {
      console.log('Migration applied successfully');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
