
import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

// Middleware to verify System Admin or Government Official
const requireGovernmentAccess = async (req: Request, res: Response, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Missing Authorization Header' });
    
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Invalid Token Format' });

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ message: 'Unauthorized: Invalid Token' });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, secondary_role')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ message: 'Forbidden: Profile not found or access denied' });
    }

    if (profile.role !== 'system_admin' && profile.role !== 'government' && profile.secondary_role !== 'government') {
      return res.status(403).json({ message: 'Forbidden: Requires Government or System Admin privileges' });
    }

    // Attach user info to request
    (req as any).user = data.user;
    (req as any).userId = data.user.id;
    (req as any).userRole = profile.role;

    next();
  } catch (err: any) {
    console.error("Government Auth Middleware Error:", err);
    res.status(500).json({ message: `Auth error: ${err.message}` });
  }
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

// GET /api/government/population-data
router.get('/population-data', requireGovernmentAccess, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('population_projections')
      .select('*');
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/government/overview
router.get('/overview', requireGovernmentAccess, async (req: Request, res: Response) => {
  const province = req.query.province === 'All' ? null : req.query.province;
  const district = req.query.district === 'All' ? null : req.query.district;
  
  try {
    // 1. Basic Counts (Filtered by region if provided)
    let schoolQuery = supabaseAdmin.from('schools').select('*', { count: 'exact', head: true });
    let studentQuery = supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
    let teacherQuery = supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher');

    if (province) {
      schoolQuery = schoolQuery.eq('province', province as string);
      const { data: schoolIds } = await supabaseAdmin.from('schools').select('id').eq('province', province as string);
      const ids = schoolIds?.map(s => s.id) || [];
      studentQuery = studentQuery.in('school_id', ids);
      teacherQuery = teacherQuery.in('school_id', ids);
    }
    if (district) {
      schoolQuery = schoolQuery.eq('district', district as string);
      const { data: schoolIds } = await supabaseAdmin.from('schools').select('id').eq('district', district as string);
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
    const pFilter = province === 'All' ? null : province;
    const dFilter = district === 'All' ? null : district;

    if (pFilter || dFilter) {
       const { data: schoolIds } = await supabaseAdmin.from('schools').select('id')
         .match({ ...(pFilter && { province: pFilter }), ...(dFilter && { district: dFilter }) });
       attendanceQuery = attendanceQuery.in('school_id', schoolIds?.map(s => s.id) || []);
    }
    const { data: attendanceData } = await attendanceQuery;
    const totalAttendanceDays = attendanceData?.length || 0;
    const presentDays = attendanceData?.filter(a => a.status === 'present').length || 0;
    const avgAttendanceValue = totalAttendanceDays > 0 ? (presentDays / totalAttendanceDays) * 100 : 0;

    // 5. Aggregate national pass rate (%) and Gender-wise Grade Distribution
    // NOTE: Using a simpler query and manual joining below to ensure stability against schema cache issues
    let passRateQuery = supabaseAdmin.from('student_grades').select('school_id, percentage, student_id, subject_id, grade');

    let scalesQuery = supabaseAdmin.from('grading_scales').select('grade, min_percentage, max_percentage, description, school_id');
    
    let filteredSchoolDetails: any[] = [];
    const provinceFilter = province === 'All' ? null : province;
    const districtFilter = district === 'All' ? null : district;

    if (provinceFilter || districtFilter) {
      const { data: schoolDetails } = await supabaseAdmin.from('schools').select('id, name, district, province, category, school_type')
        .match({ ...(provinceFilter && { province: provinceFilter }), ...(districtFilter && { district: districtFilter }) });
      filteredSchoolDetails = schoolDetails || [];
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

    // Manual merge for profiles and subjects to ensure data visibility
    const studentIds = [...new Set(gradeData?.map(g => g.student_id) || [])];
    const subjectIds = [...new Set(gradeData?.map(g => g.subject_id) || [])];

    const [{ data: profilesData }, { data: subjectsData }] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, gender').in('id', studentIds),
      supabaseAdmin.from('subjects').select('id, name').in('id', subjectIds)
    ]);

    const profileMap = new Map(profilesData?.map(p => [p.id, p]));
    const subjectMap = new Map(subjectsData?.map(s => [s.id, s]));

    if (gradeData) {
      gradeData.forEach(g => {
        g.profiles = profileMap.get(g.student_id);
        g.subjects = subjectMap.get(g.subject_id);
      });
    }

    const validGrades = gradeData?.filter(g => g.grade !== 'ABSENT') || [];
    const totalGrades = validGrades.length;
    const avgPassRate = totalGrades > 0 
      ? validGrades.reduce((acc, curr) => acc + curr.percentage, 0) / totalGrades 
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
      if (g.percentage == null || g.grade === 'ABSENT') return;
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
      if (!g.school_id || g.percentage == null || g.grade === 'ABSENT') return;
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
      if (g.grade === 'ABSENT') return;
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

    // 8. YoY Pass Rate Comparison
    const currentYear = new Date().getFullYear();
    const prevYear = currentYear - 1;
    
    let yoyQuery = supabaseAdmin.from('student_grades').select('percentage, academic_year');
    if (province || district) {
       yoyQuery = yoyQuery.in('school_id', schoolIds);
    }
    const { data: yoyData } = await yoyQuery.in('academic_year', [currentYear, prevYear]);
    
    const currentYearGrades = yoyData?.filter(g => g.academic_year === currentYear) || [];
    const prevYearGrades = yoyData?.filter(g => g.academic_year === prevYear) || [];
    
    const currentAvg = currentYearGrades.length > 0 ? currentYearGrades.reduce((a, b) => a + b.percentage, 0) / currentYearGrades.length : 0;
    const prevAvg = prevYearGrades.length > 0 ? prevYearGrades.reduce((a, b) => a + b.percentage, 0) / prevYearGrades.length : 0;

    // 9. Underperforming Clusters (Districts with < 40% avg)
    const districtPerformance: Record<string, { total: number, count: number }> = {};
    schoolPerformanceMetrics.forEach(s => {
      if (!districtPerformance[s.district]) districtPerformance[s.district] = { total: 0, count: 0 };
      districtPerformance[s.district].total += s.passRate;
      districtPerformance[s.district].count += 1;
    });

    const underperformingClusters = Object.entries(districtPerformance)
      .map(([name, data]) => ({ name, avg: data.total / data.count }))
      .filter(d => d.avg < 40)
      .sort((a, b) => a.avg - b.avg);

    res.json({
      totalSchools: totalSchools || 0,
      totalStudents: totalStudents || 0,
      totalTeachers: totalTeachers || 0,
      studentTeacherRatio: totalTeachers! > 0 ? Number((totalStudents! / totalTeachers!).toFixed(1)) : totalStudents || 0,
      avgAttendance: Number(avgAttendanceValue.toFixed(1)),
      nationalPassRate: Number(avgPassRate.toFixed(1)),
      yoyPassRate: {
        current: Number(currentAvg.toFixed(1)),
        previous: Number(prevAvg.toFixed(1)),
        change: Number((currentAvg - prevAvg).toFixed(1))
      },
      underperformingClusters,
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

// GET /api/government/enrollment-analytics
router.get('/enrollment-analytics', requireGovernmentAccess, async (req: Request, res: Response) => {
  const { province, district } = req.query;
  try {
    let profileQuery = supabaseAdmin.from('profiles').select('gender, grade, dob, disability_status').eq('role', 'student');
    
    const pFilter = province === 'All' ? null : province;
    const dFilter = district === 'All' ? null : district;

    if (pFilter || dFilter) {
      const { data: schoolIds } = await supabaseAdmin.from('schools').select('id')
        .match({ ...(pFilter && { province: pFilter }), ...(dFilter && { district: dFilter }) });
      profileQuery = profileQuery.in('school_id', schoolIds?.map(s => s.id) || []);
    }
    
    const { data: students, error } = await profileQuery;
    if (error) throw error;

    const currentYear = new Date().getFullYear();
    const ageBands: Record<string, number> = { 'Under 7': 0, '7-13': 0, '14-18': 0, 'Over 18': 0 };
    const gradeBreakdown: Record<string, number> = {};
    const disabilityBreakdown: Record<string, number> = {};
    const genderBreakdown: Record<string, number> = { Male: 0, Female: 0, Other: 0 };

    students?.forEach(s => {
      // Age calculation
      if (s.dob) {
        const age = currentYear - new Date(s.dob).getFullYear();
        if (age < 7) ageBands['Under 7']++;
        else if (age <= 13) ageBands['7-13']++;
        else if (age <= 18) ageBands['14-18']++;
        else ageBands['Over 18']++;
      }

      // Grade breakdown
      const grade = s.grade || 'Unknown';
      gradeBreakdown[grade] = (gradeBreakdown[grade] || 0) + 1;

      // Disability breakdown
      const disability = s.disability_status || 'none';
      disabilityBreakdown[disability] = (disabilityBreakdown[disability] || 0) + 1;

      // Gender
      const g = s.gender || 'Other';
      genderBreakdown[g] = (genderBreakdown[g] || 0) + 1;
    });

    // NER/GER Calculation (Estimates)
    const { data: popData } = await supabaseAdmin.from('population_projections')
      .select('*')
      .eq('academic_year', currentYear);
    
    const primaryPop = popData?.find(p => p.age_group === '7-13')?.population_count || 4500000;
    const secondaryPop = popData?.find(p => p.age_group === '14-18')?.population_count || 3200000;

    const ger = {
      primary: Number(((ageBands['7-13'] / primaryPop) * 100).toFixed(1)),
      secondary: Number(((ageBands['14-18'] / secondaryPop) * 100).toFixed(1))
    };

    res.json({
      ageBands,
      gradeBreakdown,
      disabilityBreakdown,
      genderBreakdown,
      ger,
      totalEnrolled: students?.length || 0
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/government/teacher-analytics
router.get('/teacher-analytics', requireGovernmentAccess, async (req: Request, res: Response) => {
  const { province, district } = req.query;
  try {
    const provinceFilter = province === 'All' ? null : province;
    const districtFilter = district === 'All' ? null : district;

    let schoolIds: string[] = [];
    if (provinceFilter || districtFilter) {
      const { data: schools } = await supabaseAdmin.from('schools').select('id')
        .match({ ...(provinceFilter && { province: provinceFilter }), ...(districtFilter && { district: districtFilter }) });
      schoolIds = schools?.map(s => s.id) || [];
    }

    let teacherQuery = supabaseAdmin.from('teachers').select('*, profiles!teachers_staff_user_id_fkey(full_name, gender), schools(name, district, province)');
    if (schoolIds.length > 0) {
      teacherQuery = teacherQuery.in('school_id', schoolIds);
    } else if (provinceFilter || districtFilter) {
      // If filters provided but no schools found, return empty
      return res.json({ qualificationBreakdown: {}, specializationBreakdown: {}, staffingGaps: [], totalTeachers: 0 });
    }

    const { data: teachers } = await teacherQuery;

    const qualificationBreakdown: Record<string, number> = {};
    const specializationBreakdown: Record<string, number> = {};
    
    teachers?.forEach(t => {
      const qual = t.qualification || 'Other';
      qualificationBreakdown[qual] = (qualificationBreakdown[qual] || 0) + 1;
      
      const spec = t.specialization || 'General';
      specializationBreakdown[spec] = (specializationBreakdown[spec] || 0) + 1;
    });

    // Fetch school ratios
    let schoolQuery = supabaseAdmin.from('schools').select('id, name, district, province');
    if (provinceFilter) schoolQuery = schoolQuery.eq('province', provinceFilter);
    if (districtFilter) schoolQuery = schoolQuery.eq('district', districtFilter);
    
    const { data: schools } = await schoolQuery;
    const finalSchoolIds = schools?.map(s => s.id) || [];

    const { data: studentCounts } = await supabaseAdmin.rpc('get_student_counts_per_school'); 
    // Fallback if RPC doesn't exist: manually count
    const { data: students } = await supabaseAdmin.from('profiles').select('school_id').eq('role', 'student').in('school_id', finalSchoolIds);
    
    const teacherCountsBySchool = new Map<string, number>();
    teachers?.forEach(t => {
      if (t.profile?.school_id) {
        teacherCountsBySchool.set(t.profile.school_id, (teacherCountsBySchool.get(t.profile.school_id) || 0) + 1);
      }
    });

    const studentCountsBySchool = new Map<string, number>();
    students?.forEach(s => {
      studentCountsBySchool.set(s.school_id, (studentCountsBySchool.get(s.school_id) || 0) + 1);
    });

    const staffingGaps = schools?.map(s => {
      const tc = teacherCountsBySchool.get(s.id) || 0;
      const sc = studentCountsBySchool.get(s.id) || 0;
      const ptr = tc > 0 ? sc / tc : sc;
      return {
        schoolName: s.name,
        district: s.district,
        ptr: Number(ptr.toFixed(1)),
        gap: ptr > 40 ? 'Critical' : ptr > 30 ? 'Warning' : 'Stable'
      };
    }).filter(s => s.ptr > 35).sort((a, b) => b.ptr - a.ptr);

    res.json({
      qualificationBreakdown,
      specializationBreakdown,
      staffingGaps,
      totalTeachers: teachers?.length || 0
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/government/infrastructure-analytics
router.get('/infrastructure-analytics', requireGovernmentAccess, async (req: Request, res: Response) => {
  const { province, district } = req.query;
  try {
    const provinceFilter = province === 'All' ? null : province;
    const districtFilter = district === 'All' ? null : district;

    let query = supabaseAdmin.from('infrastructure_assessments').select('*, school:schools(name, province, district)');
    
    if (provinceFilter || districtFilter) {
      const { data: schoolIds } = await supabaseAdmin.from('schools').select('id')
        .match({ ...(provinceFilter && { province: provinceFilter }), ...(districtFilter && { district: districtFilter }) });
      const ids = schoolIds?.map(s => s.id) || [];
      if (ids.length === 0) return res.json({ summary: { waterAccessPct: 0, electricityAccessPct: 0, internetAccessPct: 0, avgToilets: 0, avgClassrooms: 0 }, assessments: [] });
      query = query.in('school_id', ids);
    }

    const { data: assessments, error } = await query;
    if (error) throw error;

    const stats = {
      waterAccess: 0,
      electricityAccess: 0,
      internetAccess: 0,
      totalToilets: 0,
      totalClassrooms: 0,
      count: assessments?.length || 0
    };

    assessments?.forEach(a => {
      if (a.water_access) stats.waterAccess++;
      if (a.electricity_access) stats.electricityAccess++;
      if (a.internet_connectivity) stats.internetAccess++;
      stats.totalToilets += (a.toilets_count || 0);
      stats.totalClassrooms += (a.classroom_count || 0);
    });

    res.json({
      summary: {
        waterAccessPct: stats.count > 0 ? Number(((stats.waterAccess / stats.count) * 100).toFixed(1)) : 0,
        electricityAccessPct: stats.count > 0 ? Number(((stats.electricityAccess / stats.count) * 100).toFixed(1)) : 0,
        internetAccessPct: stats.count > 0 ? Number(((stats.internetAccess / stats.count) * 100).toFixed(1)) : 0,
        avgToilets: stats.count > 0 ? Number((stats.totalToilets / stats.count).toFixed(1)) : 0,
        avgClassrooms: stats.count > 0 ? Number((stats.totalClassrooms / stats.count).toFixed(1)) : 0
      },
      assessments
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/government/cohort-survival
router.get('/cohort-survival', requireGovernmentAccess, async (req: Request, res: Response) => {
  try {
    // This is a complex calculation. For now, we simulate based on enrollment trends
    // In a real scenario, we'd follow student IDs across academic years
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear];
    
    const cohortData = await Promise.all(years.map(async year => {
      const { count } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true })
        .eq('role', 'student')
        .lte('created_at', `${year}-12-31`)
        .gte('created_at', `${year}-01-01`);
      return { year, count: count || 0 };
    }));

    res.json(cohortData);
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
