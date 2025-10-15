import { Request, Response } from 'express';
import { Assignment, UUID } from '../../shared/api';
import { pool } from '../lib/db';

function dbRowToAssignment(row: any): Assignment {
  return {
    id: row.id,
    assignmentNumber: row.assignment_number,
    teacherId: row.teacher_id || undefined,
    classId: row.class_id,
    subjectId: row.subject_id,
    title: row.title,
    description: row.description || '',
    category: row.category,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date ?? null,
    totalMarks: row.total_marks ?? null,
    relatedFiles: row.related_files ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as Assignment;
}

function generateAssignmentNumber(): string {
  const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `ASN-${ts}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

export async function handleListAssignments(req: Request, res: Response) {
  try {
    const { schoolId, classId, subjectId, teacherId, status, category, limit } = req.query as any;

    let sql = 'SELECT * FROM assignments WHERE 1=1';
    const params: any[] = [];
    let idx = 0;

    if (schoolId) { idx++; sql += ` AND school_id = $${idx}`; params.push(schoolId); }
    if (classId) { idx++; sql += ` AND class_id = $${idx}`; params.push(classId); }
    if (subjectId) { idx++; sql += ` AND subject_id = $${idx}`; params.push(subjectId); }
    if (teacherId) { idx++; sql += ` AND teacher_id = $${idx}`; params.push(teacherId); }
    if (status) { idx++; sql += ` AND status = $${idx}`; params.push(status); }
    if (category) { idx++; sql += ` AND category = $${idx}`; params.push(category); }

    sql += ' ORDER BY due_date ASC NULLS LAST, updated_at DESC';
    const lim = Number(limit) > 0 ? Math.min(Number(limit), 500) : 100;
    sql += ` LIMIT ${lim}`;

    const result = await pool.query(sql, params);
    res.json(result.rows.map(dbRowToAssignment));
  } catch (error) {
    console.error('Error listing assignments:', error);
    res.status(500).json({ error: 'Failed to list assignments' });
  }
}

export async function handleGetAssignment(req: Request, res: Response) {
  try {
    const { assignmentId } = req.params;
    const result = await pool.query('SELECT * FROM assignments WHERE id = $1', [assignmentId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(dbRowToAssignment(result.rows[0]));
  } catch (error) {
    console.error('Error getting assignment:', error);
    res.status(500).json({ error: 'Failed to get assignment' });
  }
}

export async function handleCreateAssignment(req: Request, res: Response) {
  try {
    const {
      schoolId,
      teacherId,
      classId,
      subjectId,
      title,
      description,
      instructions,
      category,
      priority,
      status,
      dueDate,
      totalMarks,
      relatedFiles,
    } = req.body || {};

    if (!schoolId || !classId || !subjectId || !title || !category) {
      return res.status(400).json({ error: 'schoolId, classId, subjectId, title, and category are required' });
    }

    const now = new Date();
    const assignmentNumber = generateAssignmentNumber();

    const insertSql = `
      INSERT INTO assignments (
        school_id, assignment_number, teacher_id, class_id, subject_id,
        title, description, instructions, category, priority, status,
        due_date, total_marks, related_files, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, COALESCE($10, 'medium'), COALESCE($11, 'assigned'),
        $12, $13, $14, $15, $16
      ) RETURNING *
    `;

    const result = await pool.query(insertSql, [
      schoolId,
      assignmentNumber,
      teacherId ?? null,
      classId,
      subjectId,
      title,
      description ?? null,
      instructions ?? null,
      category,
      priority ?? null,
      status ?? null,
      dueDate ?? null,
      totalMarks ?? null,
      relatedFiles ?? null,
      now,
      now,
    ]);

    res.status(201).json(dbRowToAssignment(result.rows[0]));
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    const msg = error?.message?.includes('duplicate key value')
      ? 'Assignment number already exists'
      : 'Failed to create assignment';
    res.status(500).json({ error: msg });
  }
}

export async function handleUpdateAssignment(req: Request, res: Response) {
  try {
    const { assignmentId } = req.params;
    const data = req.body as Partial<Assignment> & { instructions?: string };

    const exists = await pool.query('SELECT id FROM assignments WHERE id = $1', [assignmentId]);
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 0;

    if (data.title !== undefined) { idx++; fields.push(`title = $${idx}`); values.push(data.title); }
    if (data.description !== undefined) { idx++; fields.push(`description = $${idx}`); values.push(data.description); }
    if ((data as any).instructions !== undefined) { idx++; fields.push(`instructions = $${idx}`); values.push((data as any).instructions); }
    if (data.category !== undefined) { idx++; fields.push(`category = $${idx}`); values.push(data.category); }
    if (data.priority !== undefined) { idx++; fields.push(`priority = $${idx}`); values.push(data.priority); }
    if (data.status !== undefined) { idx++; fields.push(`status = $${idx}`); values.push(data.status); }
    if (data.dueDate !== undefined) { idx++; fields.push(`due_date = $${idx}`); values.push(data.dueDate); }
    if (data.totalMarks !== undefined) { idx++; fields.push(`total_marks = $${idx}`); values.push(data.totalMarks); }
    if (data.relatedFiles !== undefined) { idx++; fields.push(`related_files = $${idx}`); values.push(data.relatedFiles); }
    if ((data as any).teacherId !== undefined) { idx++; fields.push(`teacher_id = $${idx}`); values.push((data as any).teacherId); }
    if ((data as any).classId !== undefined) { idx++; fields.push(`class_id = $${idx}`); values.push((data as any).classId); }
    if ((data as any).subjectId !== undefined) { idx++; fields.push(`subject_id = $${idx}`); values.push((data as any).subjectId); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    idx++; fields.push(`updated_at = $${idx}`); values.push(new Date());
    idx++; values.push(assignmentId);

    const updateSql = `UPDATE assignments SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const updated = await pool.query(updateSql, values);
    res.json(dbRowToAssignment(updated.rows[0]));
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
}

export async function handleDeleteAssignment(req: Request, res: Response) {
  try {
    const { assignmentId } = req.params;
    await pool.query('DELETE FROM assignments WHERE id = $1', [assignmentId]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
}

export async function handleGetAssignmentStats(req: Request, res: Response) {
  try {
    const { schoolId } = req.query as any;
    const params: any[] = [];
    let where = '1=1';
    if (schoolId) { where = 'school_id = $1'; params.push(schoolId); }

    const totalResult = await pool.query(`SELECT COUNT(*) as c FROM assignments WHERE ${where}`, params);
    const overdueResult = await pool.query(
      `SELECT COUNT(*) as c FROM assignments WHERE ${where} AND due_date < NOW() AND status <> 'graded'`,
      params
    );
    const completedResult = await pool.query(
      `SELECT COUNT(*) as c FROM assignments WHERE ${where} AND status = 'graded'`,
      params
    );

    const total = parseInt(totalResult.rows[0]?.c || '0', 10);
    const overdue = parseInt(overdueResult.rows[0]?.c || '0', 10);
    const completed = parseInt(completedResult.rows[0]?.c || '0', 10);
    const pending = Math.max(total - completed, 0);

    res.json({ total, overdue, completed, pending });
  } catch (error) {
    console.error('Error getting assignment stats:', error);
    res.status(500).json({ error: 'Failed to get assignment statistics' });
  }
}