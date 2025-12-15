import { RequestHandler } from 'express';
import { query } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

// --- Time Slots ---

export const handleListTimeSlots: RequestHandler = async (req, res) => {
    try {
        const { schoolId } = req.query;
        if (!schoolId) return res.status(400).json({ error: 'School ID is required' });

        const result = await query(
            `SELECT * FROM time_slots WHERE school_id = $1 ORDER BY start_time ASC`,
            [schoolId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error listing time slots:', error);
        res.status(500).json({ error: 'Failed to list time slots' });
    }
};

export const handleCreateTimeSlot: RequestHandler = async (req, res) => {
    try {
        const { schoolId, name, startTime, endTime, isBreak, category } = req.body;

        if (!schoolId || !name || !startTime || !endTime) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const id = uuidv4();
        await query(
            `INSERT INTO time_slots (id, school_id, name, start_time, end_time, is_break, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, schoolId, name, startTime, endTime, isBreak || false, category || 'regular']
        );

        res.json({ id, message: 'Time slot created successfully' });
    } catch (error) {
        console.error('Error creating time slot:', error);
        res.status(500).json({ error: 'Failed to create time slot' });
    }
};

export const handleUpdateTimeSlot: RequestHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, startTime, endTime, isBreak, category } = req.body;

        await query(
            `UPDATE time_slots 
       SET name = COALESCE($1, name),
           start_time = COALESCE($2, start_time),
           end_time = COALESCE($3, end_time),
           is_break = COALESCE($4, is_break),
           category = COALESCE($5, category),
           updated_at = NOW()
       WHERE id = $6`,
            [name, startTime, endTime, isBreak, category, id]
        );

        res.json({ message: 'Time slot updated successfully' });
    } catch (error) {
        console.error('Error updating time slot:', error);
        res.status(500).json({ error: 'Failed to update time slot' });
    }
};

export const handleDeleteTimeSlot: RequestHandler = async (req, res) => {
    try {
        const { id } = req.params;
        await query(`DELETE FROM time_slots WHERE id = $1`, [id]);
        res.json({ message: 'Time slot deleted successfully' });
    } catch (error) {
        console.error('Error deleting time slot:', error);
        res.status(500).json({ error: 'Failed to delete time slot' });
    }
};

// --- Timetable Entries ---

export const handleGetTimetable: RequestHandler = async (req, res) => {
    try {
        const { schoolId, classId, teacherId } = req.query;
        if (!schoolId) return res.status(400).json({ error: 'School ID is required' });

        let sql = `SELECT t.*, s.name as subject_name, tea.first_name as teacher_first_name, tea.last_name as teacher_last_name
               FROM timetable_entries t
               LEFT JOIN subjects s ON t.subject_id = s.id
               LEFT JOIN teachers term_tea ON t.teacher_id = term_tea.id
               LEFT JOIN staff_users tea ON term_tea.staff_user_id = tea.id
               WHERE t.school_id = $1`;
        const params: any[] = [schoolId];

        if (classId) {
            params.push(classId);
            sql += ` AND t.class_id = $${params.length}`;
        }
        if (teacherId) {
            params.push(teacherId);
            sql += ` AND t.teacher_id = $${params.length}`;
        }

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error getting timetable:', error);
        res.status(500).json({ error: 'Failed to get timetable' });
    }
};

export const handleCreateTimetableEntry: RequestHandler = async (req, res) => {
    try {
        const { schoolId, classId, subjectId, teacherId, dayOfWeek, startTime, endTime, roomNumber } = req.body;

        if (!schoolId || !classId || !dayOfWeek || !startTime || !endTime) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // TODO: Conflict check (check if teacher or class is already booked at this time)
        // For now, allow overlapping

        const id = uuidv4();
        await query(
            `INSERT INTO timetable_entries (id, school_id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [id, schoolId, classId, subjectId, teacherId, dayOfWeek, startTime, endTime, roomNumber]
        );

        res.json({ id, message: 'Timetable entry created successfully' });
    } catch (error) {
        console.error('Error creating timetable entry:', error);
        res.status(500).json({ error: 'Failed to create timetable entry' });
    }
};

export const handleUpdateTimetableEntry: RequestHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const { subjectId, teacherId, dayOfWeek, startTime, endTime, roomNumber } = req.body;

        await query(
            `UPDATE timetable_entries 
       SET subject_id = COALESCE($1, subject_id),
           teacher_id = COALESCE($2, teacher_id),
           day_of_week = COALESCE($3, day_of_week),
           start_time = COALESCE($4, start_time),
           end_time = COALESCE($5, end_time),
           room_number = COALESCE($6, room_number),
           updated_at = NOW()
       WHERE id = $7`,
            [subjectId, teacherId, dayOfWeek, startTime, endTime, roomNumber, id]
        );

        res.json({ message: 'Timetable entry updated successfully' });
    } catch (error) {
        console.error('Error updating timetable entry:', error);
        res.status(500).json({ error: 'Failed to update timetable entry' });
    }
};

export const handleDeleteTimetableEntry: RequestHandler = async (req, res) => {
    try {
        const { id } = req.params;
        await query(`DELETE FROM timetable_entries WHERE id = $1`, [id]);
        res.json({ message: 'Timetable entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting timetable entry:', error);
        res.status(500).json({ error: 'Failed to delete timetable entry' });
    }
};
