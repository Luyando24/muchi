
import { supabaseAdmin } from '../server/lib/supabase.js';

async function checkAbnormalMarks() {
  console.log('Checking student_grades...');
  const { data: grades, error: gradesError } = await supabaseAdmin
    .from('student_grades')
    .select('id, percentage')
    .gt('percentage', 100);

  if (gradesError) {
    console.error('Error fetching grades:', gradesError);
  } else {
    console.log(`Found ${grades.length} abnormal grades.`);
    grades.slice(0, 10).forEach(g => console.log(`ID: ${g.id}, Percentage: ${g.percentage}`));
  }

  console.log('\nChecking submissions...');
  const { data: submissions, error: subError } = await supabaseAdmin
    .from('submissions')
    .select('id, score, max_score')
    .gt('score', 100);

  if (subError) {
    console.error('Error fetching submissions:', subError);
  } else {
    console.log(`Found ${submissions.length} abnormal submissions.`);
    submissions.slice(0, 10).forEach(s => console.log(`ID: ${s.id}, Score: ${s.score}, Max: ${s.max_score}`));
  }
}

checkAbnormalMarks();
