import { supabaseAdmin } from './server/lib/supabase.js';

async function run() {
    try {
      // 1. Basic Counts (Filtered by region if provided)
      let schoolQuery = supabaseAdmin.from('schools').select('*', { count: 'exact', head: true });
      let studentQuery = supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
      let teacherQuery = supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher');

      const [
        { count: totalSchools, error: e1 },
        { count: totalStudents, error: e2 },
        { count: totalTeachers, error: e3 }
      ] = await Promise.all([schoolQuery, studentQuery, teacherQuery]);

      console.log(e1, e2, e3);

      // 2. Aggregate average attendance (%)
      let attendanceQuery = supabaseAdmin.from('attendance').select('status');
      
      const { data: attendanceData, error: e4 } = await attendanceQuery;
      console.log("e4", e4);
      const totalAttendanceDays = attendanceData?.length || 0;
      const presentDays = attendanceData?.filter(a => a.status === 'present').length || 0;
      const avgAttendanceValue = totalAttendanceDays > 0 ? (presentDays / totalAttendanceDays) * 100 : 0;

      // 3. Aggregate national pass rate (%) - Based on average grade percentage
      let passRateQuery = supabaseAdmin.from('student_grades').select('percentage');
      const { data: gradeData, error: e5 } = await passRateQuery;
      console.log("e5", e5);
      const totalGrades = gradeData?.length || 0;
      const avgPassRate = totalGrades > 0 
        ? gradeData?.reduce((acc, curr) => acc + curr.percentage, 0) / totalGrades 
        : 0;

      console.log({
        totalSchools: totalSchools || 0,
        totalStudents: totalStudents || 0,
        totalTeachers: totalTeachers || 0,
        avgAttendance: Number(avgAttendanceValue.toFixed(1)),
        nationalPassRate: Number(avgPassRate.toFixed(1))
      });
    } catch (error) {
      console.error("CATCH:", error.message);
    }
}
run();