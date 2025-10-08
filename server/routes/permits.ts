import { RequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  CreatePermitRequest,
  CreatePermitResponse,
  ListPermitsResponse,
  UpdatePermitRequest,
  UpdatePermitResponse,
  Permit,
  Visa,
} from "@shared/api";
import { query } from "../lib/db";

// Helper function to generate permit number
function generatePermitNumber(type: string): string {
  const prefix = type === 'visa' ? 'VIS' : 'PER';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export const handleCreatePermit: RequestHandler = async (req, res) => {
  try {
    const {
      residentId,
      officeId,
      officerId,
      permitType,
      visaType,
      purpose,
      duration,
      validFrom,
      validUntil,
      status = 'pending',
      conditions,
      documents
    }: CreatePermitRequest = req.body;
    
    const permitId = uuidv4();
    const permitNumber = generatePermitNumber(permitType);
    const now = new Date().toISOString();
    
    // Insert permit into database
    await query(
      `INSERT INTO permits (
        id, permit_number, resident_id, office_id, officer_id, permit_type, 
        visa_type, purpose, duration, valid_from, valid_until, status, 
        conditions, documents, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        permitId, permitNumber, residentId, officeId, officerId, permitType,
        visaType, purpose, duration, validFrom, validUntil, status,
        JSON.stringify(conditions || []), JSON.stringify(documents || []),
        now, now
      ]
    );
    
    const newPermit: Permit = {
      id: permitId,
      permitNumber,
      residentId,
      officeId,
      officerId,
      permitType,
      visaType,
      purpose,
      duration,
      validFrom,
      validUntil,
      status,
      conditions: conditions || [],
      documents: documents || [],
      createdAt: now,
      updatedAt: now,
    };
    
    const response: CreatePermitResponse = {
      permit: newPermit,
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating permit:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleListPermits: RequestHandler = async (req, res) => {
  try {
    const { 
      officeId, 
      officerId, 
      residentId,
      status, 
      permitType, 
      visaType,
      limit = 50, 
      offset = 0 
    } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (officeId) {
      whereClause += ' AND office_id = ?';
      params.push(officeId);
    }
    
    if (officerId) {
      whereClause += ' AND officer_id = ?';
      params.push(officerId);
    }
    
    if (residentId) {
      whereClause += ' AND resident_id = ?';
      params.push(residentId);
    }
    
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    if (permitType) {
      whereClause += ' AND permit_type = ?';
      params.push(permitType);
    }
    
    if (visaType) {
      whereClause += ' AND visa_type = ?';
      params.push(visaType);
    }
    
    params.push(Number(limit), Number(offset));
    
    const result = await query(
      `SELECT * FROM permits 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      params
    );
    
    // Convert database format to API format
    const items = result.rows.map(dbPermit => ({
      id: dbPermit.id,
      permitNumber: dbPermit.permit_number,
      residentId: dbPermit.resident_id,
      officeId: dbPermit.office_id,
      officerId: dbPermit.officer_id,
      permitType: dbPermit.permit_type,
      visaType: dbPermit.visa_type,
      purpose: dbPermit.purpose,
      duration: dbPermit.duration,
      validFrom: dbPermit.valid_from,
      validUntil: dbPermit.valid_until,
      status: dbPermit.status,
      conditions: JSON.parse(dbPermit.conditions || '[]'),
      documents: JSON.parse(dbPermit.documents || '[]'),
      createdAt: dbPermit.created_at,
      updatedAt: dbPermit.updated_at,
    }));
    
    const response: ListPermitsResponse = {
      items,
    };
    
    res.json(response);
  } catch (error) {
    console.error('List permits error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleUpdatePermit: RequestHandler = async (req, res) => {
  try {
    const { permitId } = req.params;
    const {
      status,
      validFrom,
      validUntil,
      conditions,
      documents,
      notes
    }: UpdatePermitRequest = req.body;
    
    const now = new Date().toISOString();
    
    // Build dynamic update query
    const updateFields: string[] = [];
    const params: any[] = [];
    
    if (status !== undefined) {
      updateFields.push('status = ?');
      params.push(status);
    }
    
    if (validFrom !== undefined) {
      updateFields.push('valid_from = ?');
      params.push(validFrom);
    }
    
    if (validUntil !== undefined) {
      updateFields.push('valid_until = ?');
      params.push(validUntil);
    }
    
    if (conditions !== undefined) {
      updateFields.push('conditions = ?');
      params.push(JSON.stringify(conditions));
    }
    
    if (documents !== undefined) {
      updateFields.push('documents = ?');
      params.push(JSON.stringify(documents));
    }
    
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      params.push(notes);
    }
    
    updateFields.push('updated_at = ?');
    params.push(now);
    params.push(permitId);
    
    if (updateFields.length === 1) { // Only updated_at
      return res.status(400).json({ error: "No fields to update" });
    }
    
    await query(
      `UPDATE permits SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    // Fetch updated permit
    const result = await query(
      'SELECT * FROM permits WHERE id = ?',
      [permitId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Permit not found" });
    }
    
    const dbPermit = result.rows[0];
    const updatedPermit: Permit = {
      id: dbPermit.id,
      permitNumber: dbPermit.permit_number,
      residentId: dbPermit.resident_id,
      officeId: dbPermit.office_id,
      officerId: dbPermit.officer_id,
      permitType: dbPermit.permit_type,
      visaType: dbPermit.visa_type,
      purpose: dbPermit.purpose,
      duration: dbPermit.duration,
      validFrom: dbPermit.valid_from,
      validUntil: dbPermit.valid_until,
      status: dbPermit.status,
      conditions: JSON.parse(dbPermit.conditions || '[]'),
      documents: JSON.parse(dbPermit.documents || '[]'),
      createdAt: dbPermit.created_at,
      updatedAt: dbPermit.updated_at,
    };
    
    const response: UpdatePermitResponse = {
      permit: updatedPermit,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Update permit error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleGetPermit: RequestHandler = async (req, res) => {
  try {
    const { permitId } = req.params;
    
    const result = await query(
      'SELECT * FROM permits WHERE id = ?',
      [permitId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Permit not found" });
    }
    
    const dbPermit = result.rows[0];
    const permitData: Permit = {
      id: dbPermit.id,
      permitNumber: dbPermit.permit_number,
      residentId: dbPermit.resident_id,
      officeId: dbPermit.office_id,
      officerId: dbPermit.officer_id,
      permitType: dbPermit.permit_type,
      visaType: dbPermit.visa_type,
      purpose: dbPermit.purpose,
      duration: dbPermit.duration,
      validFrom: dbPermit.valid_from,
      validUntil: dbPermit.valid_until,
      status: dbPermit.status,
      conditions: JSON.parse(dbPermit.conditions || '[]'),
      documents: JSON.parse(dbPermit.documents || '[]'),
      createdAt: dbPermit.created_at,
      updatedAt: dbPermit.updated_at,
    };
    
    res.json({ permit: permitData });
  } catch (error) {
    console.error('Get permit error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleDeletePermit: RequestHandler = async (req, res) => {
  try {
    const { permitId } = req.params;
    
    const result = await query(
      'DELETE FROM permits WHERE id = ?',
      [permitId]
    );
    
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: "Permit not found" });
    }
    
    res.json({ message: "Permit deleted successfully" });
  } catch (error) {
    console.error('Delete permit error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get permit statistics
export const handleGetPermitStats: RequestHandler = async (req, res) => {
  try {
    const { officeId, officerId } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (officeId) {
      whereClause += ' AND office_id = ?';
      params.push(officeId);
    }
    
    if (officerId) {
      whereClause += ' AND officer_id = ?';
      params.push(officerId);
    }
    
    const statsResult = await query(
      `SELECT 
         COUNT(*) as total_permits,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_permits,
         COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_permits,
         COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_permits,
         COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_permits,
         COUNT(CASE WHEN permit_type = 'visa' THEN 1 END) as visa_permits,
         COUNT(CASE WHEN permit_type = 'work_permit' THEN 1 END) as work_permits,
         COUNT(CASE WHEN permit_type = 'residence_permit' THEN 1 END) as residence_permits
       FROM permits ${whereClause}`,
      params
    );
    
    const stats = statsResult.rows[0];
    
    res.json({
      totalPermits: parseInt(stats.total_permits),
      pendingPermits: parseInt(stats.pending_permits),
      approvedPermits: parseInt(stats.approved_permits),
      rejectedPermits: parseInt(stats.rejected_permits),
      expiredPermits: parseInt(stats.expired_permits),
      visaPermits: parseInt(stats.visa_permits),
      workPermits: parseInt(stats.work_permits),
      residencePermits: parseInt(stats.residence_permits),
    });
  } catch (error) {
    console.error('Get permit stats error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Visa-specific handlers
export const handleCreateVisa: RequestHandler = async (req, res) => {
  try {
    const visaData = {
      ...req.body,
      permitType: 'visa'
    };
    
    // Reuse permit creation logic
    req.body = visaData;
    return handleCreatePermit(req, res);
  } catch (error) {
    console.error("Error creating visa:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleListVisas: RequestHandler = async (req, res) => {
  try {
    // Add visa filter to query
    req.query = {
      ...req.query,
      permitType: 'visa'
    };
    
    return handleListPermits(req, res);
  } catch (error) {
    console.error('List visas error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Check permit validity
export const handleCheckPermitValidity: RequestHandler = async (req, res) => {
  try {
    const { permitNumber } = req.params;
    
    const result = await query(
      'SELECT * FROM permits WHERE permit_number = ?',
      [permitNumber]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Permit not found" });
    }
    
    const permit = result.rows[0];
    const now = new Date();
    const validUntil = new Date(permit.valid_until);
    const validFrom = new Date(permit.valid_from);
    
    const isValid = permit.status === 'approved' && 
                   now >= validFrom && 
                   now <= validUntil;
    
    res.json({
      permitNumber: permit.permit_number,
      isValid,
      status: permit.status,
      validFrom: permit.valid_from,
      validUntil: permit.valid_until,
      daysRemaining: isValid ? Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0
    });
  } catch (error) {
    console.error('Check permit validity error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};