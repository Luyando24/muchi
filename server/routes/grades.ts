import { RequestHandler } from 'express';
import { query } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

// --- Term Grades ---

export const handleListTermGrades: RequestHandler = async (req, res) => {
    try {
        const { schoolId, studentId, classId, subjectId, academicYear, term } = req.query;
        if (!schoolId) return res.status(400).json({ error: 'School ID is required' });

        let sql = `SELECT g.*, 
                 s.first_name as student_first_name, s.last_name as student_last_name, 
                 sub.name as subject_name
               FROM term_grades g
               JOIN students s ON g.student_id = s.id
               JOIN subjects sub ON g.subject_id = sub.id
               WHERE g.school_id = $1`;
        const params: any[] = [schoolId];

        if (studentId) {
            params.push(studentId);
            sql += ` AND g.student_id = $${params.length}`;
        }
        if (classId) {
            params.push(classId);
            sql += ` AND g.class_id = $${params.length}`;
        }
        if (subjectId) {
            params.push(subjectId);
            sql += ` AND g.subject_id = $${params.length}`;
        }
        if (academicYear) {
            params.push(academicYear);
            sql += ` AND g.academic_year = $${params.length}`;
        }
        if (term) {
            params.push(term);
            sql += ` AND g.term = $${params.length}`;
        }

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error listing grades:', error);
        res.status(500).json({ error: 'Failed to list grades' });
    }
};

export const handleRecordTermGrade: RequestHandler = async (req, res) => {
    try {
        const { schoolId, studentId, classId, subjectId, academicYear, term, marks, grade, remarks, teacherId } = req.body;

        if (!schoolId || !studentId || !classId || !subjectId || !academicYear || !term) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Upsert logic (insert or update if exists)
        const result = await query(
            `INSERT INTO term_grades (school_id, student_id, class_id, subject_id, academic_year, term, marks, grade, remarks, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (student_id, subject_id, class_id, academic_year, term)
       DO UPDATE SET marks = EXCLUDED.marks, grade = EXCLUDED.grade, remarks = EXCLUDED.remarks, updated_at = NOW()
       RETURNING id`,
            [schoolId, studentId, classId, subjectId, academicYear, term, marks, grade, remarks, teacherId]
        );

        res.json({ id: result.rows[0].id, message: 'Grade recorded successfully' });
    } catch (error) {
        console.error('Error recording grade:', error);
        res.status(500).json({ error: 'Failed to record grade' });
    }
};

// --- Report Cards ---

export const handleGenerateReportCard: RequestHandler = async (req, res) => {
    try {
        const { schoolId, studentId, academicYear, term } = req.body;

        // 1. Fetch all grades for this student, year, term
        const gradesRes = await query(
            `SELECT g.*, sub.name as subject_name 
       FROM term_grades g
       JOIN subjects sub ON g.subject_id = sub.id
       WHERE g.school_id = $1 AND g.student_id = $2 AND g.academic_year = $3 AND g.term = $4`,
            [schoolId, studentId, academicYear, term]
        );

        // 2. Fetch attendance summary (simple count)
        const attendRes = await query(
            `SELECT status, COUNT(*) as count 
       FROM attendance 
       WHERE school_id = $1 AND student_id = $2
       GROUP BY status`,
            [schoolId, studentId] // TODO: Filter by term dates
        );

        // 3. Construct summary data
        const summaryData = {
            grades: gradesRes.rows,
            attendance: attendRes.rows.reduce((acc: any, row: any) => {
                acc[row.status] = parseInt(row.count);
                return acc;
            }, {}),
            generatedAt: new Date().toISOString()
        };

        // 4. Save report card record
        const id = uuidv4();
        await query(
            `INSERT INTO report_cards (id, school_id, student_id, academic_year, term, summary_data, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft')`,
            [id, schoolId, studentId, academicYear, term, summaryData]
        );

        res.json({ id, summaryData, message: 'Report card generated successfully' });
    } catch (error) {
        console.error('Error generating report card:', error);
        res.status(500).json({ error: 'Failed to generate report card' });
    }
};

export const handleListReportCards: RequestHandler = async (req, res) => {
    try {
        const { schoolId, studentId, academicYear, term } = req.query;
        if (!schoolId) return res.status(400).json({ error: 'School ID is required' });

        let sql = `SELECT r.*, s.first_name, s.last_name 
               FROM report_cards r
               JOIN students s ON r.student_id = s.id
               WHERE r.school_id = $1`;
        const params: any[] = [schoolId];

        if (studentId) {
            params.push(studentId);
            sql += ` AND r.student_id = $${params.length}`;
        }
        if (academicYear) {
            params.push(academicYear);
            sql += ` AND r.academic_year = $${params.length}`;
        }
        if (term) {
            params.push(term);
            sql += ` AND r.term = $${params.length}`;
        }

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error listing report cards:', error);
        res.status(500).json({ error: 'Failed to list report cards' });
    }
};
