import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run(province, district) {
    try {
      // 1. Basic Counts (Filtered by region if provided)
      let schoolQuery = supabaseAdmin.from('schools').select('*', { count: 'exact', head: true });
      let studentQuery = supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
      let teacherQuery = supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher');

      if (province) {
        schoolQuery = schoolQuery.eq('province', province);
        // For student/teacher, we need to join with schools or filter by school_id
        const { data: schoolIds } = await supabaseAdmin.from('schools').select('id').eq('province', province);
        const ids = schoolIds?.map(s => s.id) || [];
        console.log("ids for province:", ids);
        studentQuery = studentQuery.in('school_id', ids);
        teacherQuery = teacherQuery.in('school_id', ids);
      }
      if (district) {
        schoolQuery = schoolQuery.eq('district', district);
        const { data: schoolIds } = await supabaseAdmin.from('schools').select('id').eq('district', district);
        const ids = schoolIds?.map(s => s.id) || [];
        studentQuery = studentQuery.in('school_id', ids);
        teacherQuery = teacherQuery.in('school_id', ids);
      }

      const [
        { count: totalSchools, error: err1 },
        { count: totalStudents, error: err2 },
        { count: totalTeachers, error: err3 }
      ] = await Promise.all([schoolQuery, studentQuery, teacherQuery]);

      console.log("errors:", err1, err2, err3);

      console.log({ totalSchools, totalStudents, totalTeachers });
    } catch (e) {
      console.error(e);
    }
}

run("Lusaka", undefined);
run("Copperbelt", undefined);
