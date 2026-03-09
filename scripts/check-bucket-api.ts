
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBucket() {
    try {
        const { data, error } = await supabase.storage.listBuckets();
        if (error) {
            console.error('Error listing buckets:', error.message);
            return;
        }

        console.log('Available buckets:', data.map(b => b.name));
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkBucket();
