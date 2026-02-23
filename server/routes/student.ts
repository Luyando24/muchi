
import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireActiveLicense } from '../middleware/license';

const router = Router();

// Middleware to verify Student Role
const requireStudent = async (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*, schools(name, id)')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ message: 'Forbidden: Profile not found' });
    }

    if (profile.role !== 'student') {
      return res.status(403).json({ message: 'Forbidden: Requires student role' });
    }

    (req as any).user = user;
    (req as any).profile = profile;
    
    // Check for active license
    await requireActiveLicense(req, res, next);
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// GET /api/student/dashboard
// Returns overview stats
router.get('/dashboard', requireStudent, async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const studentId = profile.id;
  const schoolId = profile.school_id;

  try {
    // 1. Fetch Attendance
    const { data: attendance } = await supabaseAdmin
      .from('attendance')
      .select('status')
      .eq('student_id', studentId);

    let attendanceRate = 100;
    let daysPresent = 0;
    let daysAbsent = 0;
    
    if (attendance && attendance.length > 0) {
      daysPresent = attendance.filter(a => a.status === 'present').length;
      daysAbsent = attendance.filter(a => a.status === 'absent').length;
      attendanceRate = Math.round((daysPresent / attendance.length) * 100);
    }

    // 3. Pending Assignments
    const { data: assignments } = await supabaseAdmin
      .from('submissions')
      .select('status')
      .eq('student_id', studentId)
      .eq('status', 'pending');

    const pendingCount = assignments?.length || 0;

    // 4. Calculate Performance Status (Ethical alternative to Rank)
    let performanceStatus = 'N/A';
    let termAverage = 0;
    
    // Get student's current class
    const { data: enrollment } = await supabaseAdmin
      .from('enrollments')
      .select('class_id')
      .eq('student_id', studentId)
      .eq('status', 'Active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (enrollment) {
      // Get latest term/year for this student
      const { data: latestGrade } = await supabaseAdmin
        .from('student_grades')
        .select('academic_year, term')
        .eq('student_id', studentId)
        .order('academic_year', { ascending: false })
        .order('term', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestGrade) {
        // Get grades for THIS student only
        const { data: studentGrades } = await supabaseAdmin
          .from('student_grades')
          .select('percentage')
          .eq('student_id', studentId)
          .eq('academic_year', latestGrade.academic_year)
          .eq('term', latestGrade.term);

        if (studentGrades && studentGrades.length > 0) {
           const total = studentGrades.reduce((sum, g) => sum + (g.percentage || 0), 0);
           termAverage = Math.round(total / studentGrades.length);

           if (termAverage >= 75) performanceStatus = "Outstanding";
           else if (termAverage >= 65) performanceStatus = "Very Good";
           else if (termAverage >= 55) performanceStatus = "Good";
           else if (termAverage >= 45) performanceStatus = "Satisfactory";
           else performanceStatus = "Needs Improvement";
        }
      }
    }

    res.json({
      attendance: {
        overall: attendanceRate,
        present: daysPresent,
        absent: daysAbsent
      },
      pendingTasks: pendingCount,
      performance: performanceStatus,
      average: termAverage
    });

  } catch (error: any) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/student/assignments
router.get('/assignments', requireStudent, async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const studentId = profile.id;

  try {
    // Get student's class
    const { data: enrollment } = await supabaseAdmin
      .from('enrollments')
      .select('class_id')
      .eq('student_id', studentId)
      .single();

    if (!enrollment) {
      return res.json([]); // No class = no assignments
    }

    // Get assignments for class
    const { data: assignments, error } = await supabaseAdmin
      .from('assignments')
      .select(`
        *,
        subjects(name)
      `)
      .eq('class_id', enrollment.class_id)
      .order('due_date', { ascending: true });

    if (error) throw error;

    // Get submissions for these assignments to check status
    const { data: submissions } = await supabaseAdmin
      .from('submissions')
      .select('assignment_id, status, grade')
      .eq('student_id', studentId);

    const submissionMap = new Map(submissions?.map(s => [s.assignment_id, s]));

    const result = assignments.map(a => ({
      id: a.id,
      title: a.title,
      subject: a.subjects?.name || 'General',
      dueDate: a.due_date,
      type: a.type,
      category: a.category,
      assignmentNumber: a.assignment_number,
      status: submissionMap.get(a.id)?.status || 'pending',
      grade: submissionMap.get(a.id)?.grade
    }));

    res.json(result);
  } catch (error: any) {
    console.error('Assignments Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/student/assignments/:id/submit
router.post('/assignments/:id/submit', requireStudent, async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const studentId = profile.id;
  const { id } = req.params;
  const { file_url, comments } = req.body;

  try {
    // Check if assignment exists and is for student's class
    // We can skip strict class check for now if we trust the ID, but better to check
    // For now, just upsert submission
    
    const { data, error } = await supabaseAdmin
      .from('submissions')
      .upsert({
        assignment_id: id,
        student_id: studentId,
        file_url,
        content: comments,
        submitted_at: new Date().toISOString(),
        status: 'submitted'
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error('Submission Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/student/grades
router.get('/grades', requireStudent, async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const studentId = profile.id;
  const schoolId = profile.school_id;

  try {
    // 1. Fetch School Details (for branding)
    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single();

    if (schoolError) console.error('Error fetching school:', schoolError);

    // 2. Fetch Grading Scale
    const { data: gradingScale, error: scaleError } = await supabaseAdmin
      .from('grading_scales')
      .select('*')
      .eq('school_id', schoolId)
      .order('min_percentage', { ascending: false });

    if (scaleError) console.error('Error fetching grading scale:', scaleError);

    // 3. Fetch Student Class (Enrollment)
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .select('*, classes(name)')
      .eq('student_id', studentId)
      .eq('status', 'Active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (enrollmentError) console.error('Error fetching enrollment:', enrollmentError);

    // 4. Fetch Grades
    const { data: grades, error: gradesError } = await supabaseAdmin
      .from('student_grades')
      .select(`
        *,
        subjects(name, code, department)
      `)
      .eq('student_id', studentId)
      .order('academic_year', { ascending: false })
      .order('term', { ascending: false });

    if (gradesError) throw gradesError;

    // 5. Group by Term/Year
    const termResults: any[] = [];
    let currentGroup: any = null;
    
    // Since the query is sorted by year desc, term desc, we can just iterate and group
    for (const grade of grades) {
        if (!currentGroup || currentGroup.term !== grade.term || currentGroup.academicYear !== grade.academic_year) {
            if (currentGroup) {
                termResults.push(currentGroup);
            }
            currentGroup = {
                term: grade.term,
                academicYear: grade.academic_year,
                grades: []
            };
        }
        currentGroup.grades.push(grade);
    }
    if (currentGroup) {
        termResults.push(currentGroup);
    }

    // Construct final response
    const response = {
        student: {
            name: profile.full_name,
            studentNumber: profile.student_number || 'N/A',
            class: enrollment?.classes?.name || 'Unassigned'
        },
        school: school,
        gradingScale: gradingScale || [],
        termResults: termResults
    };

    res.json(response);
  } catch (error: any) {
    console.error('Grades Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/student/subjects
router.get('/subjects', requireStudent, async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const studentId = profile.id;

  try {
    // 1. Try to fetch from student_subjects junction table
    const { data: studentSubjects, error: ssError } = await supabaseAdmin
      .from('student_subjects')
      .select('subject_id, subjects(id, name, code, department)')
      .eq('student_id', studentId);

    if (ssError) {
        // If table doesn't exist (42P01) or other error, fallback to class subjects
        if (ssError.code !== '42P01') console.warn('Error fetching student_subjects:', ssError);
        throw new Error('Fallback to class subjects');
    }

    if (studentSubjects && studentSubjects.length > 0) {
        const subjects = studentSubjects.map((ss: any) => ({
            id: ss.subjects?.id,
            name: ss.subjects?.name,
            code: ss.subjects?.code,
            department: ss.subjects?.department
        })).filter((s: any) => s.id); // Filter out nulls
        return res.json(subjects);
    }

    // 2. Fallback: If no student-specific subjects found, try class subjects
    throw new Error('No student subjects found, trying class subjects');

  } catch (fallback) {
    // Fallback logic: Get class -> class_subjects
    try {
        const { data: enrollment } = await supabaseAdmin
            .from('enrollments')
            .select('class_id')
            .eq('student_id', studentId)
            .eq('status', 'Active')
            .maybeSingle();

        if (!enrollment || !enrollment.class_id) {
            return res.json([]); // No class, no subjects
        }

        const { data: classSubjects, error: csError } = await supabaseAdmin
            .from('class_subjects')
            .select('subject_id, subjects(id, name, code, department)')
            .eq('class_id', enrollment.class_id);

        if (csError) throw csError;

        const subjects = classSubjects.map((cs: any) => ({
            id: cs.subjects?.id,
            name: cs.subjects?.name,
            code: cs.subjects?.code,
            department: cs.subjects?.department
        })).filter((s: any) => s.id);

        res.json(subjects);
    } catch (error: any) {
        console.error('Get Student Subjects Error:', error);
        res.status(500).json({ message: error.message });
    }
  }
});

// GET /api/student/attendance
router.get('/attendance', requireStudent, async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const studentId = profile.id;

  try {
    const { data: attendance, error } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: false });

    if (error) throw error;

    // Calculate stats
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;

    // Calculate this month's stats
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const thisMonthRecords = attendance.filter(a => {
      const recordDate = new Date(a.date);
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });
    
    const thisMonthTotal = thisMonthRecords.length;
    const thisMonthPresent = thisMonthRecords.filter(a => a.status === 'present').length;
    const thisMonthPercentage = thisMonthTotal > 0 ? Math.round((thisMonthPresent / thisMonthTotal) * 100) : 100;

    res.json({
      records: attendance,
      stats: {
        total,
        present,
        absent,
        late,
        percentage: total > 0 ? Math.round((present / total) * 100) : 100,
        thisMonthPercentage
      }
    });
  } catch (error: any) {
    console.error('Attendance Error:', error);
    res.status(500).json({ message: error.message });
  }
});

export const studentRouter = router;
