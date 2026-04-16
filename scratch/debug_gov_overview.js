
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function debugGovOverview() {
  try {
    const { data: schools } = await supabaseAdmin.from('schools').select('id, name').limit(5);
    const schoolIds = schools?.map(s => s.id) || [];
    
    console.log("School IDs:", schoolIds);

    // Test 1: Alias syntax
    console.log("Testing Alias Syntax...");
    const { data: gradeData, error: error1 } = await supabaseAdmin
      .from('student_grades')
      .select('school_id, percentage, student_id, subjects:subject_id(id, name, department), profiles:student_id(gender)')
      .in('school_id', schoolIds)
      .limit(5);

    if (error1) {
      console.error("Test 1 Failed:", error1.message);
    } else {
      console.log("Test 1 SUCCESS. Data keys:", Object.keys(gradeData[0]));
    }

    // Test 2: Standard table name join
    console.log("Testing Standard Join...");
    const { data: gradeData2, error: error2 } = await supabaseAdmin
      .from('student_grades')
      .select('school_id, percentage, student_id, subjects(id, name, department), profiles(gender)')
      .in('school_id', schoolIds)
      .limit(5);

    if (error2) {
      console.error("Test 2 Failed:", error2.message);
    } else {
      console.log("Test 2 SUCCESS. Data keys:", Object.keys(gradeData2[0]));
    }

    console.log("Grade Data Sample:", JSON.stringify(gradeData, null, 2));

    if (gradeData && gradeData.length > 0) {
        const first = gradeData[0];
        console.log("First record keys:", Object.keys(first));
        console.log("Profiles object:", first.profiles);
        console.log("Subjects object:", first.subjects);
    } else {
        console.log("No grade data found for these schools.");
        
        // Try without joins
        const { data: basicGrades } = await supabaseAdmin.from('student_grades').select('*').limit(5);
        console.log("Basic Grades (no joins):", basicGrades);
    }
  } catch (err) {
    console.error("Script Error:", err);
  }
}

debugGovOverview();
