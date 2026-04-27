
import { supabaseAdmin } from '../server/lib/supabase.js';

async function calculateGrade(schoolId: string, percentage: number) {
  const { data: scales, error } = await supabaseAdmin
    .from('grading_scales')
    .select('*')
    .eq('school_id', schoolId)
    .lte('min_percentage', percentage)
    .gte('max_percentage', percentage)
    .maybeSingle();

  if (error || !scales) {
    return { grade: 'N/A' };
  }

  return { grade: scales.grade };
}

async function cleanupMarks(dryRun = true) {
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Starting cleanup of abnormal marks...`);

  // 1. Process student_grades
  console.log('\nProcessing student_grades...');
  const { data: grades, error: gradesError } = await supabaseAdmin
    .from('student_grades')
    .select('id, percentage, school_id, subject_id, student_id')
    .gt('percentage', 100);

  if (gradesError) {
    console.error('Error fetching grades:', gradesError);
    return;
  }

  console.log(`Found ${grades.length} abnormal grades.`);

  for (const record of grades) {
    const originalPercentage = record.percentage;
    // Logic: take first two digits
    const newPercentage = parseInt(String(originalPercentage).substring(0, 2));
    
    const { grade: newGrade } = await calculateGrade(record.school_id, newPercentage);

    console.log(`ID: ${record.id} | Original: ${originalPercentage} -> New: ${newPercentage} (${newGrade})`);

    if (!dryRun) {
      const { error: updateError } = await supabaseAdmin
        .from('student_grades')
        .update({ 
          percentage: newPercentage,
          grade: newGrade,
          updated_at: new Date().toISOString()
        })
        .eq('id', record.id);

      if (updateError) {
        console.error(`Error updating record ${record.id}:`, updateError);
      }
    }
  }

  // 2. Process submissions (just in case, although previous check was 0)
  console.log('\nProcessing submissions...');
  const { data: submissions, error: subError } = await supabaseAdmin
    .from('submissions')
    .select('id, score, max_score')
    .gt('score', 100);

  if (subError) {
    console.error('Error fetching submissions:', subError);
  } else {
    console.log(`Found ${submissions.length} abnormal submissions.`);
    for (const sub of submissions) {
      const originalScore = sub.score;
      const newScore = parseInt(String(originalScore).substring(0, 2));
      
      console.log(`Submission ID: ${sub.id} | Original: ${originalScore} -> New: ${newScore}`);

      if (!dryRun) {
        const { error: updateError } = await supabaseAdmin
          .from('submissions')
          .update({ 
            score: newScore,
            updated_at: new Date().toISOString()
          })
          .eq('id', sub.id);

        if (updateError) {
          console.error(`Error updating submission ${sub.id}:`, updateError);
        }
      }
    }
  }

  console.log(`\nCleanup ${dryRun ? 'dry run ' : ''}completed.`);
}

const isDryRun = process.argv.includes('--execute') ? false : true;
cleanupMarks(isDryRun);
