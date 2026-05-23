import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log("Fetching schools with licenses...");
    const { data, error } = await supabaseAdmin
      .from('schools')
      .select('id, name, slug, created_at, school_licenses(*)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
        console.error("Query Error:", error);
    } else {
        console.log("Query Data:", JSON.stringify(data, null, 2));
    }
}
test();
