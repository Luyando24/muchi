-- Migration: Database Performance Optimization
-- Description: Adds strategic indexes based on known high-traffic query patterns (filtering, sorting, and joins).
-- Note: CONCURRENTLY has been removed because it cannot be run inside a transaction block.

-- ==========================================
-- 1. Profiles Table Indexes
-- ==========================================
-- Speed up school-wide directory lookups and dashboard counts
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);

-- Speed up role-specific lookups within a school (e.g. counting total students or teachers)
CREATE INDEX IF NOT EXISTS idx_profiles_school_role ON public.profiles(school_id, role);

-- ==========================================
-- 2. Enrollments Table Indexes
-- ==========================================
-- Finding all classes for a specific student
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments(student_id);

-- Finding all active students in a specific class
CREATE INDEX IF NOT EXISTS idx_enrollments_class_status ON public.enrollments(class_id, status);

-- Finding current enrollment for a student by year
CREATE INDEX IF NOT EXISTS idx_enrollments_student_year ON public.enrollments(student_id, academic_year);

-- ==========================================
-- 3. Attendance Table Indexes
-- ==========================================
-- Finding attendance history for a specific student
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);

-- Finding attendance for a whole class (e.g. for the daily register taken by teachers)
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON public.attendance(class_id);

-- Finding school-wide attendance for a specific term/year (for school admin dashboards)
CREATE INDEX IF NOT EXISTS idx_attendance_school_term_year ON public.attendance(school_id, academic_year, term);

-- ==========================================
-- 4. Assignments & Submissions Indexes
-- ==========================================
-- Finding assignments created by a specific teacher
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON public.assignments(teacher_id);

-- Finding assignments for a specific class (used widely in student and teacher portals)
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON public.assignments(class_id);

-- Finding assignments for a specific subject
CREATE INDEX IF NOT EXISTS idx_assignments_subject_id ON public.assignments(subject_id);

-- Finding all submissions for a single assignment (for grading)
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions(assignment_id);

-- Finding all submissions by a single student (for pending task counts)
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_id);

-- ==========================================
-- 5. Student Grades Indexes
-- ==========================================
-- Finding a student's full academic history
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON public.student_grades(student_id);

-- Finding all grades for a specific subject (for subject performance analysis)
CREATE INDEX IF NOT EXISTS idx_grades_subject_id ON public.student_grades(subject_id);

-- School-wide academic analysis per term (for dashboard charts)
CREATE INDEX IF NOT EXISTS idx_grades_school_term_year ON public.student_grades(school_id, academic_year, term);

-- ==========================================
-- 6. Notifications & Logs Indexes
-- ==========================================
-- Finding a user's unread notifications quickly
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);

-- Ordering notifications by most recent
CREATE INDEX IF NOT EXISTS idx_notifications_created_desc ON public.notifications(created_at DESC);

-- Ordering activity logs by most recent (for dashboard feeds)
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_desc ON public.activity_logs(created_at DESC);

-- ==========================================
-- 7. School-specific General Indexes
-- ==========================================
-- Speed up fetching general school data (Announcements, Finance, Applications)
CREATE INDEX IF NOT EXISTS idx_announcements_school_id ON public.announcements(school_id);
CREATE INDEX IF NOT EXISTS idx_finance_school_id ON public.finance_records(school_id);
CREATE INDEX IF NOT EXISTS idx_student_apps_school_id ON public.student_applications(school_id);
