
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchoolsTable() {
    try {
        const { data, error } = await supabase
            .from('schools')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error checking schools table:', error);
        } else {
            console.log('Schools table columns:', data && data.length > 0 ? Object.keys(data[0]) : 'No rows found to inspect columns');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkSchoolsTable();
