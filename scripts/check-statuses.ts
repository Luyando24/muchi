
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatuses() {
    try {
        const { data, error } = await supabase.from('student_grades').select('status').limit(100);
        if (error) {
            console.error('Error fetching statuses:', error.message);
            return;
        }

        const statuses = new Set(data.map(r => r.status));
        console.log('Unique statuses in student_grades:', Array.from(statuses));
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkStatuses();
