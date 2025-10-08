import { RequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import {
  SearchResidentRequest,
  SearchResidentResponse,
  UpsertResidentRequest,
  UpsertResidentResponse,
  ResidentRegistrationRequest,
  Resident,
} from "@shared/api";
import { query, hashNationalId } from "../lib/db";

// Helper function to generate 8-character national card ID
function generateNationalCardId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper function to create QR data for resident identity
async function createResidentQrData(resident: Resident): Promise<string> {
  const qrPayload = {
    nationalId: resident.nationalId,
    residentId: resident.id,
    firstName: resident.firstName,
    lastName: resident.lastName,
    nationality: resident.nationality,
    timestamp: Date.now(),
  };
  
  return QRCode.toDataURL(JSON.stringify(qrPayload));
}

export const handleSearchResident: RequestHandler = async (req, res) => {
  try {
    const { nationalId, passportNumber, cardIdOrQr }: SearchResidentRequest = req.body;
    
    let resident: any = null;
    
    if (nationalId) {
      // Search by National ID hash
      const nationalIdHash = hashNationalId(nationalId);
      const result = await query(
        'SELECT * FROM residents WHERE national_id_hash = ?',
        [nationalIdHash]
      );
      resident = result.rows[0] || null;
    } else if (passportNumber) {
      // Search by passport number
      const result = await query(
        'SELECT * FROM residents WHERE passport_number = ?',
        [passportNumber]
      );
      resident = result.rows[0] || null;
    } else if (cardIdOrQr) {
      // Try to parse as QR data first
      try {
        const qrData = JSON.parse(cardIdOrQr);
        if (qrData.nationalId) {
          const nationalIdHash = hashNationalId(qrData.nationalId);
          const result = await query(
            'SELECT * FROM residents WHERE national_id_hash = ?',
            [nationalIdHash]
          );
          resident = result.rows[0] || null;
        }
      } catch {
        // If not valid JSON, treat as card ID
        const result = await query(
          'SELECT * FROM residents WHERE card_id = ?',
          [cardIdOrQr]
        );
        resident = result.rows[0] || null;
      }
    }
    
    // Convert database format to API format
    if (resident) {
      resident = {
        id: resident.id,
        nationalId: resident.national_id_hash, // Note: This should be decrypted in production
        firstName: resident.first_name_cipher, // Note: This should be decrypted in production
        lastName: resident.last_name_cipher, // Note: This should be decrypted in production
        dateOfBirth: resident.date_of_birth_cipher, // Note: This should be decrypted in production
        nationality: resident.nationality,
        occupation: resident.occupation_cipher, // Note: This should be decrypted in production
        maritalStatus: resident.marital_status,
        residencyStatus: resident.residency_status,
        passportNumber: resident.passport_number,
        passportExpiryDate: resident.passport_expiry_date,
        address: resident.address_cipher, // Note: This should be decrypted in production
        phoneNumber: resident.phone_number_cipher, // Note: This should be decrypted in production
        email: resident.email_cipher, // Note: This should be decrypted in production
        emergencyContact: resident.emergency_contact_cipher, // Note: This should be decrypted in production
        qrCode: resident.qr_code_signature,
        createdAt: resident.created_at,
        updatedAt: resident.updated_at,
      };
    }
    
    const response: SearchResidentResponse = {
      resident: resident || undefined,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Search resident error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleRegisterResident: RequestHandler = async (req, res) => {
  try {
    const residentData: ResidentRegistrationRequest = req.body;
    
    // Check if resident exists by National ID
    const nationalIdHash = hashNationalId(residentData.nationalId);
    const existingResult = await query(
      'SELECT id FROM residents WHERE national_id_hash = ?',
      [nationalIdHash]
    );
    
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: "Resident with this National ID already exists" });
    }
    
    // Check if passport number already exists (if provided)
    if (residentData.passportNumber) {
      const passportResult = await query(
        'SELECT id FROM residents WHERE passport_number = ?',
        [residentData.passportNumber]
      );
      
      if (passportResult.rows.length > 0) {
        return res.status(400).json({ error: "Resident with this passport number already exists" });
      }
    }
    
    // Generate IDs
    const residentId = uuidv4();
    const cardId = generateNationalCardId();
    
    // Create resident object for QR generation
    const resident: Resident = {
      id: residentId,
      nationalId: residentData.nationalId,
      firstName: residentData.firstName,
      lastName: residentData.lastName,
      dateOfBirth: residentData.dateOfBirth,
      nationality: residentData.nationality,
      occupation: residentData.occupation,
      maritalStatus: residentData.maritalStatus,
      residencyStatus: residentData.residencyStatus || 'citizen',
      passportNumber: residentData.passportNumber,
      passportExpiryDate: residentData.passportExpiryDate,
      address: residentData.address,
      phoneNumber: residentData.phoneNumber,
      email: residentData.email,
      emergencyContact: residentData.emergencyContact,
      qrCode: "", // Will be set below
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Generate QR code data
    resident.qrCode = await createResidentQrData(resident);
    
    // Insert new resident with all fields
    await query(
      `INSERT INTO residents (
        id, department_id, national_id_hash, first_name_cipher, last_name_cipher, 
        date_of_birth_cipher, nationality, occupation_cipher, marital_status, 
        residency_status, passport_number, passport_expiry_date, address_cipher, 
        phone_number_cipher, email_cipher, emergency_contact_cipher, qr_code_signature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        residentId, 1, nationalIdHash, // Using department_id = 1 (default department)
        residentData.firstName || "", // Note: In production, encrypt these
        residentData.lastName || "",
        residentData.dateOfBirth || "",
        residentData.nationality || "",
        residentData.occupation || "",
        residentData.maritalStatus || "single",
        residentData.residencyStatus || "citizen",
        residentData.passportNumber || null,
        residentData.passportExpiryDate || null,
        residentData.address || "",
        residentData.phoneNumber || "",
        residentData.email || "",
        residentData.emergencyContact || "",
        resident.qrCode
      ]
    );
    
    const response: UpsertResidentResponse = {
      resident,
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error("Error registering resident:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleUpsertResident: RequestHandler = async (req, res) => {
  try {
    const { resident: residentData }: UpsertResidentRequest = req.body;
    
    // Check if resident exists by National ID
    const nationalIdHash = hashNationalId(residentData.nationalId);
    const existingResult = await query(
      'SELECT * FROM residents WHERE national_id_hash = ?',
      [nationalIdHash]
    );
    
    let resident: Resident;
    
    if (existingResult.rows.length > 0) {
      // Update existing resident
      const existingResident = existingResult.rows[0];
      
      await query(
        `UPDATE residents SET 
         first_name_cipher = ?, last_name_cipher = ?, date_of_birth_cipher = ?, 
         nationality = ?, occupation_cipher = ?, marital_status = ?, 
         residency_status = ?, passport_number = ?, passport_expiry_date = ?,
         address_cipher = ?, phone_number_cipher = ?, email_cipher = ?, 
         emergency_contact_cipher = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          residentData.firstName || "",
          residentData.lastName || "",
          residentData.dateOfBirth || "",
          residentData.nationality || "",
          residentData.occupation || "",
          residentData.maritalStatus || "single",
          residentData.residencyStatus || "citizen",
          residentData.passportNumber || null,
          residentData.passportExpiryDate || null,
          residentData.address || "",
          residentData.phoneNumber || "",
          residentData.email || "",
          residentData.emergencyContact || "",
          existingResident.id
        ]
      );
      
      resident = {
        id: existingResident.id,
        nationalId: residentData.nationalId,
        firstName: residentData.firstName,
        lastName: residentData.lastName,
        dateOfBirth: residentData.dateOfBirth,
        nationality: residentData.nationality,
        occupation: residentData.occupation,
        maritalStatus: residentData.maritalStatus,
        residencyStatus: residentData.residencyStatus || 'citizen',
        passportNumber: residentData.passportNumber,
        passportExpiryDate: residentData.passportExpiryDate,
        address: residentData.address,
        phoneNumber: residentData.phoneNumber,
        email: residentData.email,
        emergencyContact: residentData.emergencyContact,
        qrCode: existingResident.qr_code_signature,
        createdAt: existingResident.created_at,
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Create new resident
      const residentId = uuidv4();
      
      resident = {
        id: residentId,
        nationalId: residentData.nationalId,
        firstName: residentData.firstName,
        lastName: residentData.lastName,
        dateOfBirth: residentData.dateOfBirth,
        nationality: residentData.nationality,
        occupation: residentData.occupation,
        maritalStatus: residentData.maritalStatus,
        residencyStatus: residentData.residencyStatus || 'citizen',
        passportNumber: residentData.passportNumber,
        passportExpiryDate: residentData.passportExpiryDate,
        address: residentData.address,
        phoneNumber: residentData.phoneNumber,
        email: residentData.email,
        emergencyContact: residentData.emergencyContact,
        qrCode: "", // Will be set below
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Generate QR code data
      resident.qrCode = await createResidentQrData(resident);
      
      // Insert new resident
      await query(
        `INSERT INTO residents (
          id, department_id, national_id_hash, first_name_cipher, last_name_cipher, 
          date_of_birth_cipher, nationality, occupation_cipher, marital_status, 
          residency_status, passport_number, passport_expiry_date, address_cipher, 
          phone_number_cipher, email_cipher, emergency_contact_cipher, qr_code_signature
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          residentId, 1, nationalIdHash,
          residentData.firstName || "",
          residentData.lastName || "",
          residentData.dateOfBirth || "",
          residentData.nationality || "",
          residentData.occupation || "",
          residentData.maritalStatus || "single",
          residentData.residencyStatus || "citizen",
          residentData.passportNumber || null,
          residentData.passportExpiryDate || null,
          residentData.address || "",
          residentData.phoneNumber || "",
          residentData.email || "",
          residentData.emergencyContact || "",
          resident.qrCode
        ]
      );
    }
    
    const response: UpsertResidentResponse = {
      resident,
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error upserting resident:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all residents (with pagination)
export const handleListResidents: RequestHandler = async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    
    const result = await query(
      'SELECT * FROM residents ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    
    const residents = result.rows.map((row: any) => ({
      id: row.id,
      nationalId: row.national_id_hash, // Note: This should be decrypted in production
      firstName: row.first_name_cipher, // Note: This should be decrypted in production
      lastName: row.last_name_cipher, // Note: This should be decrypted in production
      dateOfBirth: row.date_of_birth_cipher, // Note: This should be decrypted in production
      nationality: row.nationality,
      occupation: row.occupation_cipher, // Note: This should be decrypted in production
      maritalStatus: row.marital_status,
      residencyStatus: row.residency_status,
      passportNumber: row.passport_number,
      passportExpiryDate: row.passport_expiry_date,
      address: row.address_cipher, // Note: This should be decrypted in production
      phoneNumber: row.phone_number_cipher, // Note: This should be decrypted in production
      email: row.email_cipher, // Note: This should be decrypted in production
      emergencyContact: row.emergency_contact_cipher, // Note: This should be decrypted in production
      qrCode: row.qr_code_signature,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    
    res.json({ residents, page, limit });
  } catch (error) {
    console.error('List residents error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};