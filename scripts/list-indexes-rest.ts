import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Service Role Key');
  process.exit(1);
}

async function checkIndexes() {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/pg_indexes?schemaname=eq.public&select=tablename,indexname`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey!,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) {
        console.error('Failed to fetch from rest/v1/pg_indexes:', response.status, response.statusText);
        const text = await response.text();
        console.error(text);
        return;
    }

    const data = await response.json();
    console.log('\n--- Existing Indexes (REST API) ---');
    if (data && data.length > 0) {
        data.forEach((row: any) => {
            console.log(`Table: ${row.tablename.padEnd(25)} | Index: ${row.indexname.padEnd(35)}`);
        });
    } else {
        console.log('No custom indexes found in the public schema.');
    }

  } catch (error) {
    console.error('Error fetching indexes via REST:', error);
  }
}

checkIndexes();
