import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAdminKey);

async function check() {
  const { data: profile, error: pe } = await supabase.from('profiles').select('*').eq('student_number', '20269239');
  console.log('Profile:', profile?.length ? profile[0].id : 'Not found', pe);
  
  if (profile && profile.length > 0) {
    const studentId = profile[0].id;
    const { data: grades, error: ge } = await supabase.from('student_grades').select('*').eq('student_id', studentId);
    console.log('Grades error:', ge);
    console.log('Grades count:', grades?.length);
    if (grades) {
      console.log('Grades details:', grades.map(g => ({term: g.term, year: g.academic_year, exam: g.exam_type, status: g.status, subject: g.subject_id})));
    }
  }
}
check();
