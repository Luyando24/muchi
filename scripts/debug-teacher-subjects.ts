import { supabaseAdmin } from '../server/lib/supabase';

async function main() {
  const teacherName = "Joseph Musonda";
  console.log(`Searching for teacher: ${teacherName}`);

  // 1. Get the teacher
  const { data: teachers, error: tError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, role')
    .ilike('full_name', `%${teacherName}%`);

  if (tError || !teachers || teachers.length === 0) {
    console.error('Teacher not found or error:', tError);
    return;
  }

  const teacher = teachers[0];
  console.log(`Found teacher: ${teacher.full_name} (${teacher.id}) Role: ${teacher.role}`);

  // 2. Check if Class Teacher
  const { data: classTeacherClasses, error: ctError } = await supabaseAdmin
    .from('classes')
    .select('id, name')
    .eq('class_teacher_id', teacher.id);
  
  if (ctError) console.error(ctError);
  else {
    console.log(`Is Class Teacher for: ${classTeacherClasses.length} classes`);
    console.log(JSON.stringify(classTeacherClasses, null, 2));
  }

  // 3. Check class_subjects assigned directly to this teacher (Taught Subjects)
  const { data: taughtSubjects, error: tsError } = await supabaseAdmin
    .from('class_subjects')
    .select('*, subjects(name), classes(name)')
    .eq('teacher_id', teacher.id);
  
  if (tsError) {
    console.error('Error fetching taught subjects:', tsError);
  } else {
    console.log(`Directly assigned to teach ${taughtSubjects.length} subjects (class_subjects with teacher_id):`);
    console.log(JSON.stringify(taughtSubjects, null, 2));
  }

  // 4. Check subjects in classes where they are Class Teacher (to see if subjects exist in that class)
  if (classTeacherClasses && classTeacherClasses.length > 0) {
      const classIds = classTeacherClasses.map(c => c.id);
      const { data: classSubjects, error: csError } = await supabaseAdmin
        .from('class_subjects')
        .select('*, subjects(name)')
        .in('class_id', classIds);
        
      if (csError) console.error(csError);
      else {
          console.log(`Total subjects defined for their classes (regardless of teacher): ${classSubjects.length}`);
          console.log(JSON.stringify(classSubjects, null, 2));
      }
  }

  // 5. Check Head of Department
  const { data: headSubjects, error: hError } = await supabaseAdmin
         .from('subjects')
         .select('id, name')
         .eq('head_teacher_id', teacher.id);
  
  if (hError) console.error(hError);
  else {
      console.log(`Is Head of Department for:`);
      console.log(JSON.stringify(headSubjects, null, 2));
  }
}

main();
