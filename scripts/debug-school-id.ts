import { supabaseAdmin } from '../server/lib/supabase';

async function main() {
  const teacherName = "Joseph Musonda";
  console.log(`Checking school_id for: ${teacherName}`);

  // 1. Get Teacher Profile
  const { data: teachers } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, school_id')
    .ilike('full_name', `%${teacherName}%`);

  if (!teachers || teachers.length === 0) return;
  const teacher = teachers[0];
  console.log(`Teacher: ${teacher.full_name}, School ID: ${teacher.school_id}`);

  // 2. Get Class 10A (where he is teacher)
  const { data: classes } = await supabaseAdmin
    .from('classes')
    .select('id, name, school_id')
    .eq('class_teacher_id', teacher.id);
  
  if (classes && classes.length > 0) {
      classes.forEach(c => console.log(`Class: ${c.name}, School ID: ${c.school_id}`));
      
      // 3. Get Subjects for this class
      const classId = classes[0].id;
      const { data: classSubjects } = await supabaseAdmin
        .from('class_subjects')
        .select('subject_id')
        .eq('class_id', classId);
      
      const subjectIds = classSubjects?.map((s: any) => s.subject_id) || [];
      
      if (subjectIds.length > 0) {
          const { data: subjects } = await supabaseAdmin
            .from('subjects')
            .select('id, name, school_id')
            .in('id', subjectIds);
            
          console.log(`Subjects linked to class ${classes[0].name}:`);
          subjects?.forEach(s => console.log(` - ${s.name}: School ID: ${s.school_id}`));

          // Check for mismatch
          const mismatch = subjects?.filter(s => s.school_id !== teacher.school_id);
          if (mismatch && mismatch.length > 0) {
              console.error("MISMATCH DETECTED! These subjects have different school_id:");
              console.log(JSON.stringify(mismatch, null, 2));
          } else {
              console.log("All subjects match teacher's school_id.");
          }
      }
  }
}

main();
