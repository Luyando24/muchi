import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireActiveLicense } from '../middleware/license';
import { ensureSchoolSettings } from '../lib/school-settings';

const router = Router();

// --- PUBLIC ENDPOINTS ---

// POST /api/school/public-register
router.post('/public-register', async (req: Request, res: Response) => {
  const { name, email, password, grade, schoolSlug } = req.body;

  if (!name || !email || !password || !schoolSlug) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // 1. Get School ID from Slug
    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('id, name')
      .eq('slug', schoolSlug)
      .single();

    if (schoolError || !school) {
      return res.status(404).json({ message: 'School not found' });
    }

    // 2. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for demo
      user_metadata: { name, grade }
    });

    if (authError) {
      return res.status(400).json({ message: authError.message });
    }

    if (!authData.user) {
      return res.status(500).json({ message: 'Failed to create user' });
    }

    // 3. Create Profile (Student Role)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        role: 'student',
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
      return res.status(500).json({ message: 'Failed to create profile: ' + profileError.message });
    }

    res.status(201).json({ message: 'Registration successful', userId: authData.user.id });
  } catch (error: any) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET /api/school/public-events
router.get('/public-events', async (req: Request, res: Response) => {
  const { schoolSlug } = req.query;

  if (!schoolSlug) {
    return res.status(400).json({ message: 'School slug is required' });
  }

  try {
    // 1. Get School ID from Slug
    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('id')
      .eq('slug', schoolSlug)
      .single();

    if (schoolError || !school) {
      return res.status(404).json({ message: 'School not found' });
    }

    // 2. Fetch Events
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('calendar_events')
      .select('*')
      .eq('school_id', school.id)
      .gte('date', new Date().toISOString().split('T')[0]) // Only future/today events
      .order('date', { ascending: true })
      .limit(5);

    if (eventsError) throw eventsError;

    res.json(events);
  } catch (error: any) {
    console.error('Get Public Events Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Middleware to verify School Admin or Teacher
const requireSchoolRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    try {
      // Get user from token
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
      }

      // Check role in profiles table
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*, schools(name, id)')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return res.status(403).json({ message: 'Forbidden: Profile not found' });
      }

      if (!allowedRoles.includes(profile.role)) {
        return res.status(403).json({ message: `Forbidden: Requires one of [${allowedRoles.join(', ')}]` });
      }

      // Attach user and profile to request
      (req as any).user = user;
      (req as any).profile = profile; 
      
      // Check for active license
      requireActiveLicense(req, res, next);
    } catch (error: any) {
      console.error('Auth Middleware Error:', error);
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  };
};

// --- DASHBOARD ENDPOINTS ---

// GET /api/school/dashboard
router.get('/dashboard', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const user = (req as any).user;
  const profile = (req as any).profile;
  const schoolId = profile.school_id;

  console.log(`[Dashboard] Fetching stats for School ID: ${schoolId}, User: ${user.email}, Role: ${profile.role}`);
  
  try {
    // Parallel fetch for counts
    const [students, teachers, classes] = await Promise.all([
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'student'),
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'teacher'),
      supabaseAdmin.from('classes').select('id', { count: 'exact', head: true }).eq('school_id', schoolId)
    ]);

    if (students.error) console.error('[Dashboard] Students Query Error:', students.error);
    if (teachers.error) console.error('[Dashboard] Teachers Query Error:', teachers.error);
    if (classes.error) console.error('[Dashboard] Classes Query Error:', classes.error);

    const studentCount = students.count || 0;
    const teacherCount = teachers.count || 0;
    
    console.log(`[Dashboard] Counts - Students: ${studentCount}, Teachers: ${teacherCount}, Classes: ${classes.count || 0}`);

    // 4. Calculate Attendance Rate (Today)
    const today = new Date().toISOString().split('T')[0];
    let attendanceRateValue = "0%";
    let attendanceTrend = "+0%";

    // Get total attendance records for today (to check if any taken)
    const { count: totalAttendanceToday } = await supabaseAdmin
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('date', today);

    if (totalAttendanceToday && totalAttendanceToday > 0) {
      // Get present count
      const { count: presentCount } = await supabaseAdmin
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('date', today)
        .eq('status', 'present');
      
      // Calculate against submitted attendance for accurate daily rate
      const rate = Math.round(((presentCount || 0) / totalAttendanceToday) * 100);
      attendanceRateValue = `${rate}%`;
      
      // Simple trend logic
      if (rate >= 95) attendanceTrend = "+2%";
      else if (rate < 80) attendanceTrend = "-5%";
    } else {
      attendanceRateValue = "--"; // No data for today
    }

    // Construct response matching SchoolDashboardStats interface
    const responseData = {
      overview: {
        totalStudents: { value: studentCount, trend: "+5%", status: "up" },
        totalTeachers: { value: teacherCount, trend: "+0%", status: "up" },
        revenue: { value: "K0", trend: "+0%", status: "up" }, 
        attendanceRate: { value: attendanceRateValue, trend: attendanceTrend, status: attendanceRateValue === "--" || parseInt(attendanceRateValue) >= 90 ? "up" : "down" }
      },
      recentActivities: [], 
      financialSummary: [], 
      pendingApprovals: [], 
      announcements: [] 
    };

    console.log('Sending dashboard data:', JSON.stringify(responseData, null, 2));
    res.json(responseData);
  } catch (error: any) {
    console.error('Get Dashboard Stats Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// --- STUDENT MANAGEMENT ENDPOINTS ---

// GET /api/school/students
router.get('/students', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  console.log(`[Students] Fetching students for School ID: ${schoolId}`);
  
  try {
    const { data: students, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('school_id', schoolId)
      .eq('role', 'student')
      .order('full_name', { ascending: true });

    if (error) throw error;

    const formattedStudents = students.map((student: any) => ({
      id: student.id,
      firstName: student.full_name?.split(' ')[0] || '',
      lastName: student.full_name?.split(' ').slice(1).join(' ') || '',
      fullName: student.full_name,
      studentNumber: student.student_number || '', // Include student_number
      email: student.email || '', // Email might not be in profile, strictly speaking it's in auth.users, but maybe we copied it?
      grade: student.grade || 'Unassigned',
      gender: student.gender || 'Not specified',
      status: student.enrollment_status || 'Active',
      fees: student.fees_status || 'Pending',
      guardian: student.guardian_name || 'None'
    }));

    res.json(formattedStudents);
  } catch (error: any) {
    console.error('[Students] Get Students Error:', error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// GET /api/school/students/:id/details
router.get('/students/:id/details', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const studentId = req.params.id;

  try {
    // 1. Fetch Student Profile
    const { data: student, error: studentError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .eq('school_id', schoolId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // 2. Fetch Current Enrollment (Class)
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .select('*, classes(name)')
      .eq('student_id', studentId)
      .eq('status', 'Active') // Assuming 'Active' is the current status
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(); // Use maybeSingle to handle no enrollment gracefully

    // 3. Fetch Academic Performance (Grades)
    // Join with subjects to get subject names
    const { data: grades, error: gradesError } = await supabaseAdmin
      .from('student_grades')
      .select('*, subjects(name, code, department)')
      .eq('student_id', studentId)
      .order('academic_year', { ascending: false })
      .order('term', { ascending: false });

    // 3.5 Fetch Enrolled Subjects
    // Get subjects explicitly assigned to the student
    const { data: enrolledSubjects, error: subjectsError } = await supabaseAdmin
      .from('student_subjects')
      .select('subjects(name, code)')
      .eq('student_id', studentId);
      //.eq('academic_year', enrollment?.academic_year || new Date().getFullYear().toString()); // Optional: filter by year

    if (subjectsError) {
      console.error('Error fetching student subjects:', subjectsError);
    }

    // 4. Fetch Attendance Stats
    let attendanceStats;
    try {
      // Try fetching with term/year columns
      const { data, error } = await supabaseAdmin
        .from('attendance')
        .select('status, academic_year, term')
        .eq('student_id', studentId);
      
      if (error) throw error;
      attendanceStats = data;
    } catch (e: any) {
      // Fallback if columns don't exist
      console.warn('Fetching attendance with term columns failed, falling back to basic fetch:', e.message);
      const { data, error } = await supabaseAdmin
        .from('attendance')
        .select('status')
        .eq('student_id', studentId);
        
      if (!error) attendanceStats = data;
    }
    
    // Get current settings for term-specific stats
    const settings = await ensureSchoolSettings(schoolId);
    const currentAcademicYear = settings?.academic_year || new Date().getFullYear().toString();
    const currentTerm = settings?.current_term || 'Term 1';

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
        rate: 0
      }
    };

    if (attendanceStats) {
      attendanceStats.forEach((record: any) => {
        const status = record.status?.toLowerCase() as keyof typeof attendanceSummary;
        
        // Overall Stats
        if (attendanceSummary.overall.hasOwnProperty(status)) {
          (attendanceSummary.overall as any)[status]++;
        }
        attendanceSummary.overall.total++;
        
        // Current Term Stats (Default)
        // If record has no year/term (fallback mode), count it as current to show something
        const isCurrent = (record.academic_year === currentAcademicYear && record.term === currentTerm) || 
                          (!record.academic_year && !record.term);

        if (isCurrent) {
           if (attendanceSummary.hasOwnProperty(status)) {
             (attendanceSummary as any)[status]++;
           }
           attendanceSummary.total++;
        }
      });
      
      // Calculate Rates - Overall
      attendanceSummary.overall.rate = attendanceSummary.overall.total > 0
        ? Math.round(((attendanceSummary.overall.present + attendanceSummary.overall.late) / attendanceSummary.overall.total) * 100)
        : 0;
        
      // Calculate Rates - Current Term
      attendanceSummary.rate = attendanceSummary.total > 0 
        ? Math.round(((attendanceSummary.present + attendanceSummary.late) / attendanceSummary.total) * 100) 
        : 0;
    }

    // 5. Structure the Response
    const response = {
      profile: {
        ...student,
        className: enrollment?.classes?.name || 'Unassigned',
        academicYear: enrollment?.academic_year || new Date().getFullYear().toString(),
        fees_status: student.fees_status || 'Pending'
      },
      academics: {
        enrollment,
        grades: grades || [],
        // Prefer enrolled subjects from student_subjects table, fallback to grades if empty (for backward compatibility)
        subjects: (enrolledSubjects && enrolledSubjects.length > 0)
          ? enrolledSubjects.map((s: any) => s.subjects?.name).filter(Boolean)
          : (grades ? [...new Set(grades.map((g: any) => g.subjects?.name))] : [])
      },
      attendance: attendanceSummary
    };

    res.json(response);

  } catch (error: any) {
    console.error('[Student Details] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Helper to generate a unique student number
async function generateUniqueStudentNumber(): Promise<string> {
  let isUnique = false;
  let studentNumber = '';
  
  while (!isUnique) {
    // Generate format: YY + Month + Random 4 digits (e.g., 24051234)
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digits
    studentNumber = `${year}${month}${random}`;
    
    // Check uniqueness
    const { count } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('student_number', studentNumber);
      
    if (count === 0) {
      isUnique = true;
    }
  }
  return studentNumber;
}

// POST /api/school/create-student
router.post('/create-student', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { email, password, name, grade, guardian, gender } = req.body;

  try {
    // 1. Generate Student Number
    const studentNumber = await generateUniqueStudentNumber();
    
    // 2. Determine Email to use
    // If email is provided, use it. Otherwise generate a dummy email.
    const emailToUse = email && email.trim() !== '' 
      ? email 
      : `${studentNumber}@student.muchi.app`;

    // 3. Create Auth User
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: emailToUse,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: 'student',
        school_id: schoolId
      }
    });

    if (userError) throw userError;

    // 4. Update Profile with extra details including student_number
    if (user.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          grade,
          guardian_name: guardian,
          gender,
          student_number: studentNumber,
          enrollment_status: 'Active',
          fees_status: 'Pending'
        })
        .eq('id', user.user.id);

      if (profileError) console.error('Error updating student profile:', profileError);
    }

    res.status(201).json({ 
      message: 'Student created successfully', 
      user: user.user,
      studentNumber: studentNumber,
      emailUsed: emailToUse
    });
  } catch (error: any) {
    console.error('Create Student Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/students/bulk
router.post('/students/bulk', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { students } = req.body;

  if (!students || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ message: 'No students provided' });
  }

  let importedCount = 0;
  const errors: any[] = [];

  // Process sequentially to avoid rate limits and ensure uniqueness
  for (const student of students) {
    try {
        const studentNumber = await generateUniqueStudentNumber();
        const emailToUse = student.email && student.email.trim() !== '' 
            ? student.email 
            : `${studentNumber}@student.muchi.app`;
        
        // Default password
        const password = "Student123"; 

        const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: emailToUse,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: student.name,
                role: 'student',
                school_id: schoolId
            }
        });

        if (userError) throw userError;

        if (user.user) {
            // Check if profile exists (created by trigger) or needs creation/update
            // The trigger usually creates the profile on auth.users insert.
            // We update it with specific student fields.
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({
                    grade: student.grade,
                    guardian_name: student.guardian,
                    gender: student.gender,
                    student_number: studentNumber,
                    enrollment_status: 'Active',
                    fees_status: 'Pending'
                })
                .eq('id', user.user.id);

            if (profileError) {
                console.error(`Profile update error for ${student.name}:`, profileError);
                // If update fails, we might want to log it but not necessarily delete the user 
                // as the user exists. But for consistency, maybe we should.
                // For now, just log.
                throw profileError;
            }
            importedCount++;
        }
    } catch (error: any) {
        console.error(`Error importing student ${student.name}:`, error);
        errors.push({ name: student.name, error: error.message });
    }
  }

  res.json({ 
    message: 'Bulk import completed', 
    importedCount, 
    total: students.length,
    errors 
  });
});

// PUT /api/school/students/:id
// Update a student
router.put('/students/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;
  const { 
    firstName, 
    lastName, 
    grade, 
    gender, 
    guardian, 
    status, 
    fees, 
    email,
    phone_number,
    address,
    date_of_birth,
    guardian_contact
  } = req.body;

  try {
    // 1. Verify student belongs to this school
    const { data: studentCheck, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', id)
      .eq('school_id', schoolId)
      .single();

    if (checkError || !studentCheck) {
      return res.status(404).json({ message: 'Student not found in this school' });
    }

    // 2. Update Profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: `${firstName} ${lastName}`,
        grade,
        gender,
        guardian_name: guardian,
        enrollment_status: status,
        fees_status: fees,
        phone_number,
        address,
        date_of_birth: date_of_birth || null,
        guardian_contact
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // 3. Update Email if provided (requires auth admin)
    if (email) {
      if (typeof id === 'string') {
        const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(id, { email });
        if (emailError) console.warn('Failed to update email in auth:', emailError);
      }
    }

    res.json({ message: 'Student updated successfully' });
  } catch (error: any) {
    console.error('Update Student Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/students/:id/finance
// Update finance status
router.post('/students/:id/finance', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ fees_status: status })
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;

    res.json({ message: 'Finance status updated successfully' });
  } catch (error: any) {
    console.error('Update Finance Error:', error);
    res.status(500).json({ message: error.message });
  }
});



// POST /api/school/students/:id/enroll
// Enroll a student in a class
router.post('/students/:id/enroll', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;
  const { classId, academicYear } = req.body;

  if (!classId || !academicYear) {
    return res.status(400).json({ message: 'Class ID and Academic Year are required' });
  }

  try {
    // Check for existing enrollment in this academic year
    const { data: existingEnrollment } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('student_id', id)
      .eq('academic_year', academicYear)
      .maybeSingle();

    let enrollmentId = existingEnrollment?.id;

    if (existingEnrollment) {
      // Update existing enrollment
      const { error } = await supabaseAdmin
        .from('enrollments')
        .update({
          class_id: classId,
          status: 'Active'
        })
        .eq('id', existingEnrollment.id);
        
      if (error) throw error;
    } else {
      // Create new enrollment
      const { data: newEnrollment, error } = await supabaseAdmin
        .from('enrollments')
        .insert({
          school_id: schoolId,
          student_id: id,
          class_id: classId,
          academic_year: academicYear,
          status: 'Active'
        })
        .select()
        .single();
        
      if (error) throw error;
      enrollmentId = newEnrollment.id;
    }

    // Auto-subscribe to class subjects
    try {
      // 1. Fetch subjects for the class
      const { data: classSubjects, error: subjectsError } = await supabaseAdmin
        .from('class_subjects')
        .select('subject_id')
        .eq('class_id', classId);

      if (subjectsError) {
        console.error('Error fetching class subjects:', subjectsError);
      } else if (classSubjects && classSubjects.length > 0 && enrollmentId) {
        // 2. Clear existing subjects for this enrollment (if any, e.g. class change)
        // We use try-catch here because student_subjects might not exist yet if migration failed
        const { error: deleteError } = await supabaseAdmin
          .from('student_subjects')
          .delete()
          .eq('enrollment_id', enrollmentId);
          
        if (deleteError) {
            // Ignore error if table doesn't exist, but log others
            if (deleteError.code !== '42P01') console.error('Error clearing student subjects:', deleteError);
        } else {
            // 3. Insert new subjects
            const studentSubjects = classSubjects.map((cs: any) => ({
                student_id: id,
                subject_id: cs.subject_id,
                class_id: classId,
                academic_year: academicYear,
                enrollment_id: enrollmentId
            }));

            const { error: insertError } = await supabaseAdmin
                .from('student_subjects')
                .insert(studentSubjects);
                
            if (insertError) console.error('Error auto-subscribing subjects:', insertError);
        }
      }
    } catch (subError) {
      console.error('Auto-subscription failed (non-critical):', subError);
    }

    // Also update profile current grade/class for quick access
    // Get class name first
    const { data: classData } = await supabaseAdmin.from('classes').select('name').eq('id', classId).single();
    if (classData) {
      await supabaseAdmin.from('profiles').update({ grade: classData.name }).eq('id', id);
    }

    res.json({ message: 'Enrollment updated successfully' });
  } catch (error: any) {
    console.error('Enrollment Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Helper to calculate grade from percentage
async function calculateGrade(schoolId: string, percentage: number): Promise<{ grade: string, point: number | null }> {
  const { data: scales, error } = await supabaseAdmin
    .from('grading_scales')
    .select('*')
    .eq('school_id', schoolId)
    .lte('min_percentage', percentage)
    .gte('max_percentage', percentage)
    .maybeSingle();

  if (error || !scales) {
    // Fallback if no scale found
    return { grade: 'N/A', point: 0 };
  }

  return { grade: scales.grade, point: 0 }; // gpa_point removed from schema
}

// POST /api/school/students/:id/grades
// Add or update a grade
router.post('/students/:id/grades', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;
  const { subjectId, term, academicYear, percentage, comments } = req.body;

  if (!subjectId || !term || !academicYear || percentage === undefined) {
    return res.status(400).json({ message: 'Missing required grade fields' });
  }

  try {
    // Calculate grade based on percentage
    const { grade } = await calculateGrade(schoolId, percentage);

    const { error } = await supabaseAdmin
      .from('student_grades')
      .upsert({
        school_id: schoolId,
        student_id: id,
        subject_id: subjectId,
        term,
        academic_year: academicYear,
        grade,
        percentage,
        comments,
        status: 'Draft' // Default status
      }, { onConflict: 'student_id, subject_id, term, academic_year' });

    if (error) throw error;

    res.json({ message: 'Grade saved successfully', grade });
  } catch (error: any) {
    console.error('Save Grade Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/grades/batch
// Batch add or update grades
router.post('/grades/batch', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { grades } = req.body; // Array of { studentId, subjectId, term, academicYear, percentage, comments }

  if (!grades || !Array.isArray(grades)) {
    return res.status(400).json({ message: 'Invalid grades data' });
  }

  try {
    // Optimize: Fetch scales once
    const { data: scales } = await supabaseAdmin
      .from('grading_scales')
      .select('*')
      .eq('school_id', schoolId);

    const processedGrades = grades.map(g => {
      const scale = scales?.find(s => g.percentage >= s.min_percentage && g.percentage <= s.max_percentage);
      return {
        school_id: schoolId,
        student_id: g.studentId,
        subject_id: g.subjectId,
        term: g.term,
        academic_year: g.academicYear,
        grade: scale ? scale.grade : 'N/A',
        percentage: g.percentage,
        comments: g.comments,
        status: 'Draft'
      };
    });

    const { error } = await supabaseAdmin
      .from('student_grades')
      .upsert(processedGrades, { onConflict: 'student_id, subject_id, term, academic_year' });

    if (error) throw error;

    res.json({ message: 'Batch grades saved successfully' });
  } catch (error: any) {
    console.error('Batch Save Grade Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/results/publish
// Publish results for a class/term
router.post('/results/publish', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { term, academicYear, classId, subjectId } = req.body;

  if (!term || !academicYear) {
    return res.status(400).json({ message: 'Term and Academic Year are required' });
  }

  try {
    let query = supabaseAdmin
      .from('student_grades')
      .update({ status: 'Published' })
      .eq('school_id', schoolId)
      .eq('term', term)
      .eq('academic_year', academicYear);

    // Filter by subject if provided (Teacher publishing their subject)
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    // If classId is provided, we need to filter students in that class.
    // However, update with join is tricky in Supabase/PostgREST.
    // Easier to find student IDs first.
    if (classId) {
      const { data: enrollments } = await supabaseAdmin
        .from('enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('academic_year', academicYear);
      
      if (enrollments && enrollments.length > 0) {
        const studentIds = enrollments.map(e => e.student_id);
        query = query.in('student_id', studentIds);
      } else {
        return res.json({ message: 'No students found in this class' });
      }
    }

    const { error, count } = await query;

    if (error) throw error;

    res.json({ message: 'Results published successfully', count });
  } catch (error: any) {
    console.error('Publish Results Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/school/results/report-card/:studentId
// Generate report card data
router.get('/results/report-card/:studentId', requireSchoolRole(['school_admin', 'teacher', 'student']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { studentId } = req.params;
  let { term, academicYear } = req.query as { term?: string, academicYear?: string };

  // Auto-set term/year from settings if not provided
  if (!term || !academicYear) {
    try {
      const settings = await ensureSchoolSettings(schoolId);
      term = term || settings?.current_term || 'Term 1';
      academicYear = academicYear || settings?.academic_year || new Date().getFullYear().toString();
    } catch (e) {
      console.error('Failed to fetch settings for report card defaults', e);
      term = term || 'Term 1';
      academicYear = academicYear || new Date().getFullYear().toString();
    }
  }

  // Student can only see their own report
  if (profile.role === 'student' && profile.id !== studentId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    // 1. Fetch Student Profile & Class
    const { data: student } = await supabaseAdmin
      .from('profiles')
      .select('*, enrollments(classes(name))')
      .eq('id', studentId)
      .eq('school_id', schoolId)
      .eq('enrollments.academic_year', academicYear)
      .single();

    if (!student) return res.status(404).json({ message: 'Student not found' });

    // 2. Fetch Grades (Only Published if Student)
    let gradesQuery = supabaseAdmin
      .from('student_grades')
      .select('*, subjects(name, code, department)')
      .eq('student_id', studentId)
      .eq('term', term)
      .eq('academic_year', academicYear);

    if (profile.role === 'student') {
      gradesQuery = gradesQuery.eq('status', 'Published');
    }

    const { data: grades } = await gradesQuery;

    // 3. Fetch Grading Scales (for key)
    const { data: scales } = await supabaseAdmin
      .from('grading_scales')
      .select('*')
      .eq('school_id', schoolId)
      .order('min_percentage', { ascending: false });

    // 4. Fetch School Details
    const { data: schoolDetails } = await supabaseAdmin
      .from('schools')
      .select('name, address, email, phone, website, logo_url')
      .eq('id', schoolId)
      .single();

    // 5. Calculate Position (Rank) in Class - Optional/Complex
    // Skipping for now, can be added later

    res.json({
      school: schoolDetails,
      student: {
        name: student.full_name,
        studentNumber: student.student_number,
        class: student.enrollments?.[0]?.classes?.name || 'N/A',
        attendance: 0 // Placeholder
      },
      term,
      academicYear,
      grades: grades || [],
      gradingScale: scales || []
    });

  } catch (error: any) {
    console.error('Report Card Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/students/:id/attendance
// Add attendance record
router.post('/students/:id/attendance', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;
  const { date, status, remarks } = req.body;

  if (!date || !status) {
    return res.status(400).json({ message: 'Date and Status are required' });
  }

  try {
    const settings = await ensureSchoolSettings(schoolId);
    const academicYear = settings?.academic_year || new Date().getFullYear().toString();
    const term = settings?.current_term || 'Term 1';

    const { error } = await supabaseAdmin
      .from('attendance')
      .upsert({
        school_id: schoolId,
        student_id: id,
        date,
        status,
        remarks,
        recorded_by: profile.id,
        academic_year: academicYear,
        term: term,
        updated_at: new Date().toISOString()
      }, { onConflict: 'student_id, date' });

    if (error) throw error;

    res.json({ message: 'Attendance recorded successfully' });
  } catch (error: any) {
    console.error('Record Attendance Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/school/students/:id
// Delete (soft delete or hard delete) a student
router.delete('/students/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;

  try {
    // 1. Verify student belongs to this school
    const { data: studentCheck, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', id)
      .eq('school_id', schoolId)
      .single();

    if (checkError || !studentCheck) {
      return res.status(404).json({ message: 'Student not found in this school' });
    }

    // 2. Delete User (Cascades to profile usually, but let's be safe)
    // Using admin deleteUser removes from auth.users and usually cascades to public.profiles
    if (typeof id === 'string') {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (deleteError) throw deleteError;
    }

    res.json({ message: 'Student deleted successfully' });
  } catch (error: any) {
    console.error('Delete Student Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// --- TEACHER MANAGEMENT ENDPOINTS ---

// GET /api/school/teachers
router.get('/teachers', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  
  try {
    const { data: teachers, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('school_id', schoolId)
      .eq('role', 'teacher')
      .order('full_name', { ascending: true });

    if (error) throw error;

    const formattedTeachers = teachers.map((teacher: any) => ({
      id: teacher.id,
      firstName: teacher.full_name?.split(' ')[0] || '',
      lastName: teacher.full_name?.split(' ').slice(1).join(' ') || '',
      fullName: teacher.full_name,
      email: teacher.email || '',
      department: teacher.department || 'General',
      subjects: teacher.subjects || [],
      status: teacher.employment_status || 'Active',
      joinDate: teacher.join_date || new Date().toISOString().split('T')[0]
    }));

    res.json(formattedTeachers);
  } catch (error: any) {
    console.error('Get Teachers Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/create-teacher
router.post('/create-teacher', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { email, password, name, department, subjects, joinDate } = req.body;

  try {
    // 1. Create Auth User
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: 'teacher',
        school_id: schoolId
      }
    });

    if (userError) throw userError;

    // 2. Update Profile with extra details
    if (user.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          department,
          subjects, // Assumes text[] or jsonb in DB
          join_date: joinDate,
          employment_status: 'Active'
        })
        .eq('id', user.user.id);

      if (profileError) console.error('Error updating teacher profile:', profileError);
    }

    res.status(201).json({ message: 'Teacher created successfully', user: user.user });
  } catch (error: any) {
    console.error('Create Teacher Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/school/teachers/:id
// Get teacher details
router.get('/teachers/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;

  try {
    // 1. Fetch Teacher Profile
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('school_id', schoolId)
      .eq('role', 'teacher')
      .single();

    if (teacherError || !teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // 2. Fetch Assigned Classes (as Class Teacher)
    const { data: classes, error: classesError } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('class_teacher_id', id)
      .eq('school_id', schoolId);

    // 3. Fetch Subjects where they are Head Teacher
    const { data: subjectsHead, error: subjectsError } = await supabaseAdmin
      .from('subjects')
      .select('*')
      .eq('head_teacher_id', id)
      .eq('school_id', schoolId);

    // 4. Structure Response
    const response = {
      profile: {
        ...teacher,
        firstName: teacher.full_name?.split(' ')[0] || '',
        lastName: teacher.full_name?.split(' ').slice(1).join(' ') || '',
        joinDate: teacher.join_date || teacher.created_at,
        status: teacher.employment_status || 'Active'
      },
      classes: classes || [],
      headOfSubjects: subjectsHead || []
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get Teacher Details Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/school/teachers/:id
// Update teacher details
router.put('/teachers/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
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
    qualifications
  } = req.body;

  try {
    const updateData: any = {
      updated_at: new Date()
    };

    if (firstName && lastName) updateData.full_name = `${firstName} ${lastName}`;
    if (department !== undefined) updateData.department = department;
    if (subjects !== undefined) updateData.subjects = subjects;
    if (status !== undefined) updateData.employment_status = status;
    if (phone_number !== undefined) updateData.phone_number = phone_number;
    if (address !== undefined) updateData.address = address;
    if (qualifications !== undefined) updateData.qualifications = qualifications;
    
    // Handle date_of_birth: empty string means null, undefined means no change
    if (date_of_birth !== undefined) {
      updateData.date_of_birth = (date_of_birth && typeof date_of_birth === 'string' && date_of_birth.trim() !== '') 
        ? date_of_birth 
        : null;
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;

    res.json({ message: 'Teacher updated successfully' });
  } catch (error: any) {
    console.error('Update Teacher Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/school/teachers/:id
// Soft delete teacher
router.delete('/teachers/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;

  try {
    // Soft delete by setting status to 'Terminated' or 'Left'
    // Also clear auth access? For now just status.
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ 
        employment_status: 'Terminated',
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;

    // Optional: Disable auth user
    // await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: '876000h' }); // Ban for 100 years

    res.json({ message: 'Teacher deleted successfully' });
  } catch (error: any) {
    console.error('Delete Teacher Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// --- ACADEMIC MANAGEMENT ENDPOINTS ---

// GET /api/school/subjects
router.get('/subjects', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  
  try {
    let query = supabaseAdmin
      .from('subjects')
      .select('*, head:head_teacher_id(full_name)')
      .eq('school_id', schoolId)
      .order('name', { ascending: true });

    // Filter for teachers: only show subjects they teach or lead
     if (profile.role === 'teacher') {
       // 1. Subjects they teach
       const { data: taughtSubjects, error: taughtError } = await supabaseAdmin
         .from('class_subjects')
         .select('subject_id')
         .eq('teacher_id', profile.id);
       
       if (taughtError) console.error('Error fetching taught subjects:', taughtError);
       
       const taughtSubjectIds = taughtSubjects?.map((s: any) => s.subject_id) || [];

       // 2. Subjects they are Head of Department for
        const { data: headSubjects, error: headError } = await supabaseAdmin
          .from('subjects')
          .select('id')
          .eq('head_teacher_id', profile.id);
        
        if (headError) console.error('Error fetching head subjects:', headError);
        
        const headSubjectIds = headSubjects?.map((s: any) => s.id) || [];
 
        // 3. Subjects in classes where they are Class Teacher
        // First get the classes they manage
        const { data: classTeacherClasses } = await supabaseAdmin
          .from('classes')
          .select('id')
          .eq('class_teacher_id', profile.id);
        
        const classTeacherClassIds = classTeacherClasses?.map((c: any) => c.id) || [];
        
        let classTeacherSubjectIds: string[] = [];
        if (classTeacherClassIds.length > 0) {
          const { data: classSubjects } = await supabaseAdmin
            .from('class_subjects')
            .select('subject_id')
            .in('class_id', classTeacherClassIds);
            
          classTeacherSubjectIds = classSubjects?.map((s: any) => s.subject_id) || [];
        }

        const allIds = Array.from(new Set([...taughtSubjectIds, ...headSubjectIds, ...classTeacherSubjectIds]));

       if (allIds.length > 0) {
         query = query.in('id', allIds);
       } else {
         return res.json([]);
       }
     }

    const { data: subjects, error } = await query;

    if (error) throw error;

    const formattedSubjects = subjects.map((subject: any) => ({
      id: subject.id,
      name: subject.name,
      department: subject.department || '',
      headTeacherId: subject.head_teacher_id,
      headTeacherName: subject.head?.full_name || 'Unassigned',
      code: subject.code
    }));

    res.json(formattedSubjects);
  } catch (error: any) {
    console.error('Get Subjects Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/subjects
router.post('/subjects', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { name, department, headTeacherId, code } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('subjects')
      .insert({
        school_id: schoolId,
        name,
        department,
        head_teacher_id: headTeacherId || null,
        code
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create Subject Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/school/subjects/:id
router.put('/subjects/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;
  const { name, department, headTeacherId, code } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('subjects')
      .update({
        name,
        department,
        head_teacher_id: headTeacherId || null,
        code
        // updated_at: new Date() // updated_at column might be missing
      })
      .eq('id', id)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Update Subject Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/school/subjects/:id
router.delete('/subjects/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('subjects')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;
    res.json({ message: 'Subject deleted successfully' });
  } catch (error: any) {
    console.error('Delete Subject Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/school/classes
router.get('/classes', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  
  try {
    let query = supabaseAdmin
      .from('classes')
      .select('*, teacher:class_teacher_id(full_name)')
      .eq('school_id', schoolId)
      .order('name', { ascending: true });

    // Filter for teachers: only show classes they teach or are class teacher for
    if (profile.role === 'teacher') {
      // 1. Classes where they teach a subject
      const { data: subjectClasses } = await supabaseAdmin
        .from('class_subjects')
        .select('class_id')
        .eq('teacher_id', profile.id);
      
      const subjectClassIds = subjectClasses?.map((c: any) => c.class_id) || [];

      // 2. Classes where they are Class Teacher
      const { data: teacherClasses } = await supabaseAdmin
        .from('classes')
        .select('id')
        .eq('class_teacher_id', profile.id);
      
      const teacherClassIds = teacherClasses?.map((c: any) => c.id) || [];

      const allIds = Array.from(new Set([...subjectClassIds, ...teacherClassIds]));

      if (allIds.length > 0) {
        query = query.in('id', allIds);
      } else {
        return res.json([]);
      }
    }

    const { data: classes, error } = await query;

    if (error) throw error;

    const formattedClasses = classes.map((cls: any) => ({
      id: cls.id,
      name: cls.name,
      level: cls.level,
      room: cls.room,
      capacity: cls.capacity,
      classTeacherId: cls.class_teacher_id,
      classTeacherName: cls.teacher?.full_name || 'Unassigned'
    }));

    res.json(formattedClasses);
  } catch (error: any) {
    console.error('Get Classes Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/school/classes/:id/students
router.get('/classes/:id/students', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const classId = req.params.id;
  const { year } = req.query;
  const academicYear = year ? String(year) : new Date().getFullYear().toString();

  try {
    const { data: enrollments, error } = await supabaseAdmin
      .from('enrollments')
      .select('student_id, profiles(id, full_name, student_number)')
      .eq('class_id', classId)
      //.eq('school_id', schoolId) // enrollment has school_id, good to check
      .eq('academic_year', academicYear);
      
    if (error) throw error;

    const students = enrollments.map((e: any) => ({
      id: e.profiles.id,
      fullName: e.profiles.full_name,
      studentNumber: e.profiles.student_number || ''
    })).sort((a: any, b: any) => a.fullName.localeCompare(b.fullName));

    res.json(students);
  } catch (error: any) {
    console.error('Get Class Students Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/classes
router.post('/classes', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { name, level, room, capacity, classTeacherId } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('classes')
      .insert({
        school_id: schoolId,
        name,
        level,
        room,
        capacity: capacity || 40,
        class_teacher_id: classTeacherId || null
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create Class Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/school/classes/:id
router.put('/classes/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;
  const { name, level, room, capacity, classTeacherId } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('classes')
      .update({
        name,
        level,
        room,
        capacity,
        class_teacher_id: classTeacherId || null
        // updated_at column missing in some deployments
      })
      .eq('id', id)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Update Class Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/school/classes/:id
router.delete('/classes/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('classes')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;
    res.json({ message: 'Class deleted successfully' });
  } catch (error: any) {
    console.error('Delete Class Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/school/classes/:id/subjects
router.get('/classes/:id/subjects', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabaseAdmin
      .from('class_subjects')
      .select('subject_id, subjects(id, name, code, department)')
      .eq('class_id', id);

    if (error) throw error;
    // Map to just subjects
    const subjects = data.map((item: any) => item.subjects);
    res.json(subjects);
  } catch (error: any) {
    console.error('Get Class Subjects Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/classes/:id/subjects
router.post('/classes/:id/subjects', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { subjectIds } = req.body;

  if (!Array.isArray(subjectIds)) {
    return res.status(400).json({ message: 'subjectIds must be an array' });
  }

  try {
    // 1. Delete existing subjects
    const { error: deleteError } = await supabaseAdmin
      .from('class_subjects')
      .delete()
      .eq('class_id', id);
    
    if (deleteError) throw deleteError;

    // 2. Insert new subjects
    if (subjectIds.length > 0) {
      const subjectsToInsert = subjectIds.map((subjectId: string) => ({
        class_id: id,
        subject_id: subjectId
      }));

      const { error: insertError } = await supabaseAdmin
        .from('class_subjects')
        .insert(subjectsToInsert);
      
      if (insertError) throw insertError;
    }

    res.json({ message: 'Class subjects updated successfully' });
  } catch (error: any) {
    console.error('Update Class Subjects Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// --- FINANCE ENDPOINTS ---

// GET /api/school/finance
router.get('/finance', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  
  try {
    const { data: records, error } = await supabaseAdmin
      .from('finance_records')
      .select('*')
      .eq('school_id', schoolId)
      .order('date', { ascending: false });

    if (error) throw error;
    res.json(records);
  } catch (error: any) {
    console.error('Get Finance Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/finance
router.post('/finance', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { category, amount, type, description, date } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('finance_records')
      .insert({
        school_id: schoolId,
        category,
        amount,
        type,
        description,
        date: date || new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create Finance Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/school/finance/:id
router.put('/finance/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;
  const { category, amount, type, description, date } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('finance_records')
      .update({
        category,
        amount,
        type,
        description,
        date
      })
      .eq('id', id)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Update Finance Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/school/finance/:id
router.delete('/finance/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('finance_records')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;
    res.json({ message: 'Record deleted successfully' });
  } catch (error: any) {
    console.error('Delete Finance Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/school/finance/stats
router.get('/finance/stats', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  
  try {
    const { data: records, error } = await supabaseAdmin
      .from('finance_records')
      .select('amount, type, date')
      .eq('school_id', schoolId);

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
      
      if (record.type === 'income') {
        totalRevenue += amount;
        if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
          monthlyRevenue += amount;
        }
      } else {
        totalExpenses += amount;
        if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
          monthlyExpenses += amount;
        }
      }
    });

    res.json({
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      monthlyRevenue,
      monthlyExpenses
    });
  } catch (error: any) {
    console.error('Get Finance Stats Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// --- REPORTS ENDPOINTS ---

// GET /api/school/reports
router.get('/reports', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { term, academicYear } = req.query;
  
  try {
    let query = supabaseAdmin
      .from('reports')
      .select('*, generated_by:generated_by(full_name)')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }
    
    if (term) {
      query = query.eq('term', term);
    }

    let reports;
    try {
      // Try with filters (which might use new columns)
      const { data, error } = await query;
      if (error) throw error;
      reports = data;
    } catch (e: any) {
      console.warn('Fetching reports with filters failed, retrying without filters:', e.message);
      // Fallback query without term/year filters
      const { data, error } = await supabaseAdmin
        .from('reports')
        .select('*, generated_by:generated_by(full_name)')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      reports = data;
    }
    
    res.json(reports);
  } catch (error: any) {
    console.error('Get Reports Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/reports
router.post('/reports', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const user = (req as any).user;
  const { title, type, description } = req.body;

  try {
    // Get current term/year
    const settings = await ensureSchoolSettings(schoolId);
    const academicYear = settings?.academic_year || new Date().getFullYear().toString();
    const term = settings?.current_term || 'Term 1';

    // 1. Create Report Record
    const { data, error } = await supabaseAdmin
      .from('reports')
      .insert({
        school_id: schoolId,
        title,
        type,
        generated_by: user.id,
        status: 'Ready', // Simulate instant generation
        file_url: null, // No actual file for now
        created_at: new Date(),
        academic_year: academicYear,
        term: term
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create Report Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/school/reports/:id
router.delete('/reports/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('reports')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;
    res.json({ message: 'Report deleted successfully' });
  } catch (error: any) {
    console.error('Delete Report Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// --- CALENDAR ENDPOINTS ---

// GET /api/school/calendar
router.get('/calendar', requireSchoolRole(['school_admin', 'teacher', 'student']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  
  try {
    const { data: events, error } = await supabaseAdmin
      .from('calendar_events')
      .select('*')
      .eq('school_id', schoolId)
      .order('date', { ascending: true });

    if (error) throw error;
    res.json(events);
  } catch (error: any) {
    console.error('Get Calendar Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/calendar
router.post('/calendar', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const user = (req as any).user;
  const { title, description, date, time, type, location } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('calendar_events')
      .insert({
        school_id: schoolId,
        title,
        description,
        date,
        time,
        type,
        location,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create Calendar Event Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/school/calendar/:id
router.put('/calendar/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;
  const { title, description, date, time, type, location } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('calendar_events')
      .update({
        title,
        description,
        date,
        time,
        type,
        location
      })
      .eq('id', id)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Update Calendar Event Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/school/calendar/:id
router.delete('/calendar/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;
    res.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('Delete Calendar Event Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// --- SETTINGS ENDPOINTS ---

// GET /api/school/settings
// Allow teachers and students to read settings too (for academic year context)
router.get('/settings', requireSchoolRole(['school_admin', 'teacher', 'student']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  
  try {
    // Use ensureSchoolSettings to get (and optionally init) settings
    const school = await ensureSchoolSettings(schoolId);

    if (!school) {
        return res.status(404).json({ message: 'School settings not found' });
    }
    
    res.json(school);
  } catch (error: any) {
    console.error('Get School Settings Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/school/settings
router.put('/settings', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { name, academic_year, current_term, email, phone, address, website } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('schools')
      .update({
        name,
        academic_year,
        current_term,
        email,
        phone,
        address,
        website,
        updated_at: new Date()
      })
      .eq('id', schoolId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Update School Settings Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// --- NOTIFICATIONS ENDPOINTS ---

// GET /api/school/notifications
router.get('/notifications', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json(notifications);
  } catch (error: any) {
    console.error('Get Notifications Error:', error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// PUT /api/school/notifications/:id/read
router.put('/notifications/:id/read', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Mark Notification Read Error:', error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// --- SEARCH ENDPOINT ---

// GET /api/school/search
router.get('/search', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const query = req.query.q as string;

  if (!query || query.length < 2) {
    return res.json({ students: [], teachers: [] });
  }

  try {
    // Search students
    const { data: students } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, grade')
      .eq('school_id', schoolId)
      .eq('role', 'student')
      .ilike('full_name', `%${query}%`)
      .limit(5);

    // Search teachers
    const { data: teachers } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, subject')
      .eq('school_id', schoolId)
      .eq('role', 'teacher')
      .ilike('full_name', `%${query}%`)
      .limit(5);

    res.json({
      students: students || [],
      teachers: teachers || []
    });
  } catch (error: any) {
    console.error('Search Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// --- GRADING SYSTEM ENDPOINTS ---

// GET /api/school/grading-scales
router.get('/grading-scales', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;

  try {
    const { data, error } = await supabaseAdmin
      .from('grading_scales')
      .select('*')
      .eq('school_id', schoolId)
      .order('min_percentage', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Get Grading Scales Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/grading-scales
router.post('/grading-scales', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { grade, min_percentage, max_percentage, description } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('grading_scales')
      .insert({
        school_id: schoolId,
        grade,
        min_percentage,
        max_percentage,
        description
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create Grading Scale Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/school/grading-scales/:id
router.put('/grading-scales/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;
  const { grade, min_percentage, max_percentage, description } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('grading_scales')
      .update({
        grade,
        min_percentage,
        max_percentage,
        description,
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Update Grading Scale Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/school/grading-scales/:id
router.delete('/grading-scales/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('grading_scales')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;
    res.json({ message: 'Grading scale deleted successfully' });
  } catch (error: any) {
    console.error('Delete Grading Scale Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/school/grading-weights
router.get('/grading-weights', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;

  try {
    const { data, error } = await supabaseAdmin
      .from('grading_weights')
      .select('*')
      .eq('school_id', schoolId)
      .order('weight_percentage', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Get Grading Weights Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/grading-weights
router.post('/grading-weights', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { assessment_type, weight_percentage } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('grading_weights')
      .insert({
        school_id: schoolId,
        assessment_type,
        weight_percentage
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create Grading Weight Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/school/grading-weights/:id
router.put('/grading-weights/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;
  const { assessment_type, weight_percentage } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('grading_weights')
      .update({
        assessment_type,
        weight_percentage,
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Update Grading Weight Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/school/grading-weights/:id
router.delete('/grading-weights/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('grading_weights')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;
    res.json({ message: 'Grading weight deleted successfully' });
  } catch (error: any) {
    console.error('Delete Grading Weight Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/calculate-grades
// Calculate and publish term grades for a class/subject based on weights
router.post('/calculate-grades', requireSchoolRole(['school_admin', 'teacher']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { classId, subjectId, term, academicYear } = req.body;

  if (!classId || !term || !academicYear) {
    return res.status(400).json({ message: 'Missing required fields: classId, term, academicYear' });
  }

  try {
    console.log(`[Grading] Calculating grades for Class: ${classId}, Subject: ${subjectId || 'All'}, Term: ${term}`);

    // 1. Get Grading Weights
    const { data: weights, error: weightsError } = await supabaseAdmin
      .from('grading_weights')
      .select('*')
      .eq('school_id', schoolId);

    if (weightsError) throw weightsError;
    if (!weights || weights.length === 0) {
      return res.status(400).json({ message: 'No grading weights defined for this school' });
    }

    // 2. Get Grading Scales
    const { data: scales, error: scalesError } = await supabaseAdmin
      .from('grading_scales')
      .select('*')
      .eq('school_id', schoolId)
      .order('min_percentage', { ascending: false });

    if (scalesError) throw scalesError;
    if (!scales || scales.length === 0) {
      return res.status(400).json({ message: 'No grading scales defined for this school' });
    }

    // 3. Get Students in Class
    const { data: enrollments, error: enrollError } = await supabaseAdmin
      .from('enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('status', 'Active');

    if (enrollError) throw enrollError;
    const studentIds = enrollments.map((e: any) => e.student_id);

    if (studentIds.length === 0) {
      return res.json({ message: 'No active students in this class' });
    }

    // 4. Get Assignments & Submissions
    // Filter assignments by class and optionally subject
    let assignmentsQuery = supabaseAdmin
      .from('assignments')
      .select('id, type, max_score, subject_id')
      .eq('class_id', classId);

    if (subjectId) {
      assignmentsQuery = assignmentsQuery.eq('subject_id', subjectId);
    }

    const { data: assignments, error: assignError } = await assignmentsQuery;
    if (assignError) throw assignError;

    if (!assignments || assignments.length === 0) {
      return res.json({ message: 'No assignments found for calculation' });
    }

    const assignmentIds = assignments.map((a: any) => a.id);
    const assignmentMap = new Map(assignments.map((a: any) => [a.id, a]));

    // Fetch submissions for these assignments and students
    const { data: submissions, error: subError } = await supabaseAdmin
      .from('submissions')
      .select('student_id, assignment_id, score')
      .in('assignment_id', assignmentIds)
      .in('student_id', studentIds)
      .not('score', 'is', null);

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

    const gradesToUpsert: any[] = [];

    // Iterate over each subject found in assignments
    for (const [subjId, subjAssignments] of assignmentsBySubject.entries()) {
      // For each student
      for (const studentId of studentIds) {
        let totalWeightedScore = 0;
        let totalWeightUsed = 0;

        // Group student's submissions for this subject by Type
        const studentSubmissions = submissions?.filter((s: any) => 
          s.student_id === studentId && 
          subjAssignments.some((a: any) => a.id === s.assignment_id)
        ) || [];

        // Calculate score for each weight category (e.g. Homework, Exam)
        for (const weight of weights) {
          const typeAssignments = subjAssignments.filter((a: any) => a.type === weight.assessment_type);
          
          if (typeAssignments.length === 0) continue; // No assignments of this type

          let typeTotalScore = 0;
          let typeMaxScore = 0;

          typeAssignments.forEach((a: any) => {
            const sub = studentSubmissions.find((s: any) => s.assignment_id === a.id);
            if (sub) {
              typeTotalScore += (sub.score || 0);
              typeMaxScore += (a.max_score || 100);
            }
          });

          if (typeMaxScore > 0) {
            const typePercentage = (typeTotalScore / typeMaxScore) * 100;
            totalWeightedScore += (typePercentage * (weight.weight_percentage / 100));
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
        const gradeScale = scales.find((s: any) => roundedPercentage >= s.min_percentage);
        const letterGrade = gradeScale ? gradeScale.grade : 'F'; // Default to F if no match (or lowest)

        gradesToUpsert.push({
          school_id: schoolId,
          student_id: studentId,
          subject_id: subjId,
          term,
          academic_year: academicYear,
          grade: letterGrade,
          percentage: roundedPercentage,
          comments: `Calculated on ${new Date().toISOString().split('T')[0]}`
        });
      }
    }

    // 6. Upsert Grades
    if (gradesToUpsert.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('student_grades')
        .upsert(gradesToUpsert, { onConflict: 'student_id, subject_id, term, academic_year' });

      if (upsertError) throw upsertError;
    }

    res.json({ 
      message: 'Grades calculated successfully', 
      count: gradesToUpsert.length,
      details: gradesToUpsert.map(g => ({ student: g.student_id, subject: g.subject_id, grade: g.grade }))
    });

  } catch (error: any) {
    console.error('Calculate Grades Error:', error);
    res.status(500).json({ message: error.message });
  }
});


// DELETE /api/school/grading-weights/:id
router.delete('/grading-weights/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('grading_weights')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;
    res.json({ message: 'Grading weight deleted successfully' });
  } catch (error: any) {
    console.error('Delete Grading Weight Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// --- TIMETABLE ENDPOINTS ---

// GET /api/school/timetables
router.get('/timetables', requireSchoolRole(['school_admin', 'teacher', 'student']), async (req: Request, res: Response) => {
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
      .from('timetables')
      .select(`
        *,
        classes(name),
        subjects(name, code),
        profiles(full_name)
      `)
      .eq('school_id', schoolId);

    if (class_id) query = query.eq('class_id', class_id);
    if (teacher_id) query = query.eq('teacher_id', teacher_id);
    
    // Filter by academic year and term if resolved
    if (targetYear) query = query.eq('academic_year', targetYear);
    if (targetTerm) query = query.eq('term', targetTerm);

    const { data, error } = await query.order('day_of_week').order('start_time');

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Get Timetables Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/timetables
router.post('/timetables', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { day_of_week, start_time, end_time, class_id, subject_id, teacher_id, room, academic_year, term } = req.body;

  try {
    // Basic validation
    if (!day_of_week || !start_time || !end_time || !class_id || !subject_id) {
      return res.status(400).json({ message: 'Missing required fields' });
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
        return res.status(400).json({ message: 'Academic year and term could not be determined. Please configure school settings.' });
    }

    // Check for conflicts (simple overlap check)
    // 1. Same class, overlapping time
    // 2. Same teacher, overlapping time (if teacher assigned)
    // 3. Same room, overlapping time (if room assigned)
    
    // For now, let's just create it and let the UI handle visual conflict detection or add strict checks later
    
    const { data, error } = await supabaseAdmin
      .from('timetables')
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
        term: targetTerm
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create Timetable Entry Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/school/timetables/:id
router.put('/timetables/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;
  const { day_of_week, start_time, end_time, class_id, subject_id, teacher_id, room, academic_year, term } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('timetables')
      .update({
        day_of_week,
        start_time,
        end_time,
        class_id,
        subject_id,
        teacher_id: teacher_id || null,
        room,
        academic_year, // Optional update
        term,          // Optional update
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Update Timetable Entry Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/school/timetables/:id
router.delete('/timetables/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('timetables')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;
    res.json({ message: 'Timetable entry deleted successfully' });
  } catch (error: any) {
    console.error('Delete Timetable Entry Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// --- ADMIN MANAGEMENT ENDPOINTS ---

// GET /api/school/admins
router.get('/admins', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;

  try {
    const { data: admins, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .eq('school_id', schoolId)
      .eq('role', 'school_admin')
      .order('full_name', { ascending: true });

    if (error) throw error;
    res.json(admins);
  } catch (error: any) {
    console.error('Get Admins Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/admins
router.post('/admins', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { full_name, email, password } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: 'school_admin',
        school_id: schoolId
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // 2. Ensure Profile is correct (Trigger might have created it, but we need to ensure email is set)
    // We use upsert to handle both cases (trigger ran or didn't)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        role: 'school_admin',
        school_id: schoolId,
        full_name,
        email
      });

    if (profileError) {
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    res.status(201).json({ message: 'Admin created successfully', user: authData.user });
  } catch (error: any) {
    console.error('Create Admin Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/school/admins/:id
router.delete('/admins/:id', requireSchoolRole(['school_admin']), async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;
  const { id } = req.params;

  // Prevent deleting yourself
  if (id === profile.id) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }

  try {
    // Verify target is a school admin in the same school
    const { data: target, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', id)
      .eq('school_id', schoolId)
      .single();

    if (targetError || !target) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (target.role !== 'school_admin') {
      return res.status(400).json({ message: 'Target user is not a school admin' });
    }

    // Delete from Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
    
    if (deleteError) throw deleteError;

    // Ensure profile is deleted
    await supabaseAdmin.from('profiles').delete().eq('id', id);

    res.json({ message: 'Admin deleted successfully' });
  } catch (error: any) {
    console.error('Delete Admin Error:', error);
    res.status(500).json({ message: error.message });
  }
});

export const schoolAdminRouter = router;
