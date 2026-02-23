
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function assignTeacher() {
  const teacherName = "Joseph Musonda";
  const className = "10A";
  const subjectName = "Mathematics";

  console.log(`Assigning ${teacherName} to ${subjectName} in ${className}...`);

  // 1. Get Teacher
  const { data: teachers, error: tErr } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name')
    .ilike('full_name', `%${teacherName}%`);
    
  if (tErr || !teachers?.length) {
    console.error("Teacher not found:", tErr);
    return;
  }
  const teacherId = teachers[0].id;
  console.log(`Teacher Found: ${teachers[0].full_name} (${teacherId})`);

  // 2. Get Class
  const { data: classes, error: cErr } = await supabaseAdmin
    .from('classes')
    .select('id, name')
    .ilike('name', className);
    
  if (cErr || !classes?.length) {
    console.error("Class not found:", cErr);
    return;
  }
  const classId = classes[0].id;
  console.log(`Class Found: ${classes[0].name} (${classId})`);

  // 3. Get Subject (Need to be careful with subject names across schools, so filter by class's school_id ideally, but for now name is likely unique per school or we assume correct context)
  // Actually, let's get subject by name first.
  const { data: subjects, error: sErr } = await supabaseAdmin
    .from('subjects')
    .select('id, name')
    .ilike('name', subjectName);
    
  if (sErr || !subjects?.length) {
    console.error("Subject not found:", sErr);
    return;
  }
  // If multiple subjects with same name exist (different schools), pick one that matches class's school (not strictly enforced here but good practice)
  // For now, just take the first one or verify via class_subjects
  const subjectId = subjects[0].id; 
  console.log(`Subject Found: ${subjects[0].name} (${subjectId})`);

  // 4. Update class_subjects
  // First check if the entry exists
  const { data: existing, error: eErr } = await supabaseAdmin
    .from('class_subjects')
    .select('*')
    .eq('class_id', classId)
    .eq('subject_id', subjectId);
    
  if (eErr) {
    console.error("Error checking existing assignment:", eErr);
    return;
  }
  
  if (!existing || existing.length === 0) {
    console.log("No existing class_subject entry found to update. Creating new one...");
    const { data: inserted, error: iErr } = await supabaseAdmin
        .from('class_subjects')
        .insert({
            class_id: classId,
            subject_id: subjectId,
            teacher_id: teacherId
        })
        .select();
    
    if (iErr) console.error("Insert failed:", iErr);
    else console.log("Insert success:", inserted);
  } else {
    console.log("Updating existing class_subject entry...");
    const { data: updated, error: uErr } = await supabaseAdmin
        .from('class_subjects')
        .update({ teacher_id: teacherId })
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .select();
    
    if (uErr) console.error("Update failed:", uErr);
    else console.log("Update success:", updated);
  }
}

assignTeacher();
