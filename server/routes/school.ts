import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { WhatsAppService } from "../services/whatsappService.js";
import { requireActiveLicense } from "../middleware/license.js";
import { ensureSchoolSettings } from "../lib/school-settings.js";
import { findBestClassMatch, normalizeClassName } from "../lib/class-matching.js";

// Helper function to bypass Supabase's max_rows limit by paginating
async function fetchAll(queryBuilder: any, limit = 1000) {
  let allData: any[] = [];
  let from = 0;
  let to = limit - 1;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await queryBuilder.range(from, to);
    if (error) throw error;
    
    if (data && data.length > 0) {
      allData = allData.concat(data);
      if (data.length < limit) {
        hasMore = false;
      } else {
        from += limit;
        to += limit;
      }
    } else {
      hasMore = false;
    }
  }
  return allData;
}

// Helper to calculate class rankings and averages
async function getClassRankings(classId: string, term: string, examType: string, academicYear: string) {
  const { data: enrollments } = await supabaseAdmin
    .from('enrollments')
    .select('student_id')
    .eq('class_id', classId)
    .eq('academic_year', academicYear);
    
  if (!enrollments || enrollments.length === 0) return { rankings: {}, classAverage: 0, totalStudents: 0 };
  
  const studentIds = enrollments.map(e => e.student_id);
  
  // Need to use fetchAll to bypass 1000 row limit for grades if class is large
  const gradesQuery = supabaseAdmin
    .from('student_grades')
    .select('student_id, percentage')
    .in('student_id', studentIds)
    .eq('term', term)
    .eq('exam_type', examType)
    .eq('academic_year', academicYear);
    
  const grades = await fetchAll(gradesQuery);
  
  const studentAverages: Record<string, { total: number, count: number, avg: number }> = {};
  studentIds.forEach(id => studentAverages[id] = { total: 0, count: 0, avg: 0 });
  
  if (grades) {
    grades.forEach((g: any) => {
      if (g.percentage !== null && g.percentage !== undefined && g.percentage !== '') {
         studentAverages[g.student_id].total += Number(g.percentage);
         studentAverages[g.student_id].count += 1;
      }
    });
  }
  
  let classTotal = 0;
  let classCount = 0;
  
  const averagesList = Object.entries(studentAverages).map(([id, data]) => {
     const avg = data.count > 0 ? data.total / data.count : 0;
     if (data.count > 0) {
       classTotal += avg;
       classCount += 1;
     }
     return { id, avg };
  });
  
  averagesList.sort((a, b) => b.avg - a.avg);
  
  const rankings: Record<string, number> = {};
  averagesList.forEach((item, index) => {
    rankings[item.id] = index + 1; // 1-based rank
  });
  
  const classAverage = classCount > 0 ? classTotal / classCount : 0;
  
  return {
    rankings,
    classAverage,
    totalStudents: studentIds.length
  };
}

const router = Router();

// --- PUBLIC ENDPOINTS ---

// GET /api/public/verify-report
// Verifies a report card based on the QR code hash
router.get("/verify-report", async (req: Request, res: Response) => {
  const { studentNumber, term, examType, academicYear, average } = req.query;

  if (!studentNumber || !term || !examType || !academicYear || !average) {
    return res.status(400).json({ message: "Missing required verification parameters" });
  }

  try {
    // 1. Find the student profile by student number
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, school_id")
      .eq("student_number", studentNumber)
      .eq("role", "student")
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 2. Fetch the school name
    const { data: school, error: schoolError } = await supabaseAdmin
      .from("schools")
      .select("name")
      .eq("id", profile.school_id)
      .single();

    if (schoolError || !school) {
      return res.status(404).json({ message: "School not found" });
    }

    // 3. Verify the grades and calculate the average
    // We check if the provided average loosely matches the actual database average
    const { data: grades, error: gradesError } = await supabaseAdmin
      .from("student_grades")
      .select("percentage, grade")
      .eq("student_id", profile.id)
      .eq("term", term)
      .eq("exam_type", examType)
      .eq("academic_year", academicYear);

    if (gradesError || !grades || grades.length === 0) {
      return res.status(404).json({ message: "No grades found for this term" });
    }

    // Calculate actual average from DB
    const totalPercentage = grades.reduce((sum: number, g: any) => sum + (g.percentage || 0), 0);
    const actualAverage = grades.length > 0 ? (totalPercentage / grades.length).toFixed(1) : "0.0";

    // Compare averages (allow a tiny margin of error for floating point rounding)
    const providedAvgNum = parseFloat(average as string);
    const actualAvgNum = parseFloat(actualAverage);

    if (Math.abs(providedAvgNum - actualAvgNum) > 0.5) {
      return res.status(400).json({ 
        message: "Grade verification failed. The overall average does not match the official records." 
      });
    }

    res.json({
      valid: true,
      studentName: profile.full_name,
      schoolName: school.name,
      term,
      academicYear,
      average: actualAverage
    });

  } catch (error: any) {
    console.error("Verification Error:", error);
    res.status(500).json({ message: "Internal server error during verification" });
  }
});

// POST /api/school/teacher/reset-password
// Allows a teacher to reset their own password by providing their Email and Staff Number
router.post("/teacher/reset-password", async (req: Request, res: Response) => {
  const { email, staffNumber, newPassword } = req.body;

  if (!email || !staffNumber || !newPassword) {
    return res.status(400).json({ message: "Email, Staff Number, and New Password are required." });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  try {
    // 1. Verify that the email and staff number match a profile
    // We join with auth.users to be sure the email is the one used for auth
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, email")
      .eq("email", email)
      .eq("staff_number", staffNumber)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup error:", profileError);
      return res.status(500).json({ message: "Internal server error during verification." });
    }

    if (!profile) {
      return res.status(404).json({ message: "Account not found. Please verify your Email and Staff Number." });
    }

    if (profile.role !== 'teacher') {
       // Optional: Restrict this direct reset to teachers only?
       // The requirement says "allow teachers to reset own password"
       return res.status(403).json({ message: "Direct reset is only available for Teacher accounts." });
    }

    // 2. Update the password using admin privileges
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: newPassword
    });

    if (updateError) {
      console.error("Password update error:", updateError);
      return res.status(500).json({ message: "Failed to update password: " + updateError.message });
    }

    res.json({ message: "Password reset successful. You can now log in with your new password." });
  } catch (error: any) {
    console.error("Teacher Password Reset Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// POST /api/school/public-register
router.post("/public-register", async (req: Request, res: Response) => {
  const { name, email, password, grade, schoolSlug } = req.body;

  if (!name || !email || !password || !schoolSlug) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // 1. Get School ID from Slug
    const { data: school, error: schoolError } = await supabaseAdmin
      .from("schools")
      .select("id, name")
      .eq("slug", schoolSlug)
      .single();

    if (schoolError || !school) {
      return res.status(404).json({ message: "School not found" });
    }

    // 2. Create Auth User
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm for demo
        user_metadata: { name, grade },
      });

    if (authError) {
      return res.status(400).json({ message: authError.message });
    }

    if (!authData.user) {
      return res.status(500).json({ message: "Failed to create user" });
    }

    // 3. Create Profile (Student Role)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        role: "student",
        school_id: school.id,
        full_name: name,
        // grade is not in profiles table based on schema.sql, maybe store in metadata or enrollments?
        // Checking schema.sql: enrollments table links student to class.
        // For now, we just create the profile. Enrollment happens later by admin or teacher?
        // Or maybe store grade in metadata?
      });

    if (profileError) {
      // Rollback auth user creation if profile fails (optional but good practice)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res
        .status(500)
        .json({ message: "Failed to create profile: " + profileError.message });
    }

    res
      .status(201)
      .json({ message: "Registration successful", userId: authData.user.id });
  } catch (error: any) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// POST /api/school/public-apply
router.post("/public-apply", async (req: Request, res: Response) => {
  const {
    name,
    email,
    phone,
    grade,
    schoolSlug,
    previousSchool,
    guardianName,
    guardianPhone,
  } = req.body;

  if (!name || !email || !grade || !schoolSlug) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // 1. Get School ID from Slug
    const { data: school, error: schoolError } = await supabaseAdmin
      .from("schools")
      .select("id")
      .eq("slug", schoolSlug)
      .single();

    if (schoolError || !school) {
      return res.status(404).json({ message: "School not found" });
    }

    // 2. Create Application
    const { data, error: applicationError } = await supabaseAdmin
      .from("student_applications")
      .insert({
        school_id: school.id,
        full_name: name,
        email,
        phone_number: phone,
        grade_level: grade,
        previous_school: previousSchool,
        guardian_name: guardianName,
        guardian_phone: guardianPhone,
        dynamic_fields: req.body.dynamicFields || {},
        documents: req.body.documents || {},
        status: "pending",
      })
      .select()
      .single();

    if (applicationError) throw applicationError;

    res
      .status(201)
      .json({
        message: "Application submitted successfully",
        application: data,
      });
  } catch (error: any) {
    console.error("Application Error:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error: " + error.message });
  }
});

// GET /api/school/public-events
router.get("/public-events", async (req: Request, res: Response) => {
  const { schoolSlug } = req.query;

  if (!schoolSlug) {
    return res.status(400).json({ message: "School slug is required" });
  }

  try {
    // 1. Get School ID from Slug
    const { data: school, error: schoolError } = await supabaseAdmin
      .from("schools")
      .select("id")
      .eq("slug", schoolSlug)
      .single();

    if (schoolError || !school) {
      return res.status(404).json({ message: "School not found" });
    }

    // 2. Fetch Events
    const { data: events, error: eventsError } = await supabaseAdmin
      .from("calendar_events")
      .select("*")
      .eq("school_id", school.id)
      .gte("date", new Date().toISOString().split("T")[0]) // Only future/today events
      .order("date", { ascending: true })
      .limit(5);

    if (eventsError) throw eventsError;

    res.json(events);
  } catch (error: any) {
    console.error("Get Public Events Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Middleware to verify School Admin or Teacher
const ADMIN_ROLES = [
  "school_admin",
  "bursar",
  "registrar",
  "exam_officer",
  "academic_auditor",
  "accounts",
  "content_manager",
];

export const requireSchoolRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }

    try {
      // Get user from token
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
      }

      // Check role in profiles table
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, role, secondary_role, school_id") 
        .eq("id", user.id)
        .limit(1);

      const profile = profiles && profiles.length > 0 ? profiles[0] : null;

      if (profileError || !profile) {
        console.error(`[Auth] Forbidden: Profile not found for UID ${user.id}`);
        return res
          .status(403)
          .json({ message: "Forbidden: Profile not found" });
      }

      if (!allowedRoles.includes(profile.role) && (!profile.secondary_role || !allowedRoles.includes(profile.secondary_role))) {
        console.error(`[Auth] Forbidden: Role mismatch for UID ${user.id}. Role: ${profile.role}, Allowed: ${allowedRoles}`);
        return res
          .status(403)
          .json({
            message: `Forbidden: Requires one of [${allowedRoles.join(", ")}]`,
          });
      }


      // Attach user and profile to request
      (req as any).user = user;
      (req as any).profile = profile;

      // 4. Extra Security: Verify user has a valid school_id
      // if (!profile.school_id && profile.role !== 'system_admin') {
      //   return res.status(403).json({ message: "Forbidden: Account not associated with any school." });
      // }

      // 5. Extra Security: Verify current user session is not expired or revoked
      // Supabase getUser() handles this by verifying the JWT token

      // Check for active license
      await requireActiveLicense(req, res, next);
    } catch (error: any) {
      console.error("Auth Middleware Error:", error);
      res
        .status(500)
        .json({ message: "Internal Server Error", error: error.message });
    }
  };
};

