import { Request, Response } from 'express';
import { Subject } from '../../shared/api.js';
import { pool } from '../lib/db';

function dbRowToSubject(row: any): Subject {
  return {
    id: row.id,
    schoolId: row.school_id,
    subjectName: row.name,
    subjectCode: row.code,
    description: row.description,
    category: row.category,
    credits: row.credits,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function handleListSubjects(req: Request, res: Response) {
  try {
    const { schoolId, isActive } = req.query;

    let query = `SELECT * FROM subjects WHERE 1=1`;
    const params: any[] = [];
    let idx = 0;

    if (schoolId) {
      idx++;
      query += ` AND school_id = $${idx}`;
      params.push(schoolId);
    }

    if (isActive !== undefined) {
      idx++;
      query += ` AND is_active = $${idx}`;
      params.push(isActive === 'true');
    }

    query += ` ORDER BY name ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows.map(dbRowToSubject));
  } catch (error) {
    console.error('Error listing subjects:', error);
    res.status(500).json({ error: 'Failed to list subjects' });
  }
}

export async function handleGetSubject(req: Request, res: Response) {
  try {
    const { subjectId } = req.params;
    const result = await pool.query('SELECT * FROM subjects WHERE id = $1', [subjectId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(dbRowToSubject(result.rows[0]));
  } catch (error) {
    console.error('Error getting subject:', error);
    res.status(500).json({ error: 'Failed to get subject' });
  }
}

export async function handleCreateSubject(req: Request, res: Response) {
  try {
    const { schoolId, subjectName, subjectCode, description, category, credits, isActive } = req.body || {};

    if (!schoolId || !subjectName || !subjectCode) {
      return res.status(400).json({ error: 'schoolId, subjectName, and subjectCode are required' });
    }

    const insertQuery = `
      INSERT INTO subjects (id, school_id, name, code, description, category, credits, is_active)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, COALESCE($7, TRUE))
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      schoolId,
      subjectName,
      subjectCode,
      description ?? null,
      category ?? 'core',
      credits ?? 0,
      isActive ?? true,
    ]);

    res.status(201).json(dbRowToSubject(result.rows[0]));
  } catch (error: any) {
    console.error('Error creating subject:', error);
    const message = error?.message?.includes('duplicate key value')
      ? 'Subject code must be unique per school'
      : 'Failed to create subject';
    res.status(500).json({ error: message });
  }
}

export async function handleUpdateSubject(req: Request, res: Response) {
  try {
    const { subjectId } = req.params;
    const data = req.body as Partial<SubjectFormData>;

    const exists = await pool.query('SELECT id FROM subjects WHERE id = $1', [subjectId]);
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 0;

    if (data.subjectName !== undefined) { idx++; fields.push(`name = $${idx}`); values.push(data.subjectName); }
    if (data.subjectCode !== undefined) { idx++; fields.push(`code = $${idx}`); values.push(data.subjectCode); }
    if (data.description !== undefined) { idx++; fields.push(`description = $${idx}`); values.push(data.description); }
    if (data.category !== undefined) { idx++; fields.push(`category = $${idx}`); values.push(data.category); }
    if (data.credits !== undefined) { idx++; fields.push(`credits = $${idx}`); values.push(data.credits); }
    if (data.isActive !== undefined) { idx++; fields.push(`is_active = $${idx}`); values.push(data.isActive); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    idx++; fields.push(`updated_at = $${idx}`); values.push(new Date());
    idx++; values.push(subjectId);

    const updateQuery = `UPDATE subjects SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const updated = await pool.query(updateQuery, values);
    res.json(dbRowToSubject(updated.rows[0]));
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
}

export async function handleDeleteSubject(req: Request, res: Response) {
  try {
    const { subjectId } = req.params;
    await pool.query('DELETE FROM subjects WHERE id = $1', [subjectId]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
}

export async function handleSearchSubjects(req: Request, res: Response) {
  try {
    const { q, schoolId } = req.body || {};
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const params: any[] = [`%${q}%`];
    let query = `
      SELECT * FROM subjects
      WHERE (name ILIKE $1 OR code ILIKE $1 OR description ILIKE $1 OR grade ILIKE $1)
    `;

    if (schoolId) {
      params.push(schoolId);
      query += ` AND school_id = $2`;
    }

    query += ` ORDER BY name ASC LIMIT 50`;

    const result = await pool.query(query, params);
    res.json(result.rows.map(dbRowToSubject));
  } catch (error) {
    console.error('Error searching subjects:', error);
    res.status(500).json({ error: 'Failed to search subjects' });
  }
}