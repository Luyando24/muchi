import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const { data, error } = await supabaseAdmin.from('attendance').select('status').limit(1);
    console.log("Attendance error:", error);
    
    const { error: e2 } = await supabaseAdmin.from('student_grades').select('percentage').limit(1);
    console.log("Grades error:", e2);
}
test();