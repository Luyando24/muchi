import { RequestHandler } from 'express';
import { query } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

// --- Parents ---

export const handleListParents: RequestHandler = async (req, res) => {
    try {
        const { schoolId } = req.query;
        // Parents might not be strictly bound to a school in the 'parents' table directly, 
        // but usually we query via student relationships.
        // For now, let's list all parents (admin view) or search.
        // If schoolId is provided, we need to join through student_parents -> students -> school_id

        let sql = `SELECT p.id, p.first_name, p.last_name, p.email, p.phone, p.is_active 
               FROM parents p`;
        const params: any[] = [];

        if (schoolId) {
            sql = `SELECT DISTINCT p.id, p.first_name, p.last_name, p.email, p.phone, p.is_active 
              FROM parents p
              JOIN student_parents sp ON p.id = sp.parent_id
              JOIN students s ON sp.student_id = s.id
              WHERE s.school_id = $1`;
            params.push(schoolId);
        }

        sql += ` ORDER BY p.last_name, p.first_name`;

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error listing parents:', error);
        res.status(500).json({ error: 'Failed to list parents' });
    }
};

export const handleCreateParent: RequestHandler = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, nrcNumber, address, occupation, password } = req.body;

        if (!firstName || !lastName || !email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const id = uuidv4();
        let passwordHash = null;
        if (password) {
            passwordHash = await bcrypt.hash(password, 10);
        }

        await query(
            `INSERT INTO parents (id, first_name, last_name, email, phone, nrc_number, address, occupation, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [id, firstName, lastName, email, phone, nrcNumber, address, occupation, passwordHash]
        );

        res.json({ id, message: 'Parent account created successfully' });
    } catch (error) {
        console.error('Error creating parent:', error);
        res.status(500).json({ error: 'Failed to create parent account' });
    }
};

export const handleLinkParentToStudent: RequestHandler = async (req, res) => {
    try {
        const { parentId, studentId, relationship, isPrimary } = req.body;

        if (!parentId || !studentId || !relationship) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const id = uuidv4();
        await query(
            `INSERT INTO student_parents (id, parent_id, student_id, relationship, is_primary)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (student_id, parent_id) DO UPDATE 
             SET relationship = EXCLUDED.relationship, is_primary = EXCLUDED.is_primary`,
            [id, parentId, studentId, relationship, isPrimary || false]
        );

        res.json({ message: 'Parent linked to student successfully' });
    } catch (error) {
        console.error('Error linking parent to student:', error);
        res.status(500).json({ error: 'Failed to link parent to student' });
    }
};

export const handleGetParentChildren: RequestHandler = async (req, res) => {
    try {
        const { id } = req.params; // parentId

        const result = await query(
            `SELECT s.*, sp.relationship, sp.is_primary, sch.name as school_name
             FROM students s
             JOIN student_parents sp ON s.id = sp.student_id
             JOIN schools sch ON s.school_id = sch.id
             WHERE sp.parent_id = $1`,
            [id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching parent children:', error);
        res.status(500).json({ error: 'Failed to fetch children' });
    }
}
