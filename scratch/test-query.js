const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('Credentials missing Url:', supabaseUrl, 'Key length:', supabaseServiceKey.length);
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: testClassSubjects, error } = await supabaseAdmin
    .from("class_subjects")
    .select("subject_id, teacher_id, subjects(id, name, code, department), profiles(id, full_name)")
    .limit(2);
  
  if (error) {
    console.error("Query error:", error);
  } else {
    console.log("Result profiles join:", JSON.stringify(testClassSubjects, null, 2));
  }
  
  const { data: testClassSubjects2, error: error2 } = await supabaseAdmin
    .from("class_subjects")
    .select("subject_id, teacher_id, subjects(id, name, code, department), teacher:profiles(id, full_name)")
    .limit(2);
  
  if (error2) {
    console.error("Query 2 error:", error2);
  } else {
    console.log("Result teacher:profiles join:", JSON.stringify(testClassSubjects2, null, 2));
  }
}

run();
