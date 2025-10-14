import express from 'express';
import { pool } from '../lib/db.js';

const router = express.Router();

// Get all notifications (with filtering options)
router.get('/', async (req, res) => {
  try {
    const { type, status, limit = 20, offset = 0 } = req.query;
    const userId = req.user?.id; // From auth middleware
    
    let query = `
      SELECT n.*, 
             CASE WHEN un.read_at IS NOT NULL THEN true ELSE false END as read
      FROM notifications n
      LEFT JOIN user_notifications un ON n.id = un.notification_id AND un.user_id = $1
      WHERE 1=1
    `;
    
    const queryParams = [userId || null];
    let paramCount = 2;
    
    if (type) {
      query += ` AND n.type = $${paramCount}`;
      queryParams.push(type);
      paramCount++;
    }
    
    if (status === 'read') {
      query += ` AND un.read_at IS NOT NULL`;
    } else if (status === 'unread') {
      query += ` AND un.read_at IS NULL`;
    }
    
    query += ` ORDER BY n.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);
    
    const { rows } = await pool.query(query, queryParams);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) 
      FROM notifications n
      LEFT JOIN user_notifications un ON n.id = un.notification_id AND un.user_id = $1
      WHERE 1=1
    `;
    
    const { rows: countRows } = await pool.query(countQuery, [userId || null]);
    const totalCount = parseInt(countRows[0].count);
    
    res.json({
      notifications: rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get a specific notification
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // From auth middleware
    
    const query = `
      SELECT n.*, 
             CASE WHEN un.read_at IS NOT NULL THEN true ELSE false END as read
      FROM notifications n
      LEFT JOIN user_notifications un ON n.id = un.notification_id AND un.user_id = $1
      WHERE n.id = $2
    `;
    
    const { rows } = await pool.query(query, [userId || null, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({ error: 'Failed to fetch notification' });
  }
});

// Create a new notification
router.post('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { 
      title, 
      message, 
      type, 
      priority, 
      category,
      recipients, 
      schoolIds, 
      templateId,
      isGlobal,
      expiryDate,
      actionUrl,
      actionText,
      senderId
    } = req.body;
    
    // Insert into notifications table
    const notificationQuery = `
      INSERT INTO notifications (
        title, 
        message, 
        type, 
        priority, 
        category,
        sender_id,
        is_global,
        expiry_date,
        action_url,
        action_text
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const notificationValues = [
      title,
      message,
      type || 'info',
      priority || 'medium',
      category || 'general',
      senderId || null,
      isGlobal || false,
      expiryDate || null,
      actionUrl || null,
      actionText || null
    ];
    
    const { rows } = await client.query(notificationQuery, notificationValues);
    const notification = rows[0];
    
    // If recipients are specified, create user_notifications entries
    if (recipients && recipients.length > 0) {
      const userNotificationQuery = `
        INSERT INTO user_notifications (notification_id, user_id)
        VALUES ($1, $2)
      `;
      
      for (const userId of recipients) {
        await client.query(userNotificationQuery, [notification.id, userId]);
      }
    }
    
    // If schoolIds are specified, create school_notifications entries
    if (schoolIds && schoolIds.length > 0) {
      const schoolNotificationQuery = `
        INSERT INTO school_notifications (notification_id, school_id)
        VALUES ($1, $2)
      `;
      
      for (const schoolId of schoolIds) {
        await client.query(schoolNotificationQuery, [notification.id, schoolId]);
      }
    }
    
    await client.query('COMMIT');
    
    res.status(201).json(notification);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  } finally {
    client.release();
  }
});

// Mark a notification as read
router.post('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // From auth middleware
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Check if user_notification entry exists
    const checkQuery = `
      SELECT * FROM user_notifications
      WHERE notification_id = $1 AND user_id = $2
    `;
    
    const { rows: checkRows } = await pool.query(checkQuery, [id, userId]);
    
    if (checkRows.length === 0) {
      // Create a new user_notification entry
      const insertQuery = `
        INSERT INTO user_notifications (notification_id, user_id, read_at)
        VALUES ($1, $2, NOW())
        RETURNING *
      `;
      
      const { rows } = await pool.query(insertQuery, [id, userId]);
      return res.json(rows[0]);
    } else {
      // Update existing user_notification entry
      const updateQuery = `
        UPDATE user_notifications
        SET read_at = NOW()
        WHERE notification_id = $1 AND user_id = $2
        RETURNING *
      `;
      
      const { rows } = await pool.query(updateQuery, [id, userId]);
      return res.json(rows[0]);
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Delete a notification
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Delete related user_notifications
    await client.query('DELETE FROM user_notifications WHERE notification_id = $1', [id]);
    
    // Delete related school_notifications
    await client.query('DELETE FROM school_notifications WHERE notification_id = $1', [id]);
    
    // Delete the notification
    const { rowCount } = await client.query('DELETE FROM notifications WHERE id = $1 RETURNING id', [id]);
    
    await client.query('COMMIT');
    
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  } finally {
    client.release();
  }
});

// Get notification templates
router.get('/templates', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM notification_templates ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching notification templates:', error);
    res.status(500).json({ error: 'Failed to fetch notification templates' });
  }
});

// Get notification events
router.get('/events', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM notification_events ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching notification events:', error);
    res.status(500).json({ error: 'Failed to fetch notification events' });
  }
});

export default router;