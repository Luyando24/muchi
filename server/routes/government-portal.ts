
import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import XLSX from 'xlsx';
import path from 'path';

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
    const districtsByProvince = new Map<string, Set<string>>();

    data?.forEach(school => {
      if (school.province) {
        provinces.add(school.province);
        if (!districtsByProvince.has(school.province)) {
          districtsByProvince.set(school.province, new Set<string>());
        }
        if (school.district) {
          districtsByProvince.get(school.province)!.add(school.district);
        }
      }
    });

    const regions = Array.from(provinces).map(province => ({
      province,
      districts: Array.from(districtsByProvince.get(province) || [])
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

// Helper to get system settings with defaults for government thresholds
const getSettings = async () => {
  const defaults = {
    gov_ptr_critical_threshold: '45',
    gov_ptr_warning_threshold: '35',
    gov_pass_rate_threshold: '40',
    gov_attendance_threshold: '75',
    gov_maize_allocation_per_student: '5',
    system_name: 'MUCHI Central',
    support_email: 'support@muchi.com',
    whatsapp_number: '260570260374',
    gov_promotion_min_tenure: '3',
    gov_promotion_min_qualification: "Bachelor's Degree",
    gov_diploma_upgrade_years_threshold: '5'
  };

  try {
    const { data, error } = await supabaseAdmin.from('system_settings').select('key, value');
    if (error) {
      console.warn("Failed to fetch system settings, using defaults:", error.message);
      return defaults;
    }
    const settingsMap = { ...defaults };
    data?.forEach((item: any) => {
      if (item.key && Object.prototype.hasOwnProperty.call(defaults, item.key)) {
        settingsMap[item.key as keyof typeof defaults] = item.value;
      }
    });
    return settingsMap;
  } catch (err) {
    console.warn("Failed to fetch system settings, using defaults:", err);
    return defaults;
  }
};

// GET /api/government/overview
router.get('/overview', requireGovernmentAccess, async (req: Request, res: Response) => {
  const province = req.query.province === 'All' ? null : req.query.province;
  const district = req.query.district === 'All' ? null : req.query.district;
  
  try {
    // 1. Basic Counts (Filtered by region if provided)
    let schoolQuery = supabaseAdmin.from('schools').select('*', { count: 'exact', head: true });
    let studentQuery = supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
    let teacherQuery = supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).or('role.eq.teacher,secondary_role.eq.teacher');

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

    // 3. Gender Breakdown (Students) - Optimized using student_demographics_by_school view
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

    let demographicsQuery = supabaseAdmin.from('student_demographics_by_school').select('school_id, gender, student_count');
    if (schoolIds.length > 0) {
      demographicsQuery = demographicsQuery.in('school_id', schoolIds);
    }
    const { data: demographicsData } = await demographicsQuery;
    const genderBreakdown: Record<string, number> = { Male: 0, Female: 0, Other: 0 };
    demographicsData?.forEach(p => {
      const g = p.gender || 'Other';
      genderBreakdown[g] = (genderBreakdown[g] || 0) + Number(p.student_count || 0);
    });

    // 4. Aggregate average attendance (%) - Optimized using attendance_analytics_by_school view
    let attendanceQuery = supabaseAdmin.from('attendance_analytics_by_school').select('school_id, total_days, present_days');
    if (schoolIds.length > 0) {
      attendanceQuery = attendanceQuery.in('school_id', schoolIds);
    }
    const { data: attendanceData } = await attendanceQuery;
    let totalAttendanceDays = 0;
    let presentDays = 0;
    const schoolAttendance = new Map<string, { present: number, total: number }>();
    attendanceData?.forEach(a => {
      const present = Number(a.present_days || 0);
      const total = Number(a.total_days || 0);
      totalAttendanceDays += total;
      presentDays += present;
      schoolAttendance.set(a.school_id, { present, total });
    });
    const avgAttendanceValue = totalAttendanceDays > 0 ? (presentDays / totalAttendanceDays) * 100 : 0;

    // 5. Aggregate national pass rate (%) and Gender-wise Grade Distribution - Optimized using views
    let gradeQuery = supabaseAdmin.from('grade_analytics_by_school').select('school_id, avg_percentage, total_grades');
    let gradeDistributionQuery = supabaseAdmin.from('gender_grade_distribution_by_school').select('gender, grade_label, grade_count');
    let subjectQuery = supabaseAdmin.from('subject_averages_by_school').select('subject_name, avg_percentage, total_grades');
    let teacherCountQuery = supabaseAdmin.from('teachers').select('school_id');

    if (schoolIds.length > 0) {
      gradeQuery = gradeQuery.in('school_id', schoolIds);
      gradeDistributionQuery = gradeDistributionQuery.in('school_id', schoolIds);
      subjectQuery = subjectQuery.in('school_id', schoolIds);
      teacherCountQuery = teacherCountQuery.in('school_id', schoolIds);
    }

    const [
      { data: gradeAnalytics },
      { data: distData },
      { data: subjData },
      { data: teacherCounts }
    ] = await Promise.all([gradeQuery, gradeDistributionQuery, subjectQuery, teacherCountQuery]);

    // Calculate overall pass rate and per-school grades maps
    let totalGradesCount = 0;
    let gradesWeightedSum = 0;
    const schoolGrades = new Map<string, { total: number, count: number }>();

    gradeAnalytics?.forEach(g => {
      const total = Number(g.total_grades || 0);
      const avg = Number(g.avg_percentage || 0);
      gradesWeightedSum += avg * total;
      totalGradesCount += total;

      const current = schoolGrades.get(g.school_id) || { total: 0, count: 0 };
      schoolGrades.set(g.school_id, { total: current.total + (avg * total), count: current.count + total });
    });

    const avgPassRate = totalGradesCount > 0 ? gradesWeightedSum / totalGradesCount : 0;

    // 6. Gender-wise Grade Distribution
    const genderGradeDistribution: Record<string, Record<string, number>> = {
      male: {},
      female: {},
      other: {}
    };

    distData?.forEach(g => {
      const gender = (g.gender || 'Other').toLowerCase();
      const targetGender = gender === 'male' || gender === 'female' ? gender : 'other';
      const label = g.grade_label || 'Fail';
      const count = Number(g.grade_count || 0);
      genderGradeDistribution[targetGender][label] = (genderGradeDistribution[targetGender][label] || 0) + count;
    });

    // Subject analytics
    const subjectDataMap: Record<string, { total: number, count: number }> = {};
    subjData?.forEach(g => {
      const name = g.subject_name || 'Unknown';
      const avg = Number(g.avg_percentage || 0);
      const total = Number(g.total_grades || 0);
      if (!subjectDataMap[name]) {
        subjectDataMap[name] = { total: 0, count: 0 };
      }
      subjectDataMap[name].total += avg * total;
      subjectDataMap[name].count += total;
    });

    const topSubjects: any[] = Object.entries(subjectDataMap)
      .map(([name, data]: any) => ({
        name,
        average: Number((data.total / data.count).toFixed(1)),
        count: data.count
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 10);

    // Map school student/teacher counts
    const schoolStudentCounts = new Map<string, number>();
    demographicsData?.forEach(p => {
      schoolStudentCounts.set(p.school_id, (schoolStudentCounts.get(p.school_id) || 0) + Number(p.student_count || 0));
    });

    const schoolTeacherCounts = new Map<string, number>();
    teacherCounts?.forEach(t => {
      if (t.school_id) {
        schoolTeacherCounts.set(t.school_id, (schoolTeacherCounts.get(t.school_id) || 0) + 1);
      }
    });

    const schoolPerformanceMetrics = filteredSchoolDetails.map(school => {
      const grades = schoolGrades.get(school.id);
      const att = schoolAttendance.get(school.id);
      const studentCount = schoolStudentCounts.get(school.id) || 0;
      const teacherCount = schoolTeacherCounts.get(school.id) || 0;
      return {
        id: school.id,
        name: school.name,
        district: school.district,
        province: school.province,
        category: school.category,
        type: school.school_type,
        passRate: grades ? Number((grades.total / grades.count).toFixed(1)) : 0,
        attendanceRate: att ? Number((att.present / att.total * 100).toFixed(1)) : 0,
        studentTeacherRatio: teacherCount > 0 ? Number((studentCount / teacherCount).toFixed(1)) : studentCount,
        studentCount,
        teacherCount
      };
    });

    const topSchools = [...schoolPerformanceMetrics]
      .sort((a, b) => b.passRate - a.passRate)
      .slice(0, 3);

    // 7. Category Performance
    const categoryGrades = new Map<string, { total: number, count: number }>();
    gradeAnalytics?.forEach(g => {
      const school = schoolMap.get(g.school_id);
      if (!school || !school.category) return;
      const total = Number(g.total_grades || 0);
      const avg = Number(g.avg_percentage || 0);
      const current = categoryGrades.get(school.category) || { total: 0, count: 0 };
      categoryGrades.set(school.category, { total: current.total + (avg * total), count: current.count + total });
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
    
    let yoyQuery = supabaseAdmin.from('grade_analytics_by_school').select('avg_percentage, total_grades, academic_year');
    if (schoolIds.length > 0) {
       yoyQuery = yoyQuery.in('school_id', schoolIds);
    }
    const { data: yoyData } = await yoyQuery.in('academic_year', [currentYear, prevYear]);
    
    let currentSum = 0;
    let currentCount = 0;
    let prevSum = 0;
    let prevCount = 0;

    yoyData?.forEach(g => {
      const total = Number(g.total_grades || 0);
      const avg = Number(g.avg_percentage || 0);
      const year = Number(g.academic_year);
      if (year === currentYear) {
        currentSum += avg * total;
        currentCount += total;
      } else if (year === prevYear) {
        prevSum += avg * total;
        prevCount += total;
      }
    });
    
    const currentAvg = currentCount > 0 ? currentSum / currentCount : 0;
    const prevAvg = prevCount > 0 ? prevSum / prevCount : 0;

    // Load threshold settings dynamically
    const settings = await getSettings();
    const passRateThreshold = parseFloat(settings.gov_pass_rate_threshold);
    const attendanceThreshold = parseFloat(settings.gov_attendance_threshold);
    const ptrCriticalThreshold = parseFloat(settings.gov_ptr_critical_threshold);
    const ptrWarningThreshold = parseFloat(settings.gov_ptr_warning_threshold);

    const districtPerformance: Record<string, { total: number, count: number }> = Object.create(null);
    schoolPerformanceMetrics.forEach(s => {
      if (!districtPerformance[s.district]) districtPerformance[s.district] = { total: 0, count: 0 };
      districtPerformance[s.district].total += s.passRate;
      districtPerformance[s.district].count += 1;
    });

    const underperformingClusters = Object.entries(districtPerformance)
      .map(([name, data]) => ({ name, avg: data.total / data.count }))
      .filter(d => d.avg < passRateThreshold)
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
      topSchools,
      thresholds: {
        passRate: passRateThreshold,
        attendance: attendanceThreshold,
        ptrCritical: ptrCriticalThreshold,
        ptrWarning: ptrWarningThreshold,
        systemName: settings.system_name,
        supportEmail: settings.support_email,
        whatsappNumber: settings.whatsapp_number,
        maizeAllocation: parseFloat(settings.gov_maize_allocation_per_student)
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/government/enrollment-analytics
router.get('/enrollment-analytics', requireGovernmentAccess, async (req: Request, res: Response) => {
  const { province, district } = req.query;
  try {
    let demographicsQuery = supabaseAdmin.from('student_demographics_by_school').select('gender, grade, dob, disability_status, student_count');
    
    const pFilter = province === 'All' ? null : province;
    const dFilter = district === 'All' ? null : district;

    if (pFilter || dFilter) {
      const { data: schoolIds } = await supabaseAdmin.from('schools').select('id')
        .match({ ...(pFilter && { province: pFilter }), ...(dFilter && { district: dFilter }) });
      demographicsQuery = demographicsQuery.in('school_id', schoolIds?.map(s => s.id) || []);
    }
    
    const { data: demographics, error } = await demographicsQuery;
    if (error) throw error;

    const currentYear = new Date().getFullYear();
    const ageBands: Record<string, number> = { 'Under 7': 0, '7-13': 0, '14-18': 0, 'Over 18': 0 };
    const gradeBreakdown: Record<string, number> = {};
    const disabilityBreakdown: Record<string, number> = {};
    const genderBreakdown: Record<string, number> = { Male: 0, Female: 0, Other: 0 };
    let totalEnrolled = 0;

    demographics?.forEach(s => {
      const count = Number(s.student_count || 0);
      totalEnrolled += count;

      // Age calculation
      if (s.dob) {
        const age = currentYear - new Date(s.dob).getFullYear();
        if (age < 7) ageBands['Under 7'] += count;
        else if (age <= 13) ageBands['7-13'] += count;
        else if (age <= 18) ageBands['14-18'] += count;
        else ageBands['Over 18'] += count;
      }

      // Grade breakdown
      const grade = s.grade || 'Unknown';
      gradeBreakdown[grade] = (gradeBreakdown[grade] || 0) + count;

      // Disability breakdown
      const disability = s.disability_status || 'none';
      disabilityBreakdown[disability] = (disabilityBreakdown[disability] || 0) + count;

      // Gender
      const g = s.gender || 'Other';
      genderBreakdown[g] = (genderBreakdown[g] || 0) + count;
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
      totalEnrolled
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

    let teacherQuery = supabaseAdmin.from('teachers').select('*, profiles!teachers_staff_user_id_fkey(full_name, gender, location_type), schools(name, district, province, location_type)');
    if (schoolIds.length > 0) {
      teacherQuery = teacherQuery.in('school_id', schoolIds);
    } else if (provinceFilter || districtFilter) {
      // If filters provided but no schools found, return empty
      return res.json({ qualificationBreakdown: {}, specializationBreakdown: {}, locationBreakdown: { Rural: 0, Urban: 0 }, staffingGaps: [], totalTeachers: 0 });
    }

    const { data: teachers } = await teacherQuery;

    const qualificationBreakdown: Record<string, number> = {};
    const specializationBreakdown: Record<string, number> = {};
    const locationBreakdown = { Rural: 0, Urban: 0 };
    
    teachers?.forEach(t => {
      const qual = t.qualification || 'Other';
      qualificationBreakdown[qual] = (qualificationBreakdown[qual] || 0) + 1;
      
      const spec = t.specialization || 'General';
      specializationBreakdown[spec] = (specializationBreakdown[spec] || 0) + 1;

      // Location type is determined by the school, not the individual teacher
      const loc = t.schools?.location_type || 'Urban';
      if (loc === 'Rural') locationBreakdown.Rural++;
      else locationBreakdown.Urban++;
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

    const settings = await getSettings();
    const ptrCritical = parseFloat(settings.gov_ptr_critical_threshold);
    const ptrWarning = parseFloat(settings.gov_ptr_warning_threshold);

    const staffingGaps = schools?.map(s => {
      const tc = teacherCountsBySchool.get(s.id) || 0;
      const sc = studentCountsBySchool.get(s.id) || 0;
      const ptr = tc > 0 ? sc / tc : sc;
      return {
        schoolName: s.name,
        district: s.district,
        ptr: Number(ptr.toFixed(1)),
        gap: ptr >= ptrCritical ? 'Critical' : ptr >= ptrWarning ? 'Warning' : 'Stable'
      };
    }).filter(s => s.ptr >= ptrWarning).sort((a, b) => b.ptr - a.ptr);

    res.json({
      qualificationBreakdown,
      specializationBreakdown,
      locationBreakdown,
      staffingGaps,
      totalTeachers: teachers?.length || 0,
      thresholds: {
        ptrCritical,
        ptrWarning
      }
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
      }, Object.create(null)),
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

// GET /api/government/staffing-overview
router.get('/staffing-overview', requireGovernmentAccess, async (req: Request, res: Response) => {
  const { province, district } = req.query;
  try {
    let schoolQuery = supabaseAdmin.from('schools').select('id, name, district, province');
    if (province && province !== 'All') schoolQuery = schoolQuery.eq('province', province);
    if (district && district !== 'All') schoolQuery = schoolQuery.eq('district', district);
    
    const { data: schools } = await schoolQuery;
    const schoolIds = schools?.map(s => s.id) || [];

    if (schoolIds.length === 0) {
      return res.json({ headcount: 0, genderBreakdown: { Male: 0, Female: 0, Other: 0 }, locationBreakdown: { Rural: 0, Urban: 0 }, mortality: [], vacancies: [], alerts: [] });
    }

    // Teachers — join school to get location_type from school, not profile
    const { data: teachers } = await supabaseAdmin.from('profiles')
      .select('gender, school_id')
      .or('role.eq.teacher,secondary_role.eq.teacher')
      .in('school_id', schoolIds);

    // Build school location map
    const { data: schoolsWithLocation } = await supabaseAdmin.from('schools')
      .select('id, location_type')
      .in('id', schoolIds);
    const schoolLocationMap = new Map<string, string>();
    schoolsWithLocation?.forEach((s: any) => schoolLocationMap.set(s.id, s.location_type || 'Urban'));

    const genderBreakdown = { Male: 0, Female: 0, Other: 0 };
    const locationBreakdown = { Rural: 0, Urban: 0 };
    const teacherCountsBySchool = new Map<string, number>();
    teachers?.forEach(t => {
      const g = t.gender || 'Other';
      if (g === 'Male') genderBreakdown.Male++;
      else if (g === 'Female') genderBreakdown.Female++;
      else genderBreakdown.Other++;

      // Location type comes from the school, not the teacher profile
      const loc = (t.school_id ? schoolLocationMap.get(t.school_id) : null) || 'Urban';
      if (loc === 'Rural') locationBreakdown.Rural++;
      else locationBreakdown.Urban++;
      
      if (t.school_id) {
        teacherCountsBySchool.set(t.school_id, (teacherCountsBySchool.get(t.school_id) || 0) + 1);
      }
    });

    // Students for PTR
    const { data: students } = await supabaseAdmin.from('profiles')
      .select('school_id')
      .eq('role', 'student')
      .in('school_id', schoolIds);
      
    const studentCountsBySchool = new Map<string, number>();
    students?.forEach(s => {
      if (s.school_id) {
        studentCountsBySchool.set(s.school_id, (studentCountsBySchool.get(s.school_id) || 0) + 1);
      }
    });

    const settings = await getSettings();
    const ptrCritical = parseFloat(settings.gov_ptr_critical_threshold);
    const ptrWarning = parseFloat(settings.gov_ptr_warning_threshold);

    const alerts = schools?.map(s => {
      const tc = teacherCountsBySchool.get(s.id) || 0;
      const sc = studentCountsBySchool.get(s.id) || 0;
      const ptr = tc > 0 ? sc / tc : sc;
      if (ptr >= ptrCritical) return { schoolName: s.name, district: s.district, ptr: Number(ptr.toFixed(1)), level: 'Critical' };
      if (ptr >= ptrWarning) return { schoolName: s.name, district: s.district, ptr: Number(ptr.toFixed(1)), level: 'Warning' };
      return null;
    }).filter(Boolean);

    // Mortality
    const { data: mortalityData } = await supabaseAdmin.from('teacher_mortality').select('*, profiles(full_name, gender, school_id)');
    const mortality = mortalityData?.filter((m: any) => m.profiles?.school_id && schoolIds.includes(m.profiles.school_id)) || [];

    // Vacancies
    const { data: vacancies } = await supabaseAdmin.from('school_vacancies').select('*, schools(name, district, province)').in('school_id', schoolIds);

    res.json({
      headcount: teachers?.length || 0,
      genderBreakdown,
      locationBreakdown,
      mortality,
      vacancies: vacancies || [],
      alerts: alerts || []
    });
  } catch (error: any) { res.status(500).json({ message: error.message }); }
});

// GET /api/government/academic-performance
router.get('/academic-performance', requireGovernmentAccess, async (req: Request, res: Response) => {
  const { province, district } = req.query;
  try {
    let schoolQuery = supabaseAdmin.from('schools').select('id, name, district, province');
    if (province && province !== 'All') schoolQuery = schoolQuery.eq('province', province);
    if (district && district !== 'All') schoolQuery = schoolQuery.eq('district', district);
    
    const { data: schools } = await schoolQuery;
    const schoolIds = schools?.map(s => s.id) || [];

    if (schoolIds.length === 0) return res.json({ performanceList: [] });

    // This is a simplified aggregated view.
    // Fetch grades, attendance, infrastructure scores
    const { data: grades } = await supabaseAdmin.from('student_grades').select('school_id, percentage').in('school_id', schoolIds);
    const { data: infra } = await supabaseAdmin.from('school_infrastructure_scores').select('*').in('school_id', schoolIds);
    
    const schoolGrades = new Map<string, { total: number, count: number }>();
    grades?.forEach(g => {
      if (!g.percentage) return;
      const current = schoolGrades.get(g.school_id) || { total: 0, count: 0 };
      current.total += g.percentage;
      current.count++;
      schoolGrades.set(g.school_id, current);
    });

    const performanceList = schools?.map(s => {
      const g = schoolGrades.get(s.id);
      const passRate = g && g.count > 0 ? Number((g.total / g.count).toFixed(1)) : 0;
      const i = infra?.find(inf => inf.school_id === s.id);
      return {
        schoolId: s.id,
        schoolName: s.name,
        district: s.district,
        province: s.province,
        passRate,
        infrastructureScore: i ? Number(i.overall_infrastructure_score) : 0,
        // Mocked missing drivers (would be aggregated from other tables in real logic)
        teacherQualAvg: 'Diploma',
        absenteeismRate: Math.floor(Math.random() * 15) + 2, // Mock placeholder
        vulnerablePct: Math.floor(Math.random() * 30) + 5 // Mock placeholder
      };
    }).sort((a, b) => b.passRate - a.passRate);

    res.json({ performanceList });
  } catch (error: any) { res.status(500).json({ message: error.message }); }
});

// GET /api/government/transfers-housing
router.get('/transfers-housing', requireGovernmentAccess, async (req: Request, res: Response) => {
  const { province, district } = req.query;
  try {
    // Housing Status Breakdown
    let profileQuery = supabaseAdmin.from('profiles').select('housing_status, living_with_spouse, marital_status, school_id').or('role.eq.teacher,secondary_role.eq.teacher');
    
    if (province && province !== 'All' || district && district !== 'All') {
      let schoolQuery = supabaseAdmin.from('schools').select('id');
      if (province && province !== 'All') schoolQuery = schoolQuery.eq('province', province);
      if (district && district !== 'All') schoolQuery = schoolQuery.eq('district', district);
      const { data: schools } = await schoolQuery;
      const schoolIds = schools?.map(s => s.id) || [];
      if (schoolIds.length > 0) profileQuery = profileQuery.in('school_id', schoolIds);
      else return res.json({ housingStats: {}, reunions: [], transfers: [] });
    }

    const { data: housingData } = await profileQuery;
    const housingStats = {
      Government: 0, Private: 0, OwnHome: 0, Unknown: 0, SeparatedFromSpouse: 0
    };
    
    housingData?.forEach(h => {
      const status = h.housing_status || 'Unknown';
      if (status === 'Government House') housingStats.Government++;
      else if (status === 'Private Rental') housingStats.Private++;
      else if (status === 'Own Home') housingStats.OwnHome++;
      else housingStats.Unknown++;
      
      if (h.marital_status === 'Married' && h.living_with_spouse === false) {
        housingStats.SeparatedFromSpouse++;
      }
    });

    const { data: transfers } = await supabaseAdmin.from('teacher_transfers').select('*, profiles(full_name), origin:schools!origin_school_id(name, location_type), dest:schools!destination_school_id(name, location_type)');
    const { data: reunions } = await supabaseAdmin.from('couple_reunion_applications').select('*, profiles(full_name, school_id)');

    const transferFlowStats = { RuralToUrban: 0, UrbanToRural: 0, RuralToRural: 0, UrbanToUrban: 0 };
    transfers?.forEach((t: any) => {
      const originLoc = t.origin?.location_type || 'Urban';
      const destLoc = t.dest?.location_type || 'Urban';
      if (originLoc === 'Rural' && destLoc === 'Urban') transferFlowStats.RuralToUrban++;
      else if (originLoc === 'Urban' && destLoc === 'Rural') transferFlowStats.UrbanToRural++;
      else if (originLoc === 'Rural' && destLoc === 'Rural') transferFlowStats.RuralToRural++;
      else if (originLoc === 'Urban' && destLoc === 'Urban') transferFlowStats.UrbanToUrban++;
    });

    res.json({ housingStats, transfers: transfers || [], reunions: reunions || [], transferFlowStats });
  } catch (error: any) { res.status(500).json({ message: error.message }); }
});

// GET /api/government/qualifications
router.get('/qualifications', requireGovernmentAccess, async (req: Request, res: Response) => {
  const { province, district } = req.query;
  try {
    const settings = await getSettings();
    let profileQuery = supabaseAdmin.from('profiles').select('id, full_name, highest_qualification, current_role, institution_name, completion_year, school_id, join_date, created_at, employment_date, schools(name, school_type, province, district)').or('role.eq.teacher,secondary_role.eq.teacher');
    
    if (province && province !== 'All' || district && district !== 'All') {
      let schoolQuery = supabaseAdmin.from('schools').select('id');
      if (province && province !== 'All') schoolQuery = schoolQuery.eq('province', province);
      if (district && district !== 'All') schoolQuery = schoolQuery.eq('district', district);
      const { data: schools } = await schoolQuery;
      const schoolIds = schools?.map(s => s.id) || [];
      if (schoolIds.length > 0) {
        profileQuery = profileQuery.in('school_id', schoolIds);
      } else {
        return res.json({ qualifications: [], distribution: {}, upgradesRate: [], schoolStats: [], alerts: [], settings });
      }
    }

    const { data: profiles } = await profileQuery;
    const distribution: Record<string, number> = {};
    
    const teacherIds = profiles?.map(t => t.id) || [];
    let cpdSums: Record<string, number> = {};
    
    if (teacherIds.length > 0) {
      const { data: cpdData } = await supabaseAdmin
        .from('teacher_cpd')
        .select('teacher_id, hours')
        .in('teacher_id', teacherIds);
      
      cpdData?.forEach(item => {
        cpdSums[item.teacher_id] = (cpdSums[item.teacher_id] || 0) + item.hours;
      });
    }

    const currentYear = new Date().getFullYear();
    const qualifications = (profiles || []).map((t: any) => {
      const qual = t.highest_qualification || 'Unknown';
      distribution[qual] = (distribution[qual] || 0) + 1;

      const joinYearStr = t.employment_date
        ? String(t.employment_date).split('-')[0]
        : (t.join_date 
            ? String(t.join_date).split('-')[0] 
            : (t.created_at ? String(t.created_at).split('-')[0] : null));
      const joinYear = joinYearStr ? parseInt(joinYearStr, 10) : (currentYear - 2);
      const tenureYears = Math.max(0, currentYear - joinYear);

      return {
        ...t,
        tenureYears,
        cpdHours: cpdSums[t.id] || 0
      };
    });

    // Compute upgrades rate
    const upgradesByYear: Record<number, number> = {};
    profiles?.forEach(t => {
      if (t.completion_year) {
        upgradesByYear[t.completion_year] = (upgradesByYear[t.completion_year] || 0) + 1;
      }
    });
    const upgradesRate = Object.entries(upgradesByYear)
      .map(([year, count]) => ({ year: parseInt(year, 10), count }))
      .sort((a, b) => a.year - b.year);

    // Compute schoolStats
    const schoolStatsMap: Record<string, { schoolId: string, name: string, schoolType: string, district: string, province: string, totalTeachers: number, bachelorsAndAbove: number }> = {};
    
    qualifications.forEach(t => {
      const school = t.schools;
      if (!school || !t.school_id) return;
      
      const schoolId = t.school_id;
      if (!schoolStatsMap[schoolId]) {
        schoolStatsMap[schoolId] = {
          schoolId,
          name: school.name || 'Unknown',
          schoolType: school.school_type || 'Unknown',
          district: school.district || 'Unknown',
          province: school.province || 'Unknown',
          totalTeachers: 0,
          bachelorsAndAbove: 0
        };
      }
      
      schoolStatsMap[schoolId].totalTeachers++;
      
      const qual = t.highest_qualification || '';
      const hasDegree = ["Bachelor's Degree", "Master's Degree", "PhD"].includes(qual);
      if (hasDegree) {
        schoolStatsMap[schoolId].bachelorsAndAbove++;
      }
    });

    const schoolStats = Object.values(schoolStatsMap).map(s => ({
      ...s,
      percentage: s.totalTeachers > 0 ? Math.round((s.bachelorsAndAbove / s.totalTeachers) * 100) : 0
    })).sort((a, b) => b.percentage - a.percentage);

    // Compute alerts (Diploma holders at Secondary School with tenure >= threshold)
    const alertLimit = parseInt(settings.gov_diploma_upgrade_years_threshold, 10) || 5;
    const alerts = qualifications.filter(t => {
      const isDiploma = (t.highest_qualification || '').toLowerCase() === 'diploma';
      const isSecondary = (t.schools?.school_type || '').toLowerCase() === 'secondary school';
      const isExceeded = t.tenureYears >= alertLimit;
      return isDiploma && isSecondary && isExceeded;
    }).map(t => ({
      teacherId: t.id,
      fullName: t.full_name,
      schoolName: t.schools?.name || 'Unknown',
      district: t.schools?.district || 'Unknown',
      province: t.schools?.province || 'Unknown',
      qualification: t.highest_qualification,
      tenureYears: t.tenureYears,
      limit: alertLimit
    }));

    res.json({ qualifications, distribution, upgradesRate, schoolStats, alerts, settings });
  } catch (error: any) { res.status(500).json({ message: error.message }); }
});

// GET /api/government/teacher-disabilities
router.get('/teacher-disabilities', requireGovernmentAccess, async (req: Request, res: Response) => {
  const { province, district } = req.query;
  try {
    let profileQuery = supabaseAdmin.from('profiles').select('id, full_name, disability_status, accommodation_provided, school_id').or('role.eq.teacher,secondary_role.eq.teacher');
    
    if (province && province !== 'All' || district && district !== 'All') {
      let schoolQuery = supabaseAdmin.from('schools').select('id');
      if (province && province !== 'All') schoolQuery = schoolQuery.eq('province', province);
      if (district && district !== 'All') schoolQuery = schoolQuery.eq('district', district);
      const { data: schools } = await schoolQuery;
      const schoolIds = schools?.map(s => s.id) || [];
      if (schoolIds.length > 0) profileQuery = profileQuery.in('school_id', schoolIds);
      else return res.json({ disabilities: [], summary: {} });
    }

    const { data: profiles } = await profileQuery;
    const disabilities = profiles?.filter(p => p.disability_status && p.disability_status !== 'None') || [];
    
    const summary: Record<string, number> = {};
    disabilities.forEach(d => {
      const status = d.disability_status;
      summary[status] = (summary[status] || 0) + 1;
    });

    res.json({ disabilities, summary });
  } catch (error: any) { res.status(500).json({ message: error.message }); }
});

// GET /api/government/student-vulnerabilities
router.get('/student-vulnerabilities', requireGovernmentAccess, async (req: Request, res: Response) => {
  const { province, district } = req.query;
  try {
    let profileQuery = supabaseAdmin.from('profiles').select('id, full_name, disability_type, poverty_flag, orphan_status, bursary_recipient, school_id').eq('role', 'student');
    
    if (province && province !== 'All' || district && district !== 'All') {
      let schoolQuery = supabaseAdmin.from('schools').select('id');
      if (province && province !== 'All') schoolQuery = schoolQuery.eq('province', province);
      if (district && district !== 'All') schoolQuery = schoolQuery.eq('district', district);
      const { data: schools } = await schoolQuery;
      const schoolIds = schools?.map(s => s.id) || [];
      if (schoolIds.length > 0) profileQuery = profileQuery.in('school_id', schoolIds);
      else return res.json({ stats: { totalVulnerable: 0, disabilities: 0, orphans: 0, poverty: 0, bursaries: 0 } });
    }

    const { data: students } = await profileQuery;
    
    const stats = {
      totalVulnerable: 0,
      disabilities: 0,
      orphans: 0,
      poverty: 0,
      bursaries: 0
    };

    students?.forEach(s => {
      let isVulnerable = false;
      if (s.disability_type && s.disability_type !== 'None') { stats.disabilities++; isVulnerable = true; }
      if (s.orphan_status && s.orphan_status !== 'None') { stats.orphans++; isVulnerable = true; }
      if (s.poverty_flag === 'Yes') { stats.poverty++; isVulnerable = true; }
      if (s.bursary_recipient) { stats.bursaries++; isVulnerable = true; }
      
      if (isVulnerable) stats.totalVulnerable++;
    });

    res.json({ stats });
  } catch (error: any) { res.status(500).json({ message: error.message }); }
});

// GET /api/government/settings
router.get('/settings', requireGovernmentAccess, async (req: Request, res: Response) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/government/settings
router.put('/settings', requireGovernmentAccess, async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    
    // Process updates into key-value format for system_settings table
    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
      updated_by: (req as any).userId
    }));

    if (updates.length === 0) {
      return res.json({ message: 'No settings to update' });
    }

    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .upsert(updates)
      .select();

    if (error) throw error;
    res.json({ message: 'Settings updated successfully', data });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/government/boarding-analytics
router.get('/boarding-analytics', requireGovernmentAccess, async (req: Request, res: Response) => {
  try {
    // 1. Fetch schools
    const { data: schools, error: schoolErr } = await supabaseAdmin
      .from("schools")
      .select("id, name, boarding_status, gender_composition, province, district");
    if (schoolErr) throw schoolErr;

    // 2. Fetch boarders
    const { data: boarders, error: boarderErr } = await supabaseAdmin
      .from("profiles")
      .select("id, school_id, gender")
      .eq("role", "student")
      .eq("boarding_type", "Boarder");
    if (boarderErr) throw boarderErr;

    // 3. Fetch blocks and rooms
    const { data: blocks, error: blockErr } = await supabaseAdmin
      .from("accommodation_blocks")
      .select("id, school_id, gender_policy");
    if (blockErr) throw blockErr;

    const { data: rooms, error: roomErr } = await supabaseAdmin
      .from("accommodation_rooms")
      .select("id, block_id, capacity");
    if (roomErr) throw roomErr;

    // 4. Fetch allocations with student details
    const { data: allocations, error: allocErr } = await supabaseAdmin
      .from("accommodation_allocations")
      .select("id, room_id, student_id, student:profiles(gender)")
      .eq("status", "Active");
    if (allocErr) throw allocErr;

    // 5. Fetch shortage notifications for current government user
    const { data: alerts, error: alertErr } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", (req as any).userId)
      .like("title", "Critical Accommodation Shortage at%")
      .order("created_at", { ascending: false });
    if (alertErr) throw alertErr;

    // Process general stats
    let dayCount = 0;
    let boardingCount = 0;
    let bothCount = 0;
    let unconfiguredCount = 0;

    schools?.forEach(s => {
      if (s.boarding_status === 'Day') dayCount++;
      else if (s.boarding_status === 'Boarding') boardingCount++;
      else if (s.boarding_status === 'Both') bothCount++;
      else unconfiguredCount++; // null or unknown
    });

    const totalBoarders = boarders?.length || 0;
    const maleBoarders = boarders?.filter(b => b.gender === 'Male').length || 0;
    const femaleBoarders = boarders?.filter(b => b.gender === 'Female').length || 0;

    const blockMap = new Map<string, any>();
    blocks?.forEach(b => blockMap.set(b.id, b));

    const roomMap = new Map<string, any>();
    let totalCapacity = 0;
    let maleCapacity = 0;
    let femaleCapacity = 0;

    rooms?.forEach(r => {
      const block = blockMap.get(r.block_id);
      if (block) {
        roomMap.set(r.id, block);
        totalCapacity += r.capacity;
        if (block.gender_policy === 'Male') maleCapacity += r.capacity;
        else if (block.gender_policy === 'Female') femaleCapacity += r.capacity;
        else {
          maleCapacity += Math.ceil(r.capacity / 2);
          femaleCapacity += Math.floor(r.capacity / 2);
        }
      }
    });

    let occupiedBeds = 0;
    let maleOccupied = 0;
    let femaleOccupied = 0;

    allocations?.forEach((a: any) => {
      occupiedBeds++;
      if (a.student?.gender === 'Male') maleOccupied++;
      else if (a.student?.gender === 'Female') femaleOccupied++;
    });

    const vacantBeds = Math.max(0, totalCapacity - occupiedBeds);
    const vacantMale = Math.max(0, maleCapacity - maleOccupied);
    const vacantFemale = Math.max(0, femaleCapacity - femaleOccupied);

    // School stats mapping
    const schoolStats = new Map<string, any>();
    schools?.forEach(s => {
      schoolStats.set(s.id, {
        id: s.id,
        name: s.name,
        province: s.province || 'Unknown',
        district: s.district || 'Unknown',
        boardingStatus: s.boarding_status,
        genderComposition: s.gender_composition,
        boarders: 0,
        maleBoarders: 0,
        femaleBoarders: 0,
        capacity: 0,
        occupied: 0,
        shortage: 0
      });
    });

    boarders?.forEach(b => {
      const stats = schoolStats.get(b.school_id);
      if (stats) {
        stats.boarders++;
        if (b.gender === 'Male') stats.maleBoarders++;
        else if (b.gender === 'Female') stats.femaleBoarders++;
      }
    });

    rooms?.forEach(r => {
      const block = blockMap.get(r.block_id);
      if (block) {
        const stats = schoolStats.get(block.school_id);
        if (stats) stats.capacity += r.capacity;
      }
    });

    allocations?.forEach((a: any) => {
      const block = roomMap.get(a.room_id);
      if (block) {
        const stats = schoolStats.get(block.school_id);
        if (stats) stats.occupied++;
      }
    });

    const shortagesList: any[] = [];
    schoolStats.forEach((stats) => {
      if (stats.boardingStatus !== 'Day' && stats.boarders > stats.capacity) {
        stats.shortage = stats.boarders - stats.capacity;
        shortagesList.push(stats);
      }
    });

    res.json({
      schoolDistribution: { day: dayCount, boarding: boardingCount, both: bothCount, unconfigured: unconfiguredCount },
      demographics: { totalBoarders, maleBoarders, femaleBoarders },
      capacity: {
        totalCapacity,
        maleCapacity,
        femaleCapacity,
        occupiedBeds,
        maleOccupied,
        femaleOccupied,
        vacantBeds,
        vacantMale,
        vacantFemale
      },
      shortages: shortagesList,
      alerts: alerts || []
    });
  } catch (error: any) {
    console.error("Boarding Analytics Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/government/calendar
router.get("/calendar", requireGovernmentAccess, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("ministry_calendar")
      .select("*")
      .order("start_date", { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error("Gov Get Calendar Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/government/calendar
router.post("/calendar", requireGovernmentAccess, async (req: Request, res: Response) => {
  try {
    const { year, type, name, start_date, end_date, midterm_begin, midterm_end } = req.body;
    const { data, error } = await supabaseAdmin
      .from("ministry_calendar")
      .insert({
        year,
        type,
        name,
        start_date,
        end_date,
        midterm_begin: midterm_begin || null,
        midterm_end: midterm_end || null
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    console.error("Gov Post Calendar Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/government/calendar/:id
router.put("/calendar/:id", requireGovernmentAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { year, type, name, start_date, end_date, midterm_begin, midterm_end } = req.body;
    const { data, error } = await supabaseAdmin
      .from("ministry_calendar")
      .update({
        year,
        type,
        name,
        start_date,
        end_date,
        midterm_begin: midterm_begin || null,
        midterm_end: midterm_end || null,
        updated_at: new Date()
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error("Gov Put Calendar Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/government/calendar/:id
router.delete("/calendar/:id", requireGovernmentAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from("ministry_calendar")
      .delete()
      .eq("id", id);
    if (error) throw error;
    res.json({ message: "Calendar entry deleted successfully" });
  } catch (err: any) {
    console.error("Gov Delete Calendar Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/government/calendar/reset
router.post("/calendar/reset", requireGovernmentAccess, async (req: Request, res: Response) => {
  try {
    const excelPath = path.join(process.cwd(), 'zambia_school_calendar_2026_2030.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    function parseDateString(str: any, year: string) {
      if (!str) return null;
      let clean = String(str).replace(/^[A-Za-z]+,\s*/, '').trim();
      const match = clean.match(/^(\d+)(st|nd|rd|th)?\s+([A-Za-z]+)$/i);
      if (!match) return null;
      const day = parseInt(match[1], 10);
      const monthName = match[3].toLowerCase();
      const months: Record<string, string> = {
        january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
        july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
      };
      const month = months[monthName];
      if (!month) return null;
      const dayStr = String(day).padStart(2, '0');
      return `${year}-${month}-${dayStr}`;
    }

    const years = ['2026', '2027', '2028', '2029', '2030'];
    const termData: Record<string, Record<string, any>> = {};
    const holidayEntries: any[] = [];
    const termEntries: any[] = [];

    let currentTerm: string | null = null;

    rawData.forEach((row) => {
      if (row.length === 0 || !row[0]) return;
      const label = String(row[0]).trim();
      
      if (label.includes('FIRST TERM')) {
        currentTerm = 'Term 1';
        return;
      } else if (label.includes('SECOND TERM')) {
        currentTerm = 'Term 2';
        return;
      } else if (label.includes('THIRD TERM')) {
        currentTerm = 'Term 3';
        return;
      }
      
      if (currentTerm) {
        if (label === 'Open' || label === 'Close' || label === 'ECE-MidTerm Break-Begin' || label === 'ECE-MidTerm Break-End') {
          years.forEach((year, colIdx) => {
            const val = row[colIdx + 1];
            const parsed = parseDateString(val, year);
            if (parsed) {
              if (!termData[year]) termData[year] = {};
              if (!termData[year][currentTerm!]) termData[year][currentTerm!] = {};
              
              if (label === 'Open') termData[year][currentTerm!].open = parsed;
              if (label === 'Close') termData[year][currentTerm!].close = parsed;
              if (label === 'ECE-MidTerm Break-Begin') termData[year][currentTerm!].midterm_begin = parsed;
              if (label === 'ECE-MidTerm Break-End') termData[year][currentTerm!].midterm_end = parsed;
            }
          });
        }
      }
    });

    Object.entries(termData).forEach(([year, terms]) => {
      Object.entries(terms).forEach(([termName, data]: [string, any]) => {
        termEntries.push({
          year,
          type: 'Term',
          name: termName,
          start_date: data.open,
          end_date: data.close,
          midterm_begin: data.midterm_begin || null,
          midterm_end: data.midterm_end || null
        });
      });
    });

    const holidayLabels = [
      "New Year's Day", "Women's Day", "Youth Day", "Good Friday", "Holy Saturday", 
      "Easter Monday", "Kenneth Kaunda Day", "Labour Day", "Africa Freedom Day", 
      "Heroes Day", "Unity Day", "Farmers' Day", "Teacher's Day", "National Prayers Day", 
      "Independence Day", "Christmas Day"
    ];

    rawData.forEach((row) => {
      if (row.length === 0 || !row[0]) return;
      const label = String(row[0]).trim();
      if (holidayLabels.includes(label)) {
        years.forEach((year, colIdx) => {
          const val = row[colIdx + 1];
          const parsed = parseDateString(val, year);
          if (parsed) {
            holidayEntries.push({
              year,
              type: 'Holiday',
              name: label,
              start_date: parsed,
              end_date: parsed
            });
          }
        });
      }
    });

    // 1. Delete all current rows in ministry_calendar
    const { error: deleteError } = await supabaseAdmin
      .from("ministry_calendar")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) throw deleteError;

    // 2. Insert terms and holidays
    const allInserts = [...termEntries, ...holidayEntries];
    const { error: insertError } = await supabaseAdmin
      .from("ministry_calendar")
      .insert(allInserts);

    if (insertError) throw insertError;

    res.json({ success: true, count: allInserts.length });
  } catch (err: any) {
    console.error("Gov Reset Calendar Error:", err);
    res.status(500).json({ message: err.message });
  }
});

export const governmentPortalRouter = router;
