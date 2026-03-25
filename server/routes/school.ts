import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { WhatsAppService } from "../services/whatsappService.js";
import { requireActiveLicense } from "../middleware/license.js";
import { ensureSchoolSettings } from "../lib/school-settings.js";
import { findBestClassMatch, normalizeClassName } from "../lib/class-matching.js";

const router = Router();

// --- PUBLIC ENDPOINTS ---

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
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, role, secondary_role, school_id") 
        .eq("id", user.id)
        .single();


      if (profileError || !profile) {
        return res
          .status(403)
          .json({ message: "Forbidden: Profile not found" });
      }

      if (!allowedRoles.includes(profile.role) && (!profile.secondary_role || !allowedRoles.includes(profile.secondary_role))) {
        return res
          .status(403)
          .json({
            message: `Forbidden: Requires one of [${allowedRoles.join(", ")}]`,
          });
      }


      // Attach user and profile to request
      (req as any).user = user;
      (req as any).profile = profile;

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
          revenue: {
            value: `K${totalRevenueValue.toLocaleString()}`,
            trend: "+0%",
            status: "up",
          },
          attendanceRate: {
            value: attendanceRateValue,
            trend: attendanceTrend,
            status:
              attendanceRateValue === "--" ||
              parseInt(attendanceRateValue) >= 90
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

      const { data: students, error, count } = await query
        .order("full_name", { ascending: true })
        .range(from, to);

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

        if (userError) throw userError;

        // 3. Update Profile with extra details (Use UPSERT with onConflict)
        if (user.user) {
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert({
              id: user.user.id,
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


          if (profileError) throw profileError;

          // 4. Handle Enrollment (Try to find class by name)
            // Use the robust matching utility
            const classData = findBestClassMatch(student.grade, schoolClasses);

            if (classData) {
              // 1. Clear any existing active enrollment for this year to avoid conflicts
              // and ensure the student is only in one class per year.
              await supabaseAdmin
                .from("enrollments")
                .delete()
                .eq("student_id", user.user.id)
                .eq("academic_year", activeYear);

              // 2. Create the new enrollment
              await supabaseAdmin.from("enrollments").insert({
                student_id: user.user.id,
                class_id: classData.id,
                academic_year: activeYear,
                status: "Active",
              });

              // 3. Update profile grade with official name
              await supabaseAdmin
                .from("profiles")
                .update({ grade: classData.name })
                .eq("id", user.user.id);
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
               // Try to find the user in Auth to get their ID? 
               // listing users is slow, but for 126 it's doable if needed.
               // However, usually they should have a profile if they exist in Auth.
               throw new Error(`Email ${finalEmail} is already in use by another user.`);
            }
            throw userError;
          }
          existingId = user.user.id;
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
            department: teacher.department || "",
            subjects: teacher.subjects || [],
            join_date: teacher.joinDate || new Date().toISOString().split("T")[0],
            employment_status: "Active",
            is_temp_password: true,
            temp_password_set_at: new Date().toISOString(),
            temp_password_expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (profileError) throw profileError;
        
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
        const scale = scales?.find(
          (s) =>
            g.percentage >= s.min_percentage &&
            g.percentage <= s.max_percentage,
        );
        return {
          school_id: schoolId,
          student_id: g.studentId,
          subject_id: g.subjectId,
          term: g.term,
          exam_type: g.examType || "End of Term",
          academic_year: g.academicYear,
          grade: scale ? scale.grade : "N/A",
          percentage: g.percentage,
          comments: g.comments,
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
          .eq("academic_year", academicYear);

        if (enrollments && enrollments.length > 0) {
          const studentIds = enrollments.map((e) => e.student_id);
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
          .eq("academic_year", academicYear);

        if (enrollments && enrollments.length > 0) {
          const studentIds = enrollments.map((e) => e.student_id);
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

    if (!term || !examType || !academicYear) {
      return res
        .status(400)
        .json({ message: "Term, Exam Type and Academic Year are required" });
    }

    try {
      // 1. Get all subjects for this class (from assignments or student_subjects?)
      // Using student_subjects gives us the subjects students are enrolled in.
      // We want to know: For each subject, what is the status of grades?

      // Get unique subjects for the class(es)
      let classSubjectsQuery = supabaseAdmin
        .from("student_subjects")
        .select("subject_id, subjects(name)")
        .eq("academic_year", academicYear);

      if (classId && classId !== "all") {
        classSubjectsQuery = classSubjectsQuery.eq("class_id", classId);
      }

      if (subjectId && subjectId !== "all") {
        classSubjectsQuery = classSubjectsQuery.eq("subject_id", subjectId);
      }

      const { data: classSubjects, error: subjError } =
        await classSubjectsQuery;

      if (subjError) throw subjError;

      // Deduplicate subjects
      const uniqueSubjects = Array.from(
        new Set(classSubjects?.map((s) => JSON.stringify(s.subjects)) || []),
      )
        .map((s: string) => JSON.parse(s))
        .filter((s) => s); // Ensure valid subjects

      // 2. Check grade status for each subject
      const statusReport = [];

      // Get all grades for this class/term
      let enrollmentsQuery = supabaseAdmin
        .from("enrollments")
        .select("student_id")
        .eq("academic_year", academicYear);

      if (classId && classId !== "all") {
        enrollmentsQuery = enrollmentsQuery.eq("class_id", classId);
      }

      const { data: enrollments } = await enrollmentsQuery;

      const studentIds = enrollments?.map((e) => e.student_id) || [];

      if (studentIds.length === 0) {
        return res.json([]);
      }

      let gradesQuery = supabaseAdmin
        .from("student_grades")
        .select("subject_id, status")
        .in("student_id", studentIds)
        .eq("term", term)
        .eq("exam_type", examType)
        .eq("academic_year", academicYear);

      if (subjectId && subjectId !== "all") {
        gradesQuery = gradesQuery.eq("subject_id", subjectId);
      }

      const { data: grades } = await gradesQuery;

      // Analyze status per subject
      // We can map subject_id -> status set
      const subjectStatusMap = new Map<string, Set<string>>();

      grades?.forEach((g) => {
        if (!subjectStatusMap.has(g.subject_id)) {
          subjectStatusMap.set(g.subject_id, new Set());
        }
        subjectStatusMap.get(g.subject_id)?.add(g.status);
      });

      // Build report
      // We need to fetch subject names for the IDs in grades if not in classSubjects
      // But let's use the classSubjects we fetched earlier as the base list of "Expected Subjects"
      // Wait, student_subjects might be empty if not populated.
      // Let's use the subjects found in grades + subjects found in assignments?
      // For now, use subjects found in grades as "Active Subjects".

      // Let's fetch all subjects to map IDs to names
      const { data: allSubjects } = await supabaseAdmin
        .from("subjects")
        .select("id, name")
        .eq("school_id", schoolId);

      const subjectNameMap = new Map(allSubjects?.map((s) => [s.id, s.name]));

      // Fetch teachers assigned to subjects for this class
      let classAssignedTeachersQuery = supabaseAdmin
        .from("class_subjects")
        .select("subject_id, profiles(full_name)");

      if (classId && classId !== "all") {
        classAssignedTeachersQuery = classAssignedTeachersQuery.eq(
          "class_id",
          classId,
        );
      }

      const { data: classAssignedTeachers } = await classAssignedTeachersQuery;

      const subjectTeacherMap = new Map();
      classAssignedTeachers?.forEach((cs: any) => {
        if (cs.profiles && cs.profiles.full_name) {
          subjectTeacherMap.set(cs.subject_id, cs.profiles.full_name);
        } else if (
          cs.profiles &&
          cs.profiles.length > 0 &&
          cs.profiles[0].full_name
        ) {
          // In case it's an array due to foreign key mapping
          subjectTeacherMap.set(cs.subject_id, cs.profiles[0].full_name);
        }
      });

      // Iterate over all subjects that have grades
      const subjectsWithGrades = Array.from(subjectStatusMap.keys());

      for (const subjId of subjectsWithGrades) {
        const statuses = subjectStatusMap.get(subjId)!;
        let overallStatus = "Draft";

        if (statuses.has("Draft")) overallStatus = "Draft";
        else if (statuses.has("Submitted") && !statuses.has("Published"))
          overallStatus = "Submitted";
        else if (statuses.has("Published")) overallStatus = "Published"; // Mixed?

        // If ALL are published, then Published.
        // If ALL are Submitted (or Published), then Submitted.
        // If ANY is Draft, then Draft (incomplete).

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
        }

        statusReport.push({
          id: subjId,
          name: subjectNameMap.get(subjId) || "Unknown Subject",
          teacher: subjectTeacherMap.get(subjId) || "Unassigned",
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

      // 3. Fetch Grades (Only Published if Student)
      let gradesQuery = supabaseAdmin
        .from("student_grades")
        .select("*, subjects(id, name, code, department)")
        .eq("student_id", studentId)
        .eq("term", term)
        .eq("exam_type", examType)
        .eq("academic_year", academicYear);

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
          "name, address, email, phone, website, logo_url, signature_url, seal_url, school_type",
        )
        .eq("id", schoolId)
        .single();

      res.json({
        school: schoolDetails,
        student: {
          id: student.id,
          name: student.full_name,
          studentNumber: student.student_number,
          class: student.enrollments?.[0]?.classes?.name || "N/A",
          attendance: 0, // Placeholder
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
          "name, address, email, phone, website, logo_url, signature_url, seal_url, school_type",
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
          "student_id, profiles!enrollments_student_id_fkey(full_name, student_number), classes(name)",
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
            class: (enrollment.classes as any)?.name || "N/A",
            attendance: 0,
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
          .update({
            username: username || null,
            department,
            subjects, // Assumes text[] or jsonb in DB
            staff_number: staffNumber,
            join_date: joinDate,
            employment_status: "Active",
            is_temp_password: true,
            temp_password_set_at: new Date().toISOString(),
            temp_password_expires_at: new Date(
              Date.now() + 100 * 365 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          })
          .eq("id", user.user.id);

        if (profileError)
          console.error("Error updating teacher profile:", profileError);
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
        .select("*")
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
    const { name } = req.body;

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
        })
        .select()
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
    const { name } = req.body;

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
        .update({ name: formattedName })
        .eq("id", id)
        .eq("school_id", schoolId)
        .select()
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

      const formattedClasses = classes.map((cls: any) => ({
        id: cls.id,
        name: cls.name,
        level: cls.level,
        room: cls.room,
        capacity: cls.capacity,
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
        profiles:teacher_id(id, full_name)
      `,
        )
        .eq("class_id", id);

      if (error) throw error;

      // Map to a cleaner structure
      const subjects = data.map((item: any) => ({
        ...item.subjects,
        classSubjectId: item.id,
        teacherId: item.teacher_id,
        teacherName: item.profiles?.full_name,
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

        const { error: insertError } = await supabaseAdmin
          .from("class_subjects")
          .insert(newAssignments);

        if (insertError) throw insertError;
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
  requireSchoolRole(ADMIN_ROLES),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { term, academic_year, examType } = req.query;

    try {
      // 1. Student & Staff Stats
      const { data: schoolProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id, role, gender, enrollment_status, full_name, grade")
        .eq("school_id", schoolId);

      // Fetch grading scales for label mapping
      const { data: scales } = await supabaseAdmin
        .from("grading_scales")
        .select("grade, min_percentage, max_percentage, description")
        .eq("school_id", schoolId);

      // Fetch class_subjects for teacher mapping
      const { data: classTeacherMap } = await supabaseAdmin
        .from("class_subjects")
        .select(`
          class_id,
          subject_id,
          teacher_id,
          classes!class_id(name),
          profiles!teacher_id(full_name, id)
        `);

      // Fetch student_subjects for robust mapping
      const { data: studentSubjectMap } = await supabaseAdmin
        .from("student_subjects")
        .select("student_id, subject_id, class_id")
        .eq("academic_year", academic_year || ""); // Filter by year if possible

      // Fetch classes to map UUIDs to names
      const { data: schoolClasses } = await supabaseAdmin
        .from("classes")
        .select("id, name")
        .eq("school_id", schoolId);

      const classIdToName: any = {};
      schoolClasses?.forEach((c) => (classIdToName[c.id] = c.name));

      const classNameToId: any = {};
      schoolClasses?.forEach((c) => (classNameToId[c.name] = c.id));

      const students =
        schoolProfiles?.filter((p) => p.role === "student") || [];
      const staff =
        schoolProfiles?.filter(
          (p) => p.role === "teacher" || p.role === "staff",
        ) || [];
      const totalStudents = students.length;
      const totalStaff = staff.length;

      const maleStudents = students.filter(
        (s) => s.gender?.toLowerCase() === "male",
      ).length;
      const femaleStudents = students.filter(
        (s) => s.gender?.toLowerCase() === "female",
      ).length;
      const otherGender = totalStudents - maleStudents - femaleStudents;

      // 2. Attendance Summary
      let attendanceQuery = supabaseAdmin
        .from("attendance")
        .select("status")
        .eq("school_id", schoolId);

      if (term) attendanceQuery = attendanceQuery.eq("term", term);
      if (academic_year)
        attendanceQuery = attendanceQuery.eq("academic_year", academic_year);

      const { data: attendance } = await attendanceQuery;

      const present =
        attendance?.filter((a) => a.status === "present").length || 0;
      const absent =
        attendance?.filter((a) => a.status === "absent").length || 0;
      const late = attendance?.filter((a) => a.status === "late").length || 0;

      // 3. Academic Performance
      let gradesQuery = supabaseAdmin
        .from("student_grades")
        .select(
          `
        percentage,
        student_id,
        term,
        academic_year,
        exam_type,
        profiles!student_id(full_name, grade, gender),
        subjects(name, department, id)
      `,
        )
        .eq("school_id", schoolId);

      if (term) gradesQuery = gradesQuery.eq("term", term);
      if (academic_year)
        gradesQuery = gradesQuery.eq("academic_year", academic_year);
      if (examType) gradesQuery = gradesQuery.eq("exam_type", examType);

      const { data: grades, error: gradesError } = await gradesQuery;

      if (gradesError) {
        console.error("[LiveStats] Grades Error:", gradesError);
      }

      // Filter in memory for more robust matching (case-insensitive)
      const filteredGrades =
        grades?.filter((g) => {
          const termMatch =
            !term ||
            String(g.term).toLowerCase() === String(term).toLowerCase();
          const yearMatch =
            !academic_year ||
            String(g.academic_year).toLowerCase() ===
              String(academic_year).toLowerCase();
          const examTypeMatch =
            !examType ||
            String(g.exam_type).toLowerCase() ===
              String(examType).toLowerCase();
          return termMatch && yearMatch && examTypeMatch;
        }) || [];

      console.log(
        `[LiveStats] Found ${grades?.length || 0} total, ${filteredGrades.length} filtered for Term: ${term}, Year: ${academic_year}, Exam Type: ${examType}`,
      );

      // Group grades by class and department
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
      const gradeDistribution: any = {
        school: {},
        byClass: {},
        bySubject: {},
      };

      const getGradeLabel = (pct: number) => {
        if (!scales || scales.length === 0) return "N/A";
        const scale = scales.find(
          (s) => pct >= s.min_percentage && pct <= s.max_percentage,
        );
        return scale ? scale.description || scale.grade : "N/A";
      };

      filteredGrades.forEach((g: any) => {
        const percentage = g.percentage || 0;
        const gradeLabel = getGradeLabel(percentage);

        // Update school-wide distribution
        gradeDistribution.school[gradeLabel] =
          (gradeDistribution.school[gradeLabel] || 0) + 1;

        // Update gender-wise distribution
        const gender = (g.profiles?.gender || "other").toLowerCase();
        const targetGender = gender === "male" || gender === "female" ? gender : "other";
        genderPerformance[targetGender].total += percentage;
        genderPerformance[targetGender].count += 1;
        genderPerformance[targetGender].grades[gradeLabel] =
          (genderPerformance[targetGender].grades[gradeLabel] || 0) + 1;

        // 1. Group by Class
        const className = g.profiles?.grade || "Unassigned";
        if (!classData[className])
          classData[className] = { total: 0, count: 0 };
        classData[className].total += percentage;
        classData[className].count += 1;

        if (!gradeDistribution.byClass[className])
          gradeDistribution.byClass[className] = {};
        gradeDistribution.byClass[className][gradeLabel] =
          (gradeDistribution.byClass[className][gradeLabel] || 0) + 1;

        // 2. Group by Subject
        const subjectName = g.subjects?.name || "Unknown";
        const subjectId = g.subjects?.id;
        if (!subjectData[subjectName])
          subjectData[subjectName] = { total: 0, count: 0, id: subjectId };
        subjectData[subjectName].total += percentage;
        subjectData[subjectName].count += 1;

        if (!gradeDistribution.bySubject[subjectName])
          gradeDistribution.bySubject[subjectName] = {};
        gradeDistribution.bySubject[subjectName][gradeLabel] =
          (gradeDistribution.bySubject[subjectName][gradeLabel] || 0) + 1;

        // 3. Group by Department
        const deptName = g.subjects?.department || "General";
        if (!departmentData[deptName])
          departmentData[deptName] = { total: 0, count: 0 };
        departmentData[deptName].total += percentage;
        departmentData[deptName].count += 1;

        // 4. Group by Student
        const studentId = g.student_id;
        if (studentId) {
          if (!studentPerformance[studentId]) {
            const profile = g.profiles;
            const displayName = profile?.full_name || "Unknown Student";

            studentPerformance[studentId] = {
              id: studentId,
              name: displayName,
              class: profile?.grade || "Unassigned",
              total: 0,
              count: 0,
            };
          }
          studentPerformance[studentId].total += percentage;
          studentPerformance[studentId].count += 1;
        }

        // 5. Group by Teacher
        // Robust Mapping: First try student_subjects table
        let classId = studentSubjectMap?.find(
          (sm) => sm.student_id === g.student_id && sm.subject_id === g.subjects?.id
        )?.class_id;

        // Fallback: Use profiles.grade string mapping
        if (!classId) {
          const className = g.profiles?.grade || "Unassigned";
          classId = classNameToId[className];
        }

        const teacherMatch = classTeacherMap?.find(
          (m) => m.class_id === classId && m.subject_id === g.subjects?.id,
        );

        if (teacherMatch && teacherMatch.teacher_id) {
          const tId = teacherMatch.teacher_id;
          const tName = teacherMatch.profiles?.full_name || "Unknown Teacher";

          if (!teacherPerformance[tId]) {
            teacherPerformance[tId] = {
              id: tId,
              name: tName,
              total: 0,
              count: 0,
              grades: {},
              details: {
                classes: new Set(),
                subjects: new Set(),
                breakdown: {}
              }
            };
          }
          teacherPerformance[tId].total += percentage;
          teacherPerformance[tId].count += 1;
          teacherPerformance[tId].grades[gradeLabel] =
            (teacherPerformance[tId].grades[gradeLabel] || 0) + 1;
          
          // Track detailed breakdown
          const cName = classIdToName[classId] || "Unknown Class";
          const sName = g.subjects?.name || "Unknown Subject";
          teacherPerformance[tId].details.classes.add(cName);
          teacherPerformance[tId].details.subjects.add(sName);
          
          const detailKey = `${cName} - ${sName}`;
          if (!teacherPerformance[tId].details.breakdown[detailKey]) {
            teacherPerformance[tId].details.breakdown[detailKey] = { total: 0, count: 0 };
          }
          teacherPerformance[tId].details.breakdown[detailKey].total += percentage;
          teacherPerformance[tId].details.breakdown[detailKey].count += 1;
        }
      });

      const studentStats = Object.values(studentPerformance)
        .map((s: any) => ({
          ...s,
          average: Math.round(s.total / s.count),
        }))
        .sort((a: any, b: any) => b.average - a.average);

      // Only include students with a minimum of 70% as average score
      const topStudents = studentStats
        .filter((s) => s.average >= 70)
        .slice(0, 10);
      const lowStudents = [...studentStats].reverse().slice(0, 10);

      console.log(
        `[LiveStats] Top Students (>=70%): ${topStudents.length}, Low Students: ${lowStudents.length}`,
      );

      const performanceByClass = Object.entries(classData)
        .map(([name, stats]: any) => ({
          name,
          average: Math.round(stats.total / stats.count),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const performanceBySubject = Object.entries(subjectData)
        .map(([name, stats]: any) => ({
          name,
          average: Math.round(stats.total / stats.count),
        }))
        .sort((a, b) => b.average - a.average)
        .slice(0, 10);

      const performanceByDept = Object.entries(departmentData)
        .map(([name, stats]: any) => ({
          name,
          average: Math.round(stats.total / stats.count),
        }))
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
        const clsId = classNameToId[cls];
        const clsGrades = filteredGrades.filter(
          (g) => (g.profiles?.grade || "Unassigned") === cls,
        );
        const clsSubjects: any = {};
        clsGrades.forEach((g) => {
          const sName = g.subjects?.name || "Unknown";
          if (!clsSubjects[sName]) clsSubjects[sName] = { total: 0, count: 0 };
          clsSubjects[sName].total += g.percentage || 0;
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
                  (sum, g) => sum + (g.percentage || 0),
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
      website,
      signature_url,
      seal_url,
      logo_url,
      school_type,
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
          website,
          signature_url,
          seal_url,
          logo_url,
          school_type,
          updated_at: new Date(),
        })
        .eq("id", schoolId)
        .select()
        .single();

      if (error) throw error;
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
        const { data: enrollments } = await supabaseAdmin
          .from("enrollments")
          .select(
            "student_id, class_id, profiles!enrollments_student_id_fkey(full_name), classes(name)",
          )
          .in("class_id", targetClassIds)
          .eq("status", "Active");

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
          const { data: classSubjectRows } = await classSubjectRowsQuery;

          if (classSubjectRows && classSubjectRows.length > 0) {
            // 3. Collect teacher IDs
            const { data: assignmentTeacherRows } = await supabaseAdmin
              .from("assignments")
              .select("class_id, subject_id, teacher_id")
              .in("class_id", targetClassIds)
              .not("teacher_id", "is", null);

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
              const { data: teachers } = await supabaseAdmin
                .from("profiles")
                .select("id, full_name")
                .in("id", allTeacherIds);
              (teachers || []).forEach((t: any) =>
                teacherMap.set(t.id, t.full_name),
              );
            }

            // 4. Fetch Published & Draft grades
            let publishedGradesQuery = supabaseAdmin
              .from("student_grades")
              .select("student_id, subject_id")
              .in("student_id", studentIds)
              .eq("term", term)
              .eq("academic_year", academicYear)
              .in("status", ["Published", "Submitted"]);

            if (subjectId && subjectId !== "all") {
              publishedGradesQuery = publishedGradesQuery.eq(
                "subject_id",
                subjectId,
              );
            }
            const { data: publishedGrades } = await publishedGradesQuery;

            const publishedSet = new Set(
              (publishedGrades || []).map(
                (g: any) => `${g.student_id}-${g.subject_id}`,
              ),
            );

            let draftGradesQuery = supabaseAdmin
              .from("student_grades")
              .select("student_id, subject_id, status")
              .in("student_id", studentIds)
              .eq("term", term)
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
          .eq("academic_year", academicYear);

        if (subjectId && subjectId !== "all") {
          gradesQuery = gradesQuery.eq("subject_id", subjectId);
        }
        if (studentIds.length > 0) {
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
        classes(name),
        subjects(name, code),
        profiles(full_name)
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
        .select("id, full_name, role, created_at")
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

export const schoolAdminRouter = router;
