import { RequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";
import { Student } from "@shared/api";
import { query } from "../lib/db";
import crypto from "crypto";

// Types for bulk operations
interface BulkStudentResult {
  success: Student[];
  failed: { data: Partial<Student>; error: string }[];
}

// Generate a unique 6-character student card ID
function generateStudentCardId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Convert database row to Student object
function dbRowToStudent(row: any): Student {
  return {
    id: row.id,
    schoolId: row.school_id || '',
    campusId: '', // Not in current schema
    studentNumber: row.student_card_id || '', // Using student_card_id as student number
    emisId: '', // Not in current schema
    firstName: row.first_name_cipher?.toString() || '', // In production, this should be decrypted
    lastName: row.last_name_cipher?.toString() || '', // In production, this should be decrypted
    dateOfBirth: row.dob_cipher?.toString() || '', // In production, this should be decrypted
    gender: row.gender || '',
    nrcNumber: '', // Cannot expose raw NRC, only hash is stored
    guardianName: row.guardian_contact_name_cipher?.toString() || '', // In production, this should be decrypted
    guardianPhone: row.guardian_contact_phone_cipher?.toString() || '', // In production, this should be decrypted
    guardianEmail: '', // Not in current schema
    address: row.address_cipher?.toString() || '', // In production, this should be decrypted
    district: '', // Not in current schema
    province: '', // Not in current schema
    currentGrade: row.grade_level || '',
    currentClass: '', // Not in current schema
    enrollmentDate: row.enrollment_date?.toISOString() || '',
    isActive: true, // Not in current schema, assuming active
    createdAt: row.created_at?.toISOString() || '',
    updatedAt: row.updated_at?.toISOString() || '',
  };
}

// List all students with optional filtering
export const handleListStudents: RequestHandler = async (req, res) => {
  try {
    const { schoolId, campusId, grade, isActive } = req.query;
    
    let sql = 'SELECT * FROM students WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    // Note: Current schema doesn't have school_id, campus_id, or is_active columns
    // These filters are kept for API compatibility but won't work until schema is updated
    
    if (grade) {
      sql += ` AND grade_level = $${paramIndex}`;
      params.push(grade);
      paramIndex++;
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const result = await query(sql, params);
    const students = result.rows.map(dbRowToStudent);
    
    res.json({ students });
  } catch (error) {
    console.error('Error listing students:', error);
    res.status(500).json({ error: 'Failed to list students' });
  }
};

// Get a single student by ID
export const handleGetStudent: RequestHandler = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const result = await query(
      'SELECT * FROM students WHERE id = $1',
      [studentId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const student = dbRowToStudent(result.rows[0]);
    res.json({ student });
  } catch (error) {
    console.error('Error getting student:', error);
    res.status(500).json({ error: 'Failed to get student' });
  }
};

// Create a new student
export const handleCreateStudent: RequestHandler = async (req, res) => {
  try {
    const studentData = req.body;
    const studentId = crypto.randomUUID();
    const studentCardId = generateStudentCardId();
    const now = new Date().toISOString();
    
    // Generate card data
    const cardId = generateStudentCardId();
    const cardQrSignature = `STUDENT_${cardId}_${Date.now()}`;
    
    const sql = `
      INSERT INTO students (
        id, student_card_id, nrc_hash, nrc_salt,
        first_name_cipher, last_name_cipher, gender, dob_cipher,
        phone_cipher, address_cipher, guardian_contact_name_cipher, guardian_contact_phone_cipher,
        grade_level, enrollment_date, card_id, card_qr_signature,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      )
    `;
    
    // Generate salt and hash for NRC (in production, use proper crypto)
    const nrcSalt = crypto.randomBytes(16).toString('hex');
    const nrcHash = studentData.nrcNumber 
      ? crypto.createHash('sha256').update(studentData.nrcNumber + nrcSalt).digest('hex')
      : crypto.createHash('sha256').update(`temp_${studentId}_${Date.now()}`).digest('hex'); // Generate unique hash for students without NRC
    
    const params = [
      studentId,
      studentCardId,
      nrcHash,
      nrcSalt,
      studentData.firstName || '', // Should be encrypted in production
      studentData.lastName || '', // Should be encrypted in production
      studentData.gender || '',
      studentData.dateOfBirth || '', // Should be encrypted in production
      studentData.guardianPhone || '', // Should be encrypted in production
      studentData.address || '', // Should be encrypted in production
      studentData.guardianName || '', // Should be encrypted in production
      studentData.guardianPhone || '', // Should be encrypted in production
      studentData.currentGrade || '',
      studentData.enrollmentDate || now,
      cardId,
      cardQrSignature,
      now,
      now
    ];
    
    await query(sql, params);
    
    // Fetch the created student
    const result = await query('SELECT * FROM students WHERE id = $1', [studentId]);
    const student = dbRowToStudent(result.rows[0]);
    
    res.status(201).json({ student });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Failed to create student' });
  }
};

// Update an existing student
export const handleUpdateStudent: RequestHandler = async (req, res) => {
  try {
    const { studentId } = req.params;
    const studentData = req.body;
    
    // Check if student exists
    const existingResult = await query('SELECT id FROM students WHERE id = $1', [studentId]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const now = new Date().toISOString();
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    // Build dynamic update query based on actual schema
    if (studentData.firstName !== undefined) {
      updateFields.push(`first_name_cipher = $${paramIndex}`);
      updateValues.push(studentData.firstName); // Should be encrypted in production
      paramIndex++;
    }
    if (studentData.lastName !== undefined) {
      updateFields.push(`last_name_cipher = $${paramIndex}`);
      updateValues.push(studentData.lastName); // Should be encrypted in production
      paramIndex++;
    }
    if (studentData.dateOfBirth !== undefined) {
      updateFields.push(`dob_cipher = $${paramIndex}`);
      updateValues.push(studentData.dateOfBirth); // Should be encrypted in production
      paramIndex++;
    }
    if (studentData.gender !== undefined) {
      updateFields.push(`gender = $${paramIndex}`);
      updateValues.push(studentData.gender);
      paramIndex++;
    }
    if (studentData.guardianName !== undefined) {
      updateFields.push(`guardian_contact_name_cipher = $${paramIndex}`);
      updateValues.push(studentData.guardianName); // Should be encrypted in production
      paramIndex++;
    }
    if (studentData.guardianPhone !== undefined) {
      updateFields.push(`guardian_contact_phone_cipher = $${paramIndex}`);
      updateValues.push(studentData.guardianPhone); // Should be encrypted in production
      paramIndex++;
    }
    if (studentData.address !== undefined) {
      updateFields.push(`address_cipher = $${paramIndex}`);
      updateValues.push(studentData.address); // Should be encrypted in production
      paramIndex++;
    }
    if (studentData.currentGrade !== undefined) {
      updateFields.push(`grade_level = $${paramIndex}`);
      updateValues.push(studentData.currentGrade);
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    updateFields.push(`updated_at = $${paramIndex}`);
    updateValues.push(now);
    paramIndex++;
    updateValues.push(studentId);
    
    const sql = `UPDATE students SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
    await query(sql, updateValues);
    
    // Fetch the updated student
    const updatedResult = await query('SELECT * FROM students WHERE id = $1', [studentId]);
    const student = dbRowToStudent(updatedResult.rows[0]);
    
    res.json({ student });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
};

// Delete a student (Note: Current schema doesn't have is_active column)
export const handleDeleteStudent: RequestHandler = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Check if student exists
    const existingResult = await query('SELECT id FROM students WHERE id = $1', [studentId]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Since current schema doesn't have is_active column, we'll do a hard delete
    // In production, you might want to add is_active column for soft deletes
    await query('DELETE FROM students WHERE id = $1', [studentId]);
    
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
};

// Search students by various criteria
export const handleSearchStudents: RequestHandler = async (req, res) => {
  try {
    const { query: searchQuery, studentNumber, nrcNumber } = req.body;
    
    let sql = 'SELECT * FROM students WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (studentNumber) {
      sql += ` AND student_card_id = $${paramIndex}`;
      params.push(studentNumber);
      paramIndex++;
    } else if (nrcNumber) {
      sql += ` AND nrc_hash = $${paramIndex}`;
      params.push(nrcNumber); // Should be hashed in production
      paramIndex++;
    } else if (searchQuery) {
      // Search in names (in production, this would need special handling for encrypted fields)
      sql += ` AND (first_name_cipher::text LIKE $${paramIndex} OR last_name_cipher::text LIKE $${paramIndex + 1})`;
      params.push(`%${searchQuery}%`, `%${searchQuery}%`);
      paramIndex += 2;
    }
    
    sql += ' ORDER BY created_at DESC LIMIT 50';
    
    const result = await query(sql, params);
    const students = result.rows.map(dbRowToStudent);
    
    res.json({ students });
  } catch (error) {
    console.error('Error searching students:', error);
    res.status(500).json({ error: 'Failed to search students' });
  }
};

// Bulk import students
export const handleBulkImportStudents: RequestHandler = async (req, res) => {
  try {
    const studentsData: Partial<Student>[] = req.body.students;
    
    if (!Array.isArray(studentsData) || studentsData.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty students data' });
    }
    
    const result: BulkStudentResult = {
      success: [],
      failed: []
    };
    
    // Process each student
    for (const studentData of studentsData) {
      try {
        const studentId = crypto.randomUUID();
        const studentCardId = generateStudentCardId();
        const now = new Date().toISOString();
        
        // Generate card data
        const cardId = generateStudentCardId();
        const cardQrSignature = `STUDENT_${cardId}_${Date.now()}`;
        
        // Generate salt and hash for NRC (in production, use proper crypto)
        const nrcSalt = crypto.randomBytes(16).toString('hex');
        const nrcHash = studentData.nrcNumber 
          ? crypto.createHash('sha256').update(studentData.nrcNumber + nrcSalt).digest('hex')
          : crypto.createHash('sha256').update(`temp_${studentId}_${Date.now()}`).digest('hex'); // Generate unique hash for students without NRC
        
        const sql = `
          INSERT INTO students (
            id, student_card_id, nrc_hash, nrc_salt,
            first_name_cipher, last_name_cipher, gender, dob_cipher,
            phone_cipher, address_cipher, guardian_contact_name_cipher, guardian_contact_phone_cipher,
            grade_level, enrollment_date, card_id, card_qr_signature,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
          )
        `;
        
        const params = [
          studentId,
          studentCardId,
          nrcHash,
          nrcSalt,
          studentData.firstName || '', // Should be encrypted in production
          studentData.lastName || '', // Should be encrypted in production
          studentData.gender || '',
          studentData.dateOfBirth || '', // Should be encrypted in production
          studentData.guardianPhone || '', // Should be encrypted in production
          studentData.address || '', // Should be encrypted in production
          studentData.guardianName || '', // Should be encrypted in production
          studentData.guardianPhone || '', // Should be encrypted in production
          studentData.currentGrade || '',
          studentData.enrollmentDate || now,
          cardId,
          cardQrSignature,
          now,
          now
        ];
        
        await query(sql, params);
        
        // Fetch the created student
        const queryResult = await query('SELECT * FROM students WHERE id = $1', [studentId]);
        const student = dbRowToStudent(queryResult.rows[0]);
        
        result.success.push(student);
      } catch (error) {
        console.error('Error importing student:', error);
        result.failed.push({
          data: studentData,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error bulk importing students:', error);
    res.status(500).json({ error: 'Failed to bulk import students' });
  }
};

// Get students by grade level
export const handleGetStudentsByGrade: RequestHandler = async (req, res) => {
  try {
    const { grade } = req.params;
    
    if (!grade) {
      return res.status(400).json({ error: 'Grade level is required' });
    }
    
    const result = await query(
      'SELECT * FROM students WHERE grade_level = $1 ORDER BY last_name_cipher',
      [grade]
    );
    
    const students = result.rows.map(dbRowToStudent);
    res.json({ students });
  } catch (error) {
    console.error('Error getting students by grade:', error);
    res.status(500).json({ error: 'Failed to get students by grade' });
  }
};

// Get student statistics
export const handleGetStudentStats: RequestHandler = async (req, res) => {
  try {
    // Get total student count
    const totalResult = await query('SELECT COUNT(*) as total FROM students');
    const total = parseInt(totalResult.rows[0].total);
    
    // Get students by grade
    const gradeResult = await query(
      'SELECT grade_level, COUNT(*) as count FROM students GROUP BY grade_level ORDER BY grade_level'
    );
    
    // Get students by gender
    const genderResult = await query(
      'SELECT gender, COUNT(*) as count FROM students GROUP BY gender'
    );
    
    // Get new students in the last 30 days
    const newStudentsResult = await query(
      'SELECT COUNT(*) as count FROM students WHERE created_at > NOW() - INTERVAL \'30 days\''
    );
    
    res.json({
      total,
      byGrade: gradeResult.rows,
      byGender: genderResult.rows,
      newStudents: parseInt(newStudentsResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error getting student statistics:', error);
    res.status(500).json({ error: 'Failed to get student statistics' });
  }
};