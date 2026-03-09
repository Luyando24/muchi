
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExecSql() {
    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1' });
        if (error) {
            console.log('exec_sql RPC not found or failed:', error.message);
        } else {
            console.log('exec_sql RPC found and working.');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkExecSql();
