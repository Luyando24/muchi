import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  try {
    console.log('Starting License Backfill/Check...');

    // 1. Get all schools
    const { data: schools, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('id, name');

    if (schoolError) throw schoolError;
    console.log(`Found ${schools.length} schools.`);

    // 2. Check and generate license for each school if missing
    for (const school of schools) {
      const { data: license } = await supabaseAdmin
        .from('school_licenses')
        .select('*')
        .eq('school_id', school.id)
        .eq('status', 'active')
        .single();

      if (license) {
        console.log(`[OK] ${school.name} has active license.`);
      } else {
        console.log(`[MISSING] ${school.name} has NO active license. Generating...`);
        
        const { error: insertError } = await supabaseAdmin
          .from('school_licenses')
          .insert({
            school_id: school.id,
            start_date: new Date().toISOString(),
            end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
            status: 'active',
            license_key: `LIC-${school.id.substring(0,8).toUpperCase()}-${Math.floor(Math.random() * 10000)}`,
            plan: 'Standard'
          });

        if (insertError) {
          console.error(`Failed to generate license for ${school.name}:`, insertError.message);
        } else {
          console.log(`[GENERATED] License created for ${school.name}`);
        }
      }
    }

    console.log('\nDone.');

  } catch (error: any) {
    console.error('Script Error:', error.message);
  }
}

main();
