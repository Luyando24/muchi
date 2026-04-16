
import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

// Middleware to verify System Admin or Government Official
const requireGovernmentAccess = async (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ message: 'Unauthorized' });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, secondary_role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'system_admin' && profile.role !== 'government' && profile.secondary_role !== 'government')) {
    return res.status(403).json({ message: 'Forbidden: Requires Government or System Admin privileges' });
  }

  next();
};

// GET /api/government/regions
router.get('/regions', requireGovernmentAccess, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('schools')
      .select('province, district');

    if (error) throw error;

    const provinces = new Set<string>();
    const districtsByProvince: Record<string, Set<string>> = {};

    data?.forEach(school => {
      if (school.province) {
        provinces.add(school.province);
        if (!districtsByProvince[school.province]) {
          districtsByProvince[school.province] = new Set<string>();
        }
        if (school.district) {
          districtsByProvince[school.province].add(school.district);
        }
      }
    });

    const regions = Array.from(provinces).map(province => ({
      province,
      districts: Array.from(districtsByProvince[province] || [])
    }));

    res.json(regions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/government/overview
router.get('/overview', requireGovernmentAccess, async (req: Request, res: Response) => {
  const { province, district } = req.query;
  console.log("GOV OVERVIEW API HIT. query:", req.query);
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
      { count: totalSchools },
      { count: totalStudents },
      { count: totalTeachers }
    ] = await Promise.all([schoolQuery, studentQuery, teacherQuery]);

    // 2. Breakdown of School Types and Categories
    let distributionQuery = supabaseAdmin.from('schools').select('school_type, category');
    if (province) distributionQuery = distributionQuery.eq('province', province);
    if (district) distributionQuery = distributionQuery.eq('district', district);
    
    const { data: distributionData } = await distributionQuery;
    const schoolTypeBreakdown: Record<string, number> = {};
    const schoolCategoryBreakdown: Record<string, number> = {};

    distributionData?.forEach(s => {
      const type = s.school_type || 'Unknown';
      const cat = s.category || 'Unknown';
      schoolTypeBreakdown[type] = (schoolTypeBreakdown[type] || 0) + 1;
      schoolCategoryBreakdown[cat] = (schoolCategoryBreakdown[cat] || 0) + 1;
    });

    // 3. Gender Breakdown (Students)
    let genderQuery = supabaseAdmin.from('profiles').select('gender').eq('role', 'student');
    if (province || district) {
      const { data: schoolIds } = await supabaseAdmin.from('schools').select('id')
        .match({ ...(province && { province }), ...(district && { district }) });
      genderQuery = genderQuery.in('school_id', schoolIds?.map(s => s.id) || []);
    }
    const { data: genderData } = await genderQuery;
    const genderBreakdown: Record<string, number> = { Male: 0, Female: 0, Other: 0 };
    genderData?.forEach(p => {
      const g = p.gender || 'Other';
      genderBreakdown[g] = (genderBreakdown[g] || 0) + 1;
    });

    // 4. Aggregate average attendance (%)
    let attendanceQuery = supabaseAdmin.from('attendance').select('status, school_id');
    if (province || district) {
       const { data: schoolIds } = await supabaseAdmin.from('schools').select('id')
         .match({ ...(province && { province }), ...(district && { district }) });
       attendanceQuery = attendanceQuery.in('school_id', schoolIds?.map(s => s.id) || []);
    }
    const { data: attendanceData } = await attendanceQuery;
    const totalAttendanceDays = attendanceData?.length || 0;
    const presentDays = attendanceData?.filter(a => a.status === 'present').length || 0;
    const avgAttendanceValue = totalAttendanceDays > 0 ? (presentDays / totalAttendanceDays) * 100 : 0;

    // 5. Aggregate national pass rate (%) and Gender-wise Grade Distribution
    let passRateQuery = supabaseAdmin.from('student_grades').select('school_id, percentage, student_id, subjects!inner(id, name, department), profiles!student_id(gender)');

    let scalesQuery = supabaseAdmin.from('grading_scales').select('grade, min_percentage, max_percentage, description, school_id');
    
    let filteredSchoolDetails: any[] = [];
    if (province || district) {
      const { data: schoolDetails } = await supabaseAdmin.from('schools').select('id, name, district, province, category, school_type')
        .match({ ...(province && { province }), ...(district && { district }) });
      filteredSchoolDetails = schoolDetails || [];
      passRateQuery = passRateQuery.in('school_id', filteredSchoolDetails.map(s => s.id));
    } else {
      const { data: schoolDetails } = await supabaseAdmin.from('schools').select('id, name, district, province, category, school_type');
      filteredSchoolDetails = schoolDetails || [];
    }
    
    const schoolMap = new Map<string, any>(filteredSchoolDetails.map(s => [s.id, s]));
    
    const schoolIds = filteredSchoolDetails.map(s => s.id);
    passRateQuery = passRateQuery.in('school_id', schoolIds);
    scalesQuery = scalesQuery.in('school_id', schoolIds);
    
    const [
      { data: gradeData },
      { data: scalesData }
    ] = await Promise.all([passRateQuery, scalesQuery]);

    const totalGrades = gradeData?.length || 0;
    const avgPassRate = totalGrades > 0 
      ? gradeData?.reduce((acc, curr) => acc + curr.percentage, 0) / totalGrades 
    : 0;

    // 6. Gender-wise Grade Distribution Aggregation & Subject Analytics
    const genderGradeDistribution: Record<string, Record<string, number>> = {
      male: {},
      female: {},
      other: {}
    };
    const subjectData: Record<string, { total: number, count: number }> = {};

    const getGradeLabel = (pct: number, schoolId: string) => {
      const schoolScales = scalesData?.filter(s => s.school_id === schoolId) || [];
      const scale = schoolScales.find(s => pct >= s.min_percentage && pct <= s.max_percentage);
      if (scale) return scale.description || scale.grade;
      
      // Fallback to standard Zambia categories if no school-specific scale found
      if (pct >= 75) return 'Distinction';
      if (pct >= 60) return 'Merit';
      if (pct >= 50) return 'Credit';
      if (pct >= 40) return 'Pass';
      return 'Fail';
    };

    gradeData?.forEach(g => {
      if (g.percentage == null) return;
      const gender = (g.profiles?.gender || 'Other').toLowerCase();
      const targetGender = gender === 'male' || gender === 'female' ? gender : 'other';
      const label = getGradeLabel(g.percentage, g.school_id);
      
      genderGradeDistribution[targetGender][label] = (genderGradeDistribution[targetGender][label] || 0) + 1;

      // Subject analytics
      const subjectName = g.subjects?.name || 'Unknown';
      if (!subjectData[subjectName]) subjectData[subjectName] = { total: 0, count: 0 };
      subjectData[subjectName].total += g.percentage;
      subjectData[subjectName].count += 1;
    });

    // 7. Detailed Metrics per School (Ratio, Pass Rate, Attendance)
    const schoolGrades = new Map<string, { total: number, count: number }>();
    gradeData?.forEach(g => {
      if (!g.school_id || g.percentage == null) return;
      const current = schoolGrades.get(g.school_id) || { total: 0, count: 0 };
      schoolGrades.set(g.school_id, { total: current.total + g.percentage, count: current.count + 1 });
    });

    const schoolAttendance = new Map<string, { present: number, total: number }>();
    attendanceData?.forEach(a => {
      const current = schoolAttendance.get(a.school_id) || { present: 0, total: 0 };
      schoolAttendance.set(a.school_id, { 
        present: current.present + (a.status === 'present' ? 1 : 0), 
        total: current.total + 1 
      });
    });

    // Student/Teacher counts per school for individual ratios
    const { data: profilesBySchool } = await supabaseAdmin
      .from('profiles')
      .select('school_id, role')
      .in('school_id', filteredSchoolDetails.map(s => s.id))
      .in('role', ['student', 'teacher']);
    
    const schoolProfiles = new Map<string, { students: number, teachers: number }>();
    profilesBySchool?.forEach(p => {
      const current = schoolProfiles.get(p.school_id) || { students: 0, teachers: 0 };
      if (p.role === 'student') current.students++;
      else if (p.role === 'teacher') current.teachers++;
      schoolProfiles.set(p.school_id, current);
    });

    const topSubjects: any[] = Object.entries(subjectData)
      .map(([name, data]: any) => ({
        name,
        average: Number((data.total / data.count).toFixed(1)),
        count: data.count
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 10);

    const schoolPerformanceMetrics = filteredSchoolDetails.map(school => {
      const grades = schoolGrades.get(school.id);
      const att = schoolAttendance.get(school.id);
      const counts = schoolProfiles.get(school.id) || { students: 0, teachers: 0 };
      return {
        id: school.id,
        name: school.name,
        district: school.district,
        province: school.province,
        category: school.category,
        type: school.school_type,
        passRate: grades ? Number((grades.total / grades.count).toFixed(1)) : 0,
        attendanceRate: att ? Number((att.present / att.total * 100).toFixed(1)) : 0,
        studentTeacherRatio: counts.teachers > 0 ? Number((counts.students / counts.teachers).toFixed(1)) : counts.students,
        studentCount: counts.students,
        teacherCount: counts.teachers
      };
    });

    const topSchools = [...schoolPerformanceMetrics]
      .sort((a, b) => b.passRate - a.passRate)
      .slice(0, 3);

    // 7. Category Ranking
    const categoryGrades = new Map<string, { total: number, count: number }>();
    gradeData?.forEach(g => {
      const school = schoolMap.get(g.school_id);
      if (!school || !school.category) return;
      const current = categoryGrades.get(school.category) || { total: 0, count: 0 };
      categoryGrades.set(school.category, { total: current.total + g.percentage, count: current.count + 1 });
    });

    const categoryPerformance = Array.from(categoryGrades.entries())
      .map(([category, stats]) => ({
        category,
        avgPassRate: Number((stats.total / stats.count).toFixed(1))
      }))
      .sort((a, b) => b.avgPassRate - a.avgPassRate);

    res.json({
      totalSchools: totalSchools || 0,
      totalStudents: totalStudents || 0,
      totalTeachers: totalTeachers || 0,
      studentTeacherRatio: totalTeachers! > 0 ? Number((totalStudents! / totalTeachers!).toFixed(1)) : totalStudents || 0,
      avgAttendance: Number(avgAttendanceValue.toFixed(1)),
      nationalPassRate: Number(avgPassRate.toFixed(1)),
      schoolTypeBreakdown,
      schoolCategoryBreakdown,
      genderBreakdown,
      genderGradeDistribution,
      topSubjects,
      categoryPerformance,
      schoolPerformanceMetrics: schoolPerformanceMetrics.sort((a, b) => b.passRate - a.passRate),
      topSchools
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/government/regional-stats
router.get('/regional-stats', requireGovernmentAccess, async (req: Request, res: Response) => {
  try {
    // Get schools count per province
    const { data: rawData, error } = await supabaseAdmin
      .from('schools')
      .select('province, id');
    
    if (error) throw error;

    const stats = rawData.reduce((acc: any, curr) => {
      const province = curr.province || 'Unknown';
      if (!acc[province]) acc[province] = { province, schools: 0 };
      acc[province].schools += 1;
      return acc;
    }, {});

    res.json(Object.values(stats));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});



// GET /api/government/feeding-program/stats
router.get('/stats', requireGovernmentAccess, async (req: Request, res: Response) => {
  try {
    // Aggregated stats across the country
    const { data: inventory, error: invError } = await supabaseAdmin
      .from('feeding_program_inventory')
      .select('item_name, quantity, unit');
    
    const { data: meals, error: mealError } = await supabaseAdmin
      .from('feeding_program_meals')
      .select('beneficiaries_count');

    const { count: pendingProcurements, error: procError } = await supabaseAdmin
      .from('feeding_program_procurements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending');

    if (invError || mealError || procError) throw invError || mealError || procError;

    const stats = {
      totalBeneficiaries: meals?.reduce((acc, curr) => acc + curr.beneficiaries_count, 0) || 0,
      stockSummary: inventory?.reduce((acc: any, curr) => {
        if (!acc[curr.item_name]) acc[curr.item_name] = 0;
        acc[curr.item_name] += Number(curr.quantity);
        return acc;
      }, {}),
      pendingProcurements: pendingProcurements || 0
    };

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/government/feeding-program/schools
router.get('/schools', requireGovernmentAccess, async (req: Request, res: Response) => {
  const { province, district } = req.query;
  try {
    let query = supabaseAdmin
      .from('schools')
      .select('id, name, province, district');
    
    if (province) query = query.eq('province', province);
    if (district) query = query.eq('district', district);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/government/feeding-program/school/:id
router.get('/school/:id', requireGovernmentAccess, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data: inventory } = await supabaseAdmin
      .from('feeding_program_inventory')
      .select('*')
      .eq('school_id', id);
    
    const { data: deliveries } = await supabaseAdmin
      .from('feeding_program_deliveries')
      .select('*')
      .eq('school_id', id)
      .order('delivery_date', { ascending: false });

    const { data: meals } = await supabaseAdmin
      .from('feeding_program_meals')
      .select('*')
      .eq('school_id', id)
      .order('date', { ascending: false });

    res.json({ inventory, deliveries, meals });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/government/feeding-program/procurements/:id/approve
router.post('/feeding-program/procurements/:id/approve', requireGovernmentAccess, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).userId;
  try {
    const { data, error } = await supabaseAdmin
      .from('feeding_program_procurements')
      .update({ status: 'Approved', approved_by: userId })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/government/feeding-program/procurements/:id/reject
router.post('/feeding-program/procurements/:id/reject', requireGovernmentAccess, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).userId;
  try {
    const { data, error } = await supabaseAdmin
      .from('feeding_program_procurements')
      .update({ status: 'Rejected', approved_by: userId })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/government/feeding-program/procurements/pending
router.get('/feeding-program/procurements/pending', requireGovernmentAccess, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('feeding_program_procurements')
      .select('*, requested_by:profiles(full_name), school:schools(name, district, province)')
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const governmentPortalRouter = router;
