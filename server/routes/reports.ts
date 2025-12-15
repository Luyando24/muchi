import { RequestHandler } from 'express';
import { query } from '../lib/db.js';

// --- Reports ---

export const handleGetReportStats: RequestHandler = async (req, res) => {
    try {
        const { schoolId, academicYear, term } = req.query;
        if (!schoolId) return res.status(400).json({ error: 'School ID is required' });

        // 1. Student Count
        const studentRes = await query(
            `SELECT COUNT(*) as total FROM students WHERE school_id = $1 AND is_active = true`,
            [schoolId]
        );
        const totalStudents = parseInt(studentRes.rows[0].total);

        // 2. Teacher Count
        const teacherRes = await query(
            `SELECT COUNT(*) as total FROM teachers WHERE school_id = $1 AND is_active = true`,
            [schoolId]
        );
        const totalTeachers = parseInt(teacherRes.rows[0].total);

        // 3. Attendance Rate (Today)
        const attendanceRes = await query(
            `SELECT 
           COUNT(*) FILTER (WHERE status = 'present') as present,
           COUNT(*) as total
         FROM attendance 
         WHERE school_id = $1 AND date = CURRENT_DATE`,
            [schoolId]
        );
        const attendanceRate = attendanceRes.rows[0].total > 0
            ? (parseInt(attendanceRes.rows[0].present) / parseInt(attendanceRes.rows[0].total)) * 100
            : 0;

        // 4. Financial (Pending Payments)
        let pendingPayments = 0;
        try {
            const financeRes = await query(
                `SELECT SUM(balance) as pending FROM invoices WHERE school_id = $1 AND status IN ('pending', 'partial', 'overdue')`,
                [schoolId]
            );
            pendingPayments = parseFloat(financeRes.rows[0].pending || '0');
        } catch (e) {
            // Ignore if finance tables not set up or empty
        }

        res.json({
            totalStudents,
            totalTeachers,
            attendanceRate,
            pendingPayments,
            academicYear,
            term
        });
    } catch (error) {
        console.error('Error getting report stats:', error);
        res.status(500).json({ error: 'Failed to get report stats' });
    }
};

export const handleGenerateCustomReport: RequestHandler = async (req, res) => {
    // Placeholder for robust PDF generation or complex aggregation
    try {
        const { schoolId, reportType, filters } = req.body;
        // Logic would switch on reportType (e.g., 'financial', 'academic', 'attendance')
        // and run complex queries based on filters.

        // For now, return a success message
        res.json({ message: 'Report generation started', fileUrl: 'https://example.com/report.pdf' });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
}
