const fs = require('fs');
const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'muchi_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function setupSystemSettings() {
  try {
    console.log('Setting up system settings database tables...');
    
    // Read the SQL schema file
    const sql = fs.readFileSync('db/system_settings_schema.sql', 'utf8');
    
    // Execute the schema
    await pool.query(sql);
    
    console.log('✅ System settings schema created successfully');
    
    // Insert some default settings
    const defaultSettings = [
      {
        key: 'app_name',
        value: 'MUCHI Platform',
        type: 'string',
        category: 'general',
        description: 'Application name displayed in the interface',
        is_public: true
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        type: 'boolean',
        category: 'general',
        description: 'Enable maintenance mode to restrict access',
        is_public: false
      },
      {
        key: 'max_file_size',
        value: '10485760',
        type: 'number',
        category: 'general',
        description: 'Maximum file upload size in bytes (10MB)',
        is_public: false
      }
    ];
    
    for (const setting of defaultSettings) {
      await pool.query(`
        INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_public)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (setting_key) DO NOTHING
      `, [setting.key, setting.value, setting.type, setting.category, setting.description, setting.is_public]);
    }
    
    console.log('✅ Default system settings inserted');
    
  } catch (error) {
    console.error('❌ Error setting up system settings:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupSystemSettings();