import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: subjects } = await supabaseAdmin.from('subjects').select('*');
    const { data: grades } = await supabaseAdmin.from('student_grades').select('*, subjects(name, code)');
    const { data: assignments } = await supabaseAdmin.from('assignments').select('*, subjects(name, code)');

    const fs = require('fs');
    fs.writeFileSync('db-inspect.json', JSON.stringify({ subjects, grades, assignments }, null, 2));
}

check();
