import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../lib/db';

const router = express.Router();

// GET /api/support/tickets - Get all support tickets
router.get('/tickets', async (req, res) => {
  try {
    const { status, priority, category, created_by, assigned_to, school_id } = req.query;
    
    let query = `
      SELECT 
        st.*,
        s.name as school_name,
        creator.username as created_by_username,
        assignee.username as assigned_to_username
      FROM support_tickets st
      LEFT JOIN schools s ON st.school_id = s.id
      LEFT JOIN staff_users creator ON st.created_by = creator.id
      LEFT JOIN staff_users assignee ON st.assigned_to = assignee.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND st.status = $${paramCount}`;
      params.push(status);
    }

    if (priority) {
      paramCount++;
      query += ` AND st.priority = $${paramCount}`;
      params.push(priority);
    }

    if (category) {
      paramCount++;
      query += ` AND st.category = $${paramCount}`;
      params.push(category);
    }

    if (created_by) {
      paramCount++;
      query += ` AND st.created_by = $${paramCount}`;
      params.push(created_by);
    }

    if (assigned_to) {
      paramCount++;
      query += ` AND st.assigned_to = $${paramCount}`;
      params.push(assigned_to);
    }

    if (school_id) {
      paramCount++;
      query += ` AND st.school_id = $${paramCount}`;
      params.push(school_id);
    }

    query += ` ORDER BY st.created_at DESC`;

    const result = await pool.query(query, params);
    
    // Get responses for each ticket
    const ticketsWithResponses = await Promise.all(
      result.rows.map(async (ticket) => {
        const responsesResult = await pool.query(
          `SELECT 
            tr.*,
            u.username as created_by_username,
            CASE WHEN su.id IS NOT NULL THEN true ELSE false END as is_staff
          FROM ticket_responses tr
          LEFT JOIN staff_users su ON tr.created_by = su.id
          LEFT JOIN staff_users u ON tr.created_by = u.id
          WHERE tr.ticket_id = $1
          ORDER BY tr.created_at ASC`,
          [ticket.id]
        );
        
        return {
          ...ticket,
          created_by: ticket.created_by_username || ticket.created_by,
          assigned_to: ticket.assigned_to_username || ticket.assigned_to,
          responses: responsesResult.rows.map(response => ({
            ...response,
            created_by: response.created_by_username || response.created_by
          }))
        };
      })
    );

    res.json(ticketsWithResponses);
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

// GET /api/support/tickets/:id - Get a specific support ticket
router.get('/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const ticketResult = await pool.query(
      `SELECT 
        st.*,
        s.name as school_name,
        creator.username as created_by_username,
        assignee.username as assigned_to_username
      FROM support_tickets st
      LEFT JOIN schools s ON st.school_id = s.id
      LEFT JOIN staff_users creator ON st.created_by = creator.id
      LEFT JOIN staff_users assignee ON st.assigned_to = assignee.id
      WHERE st.id = $1`,
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Get responses for the ticket
    const responsesResult = await pool.query(
      `SELECT 
        tr.*,
        u.username as created_by_username,
        CASE WHEN su.id IS NOT NULL THEN true ELSE false END as is_staff
      FROM ticket_responses tr
      LEFT JOIN staff_users su ON tr.created_by = su.id
      LEFT JOIN staff_users u ON tr.created_by = u.id
      WHERE tr.ticket_id = $1
      ORDER BY tr.created_at ASC`,
      [id]
    );

    const ticketWithResponses = {
      ...ticket,
      created_by: ticket.created_by_username || ticket.created_by,
      assigned_to: ticket.assigned_to_username || ticket.assigned_to,
      responses: responsesResult.rows.map(response => ({
        ...response,
        created_by: response.created_by_username || response.created_by
      }))
    };

    res.json(ticketWithResponses);
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    res.status(500).json({ error: 'Failed to fetch support ticket' });
  }
});

