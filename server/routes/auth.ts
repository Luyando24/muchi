import { RequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  LoginRequest,
  PatientLoginRequest,
  PatientAlternativeLoginRequest,
  RegisterStaffRequest,
  AuthSession,
  RegisterStaffResponse,
} from "@shared/api";
import { query, hashPassword, verifyPassword } from "../lib/db";

// Helper function to create hospital code
function createHospitalCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6)
    .padEnd(3, "0");
}

// Helper function to generate 6-character hospital card ID
function generateHospitalCardId(): string {
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
      'SELECT id, hospital_id, email, password_hash, role, first_name, last_name, is_active FROM staff_users WHERE email = ?',
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
    
    const session: AuthSession = {
      userId: staffUser.id,
      role: staffUser.role,
      hospitalId: staffUser.hospital_id,
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

export const handlePatientLogin: RequestHandler = async (req, res) => {
  try {
    const { hospitalCardId }: PatientLoginRequest = req.body;
    
    // Find patient by hospital card ID
    const result = await query(
      'SELECT id, hospital_card_id, first_name_cipher, last_name_cipher FROM patients WHERE hospital_card_id = ?',
      [hospitalCardId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid hospital card ID" });
    }
    
    const patient = result.rows[0];
    
    const session: AuthSession = {
      userId: patient.id,
      role: "patient",
      patientId: patient.id,
      tokens: {
        accessToken: `token_${patient.id}`,
        expiresInSec: 3600,
      },
    };
    
    res.json(session);
  } catch (error) {
    console.error('Patient login error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handlePatientAlternativeLogin: RequestHandler = async (req, res) => {
  try {
    const { email, phone, password }: PatientAlternativeLoginRequest = req.body;
    
    let result;
    if (email) {
      // Find patient by email
      result = await query(
        'SELECT id, password_hash FROM patients WHERE email_cipher = ? AND password_hash IS NOT NULL',
        [email] // Note: In production, this should be encrypted
      );
    } else if (phone) {
      // Find patient by phone
      result = await query(
        'SELECT id, password_hash FROM patients WHERE phone_auth_cipher = ? AND password_hash IS NOT NULL',
        [phone] // Note: In production, this should be encrypted
      );
    } else {
      return res.status(400).json({ error: "Email or phone required" });
    }
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const patient = result.rows[0];
    
    // Verify password
    const isValidPassword = await verifyPassword(password, patient.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const session: AuthSession = {
      userId: patient.id,
      role: "patient",
      patientId: patient.id,
      tokens: {
        accessToken: `token_${patient.id}`,
        expiresInSec: 3600,
      },
    };
    
    res.json(session);
  } catch (error) {
    console.error('Patient alternative login error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleRegisterStaff: RequestHandler = async (req, res) => {
  try {
    const {
      hospitalName,
      email,
      password,
      firstName,
      lastName,
      role = "admin",
    }: RegisterStaffRequest = req.body;
    
    // Check if email already exists
    const existingUserResult = await query(
      'SELECT id FROM staff_users WHERE email = ?',
      [email]
    );
    
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }
    
    // Create hospital
    const hospitalId = uuidv4();
    const hospitalCode = createHospitalCode(hospitalName);
    
    await query(
      `INSERT INTO hospitals (id, name, code, address, district, province, phone) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [hospitalId, hospitalName, hospitalCode, "", "", "", ""]
    );
    
    // Create staff user
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    
    await query(
      `INSERT INTO staff_users (id, hospital_id, email, password_hash, role, first_name, last_name, phone, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, hospitalId, email, passwordHash, role, firstName, lastName, "", true]
    );
    
    const response: RegisterStaffResponse = {
      userId,
      hospitalId,
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Staff registration error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Note: Data is now stored in PostgreSQL database
// No need to export in-memory stores