// POST /api/school/user/clear-temp-password
router.post(
  "/user/clear-temp-password",
  requireSchoolRole([...ADMIN_ROLES, "teacher", "student", "parent"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    
    try {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update({ 
          is_temp_password: false,
          temp_password_expires_at: null,
          temp_password_set_at: null,
          temp_password: null
        })
        .eq("id", profile.id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Clear Temp Password Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// --- DASHBOARD ENDPOINTS ---

// GET /api/school/dashboard
router.get(
  "/dashboard",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const user = (req as any).user;
    const profile = (req as any).profile;
    const schoolId = profile.school_id;

    console.log(
      `[Dashboard] Fetching stats for School ID: ${schoolId}, User: ${user.email}, Role: ${profile.role}`,
    );

    try {
      // Parallel fetch for counts
      const [students, teachers, classes] = await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("role", "student"),
        supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("role", "teacher")
          .or('employment_status.neq.Terminated,employment_status.is.null'),
        supabaseAdmin
          .from("classes")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId),
      ]);

      if (students.error)
        console.error("[Dashboard] Students Query Error:", students.error);
      if (teachers.error)
        console.error("[Dashboard] Teachers Query Error:", teachers.error);
      if (classes.error)
        console.error("[Dashboard] Classes Query Error:", classes.error);

      const studentCount = students.count || 0;
      const teacherCount = teachers.count || 0;

      console.log(
        `[Dashboard] Counts - Students: ${studentCount}, Teachers: ${teacherCount}, Classes: ${classes.count || 0}`,
      );

      // Fetch latest announcements
      const { data: announcements } = await supabaseAdmin
        .from("announcements")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(5);

      // 4. Get current term/year from settings first (needed for Attendance and Revenue)
      const { data: settings } = await supabaseAdmin
        .from("school_settings")
        .select("current_term, academic_year")
        .eq("school_id", schoolId)
        .maybeSingle();

      const currentTerm = settings?.current_term || "Term 1";
      const currentYear =
        settings?.academic_year || new Date().getFullYear().toString();

      // 5. Calculate Attendance Rate (Term-wide for "real data" as in reports)
      let attendanceRateValue = "--";
      let attendanceTrend = "+0%";

      const { data: attendance } = await supabaseAdmin
        .from("attendance")
        .select("status")
        .eq("school_id", schoolId)
        .eq("term", currentTerm)
        .eq("academic_year", currentYear);

      if (attendance && attendance.length > 0) {
        const presentCount = attendance.filter(
          (a) => a.status === "present",
        ).length;
        const rate = Math.round((presentCount / attendance.length) * 100);
        attendanceRateValue = `${rate}%`;

        // Trend logic (relative to a 90% benchmark or previous month could be better,
        // but keeping it simple to match dashboard design)
        if (rate >= 90) attendanceTrend = "+2%";
        else if (rate < 80) attendanceTrend = "-3%";
      }

      // 6. Calculate Revenue (Current Term/Year)
      let totalRevenueValue = 0;
      if (settings) {
        const { data: revenueData } = await supabaseAdmin
          .from("finance_records")
          .select("amount")
          .eq("school_id", schoolId)
          .eq("type", "income")
          .eq("term", currentTerm)
          .eq("academic_year", currentYear);

        if (revenueData) {
          totalRevenueValue = revenueData.reduce(
            (sum, r) => sum + Number(r.amount),
            0,
          );
        }
      }

      // 7. Academic Performance (Last 3 terms)
      const { data: academicData } = await supabaseAdmin
        .from("student_grades")
        .select("term, percentage")
        .eq("school_id", schoolId)
        .order("term", { ascending: true });

      const performanceMap: Record<string, { sum: number; count: number }> = {};
      academicData?.forEach((g) => {
        if (!performanceMap[g.term])
          performanceMap[g.term] = { sum: 0, count: 0 };
        performanceMap[g.term].sum += Number(g.percentage || 0);
        performanceMap[g.term].count++;
      });

      const academicPerformance = Object.entries(performanceMap)
        .map(([term, stats]) => ({
          term,
          average: Math.round(stats.sum / stats.count),
        }))
        .slice(-3);

      // 8. Enrollment Distribution (By Grade)
      const { data: studentsByGrade } = await supabaseAdmin
        .from("profiles")
        .select("grade")
        .eq("school_id", schoolId)
        .eq("role", "student");

      const gradeMap: Record<string, number> = {};
      studentsByGrade?.forEach((s) => {
        const g = s.grade || "Unassigned";
        gradeMap[g] = (gradeMap[g] || 0) + 1;
      });

      const enrollmentDistribution = Object.entries(gradeMap)
        .map(([grade, count]) => ({
          grade,
          count,
        }))
        .sort((a, b) => a.grade.localeCompare(b.grade));

      // 9. Finance Trends (Last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: financeRecords } = await supabaseAdmin
        .from("finance_records")
        .select("amount, type, date")
        .eq("school_id", schoolId)
        .gte("date", sixMonthsAgo.toISOString().split("T")[0]);

      const monthlyFinance: Record<
        string,
        { income: number; expense: number }
      > = {};
      financeRecords?.forEach((r) => {
        const month = new Date(r.date).toLocaleString("default", {
          month: "short",
        });
        if (!monthlyFinance[month])
          monthlyFinance[month] = { income: 0, expense: 0 };
        if (r.type === "income")
          monthlyFinance[month].income += Number(r.amount);
        else monthlyFinance[month].expense += Number(r.amount);
      });

      const financeTrends = Object.entries(monthlyFinance).map(
        ([month, data]) => ({
          month,
          income: data.income,
          expense: data.expense,
        }),
      );

      // Construct response matching SchoolDashboardStats interface
      const responseData = {
        overview: {
          totalStudents: { value: studentCount, trend: "+5%", status: "up" },
          totalTeachers: { value: teacherCount, trend: "+0%", status: "up" },
          activeClasses: {
            value: classes.count || 0,
            trend: "+0%",
            status: "up",
          },
          attendanceRate: {
            value: attendanceRateValue,
            trend: attendanceTrend,
            status:
              attendanceRateValue === "--" ||
              (parseInt(attendanceRateValue) >= 90)
                ? "up"
                : "down",
          },
        },
        recentActivities: [],
        financialSummary: [],
        pendingApprovals: [],
        announcements: announcements || [],
        academicPerformance,
        enrollmentDistribution,
        financeTrends,
      };

      console.log(
        "Sending dashboard data:",
        JSON.stringify(responseData, null, 2),
      );
      res.json(responseData);
    } catch (error: any) {
      console.error("Get Dashboard Stats Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// GET /api/school/details
router.get(
  "/details",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;

    try {
      const { data: school, error } = await supabaseAdmin
        .from("schools")
        .select("*")
        .eq("id", schoolId)
        .single();

      if (error || !school) throw new Error("School details not found");

      res.json(school);
    } catch (error: any) {
      console.error("Get School Details Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// --- STUDENT MANAGEMENT ENDPOINTS ---

// GET /api/school/students
router.get(
  "/students",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;

    console.log(`[Students] Fetching students (Page ${page}, Limit ${limit}) for School ID: ${schoolId}`);

    try {
      let query = supabaseAdmin
        .from("profiles")
        .select("*", { count: 'exact' })
        .eq("school_id", schoolId)
        .eq("role", "student");

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,student_number.ilike.%${search}%`);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const results = req.query.all === 'true' 
        ? { data: await fetchAll(query.order("full_name", { ascending: true })), error: null, count: null }
        : await query.order("full_name", { ascending: true }).range(from, to);

      const { data: students, error, count } = results;

      if (error) throw error;

      const formattedStudents = students.map((student: any) => ({
        id: student.id,
        firstName: student.full_name?.split(" ")[0] || "",
        lastName: student.full_name?.split(" ").slice(1).join(" ") || "",
        fullName: student.full_name,
        studentNumber: student.student_number || "", // Include student_number
        email: student.email || "", // Email might not be in profile, strictly speaking it's in auth.users, but maybe we copied it?
        grade: student.grade || "Unassigned",
        gender: student.gender || "Not specified",
        status: student.enrollment_status || "Active",
        fees: student.fees_status || "Pending",
        guardian: student.guardian_name || "None",
      }));

      res.json({
        data: formattedStudents,
        metadata: {
          total: count || 0,
          page,
          pageSize: limit,
          totalPages: Math.ceil((count || 0) / limit)
        }
      });
    } catch (error: any) {
      console.error("[Students] Get Students Error:", error);
      res.status(500).json({ message: error.message, stack: error.stack });
    }
  },
);

// GET /api/school/students/:id/details
router.get(
  "/students/:id/details",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const studentId = req.params.id;

    try {
      // 1. Fetch Student Profile
      const { data: student, error: studentError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", studentId)
        .eq("school_id", schoolId)
        .single();

      if (studentError || !student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // 2. Fetch Current Enrollment (Class)
      const { data: enrollment, error: enrollmentError } = await supabaseAdmin
        .from("enrollments")
        .select("*, classes(*)")
        .eq("student_id", studentId)
        .eq("status", "Active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // 2.5 Fetch subjects assigned to the class
      let classSubjects: any[] = [];
      if (enrollment?.class_id) {
        const { data: csData } = await supabaseAdmin
          .from("class_subjects")
          .select("subjects(name, code, department)")
          .eq("class_id", enrollment.class_id);
        if (csData) classSubjects = csData;
      }

      // 3. Fetch Academic Performance (Grades)
      // Join with subjects to get subject names
      const { data: grades, error: gradesError } = await supabaseAdmin
        .from("student_grades")
        .select("*, subjects(name, code, department)")
        .eq("student_id", studentId)
        .order("academic_year", { ascending: false })
        .order("term", { ascending: false });

      // 3.5 Fetch Enrolled Subjects
      // Get subjects explicitly assigned to the student
      const { data: enrolledSubjects, error: subjectsError } =
        await supabaseAdmin
          .from("student_subjects")
          .select("subjects(name, code)")
          .eq("student_id", studentId);
      //.eq('academic_year', enrollment?.academic_year || new Date().getFullYear().toString()); // Optional: filter by year

      if (subjectsError) {
        console.error("Error fetching student subjects:", subjectsError);
      }

      // 4. Fetch Attendance Stats
      let attendanceStats;
      try {
        // Try fetching with term/year columns
        const { data, error } = await supabaseAdmin
          .from("attendance")
          .select("status, academic_year, term")
          .eq("student_id", studentId);

        if (error) throw error;
        attendanceStats = data;
      } catch (e: any) {
        // Fallback if columns don't exist
        console.warn(
          "Fetching attendance with term columns failed, falling back to basic fetch:",
          e.message,
        );
        const { data, error } = await supabaseAdmin
          .from("attendance")
          .select("status")
          .eq("student_id", studentId);

        if (!error) attendanceStats = data;
      }

      // Get current settings for term-specific stats
      const settings = await ensureSchoolSettings(schoolId);
      const currentAcademicYear =
        settings?.academic_year || new Date().getFullYear().toString();
      const currentTerm = settings?.current_term || "Term 1";

      const attendanceSummary = {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
        rate: 0,
        overall: {
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          total: 0,
          rate: 0,
        },
      };

      if (attendanceStats) {
        attendanceStats.forEach((record: any) => {
          const status =
            record.status?.toLowerCase() as keyof typeof attendanceSummary;

          // Overall Stats
          if (attendanceSummary.overall.hasOwnProperty(status)) {
            (attendanceSummary.overall as any)[status]++;
          }
          attendanceSummary.overall.total++;

          // Current Term Stats (Default)
          // If record has no year/term (fallback mode), count it as current to show something
          const isCurrent =
            (record.academic_year === currentAcademicYear &&
              record.term === currentTerm) ||
            (!record.academic_year && !record.term);

          if (isCurrent) {
            if (attendanceSummary.hasOwnProperty(status)) {
              (attendanceSummary as any)[status]++;
            }
            attendanceSummary.total++;
          }
        });

        // Calculate Rates - Overall
        attendanceSummary.overall.rate =
          attendanceSummary.overall.total > 0
            ? Math.round(
                ((attendanceSummary.overall.present +
                  attendanceSummary.overall.late) /
                  attendanceSummary.overall.total) *
                  100,
              )
            : 0;

        // Calculate Rates - Current Term
        attendanceSummary.rate =
          attendanceSummary.total > 0
            ? Math.round(
                ((attendanceSummary.present + attendanceSummary.late) /
                  attendanceSummary.total) *
                  100,
              )
            : 0;
      }

      // 5. Structure the Response
      // Combine subjects from different sources
      const allSubjectNames = new Set<string>();
      
      // Add class-based subjects
      classSubjects.forEach((cs: any) => {
        if (cs.subjects?.name) allSubjectNames.add(cs.subjects.name);
      });
      
      // Add student-specific subjects
      enrolledSubjects?.forEach((s: any) => {
        if (s.subjects?.name) allSubjectNames.add(s.subjects.name);
      });
      
      // Add subjects from grades (fallback/historical)
      grades?.forEach((g: any) => {
        if (g.subjects?.name) allSubjectNames.add(g.subjects.name);
      });

      const response = {
        profile: {
          ...student,
          className: enrollment?.classes?.name || student.grade || "Unassigned",
          academicYear:
            enrollment?.academic_year || new Date().getFullYear().toString(),
          fees_status: student.fees_status || "Pending",
        },
        academics: {
          enrollment,
          grades: grades || [],
          subjects: Array.from(allSubjectNames),
        },
        attendance: attendanceSummary,
      };

      res.json(response);
    } catch (error: any) {
      console.error("[Student Details] Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// Helper to generate a unique student number
async function generateUniqueStudentNumber(): Promise<string> {
  let isUnique = false;
  let studentNumber = "";

  while (!isUnique) {
    // Generate format: YYYY + Random 4 digits (e.g., 20241234) for a total of 8 chars
    const now = new Date();
    const year = now.getFullYear().toString(); // 4 digits
    const random = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digits
    studentNumber = `${year}${random}`;

    // Check uniqueness
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("student_number", studentNumber);

    if (count === 0) {
      isUnique = true;
    }
  }
  return studentNumber;
}

// Helper to generate a unique staff number
async function generateUniqueStaffNumber(): Promise<string> {
  let isUnique = false;
  let staffNumber = "";
  let attempts = 0;
  const MAX_ATTEMPTS = 5;

  while (!isUnique && attempts < MAX_ATTEMPTS) {
    attempts++;
    // Generate format: T + YYYY + Random 4 digits (e.g., T20241234)
    const now = new Date();
    const year = now.getFullYear().toString();
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    staffNumber = `T${year}${random}`;

    // Check uniqueness
    const { count, error } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("staff_number", staffNumber);

    if (error) {
      console.error(`[StaffNumber] Error checking uniqueness:`, error);
      throw new Error(`Database error verifying staff number uniqueness: ${error.message}`);
    }

    if (count === 0) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    throw new Error("Failed to generate a unique staff number after multiple attempts.");
  }

  return staffNumber;
}

// Helper to generate a simple random password
function generateSimplePassword() {
  const adjectives = ["Happy", "Bright", "Swift", "Brave", "Cool", "Kind", "Smart", "Wise", "Fast", "Strong", "Calm", "Bold"];
  const nouns = ["Lion", "Eagle", "Tiger", "Star", "Sun", "Moon", "River", "Forest", "Wolf", "Hawk", "Peak", "Lake"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 90) + 10; // 10-99
  return `${adj}${noun}${num}`;
}


// POST /api/school/create-student
router.post(
  "/create-student",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const {
      email,
      password,
      name,
      grade: classId,
      guardian,
      gender,
    } = req.body;

    try {
      // 1. Generate Student Number
      const studentNumber = await generateUniqueStudentNumber();

      // 2. Get Class Name (for the profiles.grade column fallback)
      let className = "Unassigned";
      if (classId) {
        const { data: classData } = await supabaseAdmin
          .from("classes")
          .select("name")
          .eq("id", classId)
          .single();
        if (classData) className = classData.name;
      }

      // 3. Determine Email to use
      const emailToUse =
        email && email.trim() !== ""
          ? email
          : `${studentNumber}@student.muchi.app`;
      
      const simplePassword = generateSimplePassword();
      const passwordToUse = password || simplePassword;

      // 4. Create Auth User
      const { data: user, error: userError } =
        await supabaseAdmin.auth.admin.createUser({
          email: emailToUse,
          password: passwordToUse,
          email_confirm: true,
          user_metadata: {
            full_name: name,
            role: "student",
            school_id: schoolId,
          },
        });

      if (userError) throw userError;

      // 5. Update Profile with extra details (Use UPSERT to handle race condition with trigger)
      if (user.user) {
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            id: user.user.id,
            school_id: schoolId,
            full_name: name,
            email: emailToUse,
            role: "student",
            grade: className,
            guardian_name: guardian,
            gender: gender ? (gender.toLowerCase().trim().startsWith('m') ? 'Male' : gender.toLowerCase().trim().startsWith('f') ? 'Female' : 'Other') : null,
            student_number: studentNumber,
            temp_password: simplePassword,
            enrollment_status: "Active",
            fees_status: "Pending",
            is_temp_password: true,
            temp_password_set_at: new Date().toISOString(),
            temp_password_expires_at: new Date(
              Date.now() + 72 * 60 * 60 * 1000,
            ).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });


        if (profileError)
          console.error("Error updating student profile:", profileError);

        // 6. Create Enrollment Record
        if (classId) {
          const { error: enrollError } = await supabaseAdmin
            .from("enrollments")
            .insert({
              student_id: user.user.id,
              class_id: classId,
              academic_year: new Date().getFullYear().toString(),
              status: "Active",
            });

          if (enrollError)
            console.error("Error creating enrollment:", enrollError);
        }
      }

      res.status(201).json({
        message: "Student created successfully",
        user: user.user,
        studentNumber: studentNumber,
        emailUsed: emailToUse,
      });
    } catch (error: any) {
      console.error("Create Student Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/students/bulk
router.post(
  "/students/bulk",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    try {
      const profile = (req as any).profile;
      const schoolId = profile.school_id;
      const { students } = req.body;
      if (!students || !Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ message: "No students provided" });
      }

      let importedCount = 0;
      const errors: any[] = [];

      // Fetch school settings to get the current academic year
      const { data: settings } = await supabaseAdmin
        .from("schools")
        .select("academic_year")
        .eq("id", schoolId)
        .single();

      const activeYear =
        settings?.academic_year || new Date().getFullYear().toString();

      // Fetch all classes once for the school to enable efficient matching
      const { data: allClassData } = await supabaseAdmin
        .from("classes")
        .select("id, name")
        .eq("school_id", schoolId);
      
      const schoolClasses = allClassData || [];

      // Process sequentially to avoid rate limits and ensure uniqueness
      for (const student of students) {
      try {
        const studentNumber = await generateUniqueStudentNumber();
        const emailToUse =
          student.email && student.email.trim() !== ""
            ? student.email
            : `${studentNumber}@student.muchi.app`;

        // Generate simple random password
        const simplePassword = generateSimplePassword();
        const tempExpiresAt = new Date();
        tempExpiresAt.setHours(tempExpiresAt.getHours() + 72);
        
        let isNewAuthUser = false;
        let createdUserId = null;

        const { data: user, error: userError } =
          await supabaseAdmin.auth.admin.createUser({
            email: emailToUse,
            password: simplePassword,
            email_confirm: true,
            user_metadata: {
              full_name: student.name,
              role: "student",
              school_id: schoolId,
            },
          });

        if (userError) {
          if (userError.message.includes("already exists")) {
            throw new Error(`Email ${emailToUse} is already in use by another user.`);
          }
          throw userError;
        }
        
        isNewAuthUser = true;
        createdUserId = user.user.id;

        // 3. Update Profile with extra details (Use UPSERT with onConflict)
        if (createdUserId) {
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert({
              id: createdUserId,
              school_id: schoolId,
              full_name: student.name,
              email: emailToUse,
              role: "student",
              grade: student.grade,
              guardian_name: student.guardian,
              gender: student.gender,
              student_number: studentNumber,
              temp_password: simplePassword,
              enrollment_status: "Active",
              fees_status: "Pending",
              is_temp_password: true,
              temp_password_set_at: new Date().toISOString(),
              temp_password_expires_at: tempExpiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });


          if (profileError) {
            // ROLLBACK: If profile creation fails, delete the "ghost" Auth user
            if (isNewAuthUser) {
              console.warn(`[BulkStudent] Profile creation failed. Rolling back Auth User: ${createdUserId}`);
              await supabaseAdmin.auth.admin.deleteUser(createdUserId);
            }
            throw profileError;
          }

          // 4. Handle Enrollment (Try to find class by name)
            // Use the robust matching utility
            const classData = findBestClassMatch(student.grade, schoolClasses);

            if (classData) {
              // 1. Clear any existing active enrollment for this year to avoid conflicts
              // and ensure the student is only in one class per year.
              await supabaseAdmin
                .from("enrollments")
                .delete()
                .eq("student_id", createdUserId)
                .eq("academic_year", activeYear);

              // 2. Create the new enrollment
              await supabaseAdmin.from("enrollments").insert({
                student_id: createdUserId,
                class_id: classData.id,
                academic_year: activeYear,
                status: "Active",
              });

              // 3. Update profile grade with official name
              await supabaseAdmin
                .from("profiles")
                .update({ grade: classData.name })
                .eq("id", createdUserId);
            }

          importedCount++;
        }
      } catch (error: any) {
        console.error(`Error importing student ${student.name}:`, error);
        errors.push({ name: student.name, error: error.message });
      }
    }

      res.json({
        message: "Bulk import completed",
        importedCount,
        total: students.length,
        errors,
        success: errors.length === 0,
      });
    } catch (error: any) {
      console.error("Bulk Import Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/students/re-match-classes
// maintenance endpoint to fix already uploaded data with mismatched formatting
router.post(
  "/students/re-match-classes",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;

    try {
      // 1. Fetch current academic year
      const { data: settings } = await supabaseAdmin
        .from("schools")
        .select("academic_year")
        .eq("id", schoolId)
        .single();
      const activeYear = settings?.academic_year || new Date().getFullYear().toString();

      // 2. Fetch all classes for the school
      const { data: classes } = await supabaseAdmin
        .from("classes")
        .select("id, name")
        .eq("school_id", schoolId);
      
      if (!classes || classes.length === 0) {
        return res.status(400).json({ message: "No classes found in the system. Create classes first." });
      }

      // 3. Fetch students who potentially need matching
      // We look for students who have a 'grade' string (raw from excel) 
      // but might not be enrolled in that specific class yet.
      const { data: students } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, grade")
        .eq("school_id", schoolId)
        .eq("role", "student")
        .not("grade", "is", null);

      if (!students || students.length === 0) {
        return res.json({ message: "No students with grade information found.", fixedCount: 0 });
      }

      let fixedCount = 0;
      const results = [];

      for (const student of students) {
        const bestMatch = findBestClassMatch(student.grade, classes);
        
        // Process ALL students for whom we can find a matching class — regardless
        // of whether the stored grade string already happens to equal the class
        // name.  A student could have the correct grade text but still have no
        // enrollment (e.g. import partially failed, or the class was created after
        // the import ran).
        if (bestMatch) {
          // Check if already enrolled in THIS specific matched class for THIS year
          const { data: existingEnrollment } = await supabaseAdmin
            .from("enrollments")
            .select("id, class_id")
            .eq("student_id", student.id)
            .eq("academic_year", activeYear)
            .maybeSingle();

          if (!existingEnrollment || existingEnrollment.class_id !== bestMatch.id) {
            // Fix / create enrollment
            if (existingEnrollment) {
              await supabaseAdmin
                .from("enrollments")
                .update({ class_id: bestMatch.id, status: "Active" })
                .eq("id", existingEnrollment.id);
            } else {
              await supabaseAdmin.from("enrollments").insert({
                student_id: student.id,
                class_id: bestMatch.id,
                school_id: schoolId,
                academic_year: activeYear,
                status: "Active",
              });
            }

            // Always normalise the profile grade to the official class name so
            // that display and future lookups are consistent.
            await supabaseAdmin
              .from("profiles")
              .update({ grade: bestMatch.name })
              .eq("id", student.id);

            fixedCount++;
            results.push({
              student: student.full_name,
              from: student.grade,
              matchedTo: bestMatch.name,
            });
          } else if (student.grade !== bestMatch.name) {
            // Enrollment already points to the correct class, but the grade text
            // stored on the profile is still the raw / misformatted string.
            await supabaseAdmin
              .from("profiles")
              .update({ grade: bestMatch.name })
              .eq("id", student.id);

            fixedCount++;
            results.push({
              student: student.full_name,
              from: student.grade,
              matchedTo: bestMatch.name,
            });
          }
        }
      }

      res.json({
        message: `Successfully re-matched ${fixedCount} students to classes based on their records.`,
        fixedCount,
        details: results
      });
    } catch (error: any) {
      console.error("Re-match Classes Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// POST /api/school/teachers/bulk
// Bulk import teachers from Excel data
router.post(
  "/teachers/bulk",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { teachers } = req.body;
    console.log(`[BulkTeacher] Received request with ${teachers?.length || 0} teachers`);

    if (!teachers || !Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({ message: "No teachers provided" });
    }

    let importedCount = 0;
    const errors: any[] = [];
    const results: any[] = [];

    for (const teacher of teachers) {
      try {
        // 1. Validate mandatory fields
        if (!teacher.name || typeof teacher.name !== "string" || !teacher.name.trim()) {
          throw new Error("Name is required");
        }
        
        let existingId = null;
        let staffNumber = null;
        
        const emailToUse = (teacher.email && teacher.email.trim() !== "") 
          ? teacher.email.trim().toLowerCase()
          : null;

        // 2. Check if a profile with this email already exists
        if (emailToUse) {
          const { data: existingProfile } = await supabaseAdmin
            .from("profiles")
            .select("id, staff_number")
            .eq("email", emailToUse)
            .maybeSingle();
          
          if (existingProfile) {
            existingId = existingProfile.id;
            staffNumber = existingProfile.staff_number;
          }
        }

        // 3. Handle Auth User (Create if doesn't exist)
        let isNewAuthUser = false;
        if (!existingId) {
          const finalEmail = emailToUse || `${await generateUniqueStaffNumber()}@teacher.muchi.app`;
          
          const { data: user, error: userError } =
            await supabaseAdmin.auth.admin.createUser({
              email: finalEmail,
              password: teacher.password || "12345678",
              email_confirm: true,
              user_metadata: {
                full_name: teacher.name,
                role: "teacher",
                school_id: schoolId,
              },
            });

          if (userError) {
            // If user already exists in Auth but not linked to a profile with this email
            if (userError.message.includes("already exists")) {
               throw new Error(`Email ${finalEmail} is already in use by another user.`);
            }
            throw userError;
          }
          existingId = user.user.id;
          isNewAuthUser = true;
        }

        // 4. Generate Staff Number if missing (for new or existing but migrated users)
        if (!staffNumber) {
          staffNumber = await generateUniqueStaffNumber();
        }

        // 5. Upsert Profile with latest details
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            id: existingId,
            school_id: schoolId,
            full_name: teacher.name,
            email: emailToUse || `${staffNumber}@teacher.muchi.app`,
            role: "teacher",
            staff_number: staffNumber,
            username: teacher.username || null,
            phone_number: teacher.phone || null,
            department: teacher.department || null,
            subjects: Array.isArray(teacher.subjects) ? teacher.subjects : [],
            join_date: teacher.joinDate || new Date().toISOString().split("T")[0],
            employment_status: "Active",
            is_temp_password: true,
            temp_password_set_at: new Date().toISOString(),
            temp_password_expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (profileError) {
          // 🚨 ROLLBACK: If profile creation fails, delete the "ghost" Auth user we just created
          if (isNewAuthUser) {
            console.warn(`[BulkTeacher] Profile creation failed. Rolling back Auth User: ${existingId}`);
            await supabaseAdmin.auth.admin.deleteUser(existingId);
          }
          throw profileError;
        }
        
        importedCount++;
        results.push({ name: teacher.name, status: "Success" });
        
      } catch (error: any) {
        console.error(`Error importing teacher ${teacher.name}:`, error);
        errors.push({ name: teacher.name, error: error.message });
        results.push({ name: teacher.name, status: "Error", message: error.message });
      }
    }

    res.json({
      message: "Bulk import completed",
      importedCount,
      total: teachers.length,
      errors,
      results,
      success: errors.length === 0,
    });
  },
);

// PUT /api/school/students/:id
// Update a student
router.put(
  "/students/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;
    const {
      firstName,
      lastName,
      grade: classId,
      gender,
      guardian,
      status,
      fees,
      email,
      phone_number,
      address,
      date_of_birth,
      guardian_contact,
    } = req.body;

    try {
      // 1. Verify student belongs to this school
      const { data: studentCheck, error: checkError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", id)
        .eq("school_id", schoolId)
        .single();

      if (checkError || !studentCheck) {
        return res
          .status(404)
          .json({ message: "Student not found in this school" });
      }

      // 2. Get Class Name (fallback)
      let className = "Unassigned";
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          classId,
        );

      if (isUuid) {
        const { data: classData } = await supabaseAdmin
          .from("classes")
          .select("name")
          .eq("id", classId)
          .single();
        if (classData) className = classData.name;
      } else {
        className = classId;
      }

      // 3. Update Profile
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          full_name: `${firstName} ${lastName}`,
          grade: className,
          gender,
          guardian_name: guardian,
          enrollment_status: status,
          fees_status: fees,
          phone_number,
          address,
          date_of_birth: date_of_birth || null,
          guardian_contact,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // 4. Update Enrollment if classId is a UUID
      if (isUuid) {
        // Upsert enrollment for current year
        await supabaseAdmin.from("enrollments").upsert(
          {
            student_id: id,
            class_id: classId,
            academic_year: new Date().getFullYear().toString(),
            status: "Active",
          },
          { onConflict: "student_id, academic_year" },
        );
      }

      // 5. Update Email if provided (requires auth admin)
      if (email) {
        if (typeof id === "string") {
          const { error: emailError } =
            await supabaseAdmin.auth.admin.updateUserById(id, { email });
          if (emailError)
            console.warn("Failed to update email in auth:", emailError);
        }
      }

      res.json({ message: "Student updated successfully" });
    } catch (error: any) {
      console.error("Update Student Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// --- APPLICATION MANAGEMENT ENDPOINTS ---

// GET /api/school/applications
router.get(
  "/applications",
  requireSchoolRole([...ADMIN_ROLES]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id || profile.schools?.id;

    try {
      const { data, error } = await supabaseAdmin
        .from("student_applications")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      console.error("Get Applications Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// PUT /api/school/applications/:id
router.put(
  "/applications/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id || profile.schools?.id;
    const { id } = req.params;
    const { status } = req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from("student_applications")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("school_id", schoolId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Update Application Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/applications/:id/approve-enroll
router.post(
  "/applications/:id/approve-enroll",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id || profile.schools?.id;
    const { id } = req.params;
    const { classId, academicYear, password } = req.body;

    if (!classId || !academicYear || !password) {
      return res
        .status(400)
        .json({
          message: "Class, Academic Year, and temporary Password are required",
        });
    }

    try {
      // 1. Get Application
      const { data: application, error: appError } = await supabaseAdmin
        .from("student_applications")
        .select("*")
        .eq("id", id)
        .eq("school_id", schoolId)
        .single();

      if (appError || !application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // 2. Create Auth User
      const studentEmail = application.email.toLowerCase().trim();
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: studentEmail,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: application.full_name,
            role: "student",
            school_id: schoolId,
          },
        });

      if (authError) throw authError;

      // 3. Create or Update Profile
      const studentNumber = await generateUniqueStudentNumber();
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: authData.user.id,
            role: "student",
            school_id: schoolId,
            full_name: application.full_name,
            email: studentEmail,
            phone_number: application.phone_number,
            guardian_name: application.guardian_name,
            guardian_contact: application.guardian_phone,
            grade: application.grade_level,
            student_number: studentNumber,
            enrollment_status: "Active",
          },
          { onConflict: "id" },
        );

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      // 4. Create Enrollment
      const { error: enrollError } = await supabaseAdmin
        .from("enrollments")
        .insert({
          school_id: schoolId,
          student_id: authData.user.id,
          class_id: classId,
          academic_year: academicYear,
          status: "Active",
        });

      if (enrollError) throw enrollError;

      // 5. Update Application Status
      const { error: statusError } = await supabaseAdmin
        .from("student_applications")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("school_id", schoolId);

      if (statusError) {
        console.error("Failed to update application status:", statusError);
        // We still return success since the student was created and enrolled,
        // but the application record might need manual update.
      }

      res.status(200).json({
        message: "Student approved and enrolled successfully",
        studentId: authData.user.id,
        email: application.email,
        studentNumber,
      });
    } catch (error: any) {
      console.error("Approve Enrollment Error:", error);
      res.status(400).json({ message: error.message });
    }
  },
);

// POST /api/school/students/:id/finance
// Update finance status
router.post(
  "/students/:id/finance",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    try {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ fees_status: status })
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;

      res.json({ message: "Finance status updated successfully" });
    } catch (error: any) {
      console.error("Update Finance Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/students/:id/enroll
// Enroll a student in a class
router.post(
  "/students/:id/enroll",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;
    const { classId, academicYear } = req.body;

    if (!classId || !academicYear) {
      return res
        .status(400)
        .json({ message: "Class ID and Academic Year are required" });
    }

    try {
      // Check for existing enrollment in this academic year
      const { data: existingEnrollment } = await supabaseAdmin
        .from("enrollments")
        .select("id")
        .eq("student_id", id)
        .eq("academic_year", academicYear)
        .maybeSingle();

      let enrollmentId = existingEnrollment?.id;

      if (existingEnrollment) {
        // Update existing enrollment
        const { error } = await supabaseAdmin
          .from("enrollments")
          .update({
            class_id: classId,
            status: "Active",
          })
          .eq("id", existingEnrollment.id);

        if (error) throw error;
      } else {
        // Create new enrollment
        const { data: newEnrollment, error } = await supabaseAdmin
          .from("enrollments")
          .insert({
            school_id: schoolId,
            student_id: id,
            class_id: classId,
            academic_year: academicYear,
            status: "Active",
          })
          .select()
          .single();

        if (error) throw error;
        enrollmentId = newEnrollment.id;
      }

      // Auto-subscribe to class subjects
      try {
        // 1. Fetch subjects for the class
        const { data: classSubjects, error: subjectsError } =
          await supabaseAdmin
            .from("class_subjects")
            .select("subject_id")
            .eq("class_id", classId);

        if (subjectsError) {
          console.error("Error fetching class subjects:", subjectsError);
        } else if (classSubjects && classSubjects.length > 0 && enrollmentId) {
          // 2. Clear existing subjects for this enrollment (if any, e.g. class change)
          // We use try-catch here because student_subjects might not exist yet if migration failed
          const { error: deleteError } = await supabaseAdmin
            .from("student_subjects")
            .delete()
            .eq("enrollment_id", enrollmentId);

          if (deleteError) {
            // Ignore error if table doesn't exist, but log others
            if (deleteError.code !== "42P01")
              console.error("Error clearing student subjects:", deleteError);
          } else {
            // 3. Insert new subjects
            const studentSubjects = classSubjects.map((cs: any) => ({
              student_id: id,
              subject_id: cs.subject_id,
              class_id: classId,
              academic_year: academicYear,
              enrollment_id: enrollmentId,
            }));

            const { error: insertError } = await supabaseAdmin
              .from("student_subjects")
              .insert(studentSubjects);

            if (insertError)
              console.error("Error auto-subscribing subjects:", insertError);
          }
        }
      } catch (subError) {
        console.error("Auto-subscription failed (non-critical):", subError);
      }

      // Also update profile current grade/class for quick access
      // Get class name first
      const { data: classData } = await supabaseAdmin
        .from("classes")
        .select("name")
        .eq("id", classId)
        .single();
      if (classData) {
        await supabaseAdmin
          .from("profiles")
          .update({ grade: classData.name })
          .eq("id", id);
      }

      res.json({ message: "Enrollment updated successfully" });
    } catch (error: any) {
      console.error("Enrollment Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// Helper to calculate grade from percentage
async function calculateGrade(
  schoolId: string,
  percentage: number,
): Promise<{ grade: string; point: number | null }> {
  const { data: scales, error } = await supabaseAdmin
    .from("grading_scales")
    .select("*")
    .eq("school_id", schoolId)
    .lte("min_percentage", percentage)
    .gte("max_percentage", percentage)
    .maybeSingle();

  if (error || !scales) {
    // Fallback if no scale found
    return { grade: "N/A", point: 0 };
  }

  return { grade: scales.grade, point: 0 }; // gpa_point removed from schema
}

// POST /api/school/students/:id/grades
// Add or update a grade
router.post(
  "/students/:id/grades",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;
    const { subjectId, term, examType, academicYear, percentage, comments } =
      req.body;

    if (
      !subjectId ||
      !term ||
      !examType ||
      !academicYear ||
      percentage === undefined
    ) {
      return res.status(400).json({ message: "Missing required grade fields" });
    }

    try {
      // Calculate grade based on percentage
      const { grade } = await calculateGrade(schoolId, percentage);

      const { error } = await supabaseAdmin.from("student_grades").upsert(
        {
          school_id: schoolId,
          student_id: id,
          subject_id: subjectId,
          term,
          exam_type: examType,
          academic_year: academicYear,
          grade,
          percentage,
          comments,
          status: "Draft", // Default status
        },
        {
          onConflict: "student_id, subject_id, term, academic_year, exam_type",
        },
      );

      if (error) throw error;

      res.json({ message: "Grade saved successfully", grade });
    } catch (error: any) {
      console.error("Save Grade Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// GET /api/school/grades/batch
// Fetch grades for multiple students
router.get(
  "/grades/batch",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { subjectId, term, examType, academicYear, studentIds } = req.query;

    if (!subjectId || !term || !examType || !academicYear || !studentIds) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const idsArray = (studentIds as string).split(",");

    try {
      const { data, error } = await supabaseAdmin
        .from("student_grades")
        .select("*")
        .eq("school_id", schoolId)
        .eq("subject_id", subjectId)
        .eq("term", term)
        .eq("exam_type", examType)
        .eq("academic_year", academicYear)
        .in("student_id", idsArray);

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Get Batch Grades Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/grades/batch
// Batch add or update grades
router.post(
  "/grades/batch",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { grades } = req.body; // Array of { studentId, subjectId, term, examType, academicYear, percentage, comments }

    if (!grades || !Array.isArray(grades)) {
      return res.status(400).json({ message: "Invalid grades data" });
    }

    try {
      // Optimize: Fetch scales once
      const { data: scales } = await supabaseAdmin
        .from("grading_scales")
        .select("*")
        .eq("school_id", schoolId);

      const processedGrades = grades.map((g) => {
        const isAbsent = g.percentage === null || g.percentage === undefined || g.percentage === '';
        
        const scale = !isAbsent ? scales?.find(
          (s) =>
            g.percentage >= s.min_percentage &&
            g.percentage <= s.max_percentage,
        ) : null;

        return {
          school_id: schoolId,
          student_id: g.studentId,
          subject_id: g.subjectId,
          term: g.term,
          exam_type: g.examType || "End of Term",
          academic_year: g.academicYear,
          grade: isAbsent ? "ABSENT" : (scale ? scale.grade : "N/A"),
          percentage: isAbsent ? null : g.percentage,
          comments: g.comments || (isAbsent ? "Absent" : ""),
          status: "Draft",
        };
      });

      const { error } = await supabaseAdmin
        .from("student_grades")
        .upsert(processedGrades, {
          onConflict: "student_id, subject_id, term, academic_year, exam_type",
        });

      if (error) throw error;

      res.json({ message: "Batch grades saved successfully" });
    } catch (error: any) {
      console.error("Batch Save Grade Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/grades/migrate
// Migrate grades from one exam type to another
router.post(
  "/grades/migrate",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { term, fromExamType, toExamType, academicYear, classId, subjectId } = req.body;

    if (!term || !fromExamType || !toExamType || !academicYear || !classId || !subjectId) {
      return res.status(400).json({ message: "Missing required fields for migration" });
    }

    try {
      // Get students in this class
      const { data: enrollments } = await supabaseAdmin
        .from("enrollments")
        .select("student_id")
        .eq("class_id", classId)
        .eq("academic_year", academicYear)
        .limit(100000);

      const studentIds = enrollments?.map((e) => e.student_id) || [];

      if (studentIds.length === 0) {
        return res.json({ message: "No students found in this class." });
      }

      // Update the exam type for these students' grades in this subject/term/year
      const { data, error, count } = await supabaseAdmin
        .from("student_grades")
        .update({ exam_type: toExamType })
        .eq("school_id", schoolId)
        .eq("term", term)
        .eq("exam_type", fromExamType)
        .eq("academic_year", academicYear)
        .eq("subject_id", subjectId)
        .in("student_id", studentIds)
        .select("id", { count: "exact" });

      if (error) {
        // If there's a unique constraint violation, it means grades already exist in the destination.
        if (error.code === '23505') {
          return res.status(400).json({ message: "Cannot move grades because some grades already exist in the destination assessment type. Please clear them first." });
        }
        throw error;
      }

      res.json({ message: `Successfully moved ${count || 0} grade records to ${toExamType}.` });
    } catch (error: any) {
      console.error("Migrate Grades Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// POST /api/school/grades/clear
// Clear grades for a specific class, subject, term, and exam type
router.post(
  "/grades/clear",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { term, examType, academicYear, classId, subjectId } = req.body;

    if (!term || !examType || !academicYear || !classId || !subjectId) {
      return res.status(400).json({ message: "Missing required fields for clearing grades" });
    }

    try {
      // Get students in this class
      const { data: enrollments } = await supabaseAdmin
        .from("enrollments")
        .select("student_id")
        .eq("class_id", classId)
        .eq("academic_year", academicYear)
        .limit(100000);

      const studentIds = enrollments?.map((e) => e.student_id) || [];

      if (studentIds.length === 0) {
        return res.json({ message: "No students found in this class." });
      }

      // Delete the grades for these students in this subject/term/year/examType
      const { error, count } = await supabaseAdmin
        .from("student_grades")
        .delete({ count: "exact" })
        .eq("school_id", schoolId)
        .eq("term", term)
        .eq("exam_type", examType)
        .eq("academic_year", academicYear)
        .eq("subject_id", subjectId)
        .in("student_id", studentIds);

      if (error) {
        throw error;
      }

      res.json({ message: `Successfully cleared ${count || 0} grade records from ${examType}.` });
    } catch (error: any) {
      console.error("Clear Grades Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// POST /api/school/results/submit
// Teachers submit their grades to the admin
router.post(
  "/results/submit",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { term, examType, academicYear, classId, subjectId } = req.body;

    if (!term || !examType || !academicYear || !subjectId || !classId) {
      return res
        .status(400)
        .json({
          message:
            "Term, Exam Type, Academic Year, Class and Subject are required",
        });
    }

    try {
      let query = supabaseAdmin
        .from("student_grades")
        .update({ status: "Submitted" })
        .eq("school_id", schoolId)
        .eq("term", term)
        .eq("exam_type", examType)
        .eq("academic_year", academicYear)
        .eq("subject_id", subjectId)
        .select("id", { count: "exact" }); // Get count of updated records

      if (classId && classId !== "all") {
        const { data: enrollments } = await supabaseAdmin
          .from("enrollments")
          .select("student_id")
          .eq("class_id", classId)
          .eq("academic_year", academicYear)
          .limit(100000);

        if (enrollments && enrollments.length > 0) {
          const studentIds = enrollments.map((e) => e.student_id);
          
          // Find existing records
          const { data: existingGrades } = await supabaseAdmin
            .from("student_grades")
            .select("student_id")
            .eq("school_id", schoolId)
            .eq("term", term)
            .eq("exam_type", examType)
            .eq("academic_year", academicYear)
            .eq("subject_id", subjectId)
            .in("student_id", studentIds);
            
          const existingStudentIds = new Set(existingGrades?.map(g => g.student_id) || []);
          
          // Create records for missing students
          const missingStudentIds = studentIds.filter(id => !existingStudentIds.has(id));
          
          if (missingStudentIds.length > 0) {
            const missingRecords = missingStudentIds.map(id => ({
              school_id: schoolId,
              student_id: id,
              subject_id: subjectId,
              term: term,
              exam_type: examType,
              academic_year: academicYear,
              percentage: null,
              grade: "ABSENT",
              status: "Submitted",
              comments: "Absent"
            }));
            
            await supabaseAdmin.from("student_grades").insert(missingRecords);
          }

          query = query.in("student_id", studentIds);
        } else {
          return res.json({ message: "No students found in this class" });
        }
      }

      const { data, error, count } = await query;

      if (error) throw error;

      res.json({
        message: "Results submitted to admin successfully",
        count: count || data?.length || 0,
        status: "Submitted",
      });
    } catch (error: any) {
      console.error("Submit Results Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/results/publish
// Publish results for a class/term (Admin)
router.post(
  "/results/publish",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { term, examType, academicYear, classId, subjectId } = req.body;

    if (!term || !examType || !academicYear) {
      return res
        .status(400)
        .json({ message: "Term, Exam Type and Academic Year are required" });
    }

    try {
      const isTeacher = profile.role === "teacher";
      // Teachers submit to admin (Submitted), Admins publish to students (Published)
      const targetStatus = isTeacher ? "Submitted" : "Published";

      // If Admin is publishing, ensure we only publish 'Submitted' records,
      // OR we can publish everything.
      // Requirement: "school admin checks if all students subjects have been published before the admin can actually publish all results"
      // This implies we should check if everything is ready.

      // For this endpoint, we will simply perform the status update.
      // The check should happen in the frontend or a separate validation endpoint,
      // OR we fail here if not ready.

      // Let's implement the update logic:
      let query = supabaseAdmin
        .from("student_grades")
        .update({ status: targetStatus })
        .eq("school_id", schoolId)
        .eq("term", term)
        .eq("exam_type", examType)
        .eq("academic_year", academicYear);

      // Filter by subject if provided
      if (subjectId) {
        query = query.eq("subject_id", subjectId);
      }
      // If teacher didn't provide subjectId, we should probably restrict them to their subjects
      // But for now, we rely on the frontend sending the subjectId.

      // If classId is provided and not 'all', filter by student IDs in that class
      if (classId && classId !== "all") {
        const { data: enrollments } = await supabaseAdmin
          .from("enrollments")
          .select("student_id")
          .eq("class_id", classId)
          .eq("academic_year", academicYear)
          .limit(100000);

        if (enrollments && enrollments.length > 0) {
          const studentIds = enrollments.map((e) => e.student_id);
          
          // Find existing records
          const { data: existingGrades } = await supabaseAdmin
            .from("student_grades")
            .select("student_id")
            .eq("school_id", schoolId)
            .eq("term", term)
            .eq("exam_type", examType)
            .eq("academic_year", academicYear)
            .eq("subject_id", subjectId)
            .in("student_id", studentIds);
            
          const existingStudentIds = new Set(existingGrades?.map(g => g.student_id) || []);
          
          // Create records for missing students
          const missingStudentIds = studentIds.filter(id => !existingStudentIds.has(id));
          
          if (missingStudentIds.length > 0) {
            const missingRecords = missingStudentIds.map(id => ({
              school_id: schoolId,
              student_id: id,
              subject_id: subjectId,
              term: term,
              exam_type: examType,
              academic_year: academicYear,
              percentage: null,
              grade: "ABSENT",
              status: targetStatus,
              comments: "Absent"
            }));
            
            await supabaseAdmin.from("student_grades").insert(missingRecords);
          }

          query = query.in("student_id", studentIds);
        } else {
          return res.json({ message: "No students found in this class" });
        }
      }

      const { error, count } = await query;
      if (error) throw error;

      // Trigger WhatsApp Notifications if publishing as Admin
      if (targetStatus === "Published" && count > 0) {
        try {
          // 1. Fetch Subject Name if subjectId is provided
          let subjectName = "";
          if (subjectId) {
            const { data: subject } = await supabaseAdmin
              .from("subjects")
              .select("name")
              .eq("id", subjectId)
              .single();
            subjectName = subject?.name || "";
          }

          // 2. Fetch affected students and their guardian contact info
          let studentQuery = supabaseAdmin
            .from("profiles")
            .select("id, full_name, guardian_contact")
            .eq("school_id", schoolId)
            .eq("role", "student");

          if (classId && classId !== "all") {
            const { data: enrollments } = await supabaseAdmin
              .from("enrollments")
              .select("student_id")
              .eq("class_id", classId)
              .eq("academic_year", academicYear);

            if (enrollments && enrollments.length > 0) {
              studentQuery = studentQuery.in(
                "id",
                enrollments.map((e) => e.student_id),
              );
            }
          }

          // If subjectId was provided, we strictly only notify students who have a grade for this term/subject
          // but since we just updated their status, we can assume all students in the class might be relevant
          // or we can be more precise by querying student_grades.
          const { data: studentsToNotify } = await studentQuery;

          if (studentsToNotify && studentsToNotify.length > 0) {
            console.log(
              `[Notification] Triggering WhatsApp messages for ${studentsToNotify.length} students`,
            );

            // Send notifications sequentially to avoid overwhelming the provider or rate limits
            for (const student of studentsToNotify) {
              if (student.guardian_contact) {
                await WhatsAppService.sendResultPublishedNotification(
                  student.guardian_contact,
                  student.full_name || "your child",
                  subjectName || "the term",
                );
              }
            }
          }
        } catch (notifError) {
          console.error("Failed to send WhatsApp notifications:", notifError);
          // We don't fail the whole request if notifications fail
        }
      }

      const action = isTeacher ? "submitted to admin" : "published to students";
      res.json({
        message: `Results ${action} successfully`,
        count,
        status: targetStatus,
      });
    } catch (error: any) {
      console.error("Publish Results Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// GET /api/school/grades/status
// Check submission status for a class/term
router.get(
  "/grades/status",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { classId, term, examType, academicYear, subjectId } = req.query;
    const isAllClasses = !classId || classId === "all";

    if (!term || !examType || !academicYear) {
      return res
        .status(400)
        .json({ message: "Term, Exam Type and Academic Year are required" });
    }

    try {
      // 2. Check grade status for each subject
      const statusReport = [];

      let gradesQuery = supabaseAdmin
        .from("student_grades")
        .select("student_id, subject_id, status")
        .eq("school_id", schoolId)
        .eq("term", term)
        .eq("exam_type", examType)
        .eq("academic_year", academicYear);

      if (!isAllClasses) {
        const enrollmentsQuery = supabaseAdmin
          .from("enrollments")
          .select("student_id")
          .eq("academic_year", academicYear)
          .eq("class_id", classId);

        const enrollments = await fetchAll(enrollmentsQuery);
        const studentIds = enrollments?.map((e) => e.student_id) || [];

        if (studentIds.length === 0) {
          return res.json([]);
        }
        
        gradesQuery = gradesQuery.in("student_id", studentIds);
      }

      if (subjectId && subjectId !== "all") {
        gradesQuery = gradesQuery.eq("subject_id", subjectId);
      }

      const grades = await fetchAll(gradesQuery);

      // Fetch all enrollments to map student_id -> class_id
      const allEnrollmentsQuery = supabaseAdmin
        .from("enrollments")
        .select("student_id, class_id, classes(name)")
        .eq("academic_year", academicYear);
      
      const allEnrollments = await fetchAll(allEnrollmentsQuery);
      
      const studentClassMap = new Map<string, string>();
      const classNameMap = new Map<string, string>();
      
      allEnrollments?.forEach(e => {
        studentClassMap.set(e.student_id, e.class_id);
        if (e.classes && (e.classes as any).name) {
          classNameMap.set(e.class_id, (e.classes as any).name);
        }
      });

      // Analyze status per subject per class
      const classSubjectStatusMap = new Map<string, Set<string>>();

      grades?.forEach((g) => {
        const classIdForStudent = studentClassMap.get(g.student_id);
        if (!classIdForStudent) return; // Skip if we can't find the class

        const key = `${classIdForStudent}_${g.subject_id}`;
        if (!classSubjectStatusMap.has(key)) {
          classSubjectStatusMap.set(key, new Set());
        }
        classSubjectStatusMap.get(key)?.add(g.status);
      });

      // Let's fetch all subjects to map IDs to names
      const allSubjectsQuery = supabaseAdmin
        .from("subjects")
        .select("id, name")
        .eq("school_id", schoolId);

      const allSubjects = await fetchAll(allSubjectsQuery);
      const subjectNameMap = new Map(allSubjects?.map((s) => [s.id, s.name]));

      // Fetch teachers assigned to subjects for this class
      let classAssignedTeachersQuery = supabaseAdmin
        .from("class_subjects")
        .select("class_id, subject_id, teacher:profiles(full_name)");

      if (!isAllClasses) {
        classAssignedTeachersQuery = classAssignedTeachersQuery.eq(
          "class_id",
          classId,
        );
      } else {
        const schoolClassesQuery = supabaseAdmin
          .from("classes")
          .select("id")
          .eq("school_id", schoolId);
        
        const schoolClasses = await fetchAll(schoolClassesQuery);
        const targetClassIds = (schoolClasses || []).map((c: any) => c.id);
        
        if (targetClassIds.length > 0) {
          // If there are many classes, .in() might still be too large, but usually a school has < 100 classes.
          classAssignedTeachersQuery = classAssignedTeachersQuery.in("class_id", targetClassIds);
        } else {
          // No classes in school, return empty
          return res.json([]);
        }
      }

      const classAssignedTeachers = await fetchAll(classAssignedTeachersQuery);

      const classSubjectTeacherMap = new Map<string, Set<string>>();
      const assignedClassSubjects = new Set<string>();

      classAssignedTeachers?.forEach((cs: any) => {
        const key = `${cs.class_id}_${cs.subject_id}`;
        assignedClassSubjects.add(key);

        let teacherName = null;
        if (cs.teacher && cs.teacher.full_name) {
          teacherName = cs.teacher.full_name;
        } else if (
          cs.teacher &&
          Array.isArray(cs.teacher) &&
          cs.teacher.length > 0 &&
          cs.teacher[0].full_name
        ) {
          teacherName = cs.teacher[0].full_name;
        }

        if (teacherName) {
          if (!classSubjectTeacherMap.has(key)) {
            classSubjectTeacherMap.set(key, new Set());
          }
          classSubjectTeacherMap.get(key)?.add(teacherName);
        }
      });

      // Iterate over all assigned subjects + any subjects that have grades
      const allClassSubjects = new Set([
        ...Array.from(assignedClassSubjects),
        ...Array.from(classSubjectStatusMap.keys())
      ]);

      for (const key of allClassSubjects) {
        const [cId, subjId] = key.split('_');
        const statuses = classSubjectStatusMap.get(key);
        let overallStatus = "Not Entered";

        if (statuses && statuses.size > 0) {
          if (statuses.has("Draft")) {
            overallStatus = "Draft";
          } else if (Array.from(statuses).every((s) => s === "Published")) {
            overallStatus = "Published";
          } else if (
            Array.from(statuses).every(
              (s) => s === "Submitted" || s === "Published",
            )
          ) {
            overallStatus = "Submitted";
          } else {
            overallStatus = "Draft";
          }
        }

        let teacherDisplay = "Unassigned";
        const teachersSet = classSubjectTeacherMap.get(key);
        if (teachersSet && teachersSet.size > 0) {
          teacherDisplay = Array.from(teachersSet).join(", ");
        }

        const subjName = subjectNameMap.get(subjId) || "Unknown Subject";
        const cName = classNameMap.get(cId) || "Unknown Class";

        statusReport.push({
          id: key,
          name: isAllClasses ? `${subjName} (${cName})` : subjName,
          teacher: teacherDisplay,
          status: overallStatus,
        });
      }

      res.json(statusReport);
    } catch (error: any) {
      console.error("Grade Status Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// GET /api/school/results/report-card/:studentId
// Generate report card data
router.get(
  "/results/report-card/:studentId",
  requireSchoolRole([...ADMIN_ROLES, "teacher", "student"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { studentId } = req.params;
    let { term, examType, academicYear } = req.query as {
      term?: string;
      examType?: string;
      academicYear?: string;
    };

    // Auto-set term/year from settings if not provided
    if (!term || !examType || !academicYear) {
      try {
        const settings = await ensureSchoolSettings(schoolId);
        term = term || settings?.current_term || "Term 1";
        examType = examType || "End of Term"; // fallback
        academicYear =
          academicYear ||
          settings?.academic_year ||
          new Date().getFullYear().toString();
      } catch (e) {
        console.error("Failed to fetch settings for report card defaults", e);
        term = term || "Term 1";
        examType = examType || "End of Term";
        academicYear = academicYear || new Date().getFullYear().toString();
      }
    }

    // Student can only see their own report
    if (profile.role === "student" && profile.id !== studentId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      // 1. Fetch Student Profile & Class
      const { data: student } = await supabaseAdmin
        .from("profiles")
        .select("*, enrollments(class_id, classes(id, name))")
        .eq("id", studentId)
        .eq("school_id", schoolId)
        .single();

      if (!student)
        return res.status(404).json({ message: "Student not found" });

      const classId = student.enrollments?.[0]?.class_id;

      // 2. Fetch All Class Subjects (to ensure full list)
      let allClassSubjects: any[] = [];
      if (classId) {
        const { data: subjects } = await supabaseAdmin
          .from("class_subjects")
          .select("subject_id, subjects(id, name, code, department)")
          .eq("class_id", classId);

        if (subjects) {
          allClassSubjects = subjects
            .map((s: any) => s.subjects)
            .filter(Boolean);
        }
      }

      // 3. Fetch Grades
      // For Primary G5-7, we might want to show multiple test scores, so we fetch all exam types for the term
      const gradeStr = (student.grade || student.className || "").toString().toLowerCase();
      const isPrimaryG57 = (gradeStr.includes("5") || gradeStr.includes("6") || gradeStr.includes("7")) && 
                           !gradeStr.includes("1") && 
                           (gradeStr.includes("grade") || gradeStr.includes("g"));

      let gradesQuery = supabaseAdmin
        .from("student_grades")
        .select("*, subjects(id, name, code, department)")
        .eq("student_id", studentId)
        .eq("term", term)
        .eq("academic_year", academicYear);

      // If not primary G5-7, we can still filter by examType for backward compatibility 
      // but keeping it broader allows for more flexible reporting.
      // However, to avoid breaking expected behavior, we'll keep the filter if provided, 
      // UNLESS it's the new Primary format which specifically needs multiple scores.
      if (!isPrimaryG57 && examType) {
        gradesQuery = gradesQuery.eq("exam_type", examType);
      }

      if (profile.role === "student") {
        gradesQuery = gradesQuery.eq("status", "Published");
      }

      const { data: rawGrades } = await gradesQuery;

      // Remove duplicates manually (keeping the most recently calculated one if any)
      const gradesMap = new Map();
      if (rawGrades && rawGrades.length > 0) {
        const sortedGrades = [...rawGrades].sort((a, b) => {
          const timeA = new Date(a.calculated_at || a.created_at).getTime();
          const timeB = new Date(b.calculated_at || b.created_at).getTime();
          return timeB - timeA; // descending
        });

        for (const grade of sortedGrades) {
          // Use subject_id as key if available, fallback to code
          const key = grade.subject_id || grade.subjects?.code;
          if (key && !gradesMap.has(key)) {
            gradesMap.set(key, grade);
          }
        }
      }

      // Merge: Ensure all class subjects are present
      const finalGrades = allClassSubjects.map((subject) => {
        // Check if we have a grade for this subject
        const existingGrade =
          gradesMap.get(subject.id) || gradesMap.get(subject.code);

        if (existingGrade) {
          return existingGrade;
        }

        // Return placeholder for absent/missing grade
        return {
          id: `missing-${subject.id}`,
          student_id: studentId,
          subject_id: subject.id,
          subjects: subject,
          percentage: null,
          grade: "ABSENT", // Special marker
          remarks: "Not Recorded",
          term,
          academic_year: academicYear,
        };
      });

      // Add any grades that might not be in class_subjects (e.g. electives or errors)
      // Only add if not already in finalGrades
      const processedSubjectIds = new Set(allClassSubjects.map((s) => s.id));
      for (const grade of gradesMap.values()) {
        if (grade.subject_id && !processedSubjectIds.has(grade.subject_id)) {
          finalGrades.push(grade);
        }
      }

      // 3. Fetch Grading Scales (for key)
      const { data: scales } = await supabaseAdmin
        .from("grading_scales")
        .select("*")
        .eq("school_id", schoolId)
        .order("min_percentage", { ascending: false });

      // 4. Fetch School Details
      const { data: schoolDetails } = await supabaseAdmin
        .from("schools")
        .select(
          "name, address, email, phone, website, logo_url, signature_url, seal_url, coat_of_arms_url, school_type, headteacher_name, headteacher_title",
        )
        .eq("id", schoolId)
        .single();

      // 5. Fetch Class Rankings and Average
      let position = 0;
      let totalStudents = 0;
      let classAverage = 0;
      
      if (classId) {
        const rankingsData = await getClassRankings(classId, term, examType, academicYear);
        position = rankingsData.rankings[studentId] || 0;
        totalStudents = rankingsData.totalStudents;
        classAverage = rankingsData.classAverage;
      }

      res.json({
        school: schoolDetails,
        student: {
          id: student.id,
          name: student.full_name,
          studentNumber: student.student_number,
          gender: student.gender,
          class: student.enrollments?.[0]?.classes?.name || "N/A",
          attendance: 0, // Placeholder
          position,
          totalStudents,
          classAverage
        },
        term,
        academicYear,
        grades: finalGrades || [],
        gradingScale: scales || [],
      });
    } catch (error: any) {
      console.error("Report Card Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// GET /api/school/results/batch-report-cards
// Generate batch report cards for a class
router.get(
  "/results/batch-report-cards",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { classId, term, examType, academicYear } = req.query as {
      classId: string;
      term: string;
      examType: string;
      academicYear: string;
    };

    if (!classId || !term || !examType || !academicYear) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    try {
      // 1. Fetch Shared Info (School Details & Grading Scales)
      const { data: schoolDetails } = await supabaseAdmin
        .from("schools")
        .select(
          "name, address, email, phone, website, logo_url, signature_url, seal_url, coat_of_arms_url, school_type, headteacher_name, headteacher_title",
        )
        .eq("id", schoolId)
        .single();

      const { data: scales } = await supabaseAdmin
        .from("grading_scales")
        .select("*")
        .eq("school_id", schoolId)
        .order("min_percentage", { ascending: false });

      // 2. Fetch all students in the class
      const { data: enrollments, error: enrollmentError } = await supabaseAdmin
        .from("enrollments")
        .select(
          "student_id, profiles!enrollments_student_id_fkey(full_name, student_number, gender), classes(name)",
        )
        .eq("class_id", classId)
        .eq("academic_year", academicYear);

      if (enrollmentError) throw enrollmentError;
      if (!enrollments || enrollments.length === 0) {
        return res.json([]);
      }

      const studentIds = enrollments.map((e) => e.student_id);

      // 2b. Fetch Class Subjects (to ensure we list ALL subjects, even if absent)
      const { data: classSubjects } = await supabaseAdmin
        .from("class_subjects")
        .select("subject_id, subjects(id, name, code, department)")
        .eq("class_id", classId);

      const allClassSubjects = (classSubjects || [])
        .map((cs: any) => cs.subjects)
        .filter(Boolean);

      // 3. Fetch all grades for these students
      const { data: allGrades, error: gradesError } = await supabaseAdmin
        .from("student_grades")
        .select("*, subjects(id, name, code, department)")
        .in("student_id", studentIds)
        .eq("term", term)
        .eq("exam_type", examType)
        .eq("academic_year", academicYear);

      if (gradesError) throw gradesError;

      // 3b. Calculate rankings and class average
      const rankingsData = await getClassRankings(classId, term, examType, academicYear);

      // 4. Group data by student
      const reportCards = enrollments.map((enrollment) => {
        const studentId = enrollment.student_id;
        // Get recorded grades for this student
        const recordedGrades =
          allGrades?.filter((g) => g.student_id === studentId) || [];

        // Deduplicate grades (keeping newest)
        const gradesMap = new Map();
        const sortedGrades = [...recordedGrades].sort((a, b) => {
          const timeA = new Date(a.calculated_at || a.created_at).getTime();
          const timeB = new Date(b.calculated_at || b.created_at).getTime();
          return timeB - timeA;
        });

        for (const grade of sortedGrades) {
          const subjectCode = grade.subjects?.code || grade.subject_id;
          if (!gradesMap.has(subjectCode)) {
            gradesMap.set(subjectCode, grade);
          }
        }

        // Merge with Class Subjects to include "ABSENT" entries
        const finalGrades = allClassSubjects.map((subject: any) => {
          const existingGrade = gradesMap.get(subject.code || subject.id);

          if (existingGrade) {
            return existingGrade;
          }

          // Return an "ABSENT" grade object if no grade exists
          return {
            student_id: studentId,
            subject_id: subject.id,
            subjects: subject,
            grade: "ABSENT",
            percentage: null,
            status: "Published", // Assuming generated reports treat absent as published state for printing
          };
        });

        return {
          school: schoolDetails,
          student: {
            id: enrollment.student_id,
            name: (enrollment.profiles as any)?.full_name,
            studentNumber: (enrollment.profiles as any)?.student_number,
            gender: (enrollment.profiles as any)?.gender,
            class: (enrollment.classes as any)?.name || "N/A",
            attendance: 0,
            position: rankingsData.rankings[studentId] || 0,
            totalStudents: rankingsData.totalStudents,
            classAverage: rankingsData.classAverage
          },
          term,
          academicYear,
          grades: finalGrades,
          gradingScale: scales || [],
        };
      });

      res.json(reportCards);
    } catch (error: any) {
      console.error("Batch Report Card Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/students/:id/attendance
// Add attendance record
router.post(
  "/students/:id/attendance",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;
    const { date, status, remarks } = req.body;

    if (!date || !status) {
      return res.status(400).json({ message: "Date and Status are required" });
    }

    try {
      const settings = await ensureSchoolSettings(schoolId);
      const academicYear =
        settings?.academic_year || new Date().getFullYear().toString();
      const term = settings?.current_term || "Term 1";

      const { error } = await supabaseAdmin.from("attendance").upsert(
        {
          school_id: schoolId,
          student_id: id,
          date,
          status,
          remarks,
          recorded_by: profile.id,
          academic_year: academicYear,
          term: term,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id, date" },
      );

      if (error) throw error;

      res.json({ message: "Attendance recorded successfully" });
    } catch (error: any) {
      console.error("Record Attendance Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// DELETE /api/school/students/:id
// Delete (soft delete or hard delete) a student
router.delete(
  "/students/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;

    try {
      // 1. Verify student belongs to this school
      const { data: studentCheck, error: checkError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", id)
        .eq("school_id", schoolId)
        .single();

      if (checkError || !studentCheck) {
        return res
          .status(404)
          .json({ message: "Student not found in this school" });
      }

      // 2. Delete User (Cascades to profile usually, but let's be safe)
      // Using admin deleteUser removes from auth.users and usually cascades to public.profiles
      if (typeof id === "string") {
        const { error: deleteError } =
          await supabaseAdmin.auth.admin.deleteUser(id);
        if (deleteError) throw deleteError;
      }

      res.json({ message: "Student deleted successfully" });
    } catch (error: any) {
      console.error("Delete Student Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// --- TEACHER MANAGEMENT ENDPOINTS ---

// GET /api/school/teachers
router.get(
  "/teachers",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;

    try {
      let query = supabaseAdmin
        .from("profiles")
        .select("*", { count: 'exact' })
        .eq("school_id", schoolId)
        .eq("role", "teacher")
        .or('employment_status.neq.Terminated,employment_status.is.null');

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,department.ilike.%${search}%`);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: teachers, error, count } = await query
        .order("full_name", { ascending: true })
        .range(from, to);

      if (error) throw error;

      const formattedTeachers = teachers.map((teacher: any) => ({
        id: teacher.id,
        firstName: teacher.full_name?.split(" ")[0] || "",
        lastName: teacher.full_name?.split(" ").slice(1).join(" ") || "",
        fullName: teacher.full_name,
        staffNumber: teacher.staff_number,
        email: teacher.email || "",
        department: teacher.department || "General",
        subjects: teacher.subjects || [],
        status: teacher.employment_status || "Active",
        joinDate: teacher.join_date || new Date().toISOString().split("T")[0],
      }));

      res.json({
        data: formattedTeachers,
        metadata: {
          total: count || 0,
          page,
          pageSize: limit,
          totalPages: Math.ceil((count || 0) / limit)
        }
      });
    } catch (error: any) {
      console.error("Get Teachers Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/create-teacher
router.post(
  "/create-teacher",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { email, password, name, username, department, subjects, joinDate } = req.body;

    try {
      const staffNumber = await generateUniqueStaffNumber();
      const emailToUse = email && email.trim() !== "" 
        ? email 
        : `${staffNumber}@teacher.muchi.app`;
        
      // 1. Create Auth User
      const { data: user, error: userError } =
        await supabaseAdmin.auth.admin.createUser({
          email: emailToUse,
          password: password || "12345678",
          email_confirm: true,
          user_metadata: {
            full_name: name,
            role: "teacher",
            school_id: schoolId,
          },
        });

      if (userError) throw userError;

      // 2. Update Profile with extra details
      if (user.user) {
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            id: user.user.id,
            school_id: schoolId,
            role: "teacher",
            full_name: name,
            email: emailToUse,
            username: username || null,
            department,
            subjects: Array.isArray(subjects) ? subjects : [],
            staff_number: staffNumber,
            join_date: joinDate || new Date().toISOString().split("T")[0],
            employment_status: "Active",
            is_temp_password: true,
            temp_password_set_at: new Date().toISOString(),
            temp_password_expires_at: new Date(
              Date.now() + 100 * 365 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (profileError) {
          console.error("Error updating teacher profile:", profileError);
          // Rollback user creation if profile upsert fails
          await supabaseAdmin.auth.admin.deleteUser(user.user.id);
          throw profileError;
        }
      }

      res
        .status(201)
        .json({ message: "Teacher created successfully", user: user.user });
    } catch (error: any) {
      console.error("Create Teacher Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// GET /api/school/teachers/:id
// Get teacher details
router.get(
  "/teachers/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;

    try {
      // 1. Fetch Teacher Profile
      const { data: teacher, error: teacherError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", id)
        .eq("school_id", schoolId)
        .eq("role", "teacher")
        .single();

      if (teacherError || !teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      // 2. Fetch Assigned Classes (as Class Teacher)
      const { data: classes, error: classesError } = await supabaseAdmin
        .from("classes")
        .select("*")
        .eq("class_teacher_id", id)
        .eq("school_id", schoolId);

      // 3. Fetch Subjects where they are Head Teacher
      const { data: subjectsHead, error: subjectsError } = await supabaseAdmin
        .from("subjects")
        .select("*")
        .eq("head_teacher_id", id)
        .eq("school_id", schoolId);

      // 3.5 Fetch Specific Teaching Assignments (from class_subjects)
      const { data: teachingAssignments, error: assignmentsError } = await supabaseAdmin
        .from("class_subjects")
        .select(`
          id,
          class_id,
          subject_id,
          classes(name),
          subjects(name, code, department)
        `)
        .eq("teacher_id", id);

      if (assignmentsError) {
        console.error("Error fetching teaching assignments:", assignmentsError);
      }

      // 3.6 Calculate unique classes count
      const uniqueClassIds = new Set([
        ...(classes?.map((c: any) => c.id) || []),
        ...(teachingAssignments?.map((ta: any) => ta.class_id) || [])
      ]);

      // 4. Structure Response
      const response = {
        profile: {
          ...teacher,
          firstName: teacher.full_name?.split(" ")[0] || "",
          lastName: teacher.full_name?.split(" ").slice(1).join(" ") || "",
          joinDate: teacher.join_date || teacher.created_at,
          status: teacher.employment_status || "Active",
          totalClassesCount: uniqueClassIds.size,
        },
        classes: classes || [],
        headOfSubjects: subjectsHead || [],
        teachingAssignments: teachingAssignments || [],
      };


      res.json(response);
    } catch (error: any) {
      console.error("Get Teacher Details Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// PUT /api/school/teachers/:id
// Update teacher details
router.put(
  "/teachers/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;
    const {
      firstName,
      lastName,
      department,
      subjects,
      status,
      phone_number,
      address,
      date_of_birth,
      qualifications,
      work_history,
      username,
      email,
    } = req.body;

    try {
      const updateData: any = {
        updated_at: new Date(),
      };

      if (firstName && lastName)
        updateData.full_name = `${firstName} ${lastName}`;
      if (department !== undefined) updateData.department = department;
      if (subjects !== undefined) updateData.subjects = subjects;
      if (status !== undefined) updateData.employment_status = status;
      if (phone_number !== undefined) updateData.phone_number = phone_number;
      if (address !== undefined) updateData.address = address;
      if (qualifications !== undefined)
        updateData.qualifications = qualifications;
      if (work_history !== undefined) updateData.work_history = work_history;
      if (username !== undefined) updateData.username = username || null;

      // Handle date_of_birth: empty string means null, undefined means no change
      if (date_of_birth !== undefined) {
        updateData.date_of_birth =
          date_of_birth &&
          typeof date_of_birth === "string" &&
          date_of_birth.trim() !== ""
            ? date_of_birth
            : null;
      }

      const { error } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;

      // Synchronization of class-subject assignments
      if (subjects !== undefined) {
        // Here, 'subjects' is an array of class_subject IDs.
        
        // 1. Clear existing assignments for THIS teacher
        const { error: clearError } = await supabaseAdmin
          .from("class_subjects")
          .update({ teacher_id: null })
          .eq("teacher_id", id);
        
        if (clearError) throw clearError;

        // 2. Assign new subjects to THIS teacher
        if (subjects.length > 0) {
          const { error: assignError } = await supabaseAdmin
            .from("class_subjects")
            .update({ teacher_id: id })
            .in("id", subjects);
          
          if (assignError) throw assignError;

          // 3. Update the 'subjects' text array in profiles for display/backward compatibility
          const { data: namesData } = await supabaseAdmin
            .from("class_subjects")
            .select(`
              subjects!inner(name)
            `)
            .in("id", subjects);
          
          if (namesData) {
            const subjectNames = Array.from(new Set(namesData.map((item: any) => item.subjects.name)));
            await supabaseAdmin
              .from("profiles")
              .update({ subjects: subjectNames })
              .eq("id", id);
          }
        } else {
          // Clear the subjects array if no assignments
          await supabaseAdmin
            .from("profiles")
            .update({ subjects: [] })
            .eq("id", id);
        }
      }
      
      // Update Auth Email if provided
      if (email && typeof email === 'string' && typeof id === 'string') {
        const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(id, { email });
        if (emailError) console.warn("Failed to update email in auth:", emailError);
      }

      res.json({ message: "Teacher updated successfully" });
    } catch (error: any) {
      console.error("Update Teacher Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// DELETE /api/school/teachers/:id
// Soft delete teacher
router.delete(
  "/teachers/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;

    try {
      // Soft delete by setting status to 'Terminated' or 'Left'
      // Also clear auth access? For now just status.
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          employment_status: "Terminated",
          updated_at: new Date(),
        })
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;

      // Optional: Disable auth user
      // await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: '876000h' }); // Ban for 100 years

      res.json({ message: "Teacher deleted successfully" });
    } catch (error: any) {
      console.error("Delete Teacher Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/teachers/:id/promote
// Promote a teacher to school admin role
router.post(
  "/teachers/:id/promote",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;

    try {
      // 1. Get the current user profile
      const { data: targetProfile, error: fetchError } = await supabaseAdmin
        .from("profiles")
        .select("role, secondary_role")
        .eq("id", id)
        .eq("school_id", schoolId)
        .single();

      if (fetchError || !targetProfile) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      // 2. Check if they are already an admin
      if (targetProfile.role === "school_admin" || targetProfile.secondary_role === "school_admin") {
        return res.status(400).json({ message: "User already has school admin role" });
      }

      // 3. Update the role
      // We'll set primary role to school_admin and current role to secondary_role
      // This ensures they keep their teacher access while gaining admin access
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          role: "school_admin",
          secondary_role: targetProfile.role || "teacher",
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (updateError) throw updateError;

      res.json({ message: "Teacher promoted to School Admin successfully" });
    } catch (error: any) {
      console.error("Promote Teacher Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// --- ACADEMIC MANAGEMENT ENDPOINTS ---

// GET /api/school/departments
router.get(
  "/departments",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;

    try {
      const { data: departments, error } = await supabaseAdmin
        .from("departments")
        .select("*, head_of_department:profiles!head_of_department_id(id, full_name)")
        .eq("school_id", schoolId)
        .order("name", { ascending: true });

      if (error) throw error;

      res.json(departments);
    } catch (error: any) {
      console.error("Get Departments Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/departments
router.post(
  "/departments",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { name, head_of_department_id } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "Department name is required" });
    }

    // Capitalize each word logic (optional but good for consistency)
    const formattedName = name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();

    try {
      // Check if already exists (case insensitive)
      const { data: existing } = await supabaseAdmin
        .from("departments")
        .select("id")
        .eq("school_id", schoolId)
        .ilike("name", formattedName)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ message: "Department already exists" });
      }

      const { data: newDept, error } = await supabaseAdmin
        .from("departments")
        .insert({
          school_id: schoolId,
          name: formattedName,
          head_of_department_id: head_of_department_id || null,
        })
        .select("*, head_of_department:profiles!head_of_department_id(id, full_name)")
        .single();

      if (error) throw error;

      res.status(201).json(newDept);
    } catch (error: any) {
      console.error("Create Department Error:", error);
      // Determine if a unique constraint error occurred and handle gracefully
      if (error.code === '23505') {
        return res.status(400).json({ message: "Department already exists" });
      }
      res.status(500).json({ message: error.message });
    }
  },
);

// PUT /api/school/departments/:id
router.put(
  "/departments/:id",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;
    const { name, head_of_department_id } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "Department name is required" });
    }

    const formattedName = name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();

    try {
      // Check if another department with same name exists
      const { data: existing } = await supabaseAdmin
        .from("departments")
        .select("id")
        .eq("school_id", schoolId)
        .ilike("name", formattedName)
        .neq("id", id)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ message: "Another department with this name already exists" });
      }

      const { data: updatedDept, error } = await supabaseAdmin
        .from("departments")
        .update({ 
          name: formattedName,
          head_of_department_id: head_of_department_id || null,
        })
        .eq("id", id)
        .eq("school_id", schoolId)
        .select("*, head_of_department:profiles!head_of_department_id(id, full_name)")
        .single();

      if (error) throw error;

      res.json(updatedDept);
    } catch (error: any) {
      console.error("Update Department Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/departments/bulk
router.post(
  "/departments/bulk",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { departments } = req.body;

    if (!departments || !Array.isArray(departments) || departments.length === 0) {
      return res.status(400).json({ message: "No departments provided" });
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors: { row: number; name: string; message: string }[] = [];

    for (let i = 0; i < departments.length; i++) {
      const dept = departments[i];
      try {
        if (!dept.name || typeof dept.name !== "string" || !dept.name.trim()) {
          throw new Error("Department name is required");
        }

        const formattedName = dept.name
          .toLowerCase()
          .split(" ")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
          .trim();

        // Check if already exists
        const { data: existing } = await supabaseAdmin
          .from("departments")
          .select("id")
          .eq("school_id", schoolId)
          .ilike("name", formattedName)
          .maybeSingle();

        if (existing) {
          skippedCount++;
          continue;
        }

        const { error } = await supabaseAdmin
          .from("departments")
          .insert({ school_id: schoolId, name: formattedName });

        if (error) throw error;
        importedCount++;
      } catch (err: any) {
        errors.push({ row: i + 1, name: dept.name || "(empty)", message: err.message });
      }
    }

    res.json({ importedCount, skippedCount, errors });
  },
);

// DELETE /api/school/departments/:id
router.delete(
  "/departments/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;

    try {
      const { error } = await supabaseAdmin
        .from("departments")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
      res.json({ message: "Department deleted successfully" });
    } catch (error: any) {
      console.error("Delete Department Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/subjects/bulk
router.post(
  "/subjects/bulk",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { subjects } = req.body;

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ message: "No subjects provided" });
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors: { row: number; name: string; message: string }[] = [];

    for (let i = 0; i < subjects.length; i++) {
      const subj = subjects[i];
      try {
        if (!subj.name || typeof subj.name !== "string" || !subj.name.trim()) {
          throw new Error("Subject name is required");
        }

        // Check duplicate by name within school
        const { data: existing } = await supabaseAdmin
          .from("subjects")
          .select("id")
          .eq("school_id", schoolId)
          .ilike("name", subj.name.trim())
          .maybeSingle();

        if (existing) {
          skippedCount++;
          continue;
        }

        const { error } = await supabaseAdmin
          .from("subjects")
          .insert({
            school_id: schoolId,
            name: subj.name.trim(),
            code: subj.code?.trim() || null,
            department: subj.department?.trim() || null,
          });

        if (error) throw error;
        importedCount++;
      } catch (err: any) {
        errors.push({ row: i + 1, name: subj.name || "(empty)", message: err.message });
      }
    }

    res.json({ importedCount, skippedCount, errors });
  },
);

// POST /api/school/classes/bulk
router.post(
  "/classes/bulk",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { classes } = req.body;

    if (!classes || !Array.isArray(classes) || classes.length === 0) {
      return res.status(400).json({ message: "No classes provided" });
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors: { row: number; name: string; message: string }[] = [];

    for (let i = 0; i < classes.length; i++) {
      const cls = classes[i];
      try {
        if (!cls.name || typeof cls.name !== "string" || !cls.name.trim()) {
          throw new Error("Class name is required");
        }

        // Check duplicate by name within school
        const { data: existing } = await supabaseAdmin
          .from("classes")
          .select("id")
          .eq("school_id", schoolId)
          .ilike("name", cls.name.trim())
          .maybeSingle();

        if (existing) {
          skippedCount++;
          continue;
        }

        const { error } = await supabaseAdmin
          .from("classes")
          .insert({
            school_id: schoolId,
            name: cls.name.trim(),
            level: cls.level?.trim() || null,
            room: cls.room?.trim() || null,
            capacity: cls.capacity ? parseInt(cls.capacity) : 40,
          });

        if (error) throw error;
        importedCount++;
      } catch (err: any) {
        errors.push({ row: i + 1, name: cls.name || "(empty)", message: err.message });
      }
    }

    res.json({ importedCount, skippedCount, errors });
  },
);

// GET /api/school/subjects
router.get(
  "/subjects",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;

    try {
      let query = supabaseAdmin
        .from("subjects")
        .select("*, head:profiles!head_teacher_id(full_name)")
        .eq("school_id", schoolId)
        .order("name", { ascending: true });

      // Filter for teachers: only show subjects they teach or lead
      if (profile.role === "teacher") {
        // 1. Subjects they teach
        const { data: taughtSubjects, error: taughtError } = await supabaseAdmin
          .from("class_subjects")
          .select("subject_id")
          .eq("teacher_id", profile.id);

        if (taughtError)
          console.error("Error fetching taught subjects:", taughtError);

        const taughtSubjectIds =
          taughtSubjects?.map((s: any) => s.subject_id) || [];

        // 2. Subjects they are Head of Department for
        const { data: headSubjects, error: headError } = await supabaseAdmin
          .from("subjects")
          .select("id")
          .eq("head_teacher_id", profile.id);

        if (headError)
          console.error("Error fetching head subjects:", headError);

        const headSubjectIds = headSubjects?.map((s: any) => s.id) || [];

        // 3. Subjects in classes where they are Class Teacher
        // First get the classes they manage
        const { data: classTeacherClasses } = await supabaseAdmin
          .from("classes")
          .select("id")
          .eq("class_teacher_id", profile.id);

        const classTeacherClassIds =
          classTeacherClasses?.map((c: any) => c.id) || [];

        let classTeacherSubjectIds: string[] = [];
        if (classTeacherClassIds.length > 0) {
          const { data: classSubjects } = await supabaseAdmin
            .from("class_subjects")
            .select("subject_id")
            .in("class_id", classTeacherClassIds);

          classTeacherSubjectIds =
            classSubjects?.map((s: any) => s.subject_id) || [];
        }

        const allIds = Array.from(
          new Set([
            ...taughtSubjectIds,
            ...headSubjectIds,
            ...classTeacherSubjectIds,
          ]),
        );

        if (allIds.length > 0) {
          query = query.in("id", allIds);
        } else {
          return res.json([]);
        }
      }

      const { data: subjects, error } = await query;

      if (error) throw error;

      const formattedSubjects = subjects.map((subject: any) => ({
        id: subject.id,
        name: subject.name,
        department: subject.department || "",
        headTeacherId: subject.head_teacher_id,
        headTeacherName: subject.head?.full_name || "Unassigned",
        code: subject.code,
      }));

      res.json(formattedSubjects);
    } catch (error: any) {
      console.error("Get Subjects Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/subjects
router.post(
  "/subjects",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { name, department, headTeacherId, code } = req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from("subjects")
        .insert({
          school_id: schoolId,
          name,
          department,
          head_teacher_id: headTeacherId || null,
          code,
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error: any) {
      console.error("Create Subject Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// PUT /api/school/subjects/:id
router.put(
  "/subjects/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;
    const { name, department, headTeacherId, code } = req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from("subjects")
        .update({
          name,
          department,
          head_teacher_id: headTeacherId || null,
          code,
          // updated_at: new Date() // updated_at column might be missing
        })
        .eq("id", id)
        .eq("school_id", schoolId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Update Subject Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// DELETE /api/school/subjects/:id
router.delete(
  "/subjects/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;

    try {
      const { error } = await supabaseAdmin
        .from("subjects")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
      res.json({ message: "Subject deleted successfully" });
    } catch (error: any) {
      console.error("Delete Subject Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// GET /api/school/classes
router.get(
  "/classes",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;

    try {
      let query = supabaseAdmin
        .from("classes")
        .select("*, teacher:class_teacher_id(full_name)", { count: 'exact' })
        .eq("school_id", schoolId);

      if (search) {
        query = query.or(`name.ilike.%${search}%,level.ilike.%${search}%`);
      }

      // Filter for teachers: only show classes they teach or are class teacher for
      if (profile.role === "teacher") {
        // 1. Classes where they teach a subject
        const { data: subjectClasses } = await supabaseAdmin
          .from("class_subjects")
          .select("class_id")
          .eq("teacher_id", profile.id);

        const subjectClassIds =
          subjectClasses?.map((c: any) => c.class_id) || [];

        // 2. Classes where they are Class Teacher
        const { data: teacherClasses } = await supabaseAdmin
          .from("classes")
          .select("id")
          .eq("class_teacher_id", profile.id);

        const teacherClassIds = teacherClasses?.map((c: any) => c.id) || [];

        const allIds = Array.from(
          new Set([...subjectClassIds, ...teacherClassIds]),
        );

        if (allIds.length > 0) {
          query = query.in("id", allIds);
        } else {
          return res.json({ data: [], metadata: { total: 0, page, pageSize: limit, totalPages: 0 } });
        }
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: classes, error, count } = await query
        .order("name", { ascending: true })
        .range(from, to);

      if (error) throw error;

      // 1. Fetch enrollment counts for these classes
      const classIds = classes.map((c: any) => c.id);
      let enrollmentCounts: Record<string, number> = {};
      
      if (classIds.length > 0) {
        const currentYear = new Date().getFullYear().toString();
        const { data: enrollments, error: enrollError } = await supabaseAdmin
          .from('enrollments')
          .select('class_id')
          .in('class_id', classIds)
          .eq('status', 'Active')
          .eq('academic_year', currentYear);

        if (!enrollError && enrollments) {
          enrollments.forEach((e: any) => {
            enrollmentCounts[e.class_id] = (enrollmentCounts[e.class_id] || 0) + 1;
          });
        }
      }

      const formattedClasses = classes.map((cls: any) => ({
        id: cls.id,
        name: cls.name,
        level: cls.level,
        room: cls.room,
        capacity: cls.capacity, // Database hard limit if needed
        enrolledCount: enrollmentCounts[cls.id] || 0, // Dynamic calculation
        classTeacherId: cls.class_teacher_id,
        classTeacherName: cls.teacher?.full_name || "Unassigned",
      }));

      res.json({
        data: formattedClasses,
        metadata: {
          total: count || 0,
          page,
          pageSize: limit,
          totalPages: Math.ceil((count || 0) / limit)
        }
      });
    } catch (error: any) {
      console.error("Get Classes Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// GET /api/school/classes/:id/students
router.get(
  "/classes/:id/students",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const classId = req.params.id;
    const { year } = req.query;
    const academicYear = year
      ? String(year)
      : new Date().getFullYear().toString();

    try {
      const { data: enrollments, error } = await supabaseAdmin
        .from("enrollments")
        .select("student_id, profiles(id, full_name, student_number)")
        .eq("class_id", classId)
        //.eq('school_id', schoolId) // enrollment has school_id, good to check
        .eq("academic_year", academicYear);

      if (error) throw error;

      const students = enrollments
        .map((e: any) => ({
          id: e.profiles.id,
          fullName: e.profiles.full_name,
          studentNumber: e.profiles.student_number || "",
        }))
        .sort((a: any, b: any) => a.fullName.localeCompare(b.fullName));

      res.json(students);
    } catch (error: any) {
      console.error("Get Class Students Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/classes
router.post(
  "/classes",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { name, level, room, capacity, classTeacherId } = req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from("classes")
        .insert({
          school_id: schoolId,
          name,
          level,
          room,
          capacity: capacity || 40,
          class_teacher_id: classTeacherId || null,
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error: any) {
      console.error("Create Class Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// PUT /api/school/classes/:id
router.put(
  "/classes/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;
    const { name, level, room, capacity, classTeacherId } = req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from("classes")
        .update({
          name,
          level,
          room,
          capacity,
          class_teacher_id: classTeacherId || null,
          // updated_at column missing in some deployments
        })
        .eq("id", id)
        .eq("school_id", schoolId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Update Class Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// DELETE /api/school/classes/:id
router.delete(
  "/classes/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;

    try {
      const { error } = await supabaseAdmin
        .from("classes")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
      res.json({ message: "Class deleted successfully" });
    } catch (error: any) {
      console.error("Delete Class Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// GET /api/school/classes/:id/subjects
router.get(
  "/classes/:id/subjects",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const { data, error } = await supabaseAdmin
        .from("class_subjects")
        .select(
          `
        id,
        subject_id,
        teacher_id,
        subjects(id, name, code, department),
        profiles(id, full_name)
      `,
        )
        .eq("class_id", id);

      if (error) {
        console.error("Get Class Subjects Error details:", error);
        throw error;
      }

      // Map to a cleaner structure
      const subjects = data.map((item: any) => ({
        ...item.subjects,
        classSubjectId: item.id,
        teacherId: item.teacher_id,
        teacherName: Array.isArray(item.profiles) ? item.profiles[0]?.full_name : item.profiles?.full_name,
      }));

      res.json(subjects);
    } catch (error: any) {
      console.error("Get Class Subjects Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/classes/:id/subjects/assign
// Assign or update a teacher for a subject in a class
router.post(
  "/classes/:id/subjects/assign",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { subjectId, teacherId } = req.body;

    if (!subjectId) {
      return res.status(400).json({ message: "Subject ID is required" });
    }

    try {
      // Check if the assignment already exists
      const { data: existing } = await supabaseAdmin
        .from("class_subjects")
        .select("id")
        .eq("class_id", id)
        .eq("subject_id", subjectId)
        .single();

      let result;
      if (existing) {
        // Update existing assignment
        const { data, error } = await supabaseAdmin
          .from("class_subjects")
          .update({ teacher_id: teacherId || null })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        // Create new assignment
        const { data, error } = await supabaseAdmin
          .from("class_subjects")
          .insert({
            class_id: id,
            subject_id: subjectId,
            teacher_id: teacherId || null,
          })
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      res.json(result);
    } catch (error: any) {
      console.error("Assign Subject Teacher Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// DELETE /api/school/classes/:id/subjects/:subjectId
router.delete(
  "/classes/:id/subjects/:subjectId",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const { id, subjectId } = req.params;
    try {
      const { error } = await supabaseAdmin
        .from("class_subjects")
        .delete()
        .eq("class_id", id)
        .eq("subject_id", subjectId);

      if (error) throw error;
      res.json({ message: "Subject removed from class" });
    } catch (error: any) {
      console.error("Remove Class Subject Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/classes/:id/subjects
// Bulk assign subjects to a class
router.post(
  "/classes/:id/subjects",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const { id: classId } = req.params;
    const { subjectIds } = req.body;

    if (!subjectIds || !Array.isArray(subjectIds)) {
      return res.status(400).json({ message: "subjectIds array is required" });
    }

    try {
      // 1. Get current assignments for this class
      const { data: currentAssignments, error: fetchError } = await supabaseAdmin
        .from("class_subjects")
        .select("subject_id")
        .eq("class_id", classId);

      if (fetchError) throw fetchError;

      const currentSubjectIds = currentAssignments?.map((a) => a.subject_id) || [];

      // 2. Identify subjects to remove and subjects to add
      const subjectsToRemove = currentSubjectIds.filter(
        (id) => !subjectIds.includes(id)
      );
      const subjectsToAdd = subjectIds.filter(
        (id) => !currentSubjectIds.includes(id)
      );

      // 3. Remove subjects no longer selected
      if (subjectsToRemove.length > 0) {
        const { error: deleteError } = await supabaseAdmin
          .from("class_subjects")
          .delete()
          .eq("class_id", classId)
          .in("subject_id", subjectsToRemove);

        if (deleteError) throw deleteError;
      }

      // 4. Add new subjects (without teacher assigned yet)
      if (subjectsToAdd.length > 0) {
        const newAssignments = subjectsToAdd.map((subjectId) => ({
          class_id: classId,
          subject_id: subjectId,
        }));

        // Use upsert to avoid duplicate key errors if there's a race condition
        // or leftover data that wasn't properly deleted
        const { error: insertError } = await supabaseAdmin
          .from("class_subjects")
          .upsert(newAssignments, { onConflict: 'class_id, subject_id' });

        if (insertError) {
          console.error("Insert Error:", insertError);
          throw insertError;
        }
      }

      res.json({ message: "Class subjects updated successfully" });
    } catch (error: any) {
      console.error("Update Class Subjects Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// --- FINANCE ENDPOINTS ---

// GET /api/school/finance
router.get(
  "/finance",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { term, academic_year } = req.query;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    try {
      let query = supabaseAdmin
        .from("finance_records")
        .select("*", { count: 'exact' })
        .eq("school_id", schoolId);

      if (term) query = query.eq("term", term);
      if (academic_year) query = query.eq("academic_year", academic_year);

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: records, error, count } = await query
        .order("date", { ascending: false })
        .range(from, to);

      if (error) throw error;

      res.json({
        data: records,
        metadata: {
          total: count || 0,
          page,
          pageSize: limit,
          totalPages: Math.ceil((count || 0) / limit)
        }
      });
    } catch (error: any) {
      console.error("Get Finance Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/finance
router.post(
  "/finance",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { category, amount, type, description, date, term, academicYear } =
      req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from("finance_records")
        .insert({
          school_id: schoolId,
          category,
          amount,
          type,
          description,
          date: date || new Date().toISOString().split("T")[0],
          term,
          academic_year: academicYear,
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error: any) {
      console.error("Create Finance Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// PUT /api/school/finance/:id
router.put(
  "/finance/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;
    const { category, amount, type, description, date, term, academicYear } =
      req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from("finance_records")
        .update({
          category,
          amount,
          type,
          description,
          date,
          term,
          academic_year: academicYear,
        })
        .eq("id", id)
        .eq("school_id", schoolId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Update Finance Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// DELETE /api/school/finance/:id
router.delete(
  "/finance/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;

    try {
      const { error } = await supabaseAdmin
        .from("finance_records")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
      res.json({ message: "Record deleted successfully" });
    } catch (error: any) {
      console.error("Delete Finance Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// GET /api/school/finance/stats
router.get(
  "/finance/stats",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { term, academic_year } = req.query;

    try {
      let query = supabaseAdmin
        .from("finance_records")
        .select("amount, type, date")
        .eq("school_id", schoolId);

      if (term) query = query.eq("term", term);
      if (academic_year) query = query.eq("academic_year", academic_year);

      const { data: records, error } = await query;

      if (error) throw error;

      let totalRevenue = 0;
      let totalExpenses = 0;
      let monthlyRevenue = 0;
      let monthlyExpenses = 0;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      records.forEach((record: any) => {
        const amount = Number(record.amount);
        const recordDate = new Date(record.date);

        if (record.type === "income") {
          totalRevenue += amount;
          if (
            recordDate.getMonth() === currentMonth &&
            recordDate.getFullYear() === currentYear
          ) {
            monthlyRevenue += amount;
          }
        } else {
          totalExpenses += amount;
          if (
            recordDate.getMonth() === currentMonth &&
            recordDate.getFullYear() === currentYear
          ) {
            monthlyExpenses += amount;
          }
        }
      });

      res.json({
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        monthlyRevenue,
        monthlyExpenses,
      });
    } catch (error: any) {
      console.error("Get Finance Stats Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// --- REPORTS ENDPOINTS ---

// GET /api/school/reports
router.get(
  "/reports",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { term, academicYear } = req.query;

    try {
      let query = supabaseAdmin
        .from("reports")
        .select("*, generated_by:generated_by(full_name)")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (academicYear) {
        query = query.eq("academic_year", academicYear);
      }

      if (term) {
        query = query.eq("term", term);
      }

      let reports;
      try {
        // Try with filters (which might use new columns)
        const { data, error } = await query;
        if (error) throw error;
        reports = data;
      } catch (e: any) {
        console.warn(
          "Fetching reports with filters failed, retrying without filters:",
          e.message,
        );
        // Fallback query without term/year filters
        const { data, error } = await supabaseAdmin
          .from("reports")
          .select("*, generated_by:generated_by(full_name)")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        reports = data;
      }

      res.json(reports);
    } catch (error: any) {
      console.error("Get Reports Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/reports
router.post(
  "/reports",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const user = (req as any).user;
    const { title, type, description } = req.body;

    try {
      // Get current term/year
      const settings = await ensureSchoolSettings(schoolId);
      const academicYear =
        settings?.academic_year || new Date().getFullYear().toString();
      const term = settings?.current_term || "Term 1";

      // 1. Create Report Record
      const { data, error } = await supabaseAdmin
        .from("reports")
        .insert({
          school_id: schoolId,
          title,
          type,
          generated_by: user.id,
          status: "Ready", // Simulate instant generation
          file_url: null, // No actual file for now
          created_at: new Date(),
          academic_year: academicYear,
          term: term,
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error: any) {
      console.error("Create Report Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// DELETE /api/school/reports/:id
router.delete(
  "/reports/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;

    try {
      const { error } = await supabaseAdmin
        .from("reports")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
      res.json({ message: "Report deleted successfully" });
    } catch (error: any) {
      console.error("Delete Report Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// GET /api/school/reports/live-stats
router.get(
  "/reports/live-stats",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { term, academic_year, examType } = req.query;

    const isAdmin = ADMIN_ROLES.includes(profile.role) || (profile.secondary_role && ADMIN_ROLES.includes(profile.secondary_role));
    const isTeacher = (profile.role === 'teacher' || profile.secondary_role === 'teacher') && !isAdmin;

    let teacherClassIds: string[] = [];
    if (isTeacher) {
      const { data: tc } = await supabaseAdmin
        .from("class_subjects")
        .select("class_id")
        .eq("teacher_id", profile.id);
      teacherClassIds = Array.from(new Set(tc?.map(t => t.class_id) || []));
      
      if (teacherClassIds.length === 0) {
        return res.json({ summary: {}, performance: {}, finance: {} });
      }
    }

    try {
      // 1. Student & Staff Stats - FETCH ALL ROBUSTLY
      let schoolProfilesQuery = supabaseAdmin
        .from("profiles")
        .select(`
          id, 
          role, 
          gender, 
          enrollment_status, 
          full_name, 
          grade,
          department,
          enrollments(class_id, classes(name))
        `)
        .eq("school_id", schoolId);

      if (isTeacher) {
        const { data: enrollments } = await supabaseAdmin
          .from("enrollments")
          .select("student_id")
          .in("class_id", teacherClassIds);
        const studentIds = enrollments?.map(e => e.student_id) || [];
        if (studentIds.length > 0) {
          schoolProfilesQuery = schoolProfilesQuery.in("id", studentIds);
        } else {
          // If no students, still filter by role so staff count is 0 or filtered
          schoolProfilesQuery = schoolProfilesQuery.eq("id", "none"); 
        }
      }

      const schoolProfilesData = await fetchAll(schoolProfilesQuery);

      const studentClassMap = new Map();
      const studentProfileMap = new Map();
      schoolProfilesData?.forEach((p: any) => {
        if (p.role === "student") {
          const enrollment = p.enrollments && Array.isArray(p.enrollments) && p.enrollments.length > 0 ? p.enrollments[0] : null;
          const className = (enrollment as any)?.classes?.name || p.grade || "Unassigned";
          studentClassMap.set(p.id, className);
          studentProfileMap.set(p.id, p);
        }
      });

      // Fetch grading scales for label mapping
      const scalesQuery = supabaseAdmin
        .from("grading_scales")
        .select("grade, min_percentage, max_percentage, description")
        .eq("school_id", schoolId);
      
      const scales = await fetchAll(scalesQuery);

      // Fetch classes to map UUIDs to names
      const schoolClassesQuery = supabaseAdmin
        .from("classes")
        .select("id, name, school_id")
        .eq("school_id", schoolId);
      
      const schoolClasses = await fetchAll(schoolClassesQuery);

      const classIdToName: any = {};
      const schoolClassIds: string[] = [];
      schoolClasses?.forEach((c: any) => {
        classIdToName[c.id] = c.name;
        schoolClassIds.push(c.id);
      });

      const classNameToId: any = {};
      schoolClasses?.forEach((c: any) => (classNameToId[c.name] = c.id));

      // Fetch class_subjects for teacher mapping
      const classTeacherMapQuery = supabaseAdmin
        .from("class_subjects")
        .select(`
          class_id,
          subject_id,
          teacher_id,
          profiles!teacher_id(full_name, id)
        `);
      
      const rawClassTeacherMap = await fetchAll(classTeacherMapQuery);
      
      // Filter manually to avoid PGRST200 join error
      const classTeacherMap = rawClassTeacherMap?.filter((ct: any) => schoolClassIds.includes(ct.class_id)) || [];

      const students =
        schoolProfilesData?.filter((p: any) => p.role === "student") || [];
      const staff =
        schoolProfilesData?.filter(
          (p: any) => p.role === "teacher" || p.role === "staff",
        ) || [];
      const totalStudents = students.length;
      const totalStaff = staff.length;

      const maleStudents = students.filter(
        (s: any) => s.gender?.toLowerCase() === "male",
      ).length;
      const femaleStudents = students.filter(
        (s: any) => s.gender?.toLowerCase() === "female",
      ).length;
      const otherGender = totalStudents - maleStudents - femaleStudents;

      // 2. Attendance Summary
      let attendanceQuery = supabaseAdmin
        .from("attendance")
        .select("status")
        .eq("school_id", schoolId);

      if (isTeacher) {
        attendanceQuery = attendanceQuery.in("class_id", teacherClassIds);
      }

      if (term && term !== "All") attendanceQuery = attendanceQuery.eq("term", term);
      if (academic_year && academic_year !== "All")
        attendanceQuery = attendanceQuery.eq("academic_year", academic_year);

      const attendance = await fetchAll(attendanceQuery);

      const present =
        attendance?.filter((a: any) => a.status === "present").length || 0;
      const absent =
        attendance?.filter((a: any) => a.status === "absent").length || 0;
      const late = attendance?.filter((a: any) => a.status === "late").length || 0;

      // 3. Academic Performance - ROBUST REAL-TIME DATA

      // Fetch grades from student_grades table (ONLY Submitted and Published)
      let gradesQuery = supabaseAdmin
        .from("student_grades")
        .select(`
          percentage,
          grade,
          student_id,
          term,
          academic_year,
          exam_type,
          status,
          subjects(name, department, id)
        `)
        .eq("school_id", schoolId)
        .in("status", ["Submitted", "Published"]);

      if (isTeacher) {
        // Fetch student IDs again if needed, or use the ones from profiles
        const studentIds = Array.from(studentProfileMap.keys());
        if (studentIds.length > 0) {
          gradesQuery = gradesQuery.in("student_id", studentIds);
        } else {
          gradesQuery = gradesQuery.eq("student_id", "none");
        }
      }

      if (term && term !== "All") gradesQuery = gradesQuery.eq("term", term);
      if (academic_year && academic_year !== "All") gradesQuery = academic_year === "All" ? gradesQuery : gradesQuery.eq("academic_year", academic_year);
      
      const grades = await fetchAll(gradesQuery);

      // Map profiles to student_grades
      const mappedGrades = grades?.map((g: any) => ({
        ...g,
        profiles: studentProfileMap.get(g.student_id)
      })) || [];

      // Fetch graded assignment submissions for real-time analytics
      const realTimeSubmissionsQuery = supabaseAdmin
        .from("submissions")
        .select(`
          score,
          max_score,
          student_id,
          assignments!inner(id, type, subject_id, class_id, term, academic_year)
        `)
        .eq("status", "graded");
      
      const realTimeSubmissions = await fetchAll(realTimeSubmissionsQuery);

      // Fetch subjects for real-time mapping
      const schoolSubjectsQuery = supabaseAdmin
        .from("subjects")
        .select("id, name, department")
        .eq("school_id", schoolId);
      
      const schoolSubjects = await fetchAll(schoolSubjectsQuery);

      const submissionGrades = realTimeSubmissions
        ?.filter(s => {
          const a = s.assignments as any;
          const tMatch = !term || term === "All" || String(a.term).toLowerCase() === String(term).toLowerCase();
          const yMatch = !academic_year || academic_year === "All" || String(a.academic_year).toLowerCase() === String(academic_year).toLowerCase();
          const isOurSchool = studentProfileMap.has(s.student_id);
          return tMatch && yMatch && isOurSchool;
        })
        .map(s => {
          const a = s.assignments as any;
          let percentage = s.max_score > 0 ? (s.score / s.max_score) * 100 : 0;
          if (percentage > 100) percentage = 100;
          if (percentage < 0) percentage = 0;
          
          const student = studentProfileMap.get(s.student_id);
          const subject = schoolSubjects?.find(sub => sub.id === a.subject_id);
          
          return {
            percentage,
            student_id: s.student_id,
            term: a.term || term,
            academic_year: a.academic_year || academic_year,
            exam_type: a.type || "Assignment",
            profiles: student,
            subjects: subject || { id: a.subject_id, name: "Assignment", department: "General" }
          };
        }) || [];

      const combinedGrades = [...mappedGrades, ...submissionGrades];

      const filteredGrades = combinedGrades?.filter((g) => {
        // MUST ONLY BE FROM THIS SCHOOL
        if (!studentProfileMap.has(g.student_id)) return false;

        if (examType && examType !== "All") {
          const isMatch = String(g.exam_type).toLowerCase() === String(examType).toLowerCase();
          if (!isMatch) return false;
        }
        return true;
      }) || [];

      console.log(`[LiveStats] aggregated: ${grades?.length || 0} gradebook, ${submissionGrades.length} assignments. Total: ${filteredGrades.length}`);

      // Grouping and Aggregation
      const classData: any = {};
      const subjectData: any = {};
      const departmentData: any = {};
      const studentPerformance: any = {};
      const teacherPerformance: any = {};
      const genderPerformance: any = {
        male: { total: 0, count: 0, grades: {} },
        female: { total: 0, count: 0, grades: {} },
        other: { total: 0, count: 0, grades: {} },
      };
      const gradeDistribution: any = { school: {}, byClass: {}, bySubject: {} };

      const getGradeLabel = (pct: number) => {
        if (!scales || scales.length === 0) return "N/A";
        const scale = scales.find((s: any) => pct >= s.min_percentage && pct <= s.max_percentage);
        return scale ? scale.description || scale.grade : "N/A";
      };

      filteredGrades.forEach((g: any) => {
        // Enforce maximum percentage of 100
        let percentage = Number(g.percentage) || 0;
        if (percentage > 100) percentage = 100;
        if (percentage < 0) percentage = 0;

        // Skip absent students from all aggregated performance metrics
        if (g.grade === "ABSENT") return;
        
        const gradeLabel = getGradeLabel(percentage);

        gradeDistribution.school[gradeLabel] = (gradeDistribution.school[gradeLabel] || 0) + 1;

        const gender = (g.profiles?.gender || "other").toLowerCase();
        const targetGender = gender === "male" || gender === "female" ? gender : "other";
        genderPerformance[targetGender].total += percentage;
        genderPerformance[targetGender].count += 1;
        genderPerformance[targetGender].grades[gradeLabel] = (genderPerformance[targetGender].grades[gradeLabel] || 0) + 1;

        const className = studentClassMap.get(g.student_id) || "Unassigned";
        if (!classData[className]) classData[className] = { total: 0, count: 0 };
        classData[className].total += percentage;
        classData[className].count += 1;

        if (!gradeDistribution.byClass[className]) gradeDistribution.byClass[className] = {};
        gradeDistribution.byClass[className][gradeLabel] = (gradeDistribution.byClass[className][gradeLabel] || 0) + 1;

        const subjectName = g.subjects?.name || "Unknown";
        if (!subjectData[subjectName]) subjectData[subjectName] = { total: 0, count: 0, id: g.subjects?.id };
        subjectData[subjectName].total += percentage;
        subjectData[subjectName].count += 1;

        if (!gradeDistribution.bySubject[subjectName]) gradeDistribution.bySubject[subjectName] = {};
        gradeDistribution.bySubject[subjectName][gradeLabel] = (gradeDistribution.bySubject[subjectName][gradeLabel] || 0) + 1;

        const deptName = g.subjects?.department || "General";
        if (!departmentData[deptName]) departmentData[deptName] = { total: 0, count: 0 };
        departmentData[deptName].total += percentage;
        departmentData[deptName].count += 1;

        const studentId = g.student_id;
        if (studentId) {
          if (!studentPerformance[studentId]) {
            studentPerformance[studentId] = {
              id: studentId,
              name: g.profiles?.full_name || "Unknown Student",
              class: className,
              total: 0,
              count: 0,
            };
          }
          studentPerformance[studentId].total += percentage;
          studentPerformance[studentId].count += 1;
        }

        const teacherMatch = classTeacherMap?.find(m => m.classes?.name === className && m.subject_id === g.subjects?.id);
        if (teacherMatch && teacherMatch.teacher_id) {
          const tId = teacherMatch.teacher_id;
          if (!teacherPerformance[tId]) {
            teacherPerformance[tId] = {
              id: tId,
              name: teacherMatch.profiles?.full_name || "Unknown Teacher",
              total: 0,
              count: 0,
              grades: {},
              details: { classes: new Set(), subjects: new Set(), breakdown: {} }
            };
          }
          teacherPerformance[tId].total += percentage;
          teacherPerformance[tId].count += 1;
          teacherPerformance[tId].grades[gradeLabel] = (teacherPerformance[tId].grades[gradeLabel] || 0) + 1;
          teacherPerformance[tId].details.classes.add(className);
          teacherPerformance[tId].details.subjects.add(subjectName);
          const detailKey = `${className} - ${subjectName}`;
          if (!teacherPerformance[tId].details.breakdown[detailKey]) teacherPerformance[tId].details.breakdown[detailKey] = { total: 0, count: 0 };
          teacherPerformance[tId].details.breakdown[detailKey].total += percentage;
          teacherPerformance[tId].details.breakdown[detailKey].count += 1;
        }
      });

      const studentStats = Object.values(studentPerformance)
        .map((s: any) => ({ ...s, average: Math.round(s.total / s.count) }))
        .sort((a: any, b: any) => b.average - a.average);

      const topStudents = studentStats.filter((s) => s.average >= 70).slice(0, 10);
      const lowStudents = [...studentStats].reverse().slice(0, 10);

      const performanceByClass = Object.entries(classData)
        .map(([name, stats]: any) => ({ name, average: Math.round(stats.total / stats.count) }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const performanceBySubject = Object.entries(subjectData)
        .map(([name, stats]: any) => ({ name, average: Math.round(stats.total / stats.count) }))
        .sort((a, b) => b.average - a.average)
        .slice(0, 10);

      const performanceByDept = Object.entries(departmentData)
        .map(([name, stats]: any) => ({ name, average: Math.round(stats.total / stats.count) }))
        .sort((a, b) => b.average - a.average);

      const teacherStats = Object.values(teacherPerformance)
        .map((t: any) => ({
          ...t,
          average: Math.round(t.total / t.count),
          workload: {
            classesCount: t.details.classes.size,
            subjectsCount: t.details.subjects.size,
            classes: Array.from(t.details.classes),
            subjects: Array.from(t.details.subjects)
          },
          breakdown: Object.entries(t.details.breakdown).map(([key, stats]: any) => ({
            name: key,
            average: Math.round(stats.total / stats.count),
            count: stats.count
          })).sort((a, b) => b.average - a.average)
        }))
        .sort((a: any, b: any) => b.average - a.average);

      // Subject rankings by class
      const subjectRankingsByClass: any = {};
      Object.keys(gradeDistribution.byClass).forEach((cls) => {
        const clsGrades = filteredGrades.filter(
          (g) => (studentClassMap.get(g.student_id) || "Unassigned") === cls,
        );
        const clsSubjects: any = {};
        clsGrades.forEach((g) => {
          const sName = g.subjects?.name || "Unknown";
          if (!clsSubjects[sName]) clsSubjects[sName] = { total: 0, count: 0 };
          let percentage = Number(g.percentage) || 0;
          if (percentage > 100) percentage = 100;
          if (percentage < 0) percentage = 0;
          clsSubjects[sName].total += percentage;
          clsSubjects[sName].count += 1;
        });

        subjectRankingsByClass[cls] = Object.entries(clsSubjects)
          .map(([name, stats]: any) => ({
            name,
            average: Math.round(stats.total / stats.count),
          }))
          .sort((a, b) => b.average - a.average);
      });

      // 4. Financial Summary
      let financeQuery = supabaseAdmin
        .from("finance_records")
        .select("amount, type, category, date, term, academic_year")
        .eq("school_id", schoolId);

      if (term) financeQuery = financeQuery.eq("term", term);
      if (academic_year)
        financeQuery = financeQuery.eq("academic_year", academic_year);

      const { data: finance } = await financeQuery;

      const incomeRecords = finance?.filter((f) => f.type === "income") || [];
      const expenseRecords = finance?.filter((f) => f.type === "expense") || [];

      const totalIncome = incomeRecords.reduce(
        (sum, f) => sum + (f.amount || 0),
        0,
      );
      const totalExpense = expenseRecords.reduce(
        (sum, f) => sum + (f.amount || 0),
        0,
      );

      const incomeByCategory: any = {};
      incomeRecords.forEach((r) => {
        incomeByCategory[r.category] =
          (incomeByCategory[r.category] || 0) + (r.amount || 0);
      });

      const expenseByCategory: any = {};
      expenseRecords.forEach((r) => {
        expenseByCategory[r.category] =
          (expenseByCategory[r.category] || 0) + (r.amount || 0);
      });

      // 5. Staff Metrics
      const teachers = staff.filter((s) => s.role === "teacher");
      const nonTeaching = staff.filter((s) => s.role !== "teacher");

      const { data: teacherProfiles } = await supabaseAdmin
        .from("profiles")
        .select("department")
        .eq("school_id", schoolId)
        .eq("role", "teacher");

      const teacherDepts: any = {};
      teacherProfiles?.forEach((p) => {
        const dept = p.department || "General";
        teacherDepts[dept] = (teacherDepts[dept] || 0) + 1;
      });

      res.json({
        summary: {
          totalStudents,
          totalStaff,
          totalTeachers: teachers.length,
          attendanceRate: attendance?.length
            ? Math.round((present / attendance.length) * 100)
            : 0,
          averageGrade: filteredGrades.length
            ? Math.round(
                filteredGrades.reduce(
                  (sum, g) => {
                    let p = Number(g.percentage) || 0;
                    if (p > 100) p = 100;
                    if (p < 0) p = 0;
                    return sum + p;
                  },
                  0,
                ) / filteredGrades.length,
              )
            : 0,
          netBalance: totalIncome - totalExpense,
        },
        demographics: [
          { name: "Male", value: maleStudents },
          { name: "Female", value: femaleStudents },
          { name: "Other", value: otherGender },
        ],
        attendance: [
          { name: "Present", value: present },
          { name: "Absent", value: absent },
          { name: "Late", value: late },
        ],
        performance: {
          byClass: performanceByClass,
          bySubject: performanceBySubject,
          byDepartment: performanceByDept,
          topStudents,
          lowStudents,
          teacherPerformance: teacherStats,
          gradeDistribution,
          subjectRankingsByClass,
          genderPerformance: Object.entries(genderPerformance).map(([name, stats]: any) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            average: stats.count > 0 ? Math.round(stats.total / stats.count) : 0,
            count: stats.count,
            grades: stats.grades
          })),
        },
        finance: {
          overview: [
            { name: "Income", amount: totalIncome },
            { name: "Expense", amount: totalExpense },
          ],
          incomeBreakdown: Object.entries(incomeByCategory).map(
            ([name, value]) => ({ name, value }),
          ),
          expenseBreakdown: Object.entries(expenseByCategory).map(
            ([name, value]) => ({ name, value }),
          ),
        },
        staff: {
          distribution: [
            { name: "Teaching", value: teachers.length },
            { name: "Non-Teaching", value: nonTeaching.length },
          ],
          departments: Object.entries(teacherDepts).map(([name, value]) => ({
            name,
            value,
          })),
        },
      });
    } catch (error: any) {
      console.error("Live Stats Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// GET /api/school/reports/results-analysis
router.get(
  "/reports/results-analysis",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { term, academic_year, examType, gradeLevel, classId, subjectId } = req.query;

    const isAdmin = ADMIN_ROLES.includes(profile.role) || (profile.secondary_role && ADMIN_ROLES.includes(profile.secondary_role));
    const isTeacher = (profile.role === 'teacher' || profile.secondary_role === 'teacher') && !isAdmin;

    let teacherClassIds: string[] = [];
    if (isTeacher) {
      const { data: tc } = await supabaseAdmin
        .from("class_subjects")
        .select("class_id")
        .eq("teacher_id", profile.id);
      teacherClassIds = Array.from(new Set(tc?.map(t => t.class_id) || []));
      
      if (teacherClassIds.length === 0) {
        return res.json({ scales: [], analysis: [] });
      }
    }

    try {
      // 1. Fetch Grading Scales (Custom Scale)
      const { data: scales, error: scalesError } = await supabaseAdmin
        .from("grading_scales")
        .select("*")
        .eq("school_id", schoolId)
        .order("min_percentage", { ascending: false });

      if (scalesError) throw scalesError;

      // 2. Fetch Subjects
      let teacherSubjectIds: string[] = [];
      if (isTeacher) {
        const { data: ts } = await supabaseAdmin
          .from("class_subjects")
          .select("subject_id")
          .eq("teacher_id", profile.id);
        teacherSubjectIds = Array.from(new Set(ts?.map(t => t.subject_id) || []));
        
        if (teacherSubjectIds.length === 0) {
          return res.json({ scales, analysis: [] });
        }
      }

      let subjectsQuery = supabaseAdmin
        .from("subjects")
        .select("*")
        .eq("school_id", schoolId);

      if (subjectId && String(subjectId).toLowerCase() !== "all") {
        subjectsQuery = subjectsQuery.eq("id", subjectId);
      } else if (isTeacher) {
        subjectsQuery = subjectsQuery.in("id", teacherSubjectIds);
      }

      const { data: subjects, error: subjectsError } = await subjectsQuery.order("name", { ascending: true });

      if (subjectsError) throw subjectsError;

      // 3. Fetch Students (Filtered by Grade Level if provided)
      let studentsQuery = supabaseAdmin
        .from("profiles")
        .select("id, gender, grade")
        .eq("school_id", schoolId)
        .eq("role", "student");

      if (gradeLevel && String(gradeLevel).toLowerCase() !== "all") {
        studentsQuery = studentsQuery.ilike("grade", `%${gradeLevel}%`);
      }
      
      let enrollmentsQuery = supabaseAdmin
        .from("enrollments")
        .select("student_id, class_id")
        .eq("academic_year", academic_year || new Date().getFullYear().toString());

      if (classId && String(classId).toLowerCase() !== "all") {
        enrollmentsQuery = enrollmentsQuery.eq("class_id", classId);
      } else if (isTeacher) {
        enrollmentsQuery = enrollmentsQuery.in("class_id", teacherClassIds);
      }

      const enrollmentData = await fetchAll(enrollmentsQuery);
      const classStudentIds = enrollmentData?.map(e => e.student_id) || [];
      
      if ((classId && String(classId).toLowerCase() !== "all") || isTeacher) {
        if (classStudentIds.length === 0) {
          return res.json({ scales, analysis: [] });
        }
        studentsQuery = studentsQuery.in("id", classStudentIds);
      }

      const studentsData = await fetchAll(studentsQuery);

      if (!studentsData || studentsData.length === 0) {
        return res.json({ scales, analysis: [] });
      }

      const studentMap = new Map();
      studentsData.forEach((s: any) => {
        studentMap.set(s.id, {
          gender: (s.gender || "Other").toLowerCase(),
        });
      });

      const studentIds = Array.from(studentMap.keys());

      // 4. Fetch Grades (Fetch all for school and filter in-memory to avoid URI length issues)
      let gradesQuery = supabaseAdmin
        .from("student_grades")
        .select("student_id, subject_id, percentage, grade")
        .eq("school_id", schoolId)
        .in("status", ["Submitted", "Published"]);

      if (term && term !== "All") gradesQuery = gradesQuery.eq("term", term);
      if (academic_year && academic_year !== "All") gradesQuery = gradesQuery.eq("academic_year", academic_year);
      if (examType && examType !== "All") gradesQuery = gradesQuery.eq("exam_type", examType);

      const allGrades = await fetchAll(gradesQuery);
      const studentIdsSet = new Set(studentIds);
      const gradesData = allGrades.filter((g: any) => studentIdsSet.has(g.student_id));

      // 5. Initialize Analysis
      const analysis: Record<string, any> = {};
      subjects.forEach((subj) => {
        analysis[subj.id] = {
          subjectName: subj.name,
          subjectCode: subj.code,
          reg: { f: 0, m: 0, tot: 0 },
          wrote: { f: 0, m: 0, tot: 0 },
          abs: { f: 0, m: 0, tot: 0 },
          grades: {},
          totalPasses: { f: 0, m: 0, tot: 0 },
          percentagePass: { f: 0, m: 0, tot: 0 },
          totalFails: { f: 0, m: 0, tot: 0 },
          percentageFail: { f: 0, m: 0, tot: 0 }
        };
        scales.forEach((scale: any) => {
          analysis[subj.id].grades[scale.grade] = { f: 0, m: 0, tot: 0 };
        });
      });

      // 6. Map Enrollments to track which subjects are offered to which students
      // Filtering by school_id via profile join to avoid large studentIds list
      let allEnrollmentsQuery = supabaseAdmin
        .from("enrollments")
        .select("student_id, class_id, profiles!inner(school_id)")
        .eq("profiles.school_id", schoolId)
        .eq("academic_year", academic_year || new Date().getFullYear().toString());
      const allEnrollments = await fetchAll(allEnrollmentsQuery);

      const enrollments = allEnrollments?.filter((e: any) => studentIdsSet.has(e.student_id)) || [];

      const studentClassMap = new Map();
      enrollments?.forEach(e => studentClassMap.set(e.student_id, e.class_id));

      const relevantClassIds = Array.from(new Set(enrollments?.map(e => e.class_id).filter(Boolean) || []));
      
      let classSubjectsQuery = supabaseAdmin
        .from("class_subjects")
        .select("class_id, subject_id");
      
      if (relevantClassIds.length > 0) {
        classSubjectsQuery = classSubjectsQuery.in("class_id", relevantClassIds);
      }
      
      const classSubjects = await fetchAll(classSubjectsQuery);

      const classToSubjects = new Map();
      classSubjects?.forEach(cs => {
        if (!classToSubjects.has(cs.class_id)) classToSubjects.set(cs.class_id, new Set());
        classToSubjects.get(cs.class_id).add(cs.subject_id);
      });

      // 7. Calculate Counts
      studentsData.forEach((s: any) => {
        const gender = (s.gender || "Other").toLowerCase();
        const classId = studentClassMap.get(s.id);
        const offeredSubjects = classId ? classToSubjects.get(classId) : null;

        subjects.forEach((subj) => {
          const hasGrade = gradesData?.some(g => g.student_id === s.id && g.subject_id === subj.id);
          const isOffered = offeredSubjects?.has(subj.id);

          if (isOffered || hasGrade) {
            analysis[subj.id].reg.tot++;
            if (gender === 'male') analysis[subj.id].reg.m++;
            else if (gender === 'female') analysis[subj.id].reg.f++;
          }
        });
      });

      gradesData?.forEach((g: any) => {
        const student = studentMap.get(g.student_id);
        if (!student || !analysis[g.subject_id]) return;

        const gender = student.gender;
        const percentage = Number(g.percentage) || 0;
        
        // Skip students who were absent for this specific subject
        if (g.grade === "ABSENT") return;
        
        analysis[g.subject_id].wrote.tot++;
        if (gender === 'male') analysis[g.subject_id].wrote.m++;
        else if (gender === 'female') analysis[g.subject_id].wrote.f++;

        const scale = scales.find((s: any) => percentage >= s.min_percentage && percentage <= s.max_percentage);
        if (scale) {
          analysis[g.subject_id].grades[scale.grade].tot++;
          if (gender === 'male') analysis[g.subject_id].grades[scale.grade].m++;
          else if (gender === 'female') analysis[g.subject_id].grades[scale.grade].f++;

          const isFail = (scale.description?.toLowerCase().includes('fail')) || 
                         ['9', 'U9', 'U', 'F', 'E'].includes(String(scale.grade).toUpperCase());
          
          if (!isFail) {
             analysis[g.subject_id].totalPasses.tot++;
             if (gender === 'male') analysis[g.subject_id].totalPasses.m++;
             else if (gender === 'female') analysis[g.subject_id].totalPasses.f++;
          } else {
             analysis[g.subject_id].totalFails.tot++;
             if (gender === 'male') analysis[g.subject_id].totalFails.m++;
             else if (gender === 'female') analysis[g.subject_id].totalFails.f++;
          }
        }
      });

      // Final processing
      const resultAnalysis = Object.values(analysis)
        .filter((a: any) => a.reg.tot > 0)
        .map(a => {
          a.abs.tot = Math.max(0, a.reg.tot - a.wrote.tot);
          a.abs.f = Math.max(0, a.reg.f - a.wrote.f);
          a.abs.m = Math.max(0, a.reg.m - a.wrote.m);
          a.percentagePass.tot = a.wrote.tot > 0 ? Math.round((a.totalPasses.tot / a.wrote.tot) * 100) : 0;
          a.percentagePass.f = a.wrote.f > 0 ? Math.round((a.totalPasses.f / a.wrote.f) * 100) : 0;
          a.percentagePass.m = a.wrote.m > 0 ? Math.round((a.totalPasses.m / a.wrote.m) * 100) : 0;
          a.percentageFail.tot = a.wrote.tot > 0 ? Math.round((a.totalFails.tot / a.wrote.tot) * 100) : 0;
          a.percentageFail.f = a.wrote.f > 0 ? Math.round((a.totalFails.f / a.wrote.f) * 100) : 0;
          a.percentageFail.m = a.wrote.m > 0 ? Math.round((a.totalFails.m / a.wrote.m) * 100) : 0;
          return a;
        });

      res.json({ scales, analysis: resultAnalysis });
    } catch (error: any) {
      console.error("Results Analysis Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/school/reports/master-scoresheet
router.get(
  "/reports/master-scoresheet",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { term, academic_year, examType, classId, gradeLevel, subjectId } = req.query;

    const isAdmin = ADMIN_ROLES.includes(profile.role) || (profile.secondary_role && ADMIN_ROLES.includes(profile.secondary_role));
    const isTeacher = (profile.role === 'teacher' || profile.secondary_role === 'teacher') && !isAdmin;

    let teacherClassIds: string[] = [];
    if (isTeacher) {
      const { data: tc } = await supabaseAdmin
        .from("class_subjects")
        .select("class_id")
        .eq("teacher_id", profile.id);
      teacherClassIds = Array.from(new Set(tc?.map(t => t.class_id) || []));
      
      if (teacherClassIds.length === 0) {
        return res.json({ subjects: [], students: [], metadata: { total: 0, page: 1, pageSize: 50, totalPages: 0 }, scales: [] });
      }
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const isExport = req.query.export === "true";

    if (!term || !academic_year || !examType) {
      return res.status(400).json({ message: "Term, Academic Year, and Exam Type are required" });
    }

    try {
      // 0. Fetch Grading Scales
      const { data: scales } = await supabaseAdmin
        .from("grading_scales")
        .select("*")
        .eq("school_id", schoolId)
        .order("min_percentage", { ascending: false });

      // 1. Fetch ALL Students enrolled in this school for the selected year
      const enrollmentsQuery = supabaseAdmin
        .from("enrollments")
        .select(`
          student_id,
          class_id,
          classes(name),
          profiles!inner(id, full_name, student_number, grade, enrollment_status)
        `)
        .eq("profiles.school_id", schoolId)
        .eq("academic_year", academic_year)
        .eq("profiles.role", "student")
        .eq("profiles.enrollment_status", "Active");

      const enrollmentsData = await fetchAll(enrollmentsQuery);
      
      const studentsData = enrollmentsData.map((e: any) => ({
        ...e.profiles,
        enrollments: [{ class_id: e.class_id, classes: e.classes }]
      }));

      // 2. Filter students by class if requested
      let filteredStudents = studentsData;
      if (classId && classId !== "all") {
        filteredStudents = studentsData.filter((s: any) => {
          const enrollment = s.enrollments?.[0];
          return enrollment?.class_id === classId;
        });
      } else if (isTeacher) {
        filteredStudents = studentsData.filter((s: any) => {
          const enrollment = s.enrollments?.[0];
          return teacherClassIds.includes(enrollment?.class_id);
        });
      }

      if (gradeLevel && gradeLevel !== "all") {
        filteredStudents = filteredStudents.filter((s: any) => {
           // Handle cases where grade is stored differently
           return s.grade === gradeLevel || s.grade === `Grade ${gradeLevel}`;
        });
      }

      const totalStudents = filteredStudents.length;
      if (totalStudents === 0) {
        return res.json({ subjects: [], students: [], metadata: { total: 0, page, pageSize: limit, totalPages: 0 } });
      }

      const studentIdsSet = new Set(filteredStudents.map((s: any) => s.id));

      // 3. One efficient query to fetch ALL grades for the school/term/exam
      // Joining subjects(name) to get header information in one pass
      const gradesQuery = supabaseAdmin
        .from("student_grades")
        .select(`
          percentage,
          grade,
          student_id,
          subject_id,
          subjects(name, code)
        `)
        .eq("school_id", schoolId)
        .eq("term", term)
        .eq("academic_year", academic_year)
        .eq("exam_type", examType)
        .in("status", ["Submitted", "Published"]);

      let allGradesData = await fetchAll(gradesQuery);

      let teacherSubjectIds: string[] = [];
      if (isTeacher) {
        const { data: ts } = await supabaseAdmin
          .from("class_subjects")
          .select("subject_id")
          .eq("teacher_id", profile.id);
        teacherSubjectIds = Array.from(new Set(ts?.map(t => t.subject_id) || []));
      }

      if (subjectId && subjectId !== "all") {
        allGradesData = allGradesData.filter((g: any) => g.subject_id === subjectId);
      } else if (isTeacher) {
        allGradesData = allGradesData.filter((g: any) => teacherSubjectIds.includes(g.subject_id));
      }

      // 4. In-memory data aggregation
      const subjectMap = new Map();
      const studentPerformanceMap = new Map();

      allGradesData.forEach((g: any) => {
        // Only process grades for our filtered students
        if (!studentIdsSet.has(g.student_id)) return;

        // Collect unique subjects for headers
        if (g.subjects) {
          subjectMap.set(g.subject_id, g.subjects.name);
        }

        // Aggregate student scores
        const stats = studentPerformanceMap.get(g.student_id) || { total: 0, count: 0, grades: {} };
        // Skip absent students from performance aggregation
        if (g.grade === "ABSENT") return;

        const percentage = Number(g.percentage) || 0;
        stats.total += percentage;
        stats.count += 1;
        stats.grades[g.subject_id] = percentage;
        studentPerformanceMap.set(g.student_id, stats);
      });

      // 5. Build the Score Sheet Matrix and calculate global ranks
      const subjectsHeaders = Array.from(subjectMap.entries()).map(([id, name]) => ({ id, name }));
      const fullScoreSheet = filteredStudents.map((s: any) => {
        const perf = studentPerformanceMap.get(s.id) || { total: 0, count: 0, grades: {} };
        const enrollment = s.enrollments?.[0];
        const className = enrollment?.classes?.name || s.grade || "Unassigned";

        return {
          id: s.id,
          name: s.full_name,
          studentNumber: s.student_number,
          className: className,
          grades: perf.grades,
          total: Math.round(perf.total),
          average: perf.count > 0 ? Math.round((perf.total / perf.count) * 10) / 10 : 0,
          participationCount: perf.count
        };
      });

      // Sort results by average globally to determine correct rank
      fullScoreSheet.sort((a, b) => b.average - a.average);
      fullScoreSheet.forEach((s, idx) => {
        s.rank = idx + 1;
      });

      // 6. Paginate or serve full export
      const paginatedStudents = isExport ? fullScoreSheet : fullScoreSheet.slice((page - 1) * limit, page * limit);

      res.json({
        subjects: subjectsHeaders,
        students: paginatedStudents,
        metadata: {
          total: totalStudents,
          page: isExport ? 1 : page,
          pageSize: isExport ? totalStudents : limit,
          totalPages: isExport ? 1 : Math.ceil(totalStudents / limit)
        },
        scales: scales || []
      });
    } catch (error: any) {
      console.error("Master Score Sheet Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// --- ANNOUNCEMENT ENDPOINTS ---

// GET /api/school/announcements
router.get(
  "/announcements",
  requireSchoolRole([...ADMIN_ROLES, "teacher", "student"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id || profile.schools?.id;

    if (!schoolId) {
      console.warn(
        `[Announcements] No school ID found for user ${profile?.id}`,
      );
      return res.json([]);
    }

    console.log(
      `[Announcements] Fetching for School ID: ${schoolId}, User: ${profile.id}, Role: ${profile.role}`,
    );

    try {
      const { data, error } = await supabaseAdmin
        .from("announcements")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Announcements] DB Error:", error);
        throw error;
      }

      console.log(`[Announcements] Found ${data?.length || 0} announcements`);
      res.json(data || []);
    } catch (error: any) {
      console.error("Get Announcements Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/announcements
router.post(
  "/announcements",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id || profile.schools?.id;
    const user = (req as any).user;
    const { title, content, priority } = req.body;

    if (!schoolId) {
      return res
        .status(400)
        .json({ message: "School ID not found in profile" });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from("announcements")
        .insert({
          school_id: schoolId,
          title,
          content,
          author: profile.full_name || user.email,
          date: new Date().toISOString().split("T")[0],
          priority: priority || "Normal",
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error: any) {
      console.error("Create Announcement Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// DELETE /api/school/announcements/:id
router.delete(
  "/announcements/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id || profile.schools?.id;
    const { id } = req.params;

    if (!schoolId) {
      return res
        .status(400)
        .json({ message: "School ID not found in profile" });
    }

    try {
      const { error } = await supabaseAdmin
        .from("announcements")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
      res.json({ message: "Announcement deleted successfully" });
    } catch (error: any) {
      console.error("Delete Announcement Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// --- CALENDAR ENDPOINTS ---

// GET /api/school/calendar
router.get(
  "/calendar",
  requireSchoolRole([...ADMIN_ROLES, "teacher", "student"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;

    try {
      const { data: events, error } = await supabaseAdmin
        .from("calendar_events")
        .select("*")
        .eq("school_id", schoolId)
        .order("date", { ascending: true });

      if (error) throw error;
      res.json(events);
    } catch (error: any) {
      console.error("Get Calendar Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/calendar
router.post(
  "/calendar",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const user = (req as any).user;
    const { title, description, date, time, type, location } = req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from("calendar_events")
        .insert({
          school_id: schoolId,
          title,
          description,
          date,
          time,
          type,
          location,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error: any) {
      console.error("Create Calendar Event Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// PUT /api/school/calendar/:id
router.put(
  "/calendar/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;
    const { title, description, date, time, type, location } = req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from("calendar_events")
        .update({
          title,
          description,
          date,
          time,
          type,
          location,
        })
        .eq("id", id)
        .eq("school_id", schoolId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Update Calendar Event Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// DELETE /api/school/calendar/:id
router.delete(
  "/calendar/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;

    try {
      const { error } = await supabaseAdmin
        .from("calendar_events")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
      res.json({ message: "Event deleted successfully" });
    } catch (error: any) {
      console.error("Delete Calendar Event Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// --- SETTINGS ENDPOINTS ---

// POST /api/school/upload-asset
router.post(
  "/upload-asset",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { fileName, fileData, contentType } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({ message: "Missing file data" });
    }

    try {
      // Convert base64 to buffer if it's a data URL, otherwise assume it's just base64
      const base64Data = fileData.includes(",")
        ? fileData.split(",")[1]
        : fileData;
      const buffer = Buffer.from(base64Data, "base64");

      // Ensure the filename is prefixed with schoolId for isolation
      const finalFileName = fileName.startsWith(schoolId)
        ? fileName
        : `${schoolId}/${fileName}`;

      const { data, error } = await supabaseAdmin.storage
        .from("school-assets")
        .upload(finalFileName, buffer, {
          contentType: contentType || "image/png",
          upsert: true,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabaseAdmin.storage
        .from("school-assets")
        .getPublicUrl(finalFileName);

      res.json({ publicUrl });
    } catch (error: any) {
      console.error("Upload Asset Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// GET /api/school/settings
// Allow teachers and students to read settings too (for academic year context)
router.get(
  "/settings",
  requireSchoolRole([...ADMIN_ROLES, "teacher", "student"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;

    try {
      // Use ensureSchoolSettings to get (and optionally init) settings
      const school = await ensureSchoolSettings(schoolId);

      if (!school) {
        return res.status(404).json({ message: "School settings not found" });
      }

      res.json(school);
    } catch (error: any) {
      console.error("Get School Settings Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// PUT /api/school/settings
router.put(
  "/settings",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const {
      name,
      academic_year,
      current_term,
      exam_types,
      email,
      phone,
      address,
      province,
      district,
      website,
      signature_url,
      seal_url,
      coat_of_arms_url,
      logo_url,
      school_type,
      headteacher_name,
      headteacher_title,
      category,
      country,
    } = req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from("schools")
        .update({
          name,
          academic_year,
          current_term,
          exam_types,
          email,
          phone,
          address,
          province,
          district,
          website,
          signature_url,
          seal_url,
          logo_url,
          coat_of_arms_url,
          school_type,
          headteacher_name,
          headteacher_title,
          category,
          country,
          updated_at: new Date(),
        })
        .eq("id", schoolId)
        .select()
        .single();

      if (error) throw error;
      
      // Feature request: apply coat of arms to all schools globally if it was updated
      if (coat_of_arms_url !== undefined) {
        await supabaseAdmin
          .from("schools")
          .update({ coat_of_arms_url }); // updates all rows
      }
      
      res.json(data);
    } catch (error: any) {
      console.error("Update School Settings Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// --- NOTIFICATIONS ENDPOINTS ---

// GET /api/school/notifications
router.get(
  "/notifications",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const user = (req as any).user;

    try {
      const { data: notifications, error } = await supabaseAdmin
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      res.json(notifications);
    } catch (error: any) {
      console.error("Get Notifications Error:", error);
      res.status(500).json({ message: error.message, stack: error.stack });
    }
  },
);

// PUT /api/school/notifications/:id/read
router.put(
  "/notifications/:id/read",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { id } = req.params;

    try {
      const { error } = await supabaseAdmin
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Mark Notification Read Error:", error);
      res.status(500).json({ message: error.message, stack: error.stack });
    }
  },
);

// --- SEARCH ENDPOINT ---

// GET /api/school/search
router.get(
  "/search",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const query = req.query.q as string;

    if (!query || query.length < 2) {
      return res.json({ students: [], teachers: [] });
    }

    try {
      // Search students
      const { data: students } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, role, grade")
        .eq("school_id", schoolId)
        .eq("role", "student")
        .ilike("full_name", `%${query}%`)
        .limit(5);

      // Search teachers
      const { data: teachers } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, role, subject")
        .eq("school_id", schoolId)
        .eq("role", "teacher")
        .ilike("full_name", `%${query}%`)
        .limit(5);

      res.json({
        students: students || [],
        teachers: teachers || [],
      });
    } catch (error: any) {
      console.error("Search Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// --- GRADING SYSTEM ENDPOINTS ---

// GET /api/school/grading-scales
router.get(
  "/grading-scales",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;

    try {
      const { data, error } = await supabaseAdmin
        .from("grading_scales")
        .select("*")
        .eq("school_id", schoolId)
        .order("min_percentage", { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Get Grading Scales Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/grading-scales
router.post(
  "/grading-scales",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { grade, min_percentage, max_percentage, description } = req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from("grading_scales")
        .insert({
          school_id: schoolId,
          grade,
          min_percentage,
          max_percentage,
          description,
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error: any) {
      console.error("Create Grading Scale Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// PUT /api/school/grading-scales/:id
router.put(
  "/grading-scales/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;
    const { grade, min_percentage, max_percentage, description } = req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from("grading_scales")
        .update({
          grade,
          min_percentage,
          max_percentage,
          description,
          updated_at: new Date(),
        })
        .eq("id", id)
        .eq("school_id", schoolId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Update Grading Scale Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// DELETE /api/school/grading-scales/:id
router.delete(
  "/grading-scales/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;

    try {
      const { error } = await supabaseAdmin
        .from("grading_scales")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
      res.json({ message: "Grading scale deleted successfully" });
    } catch (error: any) {
      console.error("Delete Grading Scale Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// GET /api/school/grading-weights
router.get(
  "/grading-weights",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;

    try {
      const { data, error } = await supabaseAdmin
        .from("grading_weights")
        .select("*")
        .eq("school_id", schoolId)
        .order("weight_percentage", { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Get Grading Weights Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/grading-weights
router.post(
  "/grading-weights",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { assessment_type, weight_percentage } = req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from("grading_weights")
        .insert({
          school_id: schoolId,
          assessment_type,
          weight_percentage,
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error: any) {
      console.error("Create Grading Weight Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// PUT /api/school/grading-weights/:id
router.put(
  "/grading-weights/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;
    const { assessment_type, weight_percentage } = req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from("grading_weights")
        .update({
          assessment_type,
          weight_percentage,
          updated_at: new Date(),
        })
        .eq("id", id)
        .eq("school_id", schoolId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Update Grading Weight Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// DELETE /api/school/grading-weights/:id
router.delete(
  "/grading-weights/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;

    try {
      const { error } = await supabaseAdmin
        .from("grading_weights")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
      res.json({ message: "Grading weight deleted successfully" });
    } catch (error: any) {
      console.error("Delete Grading Weight Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// GET /api/school/grades/readiness
// Get unpublished grades for readiness report
router.get(
  "/grades/readiness",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { classId, subjectId, term, examType, academicYear } =
      req.query as Record<string, string>;

    if (!term || !examType || !academicYear) {
      return res
        .status(400)
        .json({ message: "Term, Exam Type and Academic Year are required" });
    }

    try {
      // 1. Get target class IDs for this school
      let targetClassIds: string[] = [];
      if (classId && classId !== "all") {
        targetClassIds = [classId];
      } else {
        const { data: schoolClasses } = await supabaseAdmin
          .from("classes")
          .select("id")
          .eq("school_id", schoolId);
        targetClassIds = (schoolClasses || []).map((c: any) => c.id);
      }

      if (targetClassIds.length === 0) return res.json([]);

      // 2. Get enrolled students per class
      const { data: enrollments } = await supabaseAdmin
        .from("enrollments")
        .select(
          "student_id, class_id, profiles!enrollments_student_id_fkey(full_name), classes(name)",
        )
        .in("class_id", targetClassIds)
        .eq("status", "Active");

      if (!enrollments || enrollments.length === 0) return res.json([]);

      // 3. Get subjects assigned to each class (via class_subjects)
      let classSubjectsQuery = supabaseAdmin
        .from("class_subjects")
        .select(
          `
        class_id,
        subject_id,
        teacher_id,
        subjects(name, code, head_teacher_id)
      `,
        )
        .in("class_id", targetClassIds);

      if (subjectId && subjectId !== "all") {
        classSubjectsQuery = classSubjectsQuery.eq("subject_id", subjectId);
      }

      const { data: classSubjectRows } = await classSubjectsQuery;

      if (!classSubjectRows || classSubjectRows.length === 0) {
        // No subjects assigned to classes — nothing to check
        return res.json([]);
      }

      // Collect all teacher IDs from class_subjects.teacher_id AND subjects.head_teacher_id as fallback
      // Also look up from assignments table which teacher made assignments for this class+subject
      const { data: assignmentTeacherRows } = await supabaseAdmin
        .from("assignments")
        .select("class_id, subject_id, teacher_id")
        .in("class_id", targetClassIds)
        .not("teacher_id", "is", null);

      // Build a map: "classId-subjectId" -> teacher_id, from assignments
      const assignmentTeacherMap = new Map<string, string>();
      for (const a of assignmentTeacherRows || []) {
        const k = `${a.class_id}-${a.subject_id}`;
        if (!assignmentTeacherMap.has(k))
          assignmentTeacherMap.set(k, a.teacher_id);
      }

      // Collect all unique teacher IDs (from class_subjects.teacher_id, head_teacher_id, and assignments)
      const allTeacherIds = [
        ...new Set([
          ...classSubjectRows.map((cs: any) => cs.teacher_id).filter(Boolean),
          ...classSubjectRows
            .map((cs: any) => {
              // Handle both single object and array returned by Supabase
              const subject = Array.isArray(cs.subjects)
                ? cs.subjects[0]
                : cs.subjects;
              return subject?.head_teacher_id;
            })
            .filter(Boolean),
          ...Array.from(assignmentTeacherMap.values()),
        ]),
      ];

      const teacherMap = new Map<string, string>();
      if (allTeacherIds.length > 0) {
        const { data: teachers } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name")
          .in("id", allTeacherIds);
        (teachers || []).forEach((t: any) => teacherMap.set(t.id, t.full_name));
      }

      // 4. Fetch all Published grades for these students in the term
      const studentIds = [
        ...new Set(enrollments.map((e: any) => e.student_id)),
      ];
      let publishedGradesQuery = supabaseAdmin
        .from("student_grades")
        .select("student_id, subject_id, status")
        .in("student_id", studentIds)
        .eq("term", term)
        .eq("exam_type", examType)
        .eq("academic_year", academicYear)
        .in("status", ["Published", "Submitted"]);

      if (subjectId && subjectId !== "all") {
        publishedGradesQuery = publishedGradesQuery.eq("subject_id", subjectId);
      }
      const { data: publishedGrades } = await publishedGradesQuery;

      // Build a Set of "studentId-subjectId" pairs that are already Published
      const publishedSet = new Set(
        (publishedGrades || []).map(
          (g: any) => `${g.student_id}-${g.subject_id}`,
        ),
      );

      // 5. Also fetch any grades that exist but are NOT Published (Draft / Submitted)
      let draftGradesQuery = supabaseAdmin
        .from("student_grades")
        .select("student_id, subject_id, status")
        .in("student_id", studentIds)
        .eq("term", term)
        .eq("exam_type", examType)
        .eq("academic_year", academicYear)
        .not("status", "in", '("Published","Submitted")');

      if (subjectId && subjectId !== "all") {
        draftGradesQuery = draftGradesQuery.eq("subject_id", subjectId);
      }
      const { data: draftGrades } = await draftGradesQuery;

      const draftMap = new Map(
        (draftGrades || []).map((g: any) => [
          `${g.student_id}-${g.subject_id}`,
          g.status,
        ]),
      );

      // 6. Build a lookup of class → subject rows
      const classSubjectMap = new Map<string, any[]>();
      for (const cs of classSubjectRows) {
        if (!classSubjectMap.has(cs.class_id))
          classSubjectMap.set(cs.class_id, []);
        classSubjectMap.get(cs.class_id)!.push(cs);
      }

      // 7. For each enrollment × subject, check if Published grade exists
      const missing: any[] = [];
      for (const enrollment of enrollments) {
        const subjects = classSubjectMap.get(enrollment.class_id) || [];
        for (const cs of subjects) {
          const key = `${enrollment.student_id}-${cs.subject_id}`;
          if (!publishedSet.has(key)) {
            const existingStatus = draftMap.get(key) || "Not Entered";
            const subject = Array.isArray(cs.subjects)
              ? cs.subjects[0]
              : cs.subjects;

            missing.push({
              studentId: enrollment.student_id,
              studentName:
                (enrollment as any).profiles?.full_name || "Unknown Student",
              className: (enrollment as any).classes?.name || "Unknown Class",
              subjectId: cs.subject_id,
              subjectName: subject?.name || "Unknown Subject",
              subjectCode: subject?.code || "",
              teacherName:
                teacherMap.get(cs.teacher_id) ||
                teacherMap.get(
                  assignmentTeacherMap.get(
                    `${enrollment.class_id}-${cs.subject_id}`,
                  ) || "",
                ) ||
                teacherMap.get(subject?.head_teacher_id) ||
                "Unassigned",
              status: existingStatus,
            });
          }
        }
      }

      res.json(missing);
    } catch (error: any) {
      console.error("Grades Readiness Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/grades/calculate
// Calculate grades for a class/term
router.post(
  "/grades/calculate",
  requireSchoolRole([...ADMIN_ROLES, "teacher"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const {
      classId,
      subjectId,
      term,
      examType,
      academicYear,
      skipCalculation,
      force,
    } = req.body;

    if (!term || !examType || !academicYear) {
      return res
        .status(400)
        .json({ message: "Term, Exam Type and Academic Year are required" });
    }

    try {
      // PRE-CHECK: Block calculation if any grades are not yet published
      // We run the identical checking logic as the /grades/readiness endpoint
      let targetClassIds: string[] = [];
      if (classId && classId !== "all") {
        targetClassIds = [classId];
      } else {
        const { data: schoolClasses } = await supabaseAdmin
          .from("classes")
          .select("id")
          .eq("school_id", schoolId);
        targetClassIds = (schoolClasses || []).map((c: any) => c.id);
      }

      let studentIds: string[] = [];
      let allEnrollments: any[] = [];

      if (targetClassIds.length > 0) {
        // 1. Get enrolled students
        const enrollmentsQuery = supabaseAdmin
          .from("enrollments")
          .select(
            "student_id, class_id, profiles!enrollments_student_id_fkey(full_name), classes(name)",
          )
          .in("class_id", targetClassIds)
          .eq("status", "Active");

        const enrollments = await fetchAll(enrollmentsQuery);

        if (enrollments && enrollments.length > 0) {
          allEnrollments = enrollments;
          studentIds = enrollments.map((e: any) => e.student_id);

          // 2. Get class subjects
          let classSubjectRowsQuery = supabaseAdmin
            .from("class_subjects")
            .select(
              `
              class_id,
              subject_id,
              teacher_id,
              subjects(name, code, head_teacher_id)
            `,
            )
            .in("class_id", targetClassIds);

          if (subjectId && subjectId !== "all") {
            classSubjectRowsQuery = classSubjectRowsQuery.eq(
              "subject_id",
              subjectId,
            );
          }
          const classSubjectRows = await fetchAll(classSubjectRowsQuery);

          if (classSubjectRows && classSubjectRows.length > 0) {
            // 3. Collect teacher IDs
            const assignmentTeacherRowsQuery = supabaseAdmin
              .from("assignments")
              .select("class_id, subject_id, teacher_id")
              .in("class_id", targetClassIds)
              .not("teacher_id", "is", null);

            const assignmentTeacherRows = await fetchAll(assignmentTeacherRowsQuery);

            const assignmentTeacherMap = new Map<string, string>();
            for (const a of assignmentTeacherRows || []) {
              assignmentTeacherMap.set(
                `${a.class_id}-${a.subject_id}`,
                a.teacher_id,
              );
            }

            const allTeacherIds = [
              ...new Set([
                ...classSubjectRows
                  .map((cs: any) => cs.teacher_id)
                  .filter(Boolean),
                ...classSubjectRows
                  .map((cs: any) => {
                    const subject = Array.isArray(cs.subjects)
                      ? cs.subjects[0]
                      : cs.subjects;
                    return subject?.head_teacher_id;
                  })
                  .filter(Boolean),
                ...Array.from(assignmentTeacherMap.values()),
              ]),
            ];

            const teacherMap = new Map<string, string>();
            if (allTeacherIds.length > 0) {
              const teachersQuery = supabaseAdmin
                .from("profiles")
                .select("id, full_name")
                .in("id", allTeacherIds);
              const teachers = await fetchAll(teachersQuery);
              (teachers || []).forEach((t: any) =>
                teacherMap.set(t.id, t.full_name),
              );
            }

            // 4. Fetch Published & Draft grades
            let publishedGradesQuery = supabaseAdmin
              .from("student_grades")
              .select("student_id, subject_id")
              .eq("school_id", schoolId)
              .eq("term", term)
              .eq("academic_year", academicYear)
              .in("status", ["Published", "Submitted"]);

            if (classId && classId !== "all") {
              publishedGradesQuery = publishedGradesQuery.in("student_id", studentIds);
            }

            if (subjectId && subjectId !== "all") {
              publishedGradesQuery = publishedGradesQuery.eq(
                "subject_id",
                subjectId,
              );
            }
            const publishedGrades = await fetchAll(publishedGradesQuery);

            const publishedSet = new Set(
              (publishedGrades || []).map(
                (g: any) => `${g.student_id}-${g.subject_id}`,
              ),
            );

            let draftGradesQuery = supabaseAdmin
              .from("student_grades")
              .select("student_id, subject_id, status")
              .eq("school_id", schoolId)
              .eq("term", term)
              .eq("academic_year", academicYear)
              .not("status", "in", '("Published","Submitted")');

            if (classId && classId !== "all") {
              draftGradesQuery = draftGradesQuery.in("student_id", studentIds);
            }

            if (subjectId && subjectId !== "all") {
              draftGradesQuery = draftGradesQuery.eq("subject_id", subjectId);
            }
            const draftGrades = await fetchAll(draftGradesQuery);

            const draftMap = new Map(
              (draftGrades || []).map((g: any) => [
                `${g.student_id}-${g.subject_id}`,
                g.status,
              ]),
            );

            // 5. Find missing grades
            const classSubjectMap = new Map<string, any[]>();
            for (const cs of classSubjectRows) {
              if (!classSubjectMap.has(cs.class_id))
                classSubjectMap.set(cs.class_id, []);
              classSubjectMap.get(cs.class_id)!.push(cs);
            }

            const missing: any[] = [];
            for (const enrollment of allEnrollments) {
              const subjects = classSubjectMap.get(enrollment.class_id) || [];
              for (const cs of subjects) {
                const key = `${enrollment.student_id}-${cs.subject_id}`;
                if (!publishedSet.has(key)) {
                  const subject = Array.isArray(cs.subjects)
                    ? cs.subjects[0]
                    : cs.subjects;
                  missing.push({
                    studentId: enrollment.student_id,
                    studentName:
                      (enrollment as any).profiles?.full_name ||
                      "Unknown Student",
                    className:
                      (enrollment as any).classes?.name || "Unknown Class",
                    subjectId: cs.subject_id,
                    subjectName: subject?.name || "Unknown Subject",
                    subjectCode: subject?.code || "",
                    teacherName:
                      teacherMap.get(cs.teacher_id) ||
                      teacherMap.get(
                        assignmentTeacherMap.get(
                          `${enrollment.class_id}-${cs.subject_id}`,
                        ) || "",
                      ) ||
                      teacherMap.get(subject?.head_teacher_id) ||
                      "Unassigned",
                    status: draftMap.get(key) || "Not Entered",
                  });
                }
              }
            }

            if (missing.length > 0 && !force) {
              return res.status(400).json({
                message: `Cannot calculate grades: ${missing.length} grade record(s) have not been published by teachers yet.`,
                unpublished: missing,
              });
            }
          }
        }
      }

      console.log(
        `[Grading] Calculating grades for Class: ${classId}, Subject: ${subjectId || "All"}, Term: ${term}, Skip Calculation: ${!!skipCalculation}`,
      );

      // 1. Get Grading Scales (always needed)
      const { data: scales, error: scalesError } = await supabaseAdmin
        .from("grading_scales")
        .select("*")
        .eq("school_id", schoolId)
        .order("min_percentage", { ascending: false });

      if (scalesError) throw scalesError;
      if (!scales || scales.length === 0) {
        return res
          .status(400)
          .json({ message: "No grading scales defined for this school" });
      }

      const gradesToUpsert: any[] = [];

      if (skipCalculation) {
        // PATH 2: Use Direct Marks - Re-verify letter grades from existing student_grades records
        let gradesQuery = supabaseAdmin
          .from("student_grades")
          .select("*")
          .eq("school_id", schoolId)
          .eq("term", term)
          .eq("exam_type", examType)
          .eq("academic_year", academicYear)
          .limit(100000);

        if (subjectId && subjectId !== "all") {
          gradesQuery = gradesQuery.eq("subject_id", subjectId);
        }
        if (classId && classId !== "all" && studentIds.length > 0) {
          gradesQuery = gradesQuery.in("student_id", studentIds);
        }

        const { data: existingGrades, error: fetchError } = await gradesQuery;
        if (fetchError) throw fetchError;

        if (!existingGrades || existingGrades.length === 0) {
          return res
            .status(400)
            .json({
              message:
                "No grades found in the gradebook to finalize. Please ensure teachers have saved their grades.",
            });
        }

        for (const g of existingGrades) {
          const roundedPercentage = Math.round(g.percentage || 0);
          const gradeScale = scales.find(
            (s: any) => roundedPercentage >= s.min_percentage,
          );
          const letterGrade = gradeScale ? gradeScale.grade : "F";

          gradesToUpsert.push({
            ...g,
            grade: letterGrade,
            percentage: roundedPercentage,
            calculated_at: new Date().toISOString(),
          });
        }
      } else {
        // PATH 1: Traditional Assignment Calculation
        // 1. Get Grading Weights
        const { data: weights, error: weightsError } = await supabaseAdmin
          .from("grading_weights")
          .select("*")
          .eq("school_id", schoolId);

        if (weightsError) throw weightsError;
        if (!weights || weights.length === 0) {
          return res
            .status(400)
            .json({
              message:
                'No grading weights defined for this school. Use "Direct Mark Entry" or define weights.',
            });
        }

        // 3. Get Students in Class(es)
        if (studentIds.length === 0) {
          let enrollmentsQuery = supabaseAdmin
            .from("enrollments")
            .select("student_id")
            .eq("status", "Active");

          if (classId && classId !== "all") {
            enrollmentsQuery = enrollmentsQuery.eq("class_id", classId);
          } else if (targetClassIds.length > 0) {
            enrollmentsQuery = enrollmentsQuery.in("class_id", targetClassIds);
          }

          const { data: enrollments, error: enrollError } =
            await enrollmentsQuery;
          if (enrollError) throw enrollError;
          studentIds = (enrollments || []).map((e: any) => e.student_id);
        }

        if (studentIds.length === 0) {
          return res.status(400).json({ message: "No active students found" });
        }

        // 4. Get Assignments & Submissions
        // Filter assignments by class(es) and optionally subject
        let assignmentsQuery = supabaseAdmin
          .from("assignments")
          .select("id, type, subject_id, class_id"); // Ensure class_id is selected for cross-referencing if needed

        if (classId && classId !== "all") {
          assignmentsQuery = assignmentsQuery.eq("class_id", classId);
        }

        if (subjectId && subjectId !== "all") {
          assignmentsQuery = assignmentsQuery.eq("subject_id", subjectId);
        }

        const { data: assignments, error: assignError } =
          await assignmentsQuery;
        if (assignError) throw assignError;

        if (!assignments || assignments.length === 0) {
          return res
            .status(400)
            .json({
              message:
                "No assignments found for calculation. Please ensure assignments are created for this class and subject.",
            });
        }

        const assignmentIds = assignments.map((a: any) => a.id);
        const assignmentMap = new Map(assignments.map((a: any) => [a.id, a]));

        // Fetch submissions for these assignments and students
        const { data: submissions, error: subError } = await supabaseAdmin
          .from("submissions")
          .select("student_id, assignment_id, score, max_score")
          .in("assignment_id", assignmentIds)
          .in("student_id", studentIds)
          .not("score", "is", null);

        if (subError) throw subError;

        // 5. Calculate Grades per Student per Subject
        // If subjectId is not provided, we might need to group by subject.
        // For simplicity, let's assume if subjectId is missing, we calculate for ALL subjects in the class assignments.

        // Group assignments by Subject
        const assignmentsBySubject = new Map<string | null, any[]>();
        assignments.forEach((a: any) => {
          const sId = a.subject_id || null;
          if (!assignmentsBySubject.has(sId)) {
            assignmentsBySubject.set(sId, []);
          }
          assignmentsBySubject.get(sId)?.push(a);
        });

        // Iterate over each subject found in assignments
        for (const [
          subjId,
          subjAssignments,
        ] of assignmentsBySubject.entries()) {
          // For each student
          for (const studentId of studentIds) {
            let totalWeightedScore = 0;
            let totalWeightUsed = 0;

            // Group student's submissions for this subject by Type
            const studentSubmissions =
              submissions?.filter(
                (s: any) =>
                  s.student_id === studentId &&
                  subjAssignments.some((a: any) => a.id === s.assignment_id),
              ) || [];

            // Calculate score for each weight category (e.g. Homework, Exam)
            for (const weight of weights) {
              const typeAssignments = subjAssignments.filter(
                (a: any) => a.type === weight.assessment_type,
              );

              if (typeAssignments.length === 0) continue; // No assignments of this type

              let typeTotalScore = 0;
              let typeMaxScore = 0;

              typeAssignments.forEach((a: any) => {
                const sub = studentSubmissions.find(
                  (s: any) => s.assignment_id === a.id,
                );
                if (sub) {
                  typeTotalScore += sub.score || 0;
                  typeMaxScore += sub.max_score || 100;
                }
              });

              if (typeMaxScore > 0) {
                const typePercentage = (typeTotalScore / typeMaxScore) * 100;
                totalWeightedScore +=
                  typePercentage * (weight.weight_percentage / 100);
                totalWeightUsed += weight.weight_percentage;
              }
            }

            // Normalize if weights don't add up to 100 (optional, but good for partial terms)
            // If we want strict 100%, we might leave it. But usually safe to normalize.
            let finalPercentage = 0;
            if (totalWeightUsed > 0) {
              finalPercentage = (totalWeightedScore / totalWeightUsed) * 100;
            }

            // Determine Letter Grade
            const roundedPercentage = Math.round(finalPercentage);
            const gradeScale = scales.find(
              (s: any) => roundedPercentage >= s.min_percentage,
            );
            const letterGrade = gradeScale ? gradeScale.grade : "F"; // Default to F if no match (or lowest)

            gradesToUpsert.push({
              school_id: schoolId,
              student_id: studentId,
              subject_id: subjId,
              term,
              exam_type: examType,
              academic_year: academicYear,
              grade: letterGrade,
              percentage: roundedPercentage,
              calculated_at: new Date().toISOString(),
            });
          }
        }
      }

      // 6. Upsert Grades
      if (gradesToUpsert.length > 0) {
        const { error: upsertError } = await supabaseAdmin
          .from("student_grades")
          .upsert(gradesToUpsert, {
            onConflict:
              "student_id, subject_id, term, academic_year, exam_type",
          });

        if (upsertError) throw upsertError;
      }

      res.json({
        message: "Grades calculated successfully",
        count: gradesToUpsert.length,
        details: gradesToUpsert.map((g) => ({
          student: g.student_id,
          subject: g.subject_id,
          grade: g.grade,
        })),
      });
    } catch (error: any) {
      console.error("Calculate Grades Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// DELETE /api/school/grading-weights/:id
router.delete(
  "/grading-weights/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;

    try {
      const { error } = await supabaseAdmin
        .from("grading_weights")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
      res.json({ message: "Grading weight deleted successfully" });
    } catch (error: any) {
      console.error("Delete Grading Weight Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// --- TIMETABLE ENDPOINTS ---

// GET /api/school/timetables
router.get(
  "/timetables",
  requireSchoolRole([...ADMIN_ROLES, "teacher", "student"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { class_id, teacher_id, academic_year, term } = req.query;

    try {
      // Determine context (default to current settings if not provided)
      let targetYear = academic_year as string;
      let targetTerm = term as string;

      if (!targetYear || !targetTerm) {
        const settings = await ensureSchoolSettings(schoolId);
        if (settings) {
          targetYear = targetYear || settings.academic_year;
          targetTerm = targetTerm || settings.current_term;
        }
      }

      let query = supabaseAdmin
        .from("timetables")
        .select(
          `
        *,
        class:classes!class_id(name),
        subject:subjects!subject_id(name, code),
        teacher:profiles!teacher_id(full_name)
      `,
        )
        .eq("school_id", schoolId);

      if (class_id) query = query.eq("class_id", class_id);
      if (teacher_id) query = query.eq("teacher_id", teacher_id);

      // Filter by academic year and term if resolved
      if (targetYear) query = query.eq("academic_year", targetYear);
      if (targetTerm) query = query.eq("term", targetTerm);

      const { data, error } = await query
        .order("day_of_week")
        .order("start_time");

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Get Timetables Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/timetables
router.post(
  "/timetables",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const {
      day_of_week,
      start_time,
      end_time,
      class_id,
      subject_id,
      teacher_id,
      room,
      academic_year,
      term,
    } = req.body;

    try {
      // Basic validation
      if (
        !day_of_week ||
        !start_time ||
        !end_time ||
        !class_id ||
        !subject_id
      ) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Determine context
      let targetYear = academic_year;
      let targetTerm = term;

      if (!targetYear || !targetTerm) {
        const settings = await ensureSchoolSettings(schoolId);
        if (settings) {
          targetYear = targetYear || settings.academic_year;
          targetTerm = targetTerm || settings.current_term;
        }
      }

      // Ensure we have a context
      if (!targetYear || !targetTerm) {
        return res
          .status(400)
          .json({
            message:
              "Academic year and term could not be determined. Please configure school settings.",
          });
      }

      // Check for conflicts (simple overlap check)
      // 1. Same class, overlapping time
      // 2. Same teacher, overlapping time (if teacher assigned)
      // 3. Same room, overlapping time (if room assigned)

      // For now, let's just create it and let the UI handle visual conflict detection or add strict checks later

      const { data, error } = await supabaseAdmin
        .from("timetables")
        .insert({
          school_id: schoolId,
          day_of_week,
          start_time,
          end_time,
          class_id,
          subject_id,
          teacher_id: teacher_id || null,
          room,
          academic_year: targetYear,
          term: targetTerm,
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error: any) {
      console.error("Create Timetable Entry Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// PUT /api/school/timetables/:id
router.put(
  "/timetables/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;
    const {
      day_of_week,
      start_time,
      end_time,
      class_id,
      subject_id,
      teacher_id,
      room,
      academic_year,
      term,
    } = req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from("timetables")
        .update({
          day_of_week,
          start_time,
          end_time,
          class_id,
          subject_id,
          teacher_id: teacher_id || null,
          room,
          academic_year, // Optional update
          term, // Optional update
          updated_at: new Date(),
        })
        .eq("id", id)
        .eq("school_id", schoolId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Update Timetable Entry Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// DELETE /api/school/timetables/:id
router.delete(
  "/timetables/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;

    try {
      const { error } = await supabaseAdmin
        .from("timetables")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
      res.json({ message: "Timetable entry deleted successfully" });
    } catch (error: any) {
      console.error("Delete Timetable Entry Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// --- ADMIN MANAGEMENT ENDPOINTS ---

// GET /api/school/admins
router.get(
  "/admins",
  requireSchoolRole(ADMIN_ROLES), // Allow all admin roles to view the team
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;

    try {
      // 1. Fetch profiles
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, role, secondary_role, created_at")
        .eq("school_id", schoolId)
        .in("role", ADMIN_ROLES)
        .order("full_name", { ascending: true });

      if (profileError) throw profileError;

      // 2. Fetch all users from auth to get emails
      // Note: In a production environment with many users, this should be optimized
      // or email should be synced to the profiles table.
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) throw authError;

      const users = authData.users || [];

      // 3. Merge emails into profiles
      const adminsWithEmail = profiles.map((p) => {
        const authUser = users.find((u: any) => u.id === p.id);
        return {
          ...p,
          email: authUser?.email || "Unknown",
        };
      });

      res.json(adminsWithEmail);
    } catch (error: any) {
      console.error("Get Admins Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// GET /api/school/class-subjects/allocation-options
// Provides Subject Name (Class Name) options for selection
router.get(
  "/class-subjects/allocation-options",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;

    try {
      // Fetch class subjects with related join data
      const { data, error } = await supabaseAdmin
        .from("class_subjects")
        .select(`
          id,
          class:classes!inner(name, school_id),
          subject:subjects!inner(name)
        `)
        .eq("class.school_id", schoolId);

      if (error) throw error;

      const options = data.map((item: any) => ({
        value: item.id,
        label: `${item.subject?.name || 'Unknown'} (${item.class?.name || 'Unknown Class'})`,
      }));

      res.json(options);
    } catch (error: any) {
      console.error("Fetch Class Subject Options Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/admins
router.post(
  "/admins",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    try {
      // 1. Create Auth User
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name,
            role: req.body.role || "school_admin",
            school_id: schoolId,
          },
        });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // 2. Ensure Profile is correct
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: authData.user.id,
          role: req.body.role || "school_admin",
          school_id: schoolId,
          full_name,
          email,
        });

      if (profileError) {
        // Rollback auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      res
        .status(201)
        .json({ message: "Admin created successfully", user: authData.user });
    } catch (error: any) {
      console.error("Create Admin Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// DELETE /api/school/admins/:id
router.delete(
  "/admins/:id",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === profile.id) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account" });
    }

    try {
      // Verify target is a school admin in the same school
      const { data: target, error: targetError } = await supabaseAdmin
        .from("profiles")
        .select("id, role")
        .eq("id", id)
        .eq("school_id", schoolId)
        .single();

      if (targetError || !target) {
        return res.status(404).json({ message: "Admin not found" });
      }

      if (!ADMIN_ROLES.includes(target.role)) {
        return res
          .status(400)
          .json({ message: "Target user is not an administrator" });
      }

      // Delete from Auth
      const { error: deleteError } =
        await supabaseAdmin.auth.admin.deleteUser(id);

      if (deleteError) throw deleteError;

      // Ensure profile is deleted
      await supabaseAdmin.from("profiles").delete().eq("id", id);

      res.json({ message: "Admin deleted successfully" });
    } catch (error: any) {
      console.error("Delete Admin Error:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

// POST /api/school/admins/:id/reset-password
router.post(
  "/admins/:id/reset-password",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    try {
      // 1. Verify target is an admin in the same school
      const { data: target, error: targetError } = await supabaseAdmin
        .from("profiles")
        .select("id, role")
        .eq("id", id)
        .eq("school_id", schoolId)
        .single();

      if (targetError || !target) {
        return res.status(404).json({ message: "Admin not found" });
      }

      if (!ADMIN_ROLES.includes(target.role)) {
        return res.status(400).json({ message: "Target user is not an administrator" });
      }

      // 2. Update password in Supabase Auth
      const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        { password: newPassword }
      );

      if (resetError) throw resetError;

      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Reset Admin Password Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// POST /api/school/admins/:id/assign-teacher
// Assign teacher role to an existing school admin
router.post(
  "/admins/:id/assign-teacher",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;

    try {
      // 1. Verify target is an admin in the same school
      const { data: target, error: targetError } = await supabaseAdmin
        .from("profiles")
        .select("id, role, secondary_role")
        .eq("id", id)
        .eq("school_id", schoolId)
        .single();

      if (targetError || !target) {
        return res.status(404).json({ message: "Admin not found" });
      }

      if (!ADMIN_ROLES.includes(target.role)) {
        return res.status(400).json({ message: "Target user is not an administrator" });
      }

      // 2. Check if they already have teacher role
      if (target.secondary_role === "teacher") {
        return res.status(400).json({ message: "User already has teacher role" });
      }

      // 3. Update the profile
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          secondary_role: "teacher",
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (updateError) throw updateError;

      res.json({ message: "Teacher role assigned successfully" });
    } catch (error: any) {
      console.error("Assign Teacher Role Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/school/grades/anomalies
// Fetch all grades > 100% across the entire school
router.get(
  "/grades/anomalies",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;

    try {
      const anomaliesQuery = supabaseAdmin
        .from("student_grades")
        .select(`
          id,
          student_id,
          subject_id,
          percentage,
          grade,
          term,
          exam_type,
          academic_year,
          subjects(name)
        `)
        .eq("school_id", schoolId)
        .gt("percentage", 100)
        .order("academic_year", { ascending: false })
        .order("term", { ascending: false });

      const anomalies = await fetchAll(anomaliesQuery);
      
      const studentIds = [...new Set(anomalies.map((a: any) => a.student_id))];
      let profilesMap: Record<string, any> = {};
      let enrollmentsMap: Record<string, any> = {};
      
      if (studentIds.length > 0) {
        // Chunk studentIds to avoid 1000 limit
        const chunkSize = 800;
        for (let i = 0; i < studentIds.length; i += chunkSize) {
          const chunk = studentIds.slice(i, i + chunkSize);
          
          // Profiles
          const { data: profilesData } = await supabaseAdmin
            .from("profiles")
            .select("id, full_name, student_number")
            .in("id", chunk);
            
          if (profilesData) {
            profilesData.forEach((p: any) => {
              profilesMap[p.id] = p;
            });
          }
          
          // Enrollments
          const { data: enrollmentsData } = await supabaseAdmin
            .from("enrollments")
            .select("student_id, academic_year, class_id, classes(name)")
            .in("student_id", chunk)
            .eq("status", "Active");
            
          if (enrollmentsData) {
            enrollmentsData.forEach((e: any) => {
              enrollmentsMap[`${e.student_id}_${e.academic_year}`] = e;
              enrollmentsMap[`${e.student_id}`] = e; // fallback
            });
          }
        }
      }
      
      const classIds = [...new Set(Object.values(enrollmentsMap).map((e: any) => e.class_id).filter(Boolean))];
      const subjectIds = [...new Set(anomalies.map((a: any) => a.subject_id).filter(Boolean))];
      let teacherMap: Record<string, string> = {};
      
      if (classIds.length > 0 && subjectIds.length > 0) {
        // Chunk class_ids if needed, but typically < 800 classes
        const { data: classSubjectsData } = await supabaseAdmin
          .from("class_subjects")
          .select("class_id, subject_id, teacher_id")
          .in("class_id", classIds)
          .in("subject_id", subjectIds);
          
        if (classSubjectsData && classSubjectsData.length > 0) {
          const teacherIds = [...new Set(classSubjectsData.map((cs: any) => cs.teacher_id).filter(Boolean))];
          let teacherProfilesMap: Record<string, string> = {};
          
          if (teacherIds.length > 0) {
             const { data: teacherProfiles } = await supabaseAdmin
               .from("profiles")
               .select("id, full_name")
               .in("id", teacherIds);
               
             if (teacherProfiles) {
               teacherProfiles.forEach((tp: any) => {
                 teacherProfilesMap[tp.id] = tp.full_name;
               });
             }
          }
          
          classSubjectsData.forEach((cs: any) => {
             if (cs.teacher_id && teacherProfilesMap[cs.teacher_id]) {
               teacherMap[`${cs.class_id}_${cs.subject_id}`] = teacherProfilesMap[cs.teacher_id];
             }
          });
        }
      }
      
      const formatted = anomalies.map((a: any) => {
        const enrollment = enrollmentsMap[`${a.student_id}_${a.academic_year}`] || enrollmentsMap[`${a.student_id}`];
        const classId = enrollment?.class_id;
        const className = enrollment?.classes?.name || 'Unknown Class';
        const teacherName = (classId && a.subject_id) ? teacherMap[`${classId}_${a.subject_id}`] || 'Unassigned' : 'Unknown Teacher';

        return {
          id: a.id,
          studentId: a.student_id,
          classId: classId,
          studentName: profilesMap[a.student_id]?.full_name || 'Unknown',
          studentNumber: profilesMap[a.student_id]?.student_number || 'Unknown',
          subject: a.subjects?.name || 'Unknown',
          term: a.term,
          examType: a.exam_type,
          academicYear: a.academic_year,
          percentage: a.percentage,
          grade: a.grade,
          className,
          teacherName
        };
      });

      res.json(formatted);
    } catch (error: any) {
      console.error("Fetch Grade Anomalies Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/school/grades/clean-classes
// Fetch all classes that have zero grade anomalies (no scores > 100)
router.get(
  "/grades/clean-classes",
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;

    try {
      // 1. Get all classes in the school
      const { data: allClasses, error: classesError } = await supabaseAdmin
        .from("classes")
        .select("id, name")
        .eq("school_id", schoolId);

      if (classesError) throw classesError;
      if (!allClasses || allClasses.length === 0) return res.json([]);

      // 2. Get all anomalies
      const anomaliesQuery = supabaseAdmin
        .from("student_grades")
        .select("student_id, academic_year")
        .eq("school_id", schoolId)
        .gt("percentage", 100);

      const anomalies = await fetchAll(anomaliesQuery);
      
      // 3. If no anomalies at all, all classes are clean
      if (anomalies.length === 0) {
        return res.json(allClasses);
      }

      // 4. Get enrollments for students with anomalies to find their classes
      const studentIds = [...new Set(anomalies.map((a: any) => a.student_id))];
      let anomalousClassIds = new Set<string>();

      if (studentIds.length > 0) {
        const chunkSize = 800;
        for (let i = 0; i < studentIds.length; i += chunkSize) {
          const chunk = studentIds.slice(i, i + chunkSize);
          const { data: enrollmentsData } = await supabaseAdmin
            .from("enrollments")
            .select("class_id")
            .in("student_id", chunk)
            .eq("status", "Active");
            
          if (enrollmentsData) {
            enrollmentsData.forEach((e: any) => {
              if (e.class_id) anomalousClassIds.add(e.class_id);
            });
          }
        }
      }

      // 5. Filter out classes that have anomalies
      const cleanClasses = allClasses.filter(c => !anomalousClassIds.has(c.id));
      
      res.json(cleanClasses);
    } catch (error: any) {
      console.error("Fetch Clean Classes Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

export const schoolAdminRouter = router;
