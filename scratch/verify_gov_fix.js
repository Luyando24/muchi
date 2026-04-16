
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function verifyGovFix() {
  try {
    const { data: schools } = await supabaseAdmin.from('schools').select('id, name').limit(5);
    const schoolIds = schools?.map(s => s.id) || [];
    
    console.log("School IDs:", schoolIds);

    // Mimic revised backend logic
    const { data: gradeData, error: gradeError } = await supabaseAdmin
      .from('student_grades')
      .select('school_id, percentage, student_id, subject_id')
      .in('school_id', schoolIds)
      .limit(5);

    if (gradeError) {
      console.error("Grade Fetch Error:", gradeError.message);
      return;
    }

    const studentIds = [...new Set(gradeData?.map(g => g.student_id) || [])];
    const subjectIds = [...new Set(gradeData?.map(g => g.subject_id) || [])];

    const [{ data: profiles }, { data: subjects }] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, gender').in('id', studentIds),
      supabaseAdmin.from('subjects').select('id, name').in('id', subjectIds)
    ]);

    const profileMap = new Map(profiles?.map(p => [p.id, p]));
    const subjectMap = new Map(subjects?.map(s => [s.id, s]));

    gradeData?.forEach(g => {
      g.profiles = profileMap.get(g.student_id);
      g.subjects = subjectMap.get(g.subject_id);
    });

    console.log("Merged Data Sample:", JSON.stringify(gradeData, null, 2));

    if (gradeData && gradeData.length > 0) {
      const first = gradeData[0];
      const hasGender = first.profiles && first.profiles.gender !== undefined;
      const hasSubject = first.subjects && first.subjects.name !== undefined;
      
      console.log("Verification Results:");
      console.log("- Profiles joined manually:", hasGender ? "PASS" : "FAIL");
      console.log("- Subjects joined manually:", hasSubject ? "PASS" : "FAIL");
      
      if (hasGender && hasSubject) {
        console.log("SUCCESS: Data is fully populated and ready for analytics.");
      } else {
        console.error("FAILURE: Some data is still missing.");
      }
    } else {
      console.log("No grade data found to verify.");
    }
  } catch (err) {
    console.error("Script Error:", err);
  }
}

verifyGovFix();
