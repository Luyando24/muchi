import { RequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  LoginRequest,
  StudentLoginRequest,
  StudentAlternativeLoginRequest,
  RegisterStaffRequest,
  AuthSession,
  RegisterStaffResponse,
} from "@shared/api";
import { query, hashPassword, verifyPassword } from "../lib/db";

// Helper function to create school code
function createSchoolCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6)
    .padEnd(3, "0");
}

// Helper function to generate 6-character student ID
function generateStudentId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const { email, password }: LoginRequest = req.body;
    
    // Find staff user by email
    const result = await query(
      'SELECT id, school_id, email, password_hash, role, first_name, last_name, is_active FROM staff_users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const staffUser = result.rows[0];
    
    // Verify password
    const isValidPassword = await verifyPassword(password, staffUser.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    if (!staffUser.is_active) {
      return res.status(401).json({ error: "Account is inactive" });
    }
    
    // Update last login time in the database if possible
    try {
      await query(
        'UPDATE staff_users SET updated_at = NOW() WHERE id = $1',
        [staffUser.id]
      );
    } catch (updateError) {
      console.error('Could not update last login time:', updateError);
      // Continue with login process even if update fails
    }
    
    const session: AuthSession = {
      userId: staffUser.id,
      role: staffUser.role,
      schoolId: staffUser.school_id,
      tokens: {
        accessToken: `token_${staffUser.id}`,
        expiresInSec: 3600,
      },
    };
    
    res.json(session);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleStudentLogin: RequestHandler = async (req, res) => {
  try {
    const { studentId }: StudentLoginRequest = req.body;
    
    // Find student by student ID
    const result = await query(
      'SELECT id, student_id, first_name_cipher, last_name_cipher FROM students WHERE student_id = $1',
      [studentId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid student ID" });
    }
    
    const student = result.rows[0];
    
    const session: AuthSession = {
      userId: student.id,
      role: "student",
      studentId: student.id,
      tokens: {
        accessToken: `token_${student.id}`,
        expiresInSec: 3600,
      },
    };
    
    res.json(session);
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleStudentAlternativeLogin: RequestHandler = async (req, res) => {
  try {
    const { email, phone, password }: StudentAlternativeLoginRequest = req.body;
    
    let result;
    if (email) {
      // Find student by email
      result = await query(
        'SELECT id, password_hash FROM students WHERE email_cipher = $1 AND password_hash IS NOT NULL',
        [email] // Note: In production, this should be encrypted
      );
    } else if (phone) {
      // Find student by phone
      result = await query(
        'SELECT id, password_hash FROM students WHERE phone_auth_cipher = $1 AND password_hash IS NOT NULL',
        [phone] // Note: In production, this should be encrypted
      );
    } else {
      return res.status(400).json({ error: "Email or phone required" });
    }
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const student = result.rows[0];
    
    // Verify password
    const isValidPassword = await verifyPassword(password, student.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const session: AuthSession = {
      userId: student.id,
      role: "student",
      studentId: student.id,
      tokens: {
        accessToken: `token_${student.id}`,
        expiresInSec: 3600,
      },
    };
    
    res.json(session);
  } catch (error) {
    console.error('Student alternative login error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleRegisterStaff: RequestHandler = async (req, res) => {
  try {
    const {
      schoolName,
      email,
      password,
      firstName,
      lastName,
      role = "admin",
    }: RegisterStaffRequest = req.body;
    
    // Check if email already exists
    const existingUserResult = await query(
      'SELECT id FROM staff_users WHERE email = $1',
      [email]
    );
    
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }
    
    // Create school
    const schoolId = uuidv4();
    const schoolCode = createSchoolCode(schoolName);
    
    await query(
      `INSERT INTO schools (id, name, code, address, district, province, phone) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [schoolId, schoolName, schoolCode, "", "", "", ""]
    );
    
    // Create staff user
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    
    await query(
      `INSERT INTO staff_users (id, school_id, email, password_hash, role, first_name, last_name, phone, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, schoolId, email, passwordHash, role, firstName, lastName, "", true]
    );
    
    const response: RegisterStaffResponse = {
      userId,
      schoolId,
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Staff registration error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleRegisterSchool: RequestHandler = async (req, res) => {
  try {
    const {
      schoolName,
      schoolType,
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      role = "admin",
    } = req.body;
    
    // Check if email already exists
    const existingUserResult = await query(
      'SELECT id FROM staff_users WHERE email = $1',
      [email]
    );
    
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }
    
    // Create school (using hospitals table for now since the schema is school-based)
    const schoolId = uuidv4();
    const schoolCode = createSchoolCode(schoolName);
    
    await query(
      `INSERT INTO hospitals (id, name, code, address, district, province, phone) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [schoolId, schoolName, schoolCode, "", "", "", phoneNumber || ""]
    );
    
    // Create staff user (school admin)
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    
    await query(
      `INSERT INTO staff_users (id, hospital_id, email, password_hash, role, first_name, last_name, phone, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, schoolId, email, passwordHash, role, firstName, lastName, phoneNumber || "", true]
    );
    
    const response = {
      userId,
      schoolId,
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error('School registration error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleRegisterSuperAdmin: RequestHandler = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
    } = req.body;
    
    // Check if email already exists
    const existingUserResult = await query(
      'SELECT id FROM staff_users WHERE email = $1',
      [email]
    );
    
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }
    
    // Create super admin user
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    
    // Map client-side role to valid database enum value
    const clientRole = req.body.role || "super_admin";
    const dbRole = "superadmin"; // Always use 'superadmin' as the valid enum value
    
    await query(
      `INSERT INTO staff_users (id, school_id, email, password_hash, role, first_name, last_name, phone, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, null, email, passwordHash, dbRole, firstName, lastName, req.body.phoneNumber || "", true]
    );
    
    const response = {
      userId,
      role: clientRole // Return the client-side role for consistency
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Super Admin registration error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleListSuperAdmins: RequestHandler = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, first_name, last_name, phone, role, is_active, created_at, updated_at
       FROM staff_users 
       WHERE role = 'superadmin' 
       ORDER BY created_at DESC`,
      []
    );

    const superAdmins = result.rows.map(user => ({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phoneNumber: user.phone || '',
      role: 'super_admin',
      permissions: [], // TODO: Implement permissions system
      createdAt: user.created_at,
      lastLogin: user.updated_at,
      status: user.is_active ? 'active' : 'inactive'
    }));

    res.json(superAdmins);
  } catch (error) {
    console.error('List Super Admins error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleDeleteSuperAdmin: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const userResult = await query(
      'SELECT id FROM staff_users WHERE id = $1 AND role = $2',
      [userId, 'superadmin']
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Super admin not found" });
    }
    
    // Delete the user
    await query(
      'DELETE FROM staff_users WHERE id = $1',
      [userId]
    );
    
    res.json({ message: "Super admin deleted successfully" });
  } catch (error) {
    console.error('Delete Super Admin error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Note: Data is now stored in PostgreSQL database
// No need to export in-memory stores