// POST /api/support/tickets - Create a new support ticket
router.post('/tickets', async (req, res) => {
  try {
    const { title, description, priority, category, school_id } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const ticketId = uuidv4();
    const createdBy = req.user?.id || 'anonymous'; // Assuming user info is available in req.user
    
    const result = await pool.query(
      `INSERT INTO support_tickets (
        id, title, description, status, priority, category, 
        created_by, school_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *`,
      [ticketId, title, description, 'open', priority || 'medium', category || 'general', createdBy, school_id]
    );

    // Get the created ticket with related data
    const ticketResult = await pool.query(
      `SELECT 
        st.*,
        s.name as school_name,
        creator.username as created_by_username
      FROM support_tickets st
      LEFT JOIN schools s ON st.school_id = s.id
      LEFT JOIN staff_users creator ON st.created_by = creator.id
      WHERE st.id = $1`,
      [ticketId]
    );

    const ticket = {
      ...ticketResult.rows[0],
      created_by: ticketResult.rows[0].created_by_username || ticketResult.rows[0].created_by,
      responses: []
    };

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

// PATCH /api/support/tickets/:id - Update a support ticket
router.patch('/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assigned_to, title, description, category } = req.body;
    
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (priority) {
      paramCount++;
      updates.push(`priority = $${paramCount}`);
      params.push(priority);
    }

    if (assigned_to !== undefined) {
      paramCount++;
      updates.push(`assigned_to = $${paramCount}`);
      params.push(assigned_to);
    }

    if (title) {
      paramCount++;
      updates.push(`title = $${paramCount}`);
      params.push(title);
    }

    if (description) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }

    if (category) {
      paramCount++;
      updates.push(`category = $${paramCount}`);
      params.push(category);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    paramCount++;
    updates.push(`updated_at = NOW()`);
    params.push(id);

    const query = `
      UPDATE support_tickets 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating support ticket:', error);
    res.status(500).json({ error: 'Failed to update support ticket' });
  }
});

// DELETE /api/support/tickets/:id - Delete a support ticket
router.delete('/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First delete all responses
    await pool.query('DELETE FROM ticket_responses WHERE ticket_id = $1', [id]);
    
    // Then delete the ticket
    const result = await pool.query('DELETE FROM support_tickets WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting support ticket:', error);
    res.status(500).json({ error: 'Failed to delete support ticket' });
  }
});

// POST /api/support/tickets/:id/responses - Add a response to a ticket
router.post('/tickets/:id/responses', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if ticket exists
    const ticketResult = await pool.query('SELECT id FROM support_tickets WHERE id = $1', [id]);
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const responseId = uuidv4();
    const createdBy = req.user?.id || 'anonymous';
    
    const result = await pool.query(
      `INSERT INTO ticket_responses (
        id, ticket_id, message, created_by, created_at
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING *`,
      [responseId, id, message, createdBy]
    );

    // Update ticket's updated_at timestamp
    await pool.query('UPDATE support_tickets SET updated_at = NOW() WHERE id = $1', [id]);

    // Get the response with user info
    const responseResult = await pool.query(
      `SELECT 
        tr.*,
        u.username as created_by_username,
        CASE WHEN su.id IS NOT NULL THEN true ELSE false END as is_staff
      FROM ticket_responses tr
      LEFT JOIN staff_users su ON tr.created_by = su.id
      LEFT JOIN staff_users u ON tr.created_by = u.id
      WHERE tr.id = $1`,
      [responseId]
    );

    const response = {
      ...responseResult.rows[0],
      created_by: responseResult.rows[0].created_by_username || responseResult.rows[0].created_by
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error adding ticket response:', error);
    res.status(500).json({ error: 'Failed to add ticket response' });
  }
});

// GET /api/support/tickets/:id/responses - Get responses for a ticket
router.get('/tickets/:id/responses', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT 
        tr.*,
        u.username as created_by_username,
        CASE WHEN su.id IS NOT NULL THEN true ELSE false END as is_staff
      FROM ticket_responses tr
      LEFT JOIN staff_users su ON tr.created_by = su.id
      LEFT JOIN staff_users u ON tr.created_by = u.id
      WHERE tr.ticket_id = $1
      ORDER BY tr.created_at ASC`,
      [id]
    );

    const responses = result.rows.map(response => ({
      ...response,
      created_by: response.created_by_username || response.created_by
    }));

    res.json(responses);
  } catch (error) {
    console.error('Error fetching ticket responses:', error);
    res.status(500).json({ error: 'Failed to fetch ticket responses' });
  }
});

// GET /api/support/stats - Get support statistics
router.get('/stats', async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tickets,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_tickets,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_tickets,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_resolution_hours
      FROM support_tickets
    `);

    const categoryStatsResult = await pool.query(`
      SELECT 
        category,
        COUNT(*) as count
      FROM support_tickets
      GROUP BY category
      ORDER BY count DESC
    `);

    const recentTicketsResult = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM support_tickets
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({
      overview: statsResult.rows[0],
      by_category: categoryStatsResult.rows,
      recent_activity: recentTicketsResult.rows
    });
  } catch (error) {
    console.error('Error fetching support stats:', error);
    res.status(500).json({ error: 'Failed to fetch support statistics' });
  }
});

export default router;