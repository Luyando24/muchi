
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  try {
    // Check attendance table for academic_year and term
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select('academic_year, term')
      .limit(1);

    if (attendanceError) {
      console.error('Error checking attendance table:', attendanceError);
    } else {
      console.log('Attendance table columns check:', attendanceData && attendanceData.length > 0 ? 'Found' : 'No rows but query ok (Columns likely exist)');
    }

    // Check reports table for academic_year and term
    const { data: reportsData, error: reportsError } = await supabase
      .from('reports')
      .select('academic_year, term')
      .limit(1);

    if (reportsError) {
      console.error('Error checking reports table:', reportsError);
    } else {
      console.log('Reports table columns check:', reportsData && reportsData.length > 0 ? 'Found' : 'No rows but query ok (Columns likely exist)');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkColumns();
