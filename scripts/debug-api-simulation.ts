import { supabaseAdmin } from '../server/lib/supabase';

async function main() {
  const teacherName = "Joseph Musonda";
  console.log(`Simulating API for teacher: ${teacherName}`);

  // 1. Get the teacher profile (simulate auth)
  const { data: teachers } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role')
    .ilike('full_name', `%${teacherName}%`);

  if (!teachers || teachers.length === 0) return;
  const profile = teachers[0];
  console.log(`Profile: ${profile.full_name} (${profile.id})`);

  // --- API LOGIC SIMULATION ---
  // 1. Subjects they teach
  const { data: taughtSubjects } = await supabaseAdmin
    .from('class_subjects')
    .select('subject_id')
    .eq('teacher_id', profile.id);
  
  const taughtSubjectIds = taughtSubjects?.map((s: any) => s.subject_id) || [];
  console.log(`Taught Subject IDs: ${taughtSubjectIds.length}`);

  // 2. Subjects they are Head of Department for
  const { data: headSubjects } = await supabaseAdmin
    .from('subjects')
    .select('id')
    .eq('head_teacher_id', profile.id);
  
  const headSubjectIds = headSubjects?.map((s: any) => s.id) || [];
  console.log(`Head Subject IDs: ${headSubjectIds.length}`);

  // 3. Subjects in classes where they are Class Teacher
  const { data: classTeacherClasses } = await supabaseAdmin
    .from('classes')
    .select('id')
    .eq('class_teacher_id', profile.id);
  
  const classTeacherClassIds = classTeacherClasses?.map((c: any) => c.id) || [];
  console.log(`Class Teacher Class IDs: ${classTeacherClassIds.join(', ')}`);
  
  let classTeacherSubjectIds: string[] = [];
  if (classTeacherClassIds.length > 0) {
    const { data: classSubjects } = await supabaseAdmin
      .from('class_subjects')
      .select('subject_id')
      .in('class_id', classTeacherClassIds);
      
    classTeacherSubjectIds = classSubjects?.map((s: any) => s.subject_id) || [];
  }
  console.log(`Class Teacher Subject IDs: ${classTeacherSubjectIds.length}`);
  console.log(classTeacherSubjectIds);

  const allIds = Array.from(new Set([...taughtSubjectIds, ...headSubjectIds, ...classTeacherSubjectIds]));
  console.log(`Total Unique IDs: ${allIds.length}`);

  if (allIds.length > 0) {
    const { data: subjects, error } = await supabaseAdmin
        .from('subjects')
        .select('*')
        .in('id', allIds);
    
    if (error) console.error(error);
    else {
        console.log(`Final Subjects Result: ${subjects?.length}`);
        subjects?.forEach(s => console.log(` - ${s.name} (${s.id})`));
    }
  } else {
      console.log("Returning empty array");
  }
}

main();
