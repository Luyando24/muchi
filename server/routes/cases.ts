import { RequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  CreateCaseRequest,
  CreateCaseResponse,
  ListCasesResponse,
  UpdateCaseRequest,
  UpdateCaseResponse,
  Case,
} from "@shared/api";
import { query } from "../lib/db";

export const handleCreateCase: RequestHandler = async (req, res) => {
  try {
    const {
      residentId,
      stationId,
      officerId,
      caseType,
      priority,
      description,
      location,
      incidentDate,
      status = 'open',
      evidence,
      witnesses
    }: CreateCaseRequest = req.body;
    
    const caseId = uuidv4();
    const caseNumber = `CASE-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const now = new Date().toISOString();
    
    // Insert case into database
    await query(
      `INSERT INTO cases (
        id, case_number, resident_id, station_id, officer_id, case_type, 
        priority, status, description, location, incident_date, evidence, 
        witnesses, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        caseId, caseNumber, residentId, stationId, officerId, caseType,
        priority, status, description, location, incidentDate || now,
        JSON.stringify(evidence || []), JSON.stringify(witnesses || []),
        now, now
      ]
    );
    
    const newCase: Case = {
      id: caseId,
      caseNumber,
      residentId,
      stationId,
      officerId,
      caseType,
      priority,
      status,
      description,
      location,
      incidentDate: incidentDate || now,
      evidence: evidence || [],
      witnesses: witnesses || [],
      createdAt: now,
      updatedAt: now,
    };
    
    const response: CreateCaseResponse = {
      case: newCase,
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating case:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleListCases: RequestHandler = async (req, res) => {
  try {
    const { 
      stationId, 
      officerId, 
      status, 
      caseType, 
      priority,
      limit = 50, 
      offset = 0 
    } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (stationId) {
      whereClause += ' AND station_id = ?';
      params.push(stationId);
    }
    
    if (officerId) {
      whereClause += ' AND officer_id = ?';
      params.push(officerId);
    }
    
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    if (caseType) {
      whereClause += ' AND case_type = ?';
      params.push(caseType);
    }
    
    if (priority) {
      whereClause += ' AND priority = ?';
      params.push(priority);
    }
    
    params.push(Number(limit), Number(offset));
    
    const result = await query(
      `SELECT * FROM cases 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      params
    );
    
    // Convert database format to API format
    const items = result.rows.map(dbCase => ({
      id: dbCase.id,
      caseNumber: dbCase.case_number,
      residentId: dbCase.resident_id,
      stationId: dbCase.station_id,
      officerId: dbCase.officer_id,
      caseType: dbCase.case_type,
      priority: dbCase.priority,
      status: dbCase.status,
      description: dbCase.description,
      location: dbCase.location,
      incidentDate: dbCase.incident_date,
      evidence: JSON.parse(dbCase.evidence || '[]'),
      witnesses: JSON.parse(dbCase.witnesses || '[]'),
      createdAt: dbCase.created_at,
      updatedAt: dbCase.updated_at,
    }));
    
    const response: ListCasesResponse = {
      items,
    };
    
    res.json(response);
  } catch (error) {
    console.error('List cases error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleUpdateCase: RequestHandler = async (req, res) => {
  try {
    const { caseId } = req.params;
    const {
      status,
      description,
      evidence,
      witnesses,
      notes
    }: UpdateCaseRequest = req.body;
    
    const now = new Date().toISOString();
    
    // Build dynamic update query
    const updateFields: string[] = [];
    const params: any[] = [];
    
    if (status !== undefined) {
      updateFields.push('status = ?');
      params.push(status);
    }
    
    if (description !== undefined) {
      updateFields.push('description = ?');
      params.push(description);
    }
    
    if (evidence !== undefined) {
      updateFields.push('evidence = ?');
      params.push(JSON.stringify(evidence));
    }
    
    if (witnesses !== undefined) {
      updateFields.push('witnesses = ?');
      params.push(JSON.stringify(witnesses));
    }
    
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      params.push(notes);
    }
    
    updateFields.push('updated_at = ?');
    params.push(now);
    params.push(caseId);
    
    if (updateFields.length === 1) { // Only updated_at
      return res.status(400).json({ error: "No fields to update" });
    }
    
    await query(
      `UPDATE cases SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    // Fetch updated case
    const result = await query(
      'SELECT * FROM cases WHERE id = ?',
      [caseId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Case not found" });
    }
    
    const dbCase = result.rows[0];
    const updatedCase: Case = {
      id: dbCase.id,
      caseNumber: dbCase.case_number,
      residentId: dbCase.resident_id,
      stationId: dbCase.station_id,
      officerId: dbCase.officer_id,
      caseType: dbCase.case_type,
      priority: dbCase.priority,
      status: dbCase.status,
      description: dbCase.description,
      location: dbCase.location,
      incidentDate: dbCase.incident_date,
      evidence: JSON.parse(dbCase.evidence || '[]'),
      witnesses: JSON.parse(dbCase.witnesses || '[]'),
      createdAt: dbCase.created_at,
      updatedAt: dbCase.updated_at,
    };
    
    const response: UpdateCaseResponse = {
      case: updatedCase,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Update case error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleGetCase: RequestHandler = async (req, res) => {
  try {
    const { caseId } = req.params;
    
    const result = await query(
      'SELECT * FROM cases WHERE id = ?',
      [caseId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Case not found" });
    }
    
    const dbCase = result.rows[0];
    const caseData: Case = {
      id: dbCase.id,
      caseNumber: dbCase.case_number,
      residentId: dbCase.resident_id,
      stationId: dbCase.station_id,
      officerId: dbCase.officer_id,
      caseType: dbCase.case_type,
      priority: dbCase.priority,
      status: dbCase.status,
      description: dbCase.description,
      location: dbCase.location,
      incidentDate: dbCase.incident_date,
      evidence: JSON.parse(dbCase.evidence || '[]'),
      witnesses: JSON.parse(dbCase.witnesses || '[]'),
      createdAt: dbCase.created_at,
      updatedAt: dbCase.updated_at,
    };
    
    res.json({ case: caseData });
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleDeleteCase: RequestHandler = async (req, res) => {
  try {
    const { caseId } = req.params;
    
    const result = await query(
      'DELETE FROM cases WHERE id = ?',
      [caseId]
    );
    
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: "Case not found" });
    }
    
    res.json({ message: "Case deleted successfully" });
  } catch (error) {
    console.error('Delete case error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get case statistics
export const handleGetCaseStats: RequestHandler = async (req, res) => {
  try {
    const { stationId, officerId } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (stationId) {
      whereClause += ' AND station_id = ?';
      params.push(stationId);
    }
    
    if (officerId) {
      whereClause += ' AND officer_id = ?';
      params.push(officerId);
    }
    
    const statsResult = await query(
      `SELECT 
         COUNT(*) as total_cases,
         COUNT(CASE WHEN status = 'open' THEN 1 END) as open_cases,
         COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_cases,
         COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_cases,
         COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_cases,
         COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority_cases,
         COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority_cases
       FROM cases ${whereClause}`,
      params
    );
    
    const stats = statsResult.rows[0];
    
    res.json({
      totalCases: parseInt(stats.total_cases),
      openCases: parseInt(stats.open_cases),
      inProgressCases: parseInt(stats.in_progress_cases),
      closedCases: parseInt(stats.closed_cases),
      highPriorityCases: parseInt(stats.high_priority_cases),
      mediumPriorityCases: parseInt(stats.medium_priority_cases),
      lowPriorityCases: parseInt(stats.low_priority_cases),
    });
  } catch (error) {
    console.error('Get case stats error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};