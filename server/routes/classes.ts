import { Request, Response } from 'express';
import { Pool } from 'pg';
import { Class, ClassFormData } from '../../shared/api';
import { pool } from '../lib/db';

// Helper function to convert database row to Class object
function dbRowToClass(row: any): Class {
  return {
    id: row.id,
    schoolId: row.school_id,
    className: row.class_name,
    gradeLevel: row.grade_level,
    section: row.section,
    subject: row.subject,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    roomNumber: row.room_number,
    capacity: row.capacity,
    currentEnrollment: row.current_enrollment,
    academicYear: row.academic_year,
    term: row.term,
    schedule: row.schedule,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// List all classes
export async function handleListClasses(req: Request, res: Response) {
  try {
    const { schoolId, gradeLevel, subject, teacherId, academicYear } = req.query;
    
    let query = `
      SELECT 
        c.*,
        CONCAT(su.first_name, ' ', su.last_name) as teacher_name
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN staff_users su ON t.staff_user_id = su.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 0;
    
    if (schoolId) {
      paramCount++;
      query += ` AND c.school_id = $${paramCount}`;
      params.push(schoolId);
    }
    
    if (gradeLevel) {
      paramCount++;
      query += ` AND c.grade_level = $${paramCount}`;
      params.push(gradeLevel);
    }
    
    if (subject) {
      paramCount++;
      query += ` AND c.subject ILIKE $${paramCount}`;
      params.push(`%${subject}%`);
    }
    
    if (teacherId) {
      paramCount++;
      query += ` AND c.teacher_id = $${paramCount}`;
      params.push(teacherId);
    }
    
    if (academicYear) {
      paramCount++;
      query += ` AND c.academic_year = $${paramCount}`;
      params.push(academicYear);
    }
    
    query += ` ORDER BY c.grade_level, c.section, c.subject`;
    
    const result = await pool.query(query, params);
    const classes = result.rows.map(dbRowToClass);
    
    res.json(classes);
  } catch (error) {
    console.error('Error listing classes:', error);
    res.status(500).json({ error: 'Failed to list classes' });
  }
}

// Get a single class by ID
export async function handleGetClass(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        c.*,
        CONCAT(su.first_name, ' ', su.last_name) as teacher_name
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN staff_users su ON t.staff_user_id = su.id
      WHERE c.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    const classData = dbRowToClass(result.rows[0]);
    res.json(classData);
  } catch (error) {
    console.error('Error getting class:', error);
    res.status(500).json({ error: 'Failed to get class' });
  }
}

// Create a new class
export async function handleCreateClass(req: Request, res: Response) {
  try {
    console.log('Creating class with data:', JSON.stringify(req.body, null, 2));
    const classData: ClassFormData = req.body;
    
    // Validate required fields
    if (!classData.schoolId || !classData.className || !classData.gradeLevel || !classData.academicYear) {
      console.log('Missing required fields:', { 
        schoolId: classData.schoolId, 
        className: classData.className, 
        gradeLevel: classData.gradeLevel, 
        academicYear: classData.academicYear 
      });
      return res.status(400).json({ 
        error: 'Missing required fields: schoolId, className, gradeLevel, academicYear' 
      });
    }
    
    try {
      // Treat schoolId as UUID/string (schema uses UUID)
      const schoolId = classData.schoolId;
      
      // Use teacherId as UUID if provided (schema uses UUID)
      const teacherId = classData.teacherId || null;
      
      // Check if class already exists
      const existingQuery = `
        SELECT id FROM classes 
        WHERE school_id = $1 AND grade_level = $2 AND section = $3 AND subject = $4 AND academic_year = $5
      `;
      const existingParams = [
        schoolId,
        classData.gradeLevel,
        classData.section || null,
        classData.subject || null,
        classData.academicYear
      ];
      console.log('Checking if class exists with params:', existingParams);
      const existingResult = await pool.query(existingQuery, existingParams);
      
      if (existingResult.rows.length > 0) {
        console.log('Class already exists with ID:', existingResult.rows[0].id);
        return res.status(409).json({ 
          error: 'A class with the same grade level, section, subject, and academic year already exists' 
        });
      }
      
      // Insert new class using UUID primary key generated by database
      const insertQuery = `
        INSERT INTO classes (
          id, school_id, class_name, grade_level, section, subject, teacher_id,
          capacity, current_enrollment, academic_year, term,
          schedule, description, is_active
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) RETURNING id
      `;
      
      const values = [
        schoolId,
        classData.className,
        String(classData.gradeLevel),
        classData.section || null,
        classData.subject || null,
        teacherId,
        (classData.capacity ?? 30),
        (classData.currentEnrollment ?? 0),
        classData.academicYear,
        classData.term || null,
        classData.schedule ? JSON.stringify(classData.schedule) : null,
        classData.description || null,
        classData.isActive !== undefined ? classData.isActive : true
      ];
      
      console.log('Inserting class with values:', values);
      const result = await pool.query(insertQuery, values);
      
      if (!result.rows || result.rows.length === 0) {
        console.error('Insert query did not return an ID');
        return res.status(500).json({ error: 'Failed to create class: No ID returned' });
      }
      
      const classId = result.rows[0].id;
      console.log('Class created with ID:', classId);
      
      // Get the created class with teacher info
      const getQuery = `
        SELECT 
          c.*,
          CONCAT(su.first_name, ' ', su.last_name) as teacher_name
        FROM classes c
        LEFT JOIN teachers t ON c.teacher_id = t.id
        LEFT JOIN staff_users su ON t.staff_user_id = su.id
        WHERE c.id = $1
      `;
      
      console.log('Fetching created class with ID:', classId);
      const createdResult = await pool.query(getQuery, [classId]);
      
      if (createdResult.rows.length === 0) {
        console.error('Could not find created class with ID:', classId);
        return res.status(500).json({ error: 'Failed to retrieve created class' });
      }
      
      const createdClass = dbRowToClass(createdResult.rows[0]);
      console.log('Successfully created class:', createdClass.id);
      
      res.status(201).json(createdClass);
    } catch (innerError) {
      console.error('Inner error in class creation:', innerError);
      throw innerError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Error creating class:', error);
    
    // Provide more specific error messages
    if (error.code === '23503') { // Foreign key violation
      console.error('Foreign key violation:', error.detail);
      return res.status(400).json({ 
        error: 'Invalid reference: school or teacher not found',
        details: error.detail || 'No additional details available'
      });
    }
    if (error.code === '23505') { // Unique constraint violation
      console.error('Unique constraint violation:', error.detail);
      return res.status(409).json({ 
        error: 'Class with these details already exists',
        details: error.detail || 'No additional details available'
      });
    }
    if (error.code === '42703') { // Undefined column
      console.error('Undefined column:', error.column);
      return res.status(500).json({ 
        error: 'Database schema error: undefined column',
        details: `Column '${error.column}' does not exist`
      });
    }
    
    // For any other errors
    res.status(500).json({ 
      error: 'Failed to create class',
      message: error.message || 'Unknown error'
    });
  }
}

// Update a class
export async function handleUpdateClass(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const classData: Partial<ClassFormData> = req.body;
    
    // Check if class exists
    const existingQuery = 'SELECT id FROM classes WHERE id = $1';
    const existingResult = await pool.query(existingQuery, [id]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;
    
    if (classData.className !== undefined) {
      paramCount++;
      updateFields.push(`class_name = $${paramCount}`);
      values.push(classData.className);
    }
    
    if (classData.gradeLevel !== undefined) {
      paramCount++;
      updateFields.push(`grade_level = $${paramCount}`);
      values.push(classData.gradeLevel);
    }
    
    if (classData.section !== undefined) {
      paramCount++;
      updateFields.push(`section = $${paramCount}`);
      values.push(classData.section);
    }
    
    if (classData.subject !== undefined) {
      paramCount++;
      updateFields.push(`subject = $${paramCount}`);
      values.push(classData.subject);
    }
    
    if (classData.teacherId !== undefined) {
      paramCount++;
      updateFields.push(`teacher_id = $${paramCount}`);
      values.push(classData.teacherId);
    }
    
    if (classData.roomNumber !== undefined) {
      paramCount++;
      updateFields.push(`room_number = $${paramCount}`);
      values.push(classData.roomNumber);
    }
    
    if (classData.capacity !== undefined) {
      paramCount++;
      updateFields.push(`capacity = $${paramCount}`);
      values.push(classData.capacity);
    }
    
    if (classData.currentEnrollment !== undefined) {
      paramCount++;
      updateFields.push(`current_enrollment = $${paramCount}`);
      values.push(classData.currentEnrollment);
    }
    
    if (classData.academicYear !== undefined) {
      paramCount++;
      updateFields.push(`academic_year = $${paramCount}`);
      values.push(classData.academicYear);
    }
    
    if (classData.term !== undefined) {
      paramCount++;
      updateFields.push(`term = $${paramCount}`);
      values.push(classData.term);
    }
    
    if (classData.schedule !== undefined) {
      paramCount++;
      updateFields.push(`schedule = $${paramCount}`);
      values.push(classData.schedule ? JSON.stringify(classData.schedule) : null);
    }
    
    if (classData.description !== undefined) {
      paramCount++;
      updateFields.push(`description = $${paramCount}`);
      values.push(classData.description);
    }
    
    if (classData.isActive !== undefined) {
      paramCount++;
      updateFields.push(`is_active = $${paramCount}`);
      values.push(classData.isActive);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    // Add updated_at field
    paramCount++;
    updateFields.push(`updated_at = $${paramCount}`);
    values.push(new Date());
    
    // Add ID for WHERE clause
    paramCount++;
    values.push(id);
    
    const updateQuery = `
      UPDATE classes 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    await pool.query(updateQuery, values);
    
    // Get the updated class with teacher info
    const getQuery = `
      SELECT 
        c.*,
        CONCAT(su.first_name, ' ', su.last_name) as teacher_name
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN staff_users su ON t.staff_user_id = su.id
      WHERE c.id = $1
    `;
    
    const updatedResult = await pool.query(getQuery, [id]);
    const updatedClass = dbRowToClass(updatedResult.rows[0]);
    
    res.json(updatedClass);
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
}

// Delete a class
export async function handleDeleteClass(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Check if class exists
    const existingQuery = 'SELECT id FROM classes WHERE id = $1';
    const existingResult = await pool.query(existingQuery, [id]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Delete the class (this will also delete related enrollments due to CASCADE)
    const deleteQuery = 'DELETE FROM classes WHERE id = $1';
    await pool.query(deleteQuery, [id]);
    
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
}

// Search classes
export async function handleSearchClasses(req: Request, res: Response) {
  try {
    const { q, schoolId } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    let query = `
      SELECT 
        c.*,
        CONCAT(su.first_name, ' ', su.last_name) as teacher_name
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN staff_users su ON t.staff_user_id = su.id
      WHERE (
        c.class_name ILIKE $1 OR 
        c.grade_level ILIKE $1 OR 
        c.subject ILIKE $1 OR
        c.section ILIKE $1 OR
        c.room_number ILIKE $1
      )
    `;
    
    const params = [`%${q}%`];
    
    if (schoolId) {
      query += ` AND c.school_id = $2`;
      params.push(schoolId as string);
    }
    
    query += ` ORDER BY c.grade_level, c.section, c.subject LIMIT 50`;
    
    const result = await pool.query(query, params);
    const classes = result.rows.map(dbRowToClass);
    
    res.json(classes);
  } catch (error) {
    console.error('Error searching classes:', error);
    res.status(500).json({ error: 'Failed to search classes' });
  }
}

// Get class statistics
export async function handleGetClassStats(req: Request, res: Response) {
  try {
    const { schoolId } = req.query;
    
    // First check if the classes table exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'classes'
      );
    `;
    
    const tableCheck = await pool.query(checkTableQuery);
    
    if (!tableCheck.rows[0].exists) {
      // Return empty stats if table doesn't exist
      return res.json({
        total: 0,
        active: 0,
        gradeLevels: 0,
        subjects: 0,
        averageEnrollment: 0,
        totalEnrollment: 0,
        averageCapacity: 0,
        totalCapacity: 0
      });
    }
    
    let statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(DISTINCT grade_level) as grade_levels,
        COUNT(DISTINCT subject) as subjects,
        AVG(capacity) as avg_capacity,
        SUM(capacity) as total_capacity
      FROM classes
    `;
    
    const params: any[] = [];
    
    if (schoolId) {
      statsQuery += ` WHERE school_id = $1`;
      params.push(schoolId);
    }
    
    const result = await pool.query(statsQuery, params);
    const stats = result.rows[0];
    
    res.json({
      total: parseInt(stats.total) || 0,
      active: parseInt(stats.active) || 0,
      gradeLevels: parseInt(stats.grade_levels) || 0,
      subjects: parseInt(stats.subjects) || 0,
      averageCapacity: parseFloat(stats.avg_capacity) || 0,
      totalCapacity: parseInt(stats.total_capacity) || 0
    });
  } catch (error) {
    console.error('Error getting class stats:', error);
    res.status(500).json({ error: 'Failed to get class statistics' });
  }
}