
import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireActiveLicense } from '../middleware/license.js';
import { ensureSchoolSettings } from '../lib/school-settings.js';
import { randomUUID } from 'crypto';

const router = Router();

// Middleware to verify Teacher Role
const requireTeacher = async (req: Request, res: Response, next: any) => {
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

    // Allow school_admin to act as teacher too, or strictly teacher? 
    // Usually admins can do everything, but for now let's strict to teacher or admin
    const isTeacher = profile.role === 'teacher' || (profile.secondary_role === 'teacher');
    const isAdmin = profile.role === 'school_admin' || profile.role === 'system_admin';

    if (!isTeacher && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden: Requires teacher or admin role' });
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

// GET /api/teacher/classes
// Get classes assigned to the teacher
router.get('/classes', requireTeacher, async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const teacherId = profile.id;
  const schoolId = profile.school_id;

  try {
    let query = supabaseAdmin
      .from('classes')
      .select('*')
      .eq('school_id', schoolId);

    // If teacher (primary or secondary), filter by teacher_id
    if (profile.role === 'teacher' || profile.secondary_role === 'teacher') {

      // 1. Get classes where they are the Class Teacher (homeroom)
      const { data: homeroomClasses } = await supabaseAdmin
        .from('classes')
        .select('id')
        .eq('class_teacher_id', teacherId);
      
      const homeroomIds = homeroomClasses?.map(c => c.id) || [];

      // 2. Get classes where they teach a subject
      const { data: subjectClasses } = await supabaseAdmin
        .from('class_subjects')
        .select('class_id')
        .eq('teacher_id', teacherId);
      
      const subjectClassIds = subjectClasses?.map(c => c.class_id) || [];

      // 3. Combine and filter
      const allClassIds = Array.from(new Set([...homeroomIds, ...subjectClassIds]));
      
      if (allClassIds.length > 0) {
        query = query.in('id', allClassIds);
      } else {
        return res.json([]);
      }
    }

    const { data: classes, error } = await query;


    if (error) throw error;

    // Fetch student counts for each class
    const classesWithCounts = await Promise.all(classes.map(async (cls) => {
        const { count } = await supabaseAdmin
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)
            .eq('status', 'Active');
        
        return {
            ...cls,
            student_count: count || 0
        };
    }));

    res.json(classesWithCounts);
  } catch (error: any) {
    console.error('Get Classes Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/teacher/all-school-classes
// Get all classes in the school (for self-assignment)
router.get('/all-school-classes', requireTeacher, async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const schoolId = profile.school_id;

  try {
    const { data: classes, error } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('school_id', schoolId)
      .order('name');

    if (error) throw error;
    res.json(classes);
  } catch (error: any) {
    console.error('Get All School Classes Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/teacher/classes/:classId/students
// Get students in a specific class
router.get('/classes/:classId/students', requireTeacher, async (req: Request, res: Response) => {
  const { classId } = req.params;

  try {
    const { data: enrollments, error } = await supabaseAdmin
      .from('enrollments')
      .select(`
        student_id,
        profiles:student_id (
          id,
          full_name,
          student_number
        )
      `)
      .eq('class_id', classId)
      .eq('status', 'Active'); // Only active students

    if (error) throw error;

    // Transform to flat list of students
    const students = enrollments.map((e: any) => ({
      id: e.profiles.id,
      name: e.profiles.full_name,
      studentId: e.profiles.student_number || e.profiles.id // Use student_number, fallback to ID if missing
    }));

    res.json(students);
  } catch (error: any) {
    console.error('Get Class Students Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/teacher/attendance/:classId/:date
// Get attendance for a class on a specific date
router.get('/attendance/:classId/:date', requireTeacher, async (req: Request, res: Response) => {
  const { classId, date } = req.params;
  const profile = (req as any).profile;

  try {
    // First get students in this class
    const { data: enrollments, error: enrollError } = await supabaseAdmin
      .from('enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('status', 'Active');
    
    if (enrollError) throw enrollError;
    
    const studentIds = enrollments.map((e: any) => e.student_id);
    
    if (studentIds.length === 0) {
      return res.json([]);
    }

    // Then fetch attendance for these students
    const { data: attendance, error } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .in('student_id', studentIds)
      .eq('date', date);

    if (error) throw error;

    res.json(attendance);
  } catch (error: any) {
    console.error('Get Attendance Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/teacher/attendance
// Submit attendance
router.post('/attendance', requireTeacher, async (req: Request, res: Response) => {
  const { classId, date, records } = req.body;
  // records: [{ student_id, status, remarks }]
  const profile = (req as any).profile;

  if (!classId || !date || !records || !Array.isArray(records)) {
    return res.status(400).json({ message: 'Invalid request body' });
  }

  try {
    // Prepare upsert data
    // Note: attendance table might be missing class_id, remarks, recorded_by columns in some environments.
    // Also, unique constraint on (student_id, date) might be missing.
    // So we manual check existing records first.
    
    // 1. Validate payload
    const studentIds = records.map((r: any) => r.student_id);
    
    console.log('Saving attendance for student IDs:', studentIds);

    // Verify all student IDs exist in profiles to prevent FK errors
    const { data: validProfiles, error: validationError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .in('id', studentIds);
    
    if (validationError) {
      console.error('Error validating profiles:', validationError);
      return res.status(500).json({ message: 'Error validating students' });
    }

    const validIds = new Set(validProfiles?.map(p => p.id));
    const invalidIds = studentIds.filter((id: string) => !validIds.has(id));

    if (invalidIds.length > 0) {
      console.error('Invalid student IDs found:', invalidIds);
      return res.status(400).json({ 
        message: 'Invalid student IDs found. These students may have been deleted.',
        invalidIds 
      });
    }

    // Simplified Upsert Logic
    // Uses UNIQUE(student_id, date) constraint to handle updates
    
    // Get School Settings for Academic Year/Term
    const settings = await ensureSchoolSettings(profile.school_id);
    const academicYear = settings?.academic_year || new Date().getFullYear().toString();
    const term = settings?.current_term || 'Term 1';

    // Using upsert with conflict on (student_id, date)
    const upsertData = records.map((r: any) => ({
      school_id: profile.school_id,
      student_id: r.student_id,
      class_id: classId, 
      date: date,
      status: r.status,
      remarks: r.remarks, 
      recorded_by: profile.id, 
      academic_year: academicYear,
      term: term,
      updated_at: new Date().toISOString()
    }));

    console.log(`Attempting to upsert ${upsertData.length} attendance records`);

    const { error: upsertError } = await supabaseAdmin
      .from('attendance')
      .upsert(upsertData, { onConflict: 'student_id,date' });

    if (upsertError) {
      console.error('Upsert Error:', upsertError);
      throw upsertError;
    }

    res.json({ message: 'Attendance saved successfully', count: upsertData.length });
  } catch (error: any) {
    console.error('Save Attendance Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/teacher/dashboard-stats
router.get('/dashboard-stats', requireTeacher, async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const teacherId = profile.id;
  const schoolId = profile.school_id;

  try {
    // 1. Total Students (unique students in classes taught by teacher)
    // Get all classes teacher is involved in
    const isTeacher = profile.role === 'teacher' || profile.secondary_role === 'teacher';
    
    const { data: homeroomClasses } = await supabaseAdmin

      .from('classes')
      .select('id')
      .eq('class_teacher_id', teacherId);
    
    const { data: subjectClasses } = await supabaseAdmin
      .from('class_subjects')
      .select('class_id')
      .eq('teacher_id', teacherId);
    
    const allClassIds = Array.from(new Set([
      ...(homeroomClasses?.map(c => c.id) || []),
      ...(subjectClasses?.map(c => c.class_id) || [])
    ]));

    let totalStudents = 0;
    if (allClassIds.length > 0) {
      const { count } = await supabaseAdmin
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .in('class_id', allClassIds)
        .eq('status', 'Active');
      totalStudents = count || 0;
    }

    // 2. Classes Today (based on timetable - simple count for now)
    const classesCount = allClassIds.length;

    // 3. Pending Grading (assignments with ungraded submissions)
    const { data: myAssignments } = await supabaseAdmin
      .from('assignments')
      .select('id')
      .eq('teacher_id', teacherId);
      
    let pendingCount = 0;
    if (myAssignments && myAssignments.length > 0) {
       const assignmentIds = myAssignments.map(a => a.id);
       const { count } = await supabaseAdmin
         .from('submissions')
         .select('id', { count: 'exact', head: true })
         .in('assignment_id', assignmentIds)
         .eq('status', 'submitted');
       pendingCount = count || 0;
    }

    // 4. Average Attendance (Overall for my classes)
    let averageAttendance = 0;
    
    if (allClassIds.length > 0) {
      // Get total attendance records
      const { count: totalRecords } = await supabaseAdmin
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .in('class_id', allClassIds);

      if (totalRecords && totalRecords > 0) {
        // Get present records
        const { count: presentCount } = await supabaseAdmin
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .in('class_id', allClassIds)
          .eq('status', 'present');
          
        averageAttendance = Math.round(((presentCount || 0) / totalRecords) * 100);
      }
    }


    res.json({
      totalStudents,
      classesToday: classesCount,
      pendingGrading: pendingCount,
      averageAttendance
    });
  } catch (error: any) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/teacher/assignments
router.get('/assignments', requireTeacher, async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const teacherId = profile.id;

  try {
    const { data: assignments, error } = await supabaseAdmin
      .from('assignments')
      .select(`
        *,
        classes(name),
        subjects(name)
      `)
      .eq('teacher_id', teacherId)
      .order('due_date', { ascending: false });

    if (error) throw error;
    res.json(assignments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/teacher/assignments
router.post('/assignments', requireTeacher, async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const { title, description, class_id, subject_id, due_date, type, category, assignment_number } = req.body;
  
  try {
    const { data, error } = await supabaseAdmin
      .from('assignments')
      .insert({
        school_id: profile.school_id,
        teacher_id: profile.id,
        title,
        description,
        class_id,
        subject_id,
        due_date,
        type,
        category,
        assignment_number
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/teacher/assignment-submissions
// Get submissions for assignments created by this teacher
router.get('/assignment-submissions', requireTeacher, async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const teacherId = profile.id;
    
    try {
        // 1. Get assignments by teacher
        const { data: assignments } = await supabaseAdmin
            .from('assignments')
            .select('id')
            .eq('teacher_id', teacherId);
        
        if (!assignments || assignments.length === 0) return res.json([]);

        const assignmentIds = assignments.map(a => a.id);

        // 2. Get submissions for those assignments
        const { data: submissions, error } = await supabaseAdmin
            .from('submissions')
            .select(`
                *,
                students:profiles!student_id(first_name, last_name, full_name),
                assignments:assignments(title)
            `)
            .in('assignment_id', assignmentIds)
            .order('submitted_at', { ascending: false });
            
        if (error) throw error;
        res.json(submissions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/teacher/assignments/:id/submissions
router.get('/assignments/:id/submissions', requireTeacher, async (req: Request, res: Response) => {
  const { id } = req.params;
  const profile = (req as any).profile;
  
  try {
    // Get all students in the class for this assignment to ensure we show everyone
    // 1. Get assignment details to know the class
    const { data: assignment } = await supabaseAdmin
        .from('assignments')
        .select('class_id')
        .eq('id', id)
        .single();
        
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    // 2. Get all students in class
    const { data: students } = await supabaseAdmin
        .from('enrollments')
        .select('student_id, profiles(full_name, id)')
        .eq('class_id', assignment.class_id)
        .eq('status', 'Active');
        
    // 3. Get existing submissions
    const { data: submissions, error } = await supabaseAdmin
      .from('submissions')
      .select(`
        *,
        profiles(full_name)
      `)
      .eq('assignment_id', id);

    if (error) throw error;

    // Merge: For each student, find submission or return null/empty placeholder
    const result = students?.map((enrollment: any) => {
        const student = enrollment.profiles;
        const sub = submissions?.find((s: any) => s.student_id === student.id);
        return {
            student_id: student.id,
            student_name: student.full_name,
            submission: sub || null
        };
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/teacher/grades
router.post('/grades', requireTeacher, async (req: Request, res: Response) => {
  const { assignment_id, student_id, score, max_score, feedback, status } = req.body;
  
  try {
    const { data, error } = await supabaseAdmin
      .from('submissions')
      .upsert({
        assignment_id,
        student_id,
        score,
        max_score,
        feedback,
        status: status || 'graded',
        submitted_at: new Date().toISOString() // Assume submitting/grading now if not exists
      }, { onConflict: 'assignment_id, student_id' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/teacher/subjects
router.get('/subjects', requireTeacher, async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    try {
        const { data: subjects, error } = await supabaseAdmin
            .from('subjects')
            .select('*')
            .eq('school_id', profile.school_id);
            
        if (error) throw error;
        res.json(subjects);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/teacher/profile
// Update teacher profile details
router.put('/profile', requireTeacher, async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const { phone_number, address } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        phone_number,
        address,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/teacher/self-assign
// Allow a teacher to self-assign to a subject in a class
router.post('/self-assign', requireTeacher, async (req: Request, res: Response) => {
  const profile = (req as any).profile;
  const teacherId = profile.id;
  const { classId, subjectId } = req.body;

  if (!classId || !subjectId) {
    return res.status(400).json({ message: 'Class ID and Subject ID are required' });
  }

  try {
    // Check if the assignment already exists
    const { data: existing } = await supabaseAdmin
      .from('class_subjects')
      .select('id, teacher_id')
      .eq('class_id', classId)
      .eq('subject_id', subjectId)
      .maybeSingle();

    if (existing) {
      // If already assigned to someone else, we'll allow overwriting for self-assignment
      const { data, error } = await supabaseAdmin
        .from('class_subjects')
        .update({ teacher_id: teacherId })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      return res.json(data);
    } else {
      // Create new assignment
      const { data, error } = await supabaseAdmin
        .from('class_subjects')
        .insert({
          class_id: classId,
          subject_id: subjectId,
          teacher_id: teacherId
        })
        .select()
        .single();
      
      if (error) throw error;
      return res.json(data);
    }
  } catch (error: any) {
    console.error('Self-assign Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/teacher/timetable
// Get teacher's timetable
router.get('/timetable', requireTeacher, async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    try {
        const settings = await ensureSchoolSettings(profile.school_id);

        let query = supabaseAdmin
            .from('timetables')
            .select(`
                *,
                classes(name),
                subjects(name, code)
            `)
            .eq('teacher_id', profile.id);

        if (settings) {
            query = query.eq('academic_year', settings.academic_year)
                        .eq('term', settings.current_term);
        }

        const { data: timetable, error } = await query.order('day_of_week').order('start_time');

        if (error) throw error;
        res.json(timetable);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
