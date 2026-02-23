
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('Inspecting attendance table columns...');
  
  // We can't query information_schema directly easily with supabase-js unless exposed.
  // But we can try to infer from error messages or if we have a way.
  // Actually, we can try to select specific columns and see which ones fail? No that's slow.
  
  // Let's try to just insert a record with minimal fields that SHOULD be there based on migration.
  // If it fails on a specific column, we know.
  
  // Known columns from migration: id, school_id, student_id, class_id, date, status, remarks, recorded_by
  
  console.log("Checking if 'class_id' exists by selecting it...");
  const { data, error } = await supabase.from('attendance').select('class_id').limit(1);
  
  if (error) {
    console.log("Error selecting class_id:", error.message);
  } else {
    console.log("class_id column exists!");
  }

  console.log("Checking if 'student_id' exists by selecting it...");
  const { data: d2, error: e2 } = await supabase.from('attendance').select('student_id').limit(1);
  if (e2) console.log("Error selecting student_id:", e2.message);
  else console.log("student_id column exists!");

  // Need valid school_id and student_id? 
   // We can try to fetch a valid student first.
   const { data: students } = await supabase.from('profiles').select('id, school_id').eq('role', 'student').limit(1);
   
   if (!students || students.length === 0) {
     console.log("No students found to test insert.");
     return;
   }
   
   const student = students[0];
   const date = new Date().toISOString().split('T')[0];

   // Try to insert into students table using the profile ID
    console.log("Trying to insert into 'students' table using profile ID...");
    
    // Inspect check constraints
    console.log("Inspecting check constraints for 'students' table...");
    
    // We can't query pg_catalog or information_schema directly easily via supabase-js without permissions or exposed views.
    // But we can try to guess or use RPC if available.
    // Or we can try to insert and catch error, which we did.
    // The error message says: violates check constraint "students_student_card_id_check"
    
    // Check enrollments table for clues
    console.log("Checking enrollments table for clues...");
    const { data: enrollments, error: enrollError } = await supabase.from('enrollments').select('*').limit(1);
    
    if (enrollError) {
      console.log("Error checking enrollments:", enrollError.message);
    } else if (enrollments && enrollments.length > 0) {
      console.log("Enrollment sample:", enrollments[0]);
    } else {
      console.log("Enrollments table is empty.");
    }
    
    // Check profiles table for any card_id field?
    console.log("Checking profiles table columns...");
    const { data: profileSample } = await supabase.from('profiles').select('*').limit(1);
    if (profileSample && profileSample.length > 0) {
       console.log("Profile keys:", Object.keys(profileSample[0]));
    }

    // Try more formats
    const formats = [
        "ST-0001", "ST0001", "S0001", "S-0001", 
        "2024-0001", "2024/0001", 
        "12345", "123456", "1234567", "12345678", "123456789",
        "A1234567", "A-1234567",
        "STUDENT", "TEST",
        "0000000000", "1111111111",
        "ZM-123456", // Zambia nrc format?
        "123456/12/1", // NRC format?
        "123456/12/1" // NRC format
    ];

    for (const fmt of formats) {
        await tryInsertStudent(student.id, fmt);
    }
  
  async function tryInsertStudent(id: string, cardId: string) {
      const uuid = crypto.randomUUID();
      const payload = {
          id: id,
          student_card_id: cardId,
          nrc_hash: 'dummy-hash', 
          nrc_salt: 'dummy-salt', 
          card_id: uuid, 
          card_qr_signature: 'dummy-signature'
      };
        
      const { error } = await supabase.from('students').insert(payload);
      if (error) {
          console.log(`Failed with ${cardId}:`, error.message);
      } else {
          console.log(`SUCCEEDED with ${cardId}!`);
          // Clean up
          await supabase.from('students').delete().eq('id', id);
      }
   }

  // Check student_grades table
  console.log('\nChecking student_grades table...');
  const { data: grades, error: gradesError } = await supabase
    .from('student_grades')
    .select('*')
    .limit(1);
  
  if (gradesError) {
    console.log('Error accessing student_grades:', gradesError.message);
  } else {
    console.log('student_grades table exists. Sample:', grades);
  }
  }
   
   main();
