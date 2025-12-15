import { RequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";
import { Attendance } from "@shared/api.js";
import { query } from "../lib/db.js";

// Convert database row to Attendance object
function dbRowToAttendance(row: any): Attendance {
  return {
    id: row.id,
    studentId: row.student_id,
    classId: row.class_id || '',
    date: row.date,
    status: row.status,
    remarks: row.notes || '',
    recordedById: row.recorded_by || '',
    createdAt: row.created_at?.toISOString() || '',
    updatedAt: row.updated_at?.toISOString() || '',
  };
}

// List attendance records with filtering
export const handleListAttendance: RequestHandler = async (req, res) => {
  try {
    const { 
      schoolId, 
      classId, 
      studentId, 
      date, 
      dateFrom, 
      dateTo, 
      status,
      limit = '50', 
      offset = '0' 
    } = req.query;

    let whereConditions = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (schoolId) {
      whereConditions.push(`school_id = $${paramIndex}`);
      queryParams.push(schoolId);
      paramIndex++;
    }

    if (classId) {
      whereConditions.push(`class_id = $${paramIndex}`);
      queryParams.push(classId);
      paramIndex++;
    }

    if (studentId) {
      whereConditions.push(`student_id = $${paramIndex}`);
      queryParams.push(studentId);
      paramIndex++;
    }

    if (date) {
      whereConditions.push(`date = $${paramIndex}`);
      queryParams.push(date);
      paramIndex++;
    }

    if (dateFrom && dateTo) {
      whereConditions.push(`date BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      queryParams.push(dateFrom, dateTo);
      paramIndex += 2;
    }

    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    queryParams.push(parseInt(limit as string), parseInt(offset as string));
    
    const attendanceQuery = `
      SELECT a.*, s.first_name_cipher, s.last_name_cipher, c.name as class_name
      FROM attendance a
      LEFT JOIN students s ON a.student_id = s.id
      LEFT JOIN classes c ON a.class_id = c.id
      ${whereClause}
      ORDER BY a.date DESC, a.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await query(attendanceQuery, queryParams);
    const attendanceRecords = result.rows.map(dbRowToAttendance);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM attendance a
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      items: attendanceRecords,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Error listing attendance:', error);
    res.status(500).json({ error: 'Failed to list attendance records' });
  }
};

// Get single attendance record
export const handleGetAttendance: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT a.*, s.first_name_cipher, s.last_name_cipher, c.name as class_name
       FROM attendance a
       LEFT JOIN students s ON a.student_id = s.id
       LEFT JOIN classes c ON a.class_id = c.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    const attendance = dbRowToAttendance(result.rows[0]);
    res.json(attendance);
  } catch (error) {
    console.error('Error getting attendance:', error);
    res.status(500).json({ error: 'Failed to get attendance record' });
  }
};

// Record single attendance
export const handleRecordAttendance: RequestHandler = async (req, res) => {
  try {
    const { studentId, classId, date, status, remarks, schoolId } = req.body;

    if (!studentId || !date || !status || !schoolId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['present', 'absent', 'late', 'excused'].includes(status)) {
      return res.status(400).json({ error: 'Invalid attendance status' });
    }

    const id = uuidv4();
    const recordedById = req.user?.id || uuidv4(); // Use authenticated user ID

    // Check if attendance already exists for this student on this date
    const existingResult = await query(
      'SELECT id FROM attendance WHERE student_id = $1 AND date = $2',
      [studentId, date]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'Attendance already recorded for this student on this date' });
    }

    const result = await query(
      `INSERT INTO attendance (id, student_id, school_id, class_id, date, status, notes, recorded_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [id, studentId, schoolId, classId, date, status, remarks, recordedById]
    );

    const attendance = dbRowToAttendance(result.rows[0]);
    res.status(201).json(attendance);
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
};

// Update attendance record
export const handleUpdateAttendance: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    if (!['present', 'absent', 'late', 'excused'].includes(status)) {
      return res.status(400).json({ error: 'Invalid attendance status' });
    }

    const result = await query(
      `UPDATE attendance 
       SET status = $1, notes = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, remarks, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    const attendance = dbRowToAttendance(result.rows[0]);
    res.json(attendance);
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ error: 'Failed to update attendance record' });
  }
};

// Delete attendance record
export const handleDeleteAttendance: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM attendance WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ error: 'Failed to delete attendance record' });
  }
};

