import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log("Fetching schools count...");
    const schools = await supabaseAdmin.from('schools').select('*', { count: 'exact', head: true });
    console.log("Schools:", schools);

    console.log("Fetching profiles count...");
    const profiles = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
    console.log("Profiles:", profiles);
}
test();
