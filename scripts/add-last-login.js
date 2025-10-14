// Add last_login column to staff_users table
import pkg from 'pg';
const { Pool } = pkg;

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'muchi_db',
});

async function addLastLoginColumn() {
  try {
    console.log('Adding last_login column to staff_users table...');
    
    await pool.query(`
      ALTER TABLE staff_users 
      ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
    `);
    
    console.log('Column added successfully!');
  } catch (error) {
    console.error('Error adding column:', error);
  } finally {
    await pool.end();
  }
}

addLastLoginColumn();