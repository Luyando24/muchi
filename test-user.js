import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const { data } = await supabaseAdmin.from('profiles').select('id, full_name, role, secondary_role').ilike('full_name', '%Luyando%');
    console.log(data);
}
test();