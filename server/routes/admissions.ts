import { RequestHandler } from 'express';
import { query } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

// --- Admission Periods ---

export const handleListAdmissionPeriods: RequestHandler = async (req, res) => {
    try {
        const { schoolId } = req.query;
        if (!schoolId) return res.status(400).json({ error: 'School ID is required' });

        const result = await query(
            `SELECT * FROM admission_periods WHERE school_id = $1 ORDER BY start_date DESC`,
            [schoolId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error listing admission periods:', error);
        res.status(500).json({ error: 'Failed to list admission periods' });
    }
};

export const handleCreateAdmissionPeriod: RequestHandler = async (req, res) => {
    try {
        const { schoolId, name, startDate, endDate, academicYear, status } = req.body;

        if (!schoolId || !name || !startDate || !endDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const id = uuidv4();
        await query(
            `INSERT INTO admission_periods (id, school_id, name, start_date, end_date, academic_year, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, schoolId, name, startDate, endDate, academicYear, status || 'open']
        );

        res.json({ id, message: 'Admission period created successfully' });
    } catch (error) {
        console.error('Error creating admission period:', error);
        res.status(500).json({ error: 'Failed to create admission period' });
    }
};

// --- Applications ---

export const handleListApplications: RequestHandler = async (req, res) => {
    try {
        const { schoolId, periodId, status } = req.query;
        if (!schoolId) return res.status(400).json({ error: 'School ID is required' });

        let sql = `SELECT a.*, p.name as period_name 
               FROM applications a 
               LEFT JOIN admission_periods p ON a.admission_period_id = p.id
               WHERE a.school_id = $1`;
        const params: any[] = [schoolId];

        if (periodId) {
            params.push(periodId);
            sql += ` AND a.admission_period_id = $${params.length}`;
        }
        if (status) {
            params.push(status);
            sql += ` AND a.status = $${params.length}`;
        }

        sql += ` ORDER BY a.submission_date DESC`;

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error listing applications:', error);
        res.status(500).json({ error: 'Failed to list applications' });
    }
};

export const handleCreateApplication: RequestHandler = async (req, res) => {
    try {
        const {
            schoolId, admissionPeriodId, applicantFirstName, applicantLastName, applicantDob,
            applicantGender, guardianName, guardianEmail, guardianPhone, gradeApplyingFor,
            previousSchool, notes, documents
        } = req.body;

        if (!schoolId || !applicantFirstName || !applicantLastName || !gradeApplyingFor) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const id = uuidv4();
        await query(
            `INSERT INTO applications (
        id, school_id, admission_period_id, applicant_first_name, applicant_last_name,
        applicant_dob, applicant_gender, guardian_name, guardian_email, guardian_phone,
        grade_applying_for, previous_school, notes, documents
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
                id, schoolId, admissionPeriodId, applicantFirstName, applicantLastName,
                applicantDob, applicantGender, guardianName, guardianEmail, guardianPhone,
                gradeApplyingFor, previousSchool, notes, documents
            ]
        );

        res.json({ id, message: 'Application submitted successfully' });
    } catch (error) {
        console.error('Error creating application:', error);
        res.status(500).json({ error: 'Failed to create application' });
    }
};

export const handleUpdateApplicationStatus: RequestHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        await query(
            `UPDATE applications 
       SET status = COALESCE($1, status),
           notes = COALESCE($2, notes),
           updated_at = NOW()
       WHERE id = $3`,
            [status, notes, id]
        );

        res.json({ message: 'Application status updated successfully' });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ error: 'Failed to update application status' });
    }
};
