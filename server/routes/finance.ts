import { RequestHandler } from 'express';
import { query } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

// --- Fee Structures ---

export const handleListFeeStructures: RequestHandler = async (req, res) => {
    try {
        const { schoolId } = req.query as { schoolId: string };
        if (!schoolId) return res.status(400).json({ error: 'School ID is required' });

        const result = await query(
            `SELECT * FROM fee_structures WHERE school_id = $1 ORDER BY created_at DESC`,
            [schoolId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error listing fee structures:', error);
        res.status(500).json({ error: 'Failed to list fee structures' });
    }
};

export const handleCreateFeeStructure: RequestHandler = async (req, res) => {
    try {
        const { schoolId, name, academicYear, term, gradeLevel, amount, breakdown, dueDate } = req.body;

        // Basic validation
        if (!schoolId || !name || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const id = uuidv4();
        await query(
            `INSERT INTO fee_structures (id, school_id, name, academic_year, term, grade_level, amount, breakdown, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [id, schoolId, name, academicYear, term, gradeLevel, amount, breakdown, dueDate]
        );

        res.json({ id, message: 'Fee structure created successfully' });
    } catch (error) {
        console.error('Error creating fee structure:', error);
        res.status(500).json({ error: 'Failed to create fee structure' });
    }
};

export const handleUpdateFeeStructure: RequestHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, academicYear, term, gradeLevel, amount, breakdown, dueDate, isActive } = req.body;

        await query(
            `UPDATE fee_structures 
       SET name = COALESCE($1, name),
           academic_year = COALESCE($2, academic_year),
           term = COALESCE($3, term),
           grade_level = COALESCE($4, grade_level),
           amount = COALESCE($5, amount),
           breakdown = COALESCE($6, breakdown),
           due_date = COALESCE($7, due_date),
           is_active = COALESCE($8, is_active),
           updated_at = NOW()
       WHERE id = $9`,
            [name, academicYear, term, gradeLevel, amount, breakdown, dueDate, isActive, id]
        );

        res.json({ message: 'Fee structure updated successfully' });
    } catch (error) {
        console.error('Error updating fee structure:', error);
        res.status(500).json({ error: 'Failed to update fee structure' });
    }
};

export const handleDeleteFeeStructure: RequestHandler = async (req, res) => {
    try {
        const { id } = req.params;
        await query(`DELETE FROM fee_structures WHERE id = $1`, [id]);
        res.json({ message: 'Fee structure deleted successfully' });
    } catch (error) {
        console.error('Error deleting fee structure:', error);
        res.status(500).json({ error: 'Failed to delete fee structure' });
    }
};

// --- Invoices ---

export const handleListInvoices: RequestHandler = async (req, res) => {
    try {
        const { schoolId, studentId, status } = req.query as { schoolId: string; studentId?: string; status?: string };
        let sql = `SELECT i.*, s.first_name, s.last_name, s.student_number, s.current_class as "class"
               FROM invoices i 
               JOIN students s ON i.student_id = s.id 
               WHERE i.school_id = $1`;
        const params: any[] = [schoolId];

        if (studentId) {
            params.push(studentId);
            sql += ` AND i.student_id = $${params.length}`;
        }
        if (status) {
            params.push(status);
            sql += ` AND i.status = $${params.length}`;
        }

        sql += ` ORDER BY i.created_at DESC`;

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error listing invoices:', error);
        res.status(500).json({ error: 'Failed to list invoices' });
    }
};

export const handleCreateInvoice: RequestHandler = async (req, res) => {
    try {
        const { schoolId, studentId, feeStructureId, amount, dueDate, items } = req.body;

        if (!schoolId || !studentId || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Generate invoice number (simple logic for now, could be improved)
        const invoiceNumber = `INV-${Date.now()}`;

        const invoiceId = uuidv4();

        // Transaction ideally
        await query('BEGIN');

        await query(
            `INSERT INTO invoices (id, school_id, student_id, invoice_number, fee_structure_id, amount, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
            [invoiceId, schoolId, studentId, invoiceNumber, feeStructureId, amount, dueDate]
        );

        if (items && Array.isArray(items)) {
            for (const item of items) {
                await query(
                    `INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount)
           VALUES ($1, $2, $3, $4, $5, $6)`,
                    [uuidv4(), invoiceId, item.description, item.quantity, item.unitPrice, item.amount]
                );
            }
        }

        await query('COMMIT');

        res.json({ id: invoiceId, invoiceNumber, message: 'Invoice created successfully' });
    } catch (error) {
        await query('ROLLBACK');
        console.error('Error creating invoice:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
};

// --- Payments ---

export const handleListPayments: RequestHandler = async (req, res) => {
    try {
        const { schoolId, studentId } = req.query;
        let sql = `SELECT p.*, s.first_name, s.last_name 
               FROM payments p 
               LEFT JOIN students s ON p.student_id = s.id 
               WHERE p.school_id = $1`;
        const params: any[] = [schoolId];

        if (studentId) {
            params.push(studentId);
            sql += ` AND p.student_id = $${params.length}`;
        }

        sql += ` ORDER BY p.payment_date DESC`;

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error listing payments:', error);
        res.status(500).json({ error: 'Failed to list payments' });
    }
};

export const handleRecordPayment: RequestHandler = async (req, res) => {
    try {
        const { schoolId, invoiceId, studentId, amount, method, referenceNumber, comments } = req.body;

        if (!schoolId || !amount || !method) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const paymentId = uuidv4();

        await query('BEGIN');

        await query(
            `INSERT INTO payments (id, school_id, invoice_id, student_id, amount, method, reference_number, comments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [paymentId, schoolId, invoiceId, studentId, amount, method, referenceNumber, comments]
        );

        // Update invoice status if linked
        if (invoiceId) {
            // Check current paid amount
            const invRes = await query(`SELECT amount, amount_paid FROM invoices WHERE id = $1`, [invoiceId]);
            if (invRes.rows.length > 0) {
                const inv = invRes.rows[0];
                const newPaid = parseFloat(inv.amount_paid) + parseFloat(amount);
                const status = newPaid >= parseFloat(inv.amount) ? 'paid' : 'partial';

                await query(
                    `UPDATE invoices SET amount_paid = $1, status = $2, updated_at = NOW() WHERE id = $3`,
                    [newPaid, status, invoiceId]
                );
            }
        }

        await query('COMMIT');
        res.json({ id: paymentId, message: 'Payment recorded successfully' });
    } catch (error) {
        await query('ROLLBACK');
        console.error('Error recording payment:', error);
        res.status(500).json({ error: 'Failed to record payment' });
    }
};

export const handleGetFinanceStats: RequestHandler = async (req, res) => {
    try {
        const { schoolId } = req.query as { schoolId: string };
        if (!schoolId) return res.status(400).json({ error: 'School ID is required' });

        // Total Revenue (sum of completed payments)
        const revenueRes = await query(
            `SELECT SUM(amount) as total FROM payments WHERE school_id = $1 AND status = 'completed'`,
            [schoolId]
        );
        const totalRevenue = parseFloat(revenueRes.rows[0].total || '0');

        // Pending Payments (sum of balance of pending/partial invoices)
        const pendingRes = await query(
            `SELECT SUM(balance) as pending FROM invoices WHERE school_id = $1 AND status IN ('pending', 'partial', 'overdue')`,
            [schoolId]
        );
        const pendingPayments = parseFloat(pendingRes.rows[0].pending || '0');

        // Overdue Payments
        const overdueRes = await query(
            `SELECT SUM(balance) as overdue FROM invoices WHERE school_id = $1 AND status = 'overdue'`,
            [schoolId]
        );
        const overduePayments = parseFloat(overdueRes.rows[0].overdue || '0');

        // Collection Rate
        const totalInvoiced = totalRevenue + pendingPayments;
        const collectionRate = totalInvoiced > 0 ? (totalRevenue / totalInvoiced) * 100 : 0;

        res.json({
            totalRevenue,
            pendingPayments,
            overduePayments,
            collectionRate,
            monthlyRevenue: [],
            paymentMethods: []
        });
    } catch (error) {
        console.error('Error getting finance stats:', error);
        res.status(500).json({ error: 'Failed to get finance stats' });
    }
}
