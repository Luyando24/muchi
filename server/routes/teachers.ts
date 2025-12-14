import { Request, Response } from 'express';
import { Pool } from 'pg';
import { Teacher, TeacherFormData } from '../../shared/api';
import { pool, hashPassword } from '../lib/db';

// Helper function to convert database row to Teacher object
function dbRowToTeacher(row: any): Teacher {
  return {
    id: row.id,
    employeeId: row.employee_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    qualification: row.qualification,
    experienceYears: row.experience_years,
    specialization: row.specialization,
    department: row.department,
    dateOfBirth: row.date_of_birth,
    hireDate: row.hire_date,
    salary: row.salary,
    isActive: row.is_active,
    isHeadTeacher: row.is_head_teacher,
    bio: row.bio,
    certifications: row.certifications || [],
    languagesSpoken: row.languages_spoken || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Generate unique employee ID
function generateEmployeeId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'EMP';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// List all teachers
export async function handleListTeachers(req: Request, res: Response) {
  try {
    let query = `
      SELECT 
        t.*,
        su.first_name,
        su.last_name,
        su.email,
        su.phone
      FROM teachers t
      JOIN staff_users su ON t.staff_user_id = su.id
      WHERE t.is_active = true
    `;

    const params: any[] = [];
    if (req.query.schoolId) {
      query += ` AND t.school_id = $1`;
      params.push(req.query.schoolId);
    }

    query += ` ORDER BY su.last_name, su.first_name`;

    const result = await pool.query(query, params);
    const teachers = result.rows.map(dbRowToTeacher);

    res.json(teachers);
  } catch (error) {
    console.error('Error listing teachers:', error);
    res.status(500).json({ error: 'Failed to list teachers' });
  }
}

// Get current teacher info based on logged-in staff user
export async function handleGetCurrentTeacher(req: Request, res: Response) {
  try {
    const staffUserId = req.user?.id;

    if (!staffUserId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const query = `
      SELECT 
        t.*,
        su.first_name,
        su.last_name,
        su.email,
        su.phone
      FROM teachers t
      JOIN staff_users su ON t.staff_user_id = su.id
      WHERE t.staff_user_id = $1 AND t.is_active = true
    `;

    const result = await pool.query(query, [staffUserId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher profile not found for current user' });
    }

    const teacher = dbRowToTeacher(result.rows[0]);
    res.json(teacher);
  } catch (error) {
    console.error('Error getting current teacher:', error);
    res.status(500).json({ error: 'Failed to get current teacher' });
  }
}

// Get a specific teacher by ID
export async function handleGetTeacher(req: Request, res: Response) {
  try {
    const { teacherId } = req.params;

    const query = `
      SELECT 
        t.*,
        su.first_name,
        su.last_name,
        su.email,
        su.phone
      FROM teachers t
      JOIN staff_users su ON t.staff_user_id = su.id
      WHERE t.id = $1 AND t.is_active = true
    `;

    const result = await pool.query(query, [teacherId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const teacher = dbRowToTeacher(result.rows[0]);
    res.json(teacher);
  } catch (error) {
    console.error('Error getting teacher:', error);
    res.status(500).json({ error: 'Failed to get teacher' });
  }
}

// Create a new teacher
export async function handleCreateTeacher(req: Request, res: Response) {
  try {
    const teacherData: TeacherFormData = req.body;

    // Validate required fields
    if (!teacherData.firstName || !teacherData.lastName || !teacherData.email || !teacherData.subject) {
      return res.status(400).json({
        error: 'Missing required fields: firstName, lastName, email, subject'
      });
    }

    // Validate schoolId is provided
    if (!teacherData.schoolId) {
      return res.status(400).json({
        error: 'School ID is required to create a teacher'
      });
    }

    // Validate password is provided
    if (!teacherData.password) {
      return res.status(400).json({
        error: 'Password is required to create teacher login credentials'
      });
    }

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Hash the password
      const passwordHash = await hashPassword(teacherData.password);

      // First, create staff_user record
      const staffUserQuery = `
        INSERT INTO staff_users (
          id, school_id, email, password_hash, role, first_name, last_name, phone, is_active
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, 'teacher', $4, $5, $6, true
        ) RETURNING id
      `;

      const staffUserResult = await client.query(staffUserQuery, [
        teacherData.schoolId,
        teacherData.email,
        passwordHash,
        teacherData.firstName,
        teacherData.lastName,
        teacherData.phone
      ]);

      const staffUserId = staffUserResult.rows[0].id;

      // Generate unique employee ID
      let employeeId = generateEmployeeId();
      let isUnique = false;

      while (!isUnique) {
        const checkQuery = 'SELECT id FROM teachers WHERE employee_id = $1';
        const checkResult = await client.query(checkQuery, [employeeId]);

        if (checkResult.rows.length === 0) {
          isUnique = true;
        } else {
          employeeId = generateEmployeeId();
        }
      }

      // Then, create teacher record
      const teacherQuery = `
        INSERT INTO teachers (
          id, staff_user_id, school_id, employee_id, subject, qualification,
          experience_years, specialization, department, date_of_birth,
          hire_date, salary, is_active, is_head_teacher, bio,
          certifications, languages_spoken
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) RETURNING id
      `;

      const teacherResult = await client.query(teacherQuery, [
        staffUserId,
        teacherData.schoolId,
        employeeId,
        teacherData.subject,
        teacherData.qualification,
        teacherData.experienceYears || 0,
        teacherData.specialization,
        teacherData.department,
        teacherData.dateOfBirth,
        teacherData.hireDate || new Date(),
        teacherData.salary,
        teacherData.isActive !== false,
        teacherData.isHeadTeacher || false,
        teacherData.bio,
        teacherData.certifications || [],
        teacherData.languagesSpoken || []
      ]);

      await client.query('COMMIT');

      // Fetch the created teacher with joined data
      const fetchQuery = `
        SELECT 
          t.*,
          su.first_name,
          su.last_name,
          su.email,
          su.phone
        FROM teachers t
        JOIN staff_users su ON t.staff_user_id = su.id
        WHERE t.id = $1
      `;

      const fetchResult = await client.query(fetchQuery, [teacherResult.rows[0].id]);
      const teacher = dbRowToTeacher(fetchResult.rows[0]);

      res.status(201).json(teacher);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({ error: 'Failed to create teacher' });
  }
}

// Update a teacher
export async function handleUpdateTeacher(req: Request, res: Response) {
  try {
    const { teacherId } = req.params;
    const teacherData: Partial<TeacherFormData> = req.body;

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update staff_users table
      if (teacherData.firstName || teacherData.lastName || teacherData.email || teacherData.phone) {
        const staffUserQuery = `
          UPDATE staff_users 
          SET 
            first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            email = COALESCE($3, email),
            phone = COALESCE($4, phone),
            updated_at = now()
          WHERE id = (SELECT staff_user_id FROM teachers WHERE id = $5)
        `;

        await client.query(staffUserQuery, [
          teacherData.firstName,
          teacherData.lastName,
          teacherData.email,
          teacherData.phone,
          teacherId
        ]);
      }

      // Update teachers table
      const teacherQuery = `
        UPDATE teachers 
        SET 
          subject = COALESCE($1, subject),
          qualification = COALESCE($2, qualification),
          experience_years = COALESCE($3, experience_years),
          specialization = COALESCE($4, specialization),
          department = COALESCE($5, department),
          date_of_birth = COALESCE($6, date_of_birth),
          hire_date = COALESCE($7, hire_date),
          salary = COALESCE($8, salary),
          is_active = COALESCE($9, is_active),
          is_head_teacher = COALESCE($10, is_head_teacher),
          bio = COALESCE($11, bio),
          certifications = COALESCE($12, certifications),
          languages_spoken = COALESCE($13, languages_spoken),
          updated_at = now()
        WHERE id = $14
      `;

      await client.query(teacherQuery, [
        teacherData.subject,
        teacherData.qualification,
        teacherData.experienceYears,
        teacherData.specialization,
        teacherData.department,
        teacherData.dateOfBirth,
        teacherData.hireDate,
        teacherData.salary,
        teacherData.isActive,
        teacherData.isHeadTeacher,
        teacherData.bio,
        teacherData.certifications,
        teacherData.languagesSpoken,
        teacherId
      ]);

      await client.query('COMMIT');

      // Fetch the updated teacher
      const fetchQuery = `
        SELECT 
          t.*,
          su.first_name,
          su.last_name,
          su.email,
          su.phone
        FROM teachers t
        JOIN staff_users su ON t.staff_user_id = su.id
        WHERE t.id = $1
      `;

      const fetchResult = await client.query(fetchQuery, [teacherId]);

      if (fetchResult.rows.length === 0) {
        return res.status(404).json({ error: 'Teacher not found' });
      }

      const teacher = dbRowToTeacher(fetchResult.rows[0]);
      res.json(teacher);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({ error: 'Failed to update teacher' });
  }
}

// Delete a teacher (soft delete)
export async function handleDeleteTeacher(req: Request, res: Response) {
  try {
    const { teacherId } = req.params;

    const query = `
      UPDATE teachers 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND is_active = true
      RETURNING *
    `;

    const result = await pool.query(query, [teacherId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
}

// Search teachers
export async function handleSearchTeachers(req: Request, res: Response) {
  try {
    const { q, subject, department } = req.body;

    let query = `
      SELECT 
        t.*,
        su.first_name,
        su.last_name,
        su.email,
        su.phone
      FROM teachers t
      JOIN staff_users su ON t.staff_user_id = su.id
      WHERE t.is_active = true
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (q) {
      query += ` AND (su.first_name ILIKE $${paramIndex} OR su.last_name ILIKE $${paramIndex} OR su.email ILIKE $${paramIndex})`;
      params.push(`%${q}%`);
      paramIndex++;
    }

    if (subject) {
      query += ` AND t.subject ILIKE $${paramIndex}`;
      params.push(`%${subject}%`);
      paramIndex++;
    }

    if (department) {
      query += ` AND t.department ILIKE $${paramIndex}`;
      params.push(`%${department}%`);
      paramIndex++;
    }

    query += ` ORDER BY su.last_name, su.first_name`;

    const result = await pool.query(query, params);
    const teachers = result.rows.map(dbRowToTeacher);

    res.json(teachers);
  } catch (error) {
    console.error('Error searching teachers:', error);
    res.status(500).json({ error: 'Failed to search teachers' });
  }
}

// Get teacher statistics
export async function handleGetTeacherStats(req: Request, res: Response) {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_head_teacher = true AND is_active = true THEN 1 END) as head_teachers,
        COUNT(DISTINCT subject) as subjects_taught,
        COUNT(DISTINCT department) as departments
      FROM teachers
    `;

    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    res.json({
      total: parseInt(stats.total),
      active: parseInt(stats.active),
      headTeachers: parseInt(stats.head_teachers),
      subjectsTaught: parseInt(stats.subjects_taught),
      departments: parseInt(stats.departments)
    });
  } catch (error) {
    console.error('Error getting teacher stats:', error);
    res.status(500).json({ error: 'Failed to get teacher statistics' });
  }
}