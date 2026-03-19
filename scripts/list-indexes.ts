
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listIndexes() {
    const sql = `
        SELECT
            tablename,
            indexname,
            indexdef
        FROM
            pg_indexes
        WHERE
            schemaname = 'public'
        ORDER BY
            tablename,
            indexname;
    `;

    try {
        console.log('Fetching indexes from Supabase...');
        const { data, error } = await supabase.rpc('execute_sql', { sql: sql });
        
        if (error) {
            console.error('Error fetching indexes:', error.message);
            console.log('If the exec_sql RPC does not exist, you may need to create it first.');
            return;
        }

        console.log('\n--- Existing Indexes ---');
        if (data && data.length > 0) {
            data.forEach((row: any) => {
                console.log(`Table: ${row.tablename.padEnd(25)} | Index: ${row.indexname.padEnd(35)}`);
                // console.log(`Definition: ${row.indexdef}\n`);
            });
        } else {
            console.log('No custom indexes found in the public schema.');
        }
    } catch (err: any) {
        console.error('Unexpected error:', err.message);
    }
}

listIndexes();
