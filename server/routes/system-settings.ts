import { RequestHandler } from "express";
import { pool } from "../lib/db.js";

// Get system settings by category or all settings
export const handleGetSystemSettings: RequestHandler = async (req, res) => {
  try {
    const { category } = req.query;
    
    // Mock data for system settings until database is properly set up
    const mockSettings = [
      {
        id: "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
        setting_key: "app_name",
        setting_value: "MUCHI Platform",
        setting_type: "string",
        category: "general",
        description: "Application name displayed in the interface",
        is_public: true,
        is_editable: true,
        validation_rules: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q",
        setting_key: "maintenance_mode",
        setting_value: "false",
        setting_type: "boolean",
        category: "general",
        description: "Enable maintenance mode to restrict access",
        is_public: false,
        is_editable: true,
        validation_rules: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r",
        setting_key: "max_file_size",
        setting_value: "10485760",
        setting_type: "number",
        category: "general",
        description: "Maximum file upload size in bytes (10MB)",
        is_public: false,
        is_editable: true,
        validation_rules: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "4d5e6f7g-8h9i-0j1k-2l3m-4n5o6p7q8r9s",
        setting_key: "allowed_file_extensions",
        setting_value: "jpg,jpeg,png,pdf,doc,docx,xls,xlsx,txt",
        setting_type: "string",
        category: "general",
        description: "Comma-separated list of allowed file extensions",
        is_public: true,
        is_editable: true,
        validation_rules: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    // Filter by category if provided
    let filteredSettings = mockSettings;
    if (category) {
      filteredSettings = mockSettings.filter(setting => setting.category === category);
    }
    
    res.json(filteredSettings);
    
    /* Commented out until database is properly set up
    let query = `
      SELECT id, setting_key, setting_value, setting_type, category, description, 
             is_public, is_editable, validation_rules, created_at, updated_at
      FROM system_settings
    `;
    
    const params: any[] = [];
    
    if (category) {
      query += ` WHERE category = $1`;
      params.push(category);
    }
    
    query += ` ORDER BY category, setting_key`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
    */
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
};

// Update a system setting
export const handleUpdateSystemSetting: RequestHandler = async (req, res) => {
  try {
    const { setting_key, setting_value, category } = req.body;
    
    if (!setting_key || setting_value === undefined) {
      return res.status(400).json({ error: 'Setting key and value are required' });
    }
    
    // Mock data response for update
    return res.json({
      id: "mock-id-" + Date.now(),
      setting_key,
      setting_value,
      updated_at: new Date().toISOString(),
      message: "Setting updated successfully"
    });
  } catch (error) {
    console.error('Error updating system setting:', error);
    res.status(500).json({ error: 'Failed to update system setting' });
  }
};

// Get email settings
export const handleGetEmailSettings: RequestHandler = async (req, res) => {
  try {
    const query = `
      SELECT id, provider, host, port, username, from_email, from_name, 
             reply_to, use_tls, use_ssl, is_active, test_email,
             created_at, updated_at
      FROM email_settings 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      // Create default email settings if none exist
      const defaultQuery = `
        INSERT INTO email_settings (provider, host, port, from_email, from_name, use_tls, is_active)
        VALUES ('smtp', 'localhost', 587, 'noreply@muchi.com', 'MUCHI System', true, false)
        RETURNING *
      `;
      const defaultResult = await pool.query(defaultQuery);
      return res.json(defaultResult.rows[0]);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching email settings:', error);
    res.status(500).json({ error: 'Failed to fetch email settings' });
  }
};

// Update email settings
export const handleUpdateEmailSettings: RequestHandler = async (req, res) => {
  try {
    const {
      provider, host, port, username, password, from_email, from_name,
      reply_to, use_tls, use_ssl, is_active, test_email
    } = req.body;
    
    // Check if email settings exist
    const checkQuery = `SELECT id FROM email_settings LIMIT 1`;
    const checkResult = await pool.query(checkQuery);
    
    let query: string;
    let params: any[];
    
    if (checkResult.rows.length === 0) {
      // Insert new email settings
      query = `
        INSERT INTO email_settings 
        (provider, host, port, username, from_email, from_name, reply_to, 
         use_tls, use_ssl, is_active, test_email)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      params = [provider, host, port, username, from_email, from_name, reply_to, 
                use_tls, use_ssl, is_active, test_email];
    } else {
      // Update existing email settings
      query = `
        UPDATE email_settings 
        SET provider = $1, host = $2, port = $3, username = $4, 
            from_email = $5, from_name = $6, reply_to = $7,
            use_tls = $8, use_ssl = $9, is_active = $10, test_email = $11,
            updated_at = now()
        WHERE id = $12
        RETURNING *
      `;
      params = [provider, host, port, username, from_email, from_name, reply_to, 
                use_tls, use_ssl, is_active, test_email, checkResult.rows[0].id];
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating email settings:', error);
    res.status(500).json({ error: 'Failed to update email settings' });
  }
};

// Test email configuration
export const handleTestEmail: RequestHandler = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    // Get current email settings
    const settingsQuery = `
      SELECT * FROM email_settings WHERE is_active = true LIMIT 1
    `;
    const settingsResult = await pool.query(settingsQuery);
    
    if (settingsResult.rows.length === 0) {
      return res.status(400).json({ error: 'No active email configuration found' });
    }
    
    const settings = settingsResult.rows[0];
    
    // Here you would implement actual email sending logic
    // For now, we'll simulate a successful test
    console.log(`Test email would be sent to ${email} using:`, {
      provider: settings.provider,
      host: settings.host,
      port: settings.port,
      from: settings.from_email
    });
    
    // In a real implementation, you would use nodemailer or similar
    // const nodemailer = require('nodemailer');
    // const transporter = nodemailer.createTransporter({...});
    // await transporter.sendMail({...});
    
    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
};

// Get security settings
export const handleGetSecuritySettings: RequestHandler = async (req, res) => {
  try {
    const query = `
      SELECT * FROM security_settings ORDER BY created_at DESC LIMIT 1
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      // Create default security settings if none exist
      const defaultQuery = `
        INSERT INTO security_settings DEFAULT VALUES RETURNING *
      `;
      const defaultResult = await pool.query(defaultQuery);
      return res.json(defaultResult.rows[0]);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching security settings:', error);
    res.status(500).json({ error: 'Failed to fetch security settings' });
  }
};

// Update security settings
export const handleUpdateSecuritySettings: RequestHandler = async (req, res) => {
  try {
    const {
      password_min_length, password_require_uppercase, password_require_lowercase,
      password_require_numbers, password_require_symbols, password_expiry_days,
      max_login_attempts, lockout_duration_minutes, session_timeout_minutes,
      two_factor_required, ip_whitelist
    } = req.body;
    
    // Check if security settings exist
    const checkQuery = `SELECT id FROM security_settings LIMIT 1`;
    const checkResult = await pool.query(checkQuery);
    
    let query: string;
    let params: any[];
    
    if (checkResult.rows.length === 0) {
      // Insert new security settings
      query = `
        INSERT INTO security_settings 
        (password_min_length, password_require_uppercase, password_require_lowercase,
         password_require_numbers, password_require_symbols, password_expiry_days,
         max_login_attempts, lockout_duration_minutes, session_timeout_minutes,
         two_factor_required, ip_whitelist)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      params = [password_min_length, password_require_uppercase, password_require_lowercase,
                password_require_numbers, password_require_symbols, password_expiry_days,
                max_login_attempts, lockout_duration_minutes, session_timeout_minutes,
                two_factor_required, JSON.stringify(ip_whitelist)];
    } else {
      // Update existing security settings
      query = `
        UPDATE security_settings 
        SET password_min_length = $1, password_require_uppercase = $2, 
            password_require_lowercase = $3, password_require_numbers = $4,
            password_require_symbols = $5, password_expiry_days = $6,
            max_login_attempts = $7, lockout_duration_minutes = $8,
            session_timeout_minutes = $9, two_factor_required = $10,
            ip_whitelist = $11, updated_at = now()
        WHERE id = $12
        RETURNING *
      `;
      params = [password_min_length, password_require_uppercase, password_require_lowercase,
                password_require_numbers, password_require_symbols, password_expiry_days,
                max_login_attempts, lockout_duration_minutes, session_timeout_minutes,
                two_factor_required, JSON.stringify(ip_whitelist), checkResult.rows[0].id];
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating security settings:', error);
    res.status(500).json({ error: 'Failed to update security settings' });
  }
};

// Get backup settings
export const handleGetBackupSettings: RequestHandler = async (req, res) => {
  try {
    const query = `
      SELECT * FROM backup_settings ORDER BY created_at DESC LIMIT 1
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      // Create default backup settings if none exist
      const defaultQuery = `
        INSERT INTO backup_settings DEFAULT VALUES RETURNING *
      `;
      const defaultResult = await pool.query(defaultQuery);
      return res.json(defaultResult.rows[0]);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching backup settings:', error);
    res.status(500).json({ error: 'Failed to fetch backup settings' });
  }
};

// Update backup settings
export const handleUpdateBackupSettings: RequestHandler = async (req, res) => {
  try {
    const {
      auto_backup_enabled, backup_frequency, backup_time, retention_days,
      backup_location, encryption_enabled, notification_emails
    } = req.body;
    
    // Check if backup settings exist
    const checkQuery = `SELECT id FROM backup_settings LIMIT 1`;
    const checkResult = await pool.query(checkQuery);
    
    let query: string;
    let params: any[];
    
    if (checkResult.rows.length === 0) {
      // Insert new backup settings
      query = `
        INSERT INTO backup_settings 
        (auto_backup_enabled, backup_frequency, backup_time, retention_days,
         backup_location, encryption_enabled, notification_emails)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      params = [auto_backup_enabled, backup_frequency, backup_time, retention_days,
                backup_location, encryption_enabled, JSON.stringify(notification_emails)];
    } else {
      // Update existing backup settings
      query = `
        UPDATE backup_settings 
        SET auto_backup_enabled = $1, backup_frequency = $2, backup_time = $3,
            retention_days = $4, backup_location = $5, encryption_enabled = $6,
            notification_emails = $7, updated_at = now()
        WHERE id = $8
        RETURNING *
      `;
      params = [auto_backup_enabled, backup_frequency, backup_time, retention_days,
                backup_location, encryption_enabled, JSON.stringify(notification_emails),
                checkResult.rows[0].id];
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating backup settings:', error);
    res.status(500).json({ error: 'Failed to update backup settings' });
  }
};

// Trigger manual backup
export const handleTriggerBackup: RequestHandler = async (req, res) => {
  try {
    // Update backup status to in_progress
    const updateQuery = `
      UPDATE backup_settings 
      SET last_backup_at = now(), last_backup_status = 'in_progress'
      WHERE id = (SELECT id FROM backup_settings LIMIT 1)
    `;
    await pool.query(updateQuery);
    
    // Here you would implement actual backup logic
    // For now, we'll simulate a successful backup
    console.log('Manual backup initiated');
    
    // Simulate backup completion after a delay
    setTimeout(async () => {
      try {
        const completeQuery = `
          UPDATE backup_settings 
          SET last_backup_status = 'success'
          WHERE id = (SELECT id FROM backup_settings LIMIT 1)
        `;
        await pool.query(completeQuery);
        console.log('Manual backup completed successfully');
      } catch (error) {
        console.error('Error completing backup:', error);
        const failQuery = `
          UPDATE backup_settings 
          SET last_backup_status = 'failed'
          WHERE id = (SELECT id FROM backup_settings LIMIT 1)
        `;
        await pool.query(failQuery);
      }
    }, 5000); // Simulate 5 second backup process
    
    res.json({ message: 'Backup initiated successfully' });
  } catch (error) {
    console.error('Error triggering backup:', error);
    res.status(500).json({ error: 'Failed to trigger backup' });
  }
};

// Get system settings audit log
export const handleGetSettingsAudit: RequestHandler = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const query = `
      SELECT sa.*, ss.setting_key, ss.description, su.full_name as changed_by_name
      FROM system_settings_audit sa
      LEFT JOIN system_settings ss ON sa.setting_id = ss.id
      LEFT JOIN staff_users su ON sa.changed_by = su.id
      ORDER BY sa.changed_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [limit, offset]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching settings audit:', error);
    res.status(500).json({ error: 'Failed to fetch settings audit' });
  }
};