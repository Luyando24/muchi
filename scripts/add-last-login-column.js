// Script to add last_login column to staff_users table
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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