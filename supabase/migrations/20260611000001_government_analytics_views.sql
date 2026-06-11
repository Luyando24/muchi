-- Migration: Government Analytics Performance Views
-- Description: Creates pre-aggregated views for school demographics, attendance, grades, and subject averages.
-- All views are created WITH (security_invoker = true) to obey Row Level Security (RLS) policies.

-- 1. Attendance analytics by school
CREATE OR REPLACE VIEW public.attendance_analytics_by_school 
WITH (security_invoker = true) AS
SELECT 
    school_id,
    COUNT(*) as total_days,
    COUNT(*) FILTER (WHERE status = 'present') as present_days,
    ROUND((COUNT(*) FILTER (WHERE status = 'present')::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 1) as avg_attendance
FROM public.attendance
GROUP BY school_id;

-- 2. Grade averages by school
CREATE OR REPLACE VIEW public.grade_analytics_by_school
WITH (security_invoker = true) AS
SELECT 
    school_id,
    academic_year,
    term,
    ROUND(AVG(percentage)::numeric, 1) as avg_percentage,
    COUNT(*) FILTER (WHERE percentage IS NOT NULL) as total_grades
FROM public.student_grades
WHERE grade <> 'ABSENT' AND percentage IS NOT NULL
GROUP BY school_id, academic_year, term;

-- 3. Student demographics by school
CREATE OR REPLACE VIEW public.student_demographics_by_school
WITH (security_invoker = true) AS
SELECT
    school_id,
    COALESCE(gender, 'Other') as gender,
    COALESCE(grade, 'Unassigned') as grade,
    disability_status,
    date_of_birth as dob,
    COUNT(*) as student_count
FROM public.profiles
WHERE role = 'student'
GROUP BY school_id, gender, grade, disability_status, date_of_birth;

-- 4. Subject averages by school
CREATE OR REPLACE VIEW public.subject_averages_by_school
WITH (security_invoker = true) AS
SELECT
    sg.school_id,
    sg.subject_id,
    s.name as subject_name,
    ROUND(AVG(sg.percentage)::numeric, 1) as avg_percentage,
    COUNT(*) as total_grades
FROM public.student_grades sg
JOIN public.subjects s ON sg.subject_id = s.id
WHERE sg.grade <> 'ABSENT' AND sg.percentage IS NOT NULL
GROUP BY sg.school_id, sg.subject_id, s.name;

-- 5. Gender-wise grade distribution by school
CREATE OR REPLACE VIEW public.gender_grade_distribution_by_school
WITH (security_invoker = true) AS
SELECT
    sg.school_id,
    COALESCE(p.gender, 'Other') as gender,
    COALESCE(gs.description, gs.grade, 
        CASE 
            WHEN sg.percentage >= 75 THEN 'Distinction'
            WHEN sg.percentage >= 60 THEN 'Merit'
            WHEN sg.percentage >= 50 THEN 'Credit'
            WHEN sg.percentage >= 40 THEN 'Pass'
            ELSE 'Fail'
        END
    ) as grade_label,
    COUNT(*) as grade_count
FROM public.student_grades sg
JOIN public.profiles p ON sg.student_id = p.id
LEFT JOIN public.grading_scales gs ON sg.school_id = gs.school_id 
    AND sg.percentage >= gs.min_percentage 
    AND sg.percentage <= gs.max_percentage
WHERE sg.grade <> 'ABSENT' AND sg.percentage IS NOT NULL AND p.role = 'student'
GROUP BY sg.school_id, p.gender, grade_label;
