
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

    // 2. Aggregate average attendance (%)
    let attendanceQuery = supabaseAdmin.from('attendance').select('status');
    if (province || district) {
       const { data: schoolIds } = await supabaseAdmin.from('schools').select('id')
         .match({ ...(province && { province }), ...(district && { district }) });
       attendanceQuery = attendanceQuery.in('school_id', schoolIds?.map(s => s.id) || []);
    }
    const { data: attendanceData } = await attendanceQuery;
    const totalAttendanceDays = attendanceData?.length || 0;
    const presentDays = attendanceData?.filter(a => a.status === 'present').length || 0;
    const avgAttendanceValue = totalAttendanceDays > 0 ? (presentDays / totalAttendanceDays) * 100 : 0;

    // 3. Aggregate national pass rate (%) - Based on average grade percentage
    let passRateQuery = supabaseAdmin.from('student_grades').select('percentage');
    if (province || district) {
      const { data: schoolIds } = await supabaseAdmin.from('schools').select('id')
        .match({ ...(province && { province }), ...(district && { district }) });
      passRateQuery = passRateQuery.in('school_id', schoolIds?.map(s => s.id) || []);
    }
    const { data: gradeData } = await passRateQuery;
    const totalGrades = gradeData?.length || 0;
    const avgPassRate = totalGrades > 0 
      ? gradeData?.reduce((acc, curr) => acc + curr.percentage, 0) / totalGrades 
      : 0;

    res.json({
      totalSchools: totalSchools || 0,
      totalStudents: totalStudents || 0,
      totalTeachers: totalTeachers || 0,
      avgAttendance: Number(avgAttendanceValue.toFixed(1)),
      nationalPassRate: Number(avgPassRate.toFixed(1))
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