// Record bulk attendance for a class
export const handleRecordBulkAttendance: RequestHandler = async (req, res) => {
  try {
    const { classId, date, records, schoolId } = req.body;

    if (!classId || !date || !records || !Array.isArray(records) || !schoolId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const recordedById = req.user?.id || uuidv4();
    const attendanceRecords = [];

    // Begin transaction
    await query('BEGIN');

    try {
      for (const record of records) {
        const { studentId, status, remarks } = record;

        if (!studentId || !status) {
          throw new Error('Missing studentId or status in record');
        }

        if (!['present', 'absent', 'late', 'excused'].includes(status)) {
          throw new Error(`Invalid status: ${status}`);
        }

        // Check if attendance already exists
        const existingResult = await query(
          'SELECT id FROM attendance WHERE student_id = $1 AND date = $2',
          [studentId, date]
        );

        if (existingResult.rows.length > 0) {
          // Update existing record
          const updateResult = await query(
            `UPDATE attendance 
             SET status = $1, notes = $2, updated_at = NOW()
             WHERE student_id = $3 AND date = $4
             RETURNING *`,
            [status, remarks, studentId, date]
          );
          attendanceRecords.push(dbRowToAttendance(updateResult.rows[0]));
        } else {
          // Create new record
          const id = uuidv4();
          const insertResult = await query(
            `INSERT INTO attendance (id, student_id, school_id, class_id, date, status, notes, recorded_by, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             RETURNING *`,
            [id, studentId, schoolId, classId, date, status, remarks, recordedById]
          );
          attendanceRecords.push(dbRowToAttendance(insertResult.rows[0]));
        }
      }

      await query('COMMIT');
      res.status(201).json({ records: attendanceRecords });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error recording bulk attendance:', error);
    res.status(500).json({ error: 'Failed to record bulk attendance' });
  }
};

// Get attendance statistics
export const handleGetAttendanceStats: RequestHandler = async (req, res) => {
  try {
    const { schoolId, classId, dateFrom, dateTo } = req.query;

    if (!schoolId) {
      return res.status(400).json({ error: 'School ID is required' });
    }

    let whereConditions = ['school_id = $1'];
    let queryParams: any[] = [schoolId];
    let paramIndex = 2;

    if (classId) {
      whereConditions.push(`class_id = $${paramIndex}`);
      queryParams.push(classId);
      paramIndex++;
    }

    if (dateFrom && dateTo) {
      whereConditions.push(`date BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      queryParams.push(dateFrom, dateTo);
      paramIndex += 2;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get overall statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused_count,
        ROUND(
          (COUNT(CASE WHEN status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
        ) as attendance_rate
      FROM attendance
      WHERE ${whereClause}
    `;

    const statsResult = await query(statsQuery, queryParams);
    const stats = statsResult.rows[0];

    // Get daily attendance trends
    const trendsQuery = `
      SELECT 
        date,
        COUNT(*) as total_students,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
        ROUND(
          (COUNT(CASE WHEN status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
        ) as daily_rate
      FROM attendance
      WHERE ${whereClause}
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `;

    const trendsResult = await query(trendsQuery, queryParams);

    res.json({
      overall: {
        totalRecords: parseInt(stats.total_records),
        presentCount: parseInt(stats.present_count),
        absentCount: parseInt(stats.absent_count),
        lateCount: parseInt(stats.late_count),
        excusedCount: parseInt(stats.excused_count),
        attendanceRate: parseFloat(stats.attendance_rate) || 0
      },
      dailyTrends: trendsResult.rows.map(row => ({
        date: row.date,
        totalStudents: parseInt(row.total_students),
        presentCount: parseInt(row.present_count),
        attendanceRate: parseFloat(row.daily_rate) || 0
      }))
    });
  } catch (error) {
    console.error('Error getting attendance stats:', error);
    res.status(500).json({ error: 'Failed to get attendance statistics' });
  }
};

// Get attendance for specific period (for reports)
export const handleGetAttendanceForPeriod: RequestHandler = async (req, res) => {
  try {
    const { schoolId, period, classId, studentId } = req.query;

    if (!schoolId || !period) {
      return res.status(400).json({ error: 'School ID and period are required' });
    }

    let dateCondition = '';
    const today = new Date();
    
    switch (period) {
      case 'today':
        dateCondition = `date = CURRENT_DATE`;
        break;
      case 'week':
        dateCondition = `date >= CURRENT_DATE - INTERVAL '7 days'`;
        break;
      case 'month':
        dateCondition = `date >= CURRENT_DATE - INTERVAL '30 days'`;
        break;
      case 'term':
        dateCondition = `date >= CURRENT_DATE - INTERVAL '90 days'`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid period' });
    }

    let whereConditions = [`school_id = $1`, dateCondition];
    let queryParams: any[] = [schoolId];
    let paramIndex = 2;

    if (classId) {
      whereConditions.push(`class_id = $${paramIndex}`);
      queryParams.push(classId);
      paramIndex++;
    }

    if (studentId) {
      whereConditions.push(`student_id = $${paramIndex}`);
      queryParams.push(studentId);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const result = await query(
      `SELECT a.*, s.first_name_cipher, s.last_name_cipher, c.name as class_name
       FROM attendance a
       LEFT JOIN students s ON a.student_id = s.id
       LEFT JOIN classes c ON a.class_id = c.id
       WHERE ${whereClause}
       ORDER BY a.date DESC, a.created_at DESC`,
      queryParams
    );

    const attendanceRecords = result.rows.map(dbRowToAttendance);
    res.json(attendanceRecords);
  } catch (error) {
    console.error('Error getting attendance for period:', error);
    res.status(500).json({ error: 'Failed to get attendance for period' });
  }
};