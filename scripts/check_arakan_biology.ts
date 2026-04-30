
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const schoolId = 'eb8bf576-0563-4db6-825b-6ed5d5045364';
  console.log(`Using School ID: ${schoolId}`);
  
  const { count: studentCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'student');
  console.log(`Total students in school: ${studentCount}`);

  console.log('Searching for Grade 10S...');
  const { data: classes } = await supabase.from('classes').select('id, name').eq('school_id', schoolId).ilike('name', 'Grade 10S');
  
  if (!classes || classes.length === 0) {
    console.error('Class not found');
    return;
  }
  
  const classId = classes[0].id;
  console.log(`Found Class: ${classes[0].name} (${classId})`);

  console.log('Searching for Biology...');
  const { data: subjects } = await supabase.from('subjects').select('id, name').eq('school_id', schoolId).ilike('name', 'Biology');
  
  if (!subjects || subjects.length === 0) {
    console.error('Subject not found');
    return;
  }
  
  const subjectId = subjects[0].id;
  console.log(`Found Subject: ${subjects[0].name} (${subjectId})`);

  console.log('Fetching students in Grade 10S...');
  const { data: enrollments } = await supabase.from('enrollments').select('student_id, academic_year').eq('class_id', classId);
  const studentIds = enrollments?.map(e => e.student_id) || [];
  console.log(`Total students enrolled in Grade 10S: ${studentIds.length}`);
  
  const years = new Set(enrollments?.map(e => e.academic_year));
  console.log('Enrolled years found:', Array.from(years));
  
  const year2026 = enrollments?.filter(e => e.academic_year === '2026') || [];
  console.log(`Students enrolled in 2026: ${year2026.length}`);

  console.log('Checking if Biology is mapped to Grade 10S in class_subjects...');
  const { data: mapping } = await supabase.from('class_subjects')
    .select('*')
    .eq('class_id', classId)
    .eq('subject_id', subjectId);
  
  console.log('Mapping found:', mapping);

  console.log('Fetching Biology grades for these students...');
  const { data: grades } = await supabase.from('student_grades')
    .select('student_id, percentage, grade, status')
    .eq('subject_id', subjectId)
    .in('student_id', studentIds);

  console.log(`Total grade records found: ${grades?.length || 0}`);

  if (grades && grades.length > 0) {
    const zeroGrades = grades.filter(g => g.percentage === 0);
    const absentGrades = grades.filter(g => g.grade === 'ABSENT');
    const nonAbsentZeroGrades = grades.filter(g => g.percentage === 0 && g.grade !== 'ABSENT');

    console.log(`Grades with 0%: ${zeroGrades.length}`);
    console.log(`Grades marked as ABSENT: ${absentGrades.length}`);
    console.log(`Grades with 0% but NOT marked ABSENT: ${nonAbsentZeroGrades.length}`);
    
    if (nonAbsentZeroGrades.length > 0) {
        console.log('Sample non-absent 0% grade:', nonAbsentZeroGrades[0]);
    }
  }
}

main();
