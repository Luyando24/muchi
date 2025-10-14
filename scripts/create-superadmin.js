import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'muchi_db',
  max: 20, // Maximum number of connections in the pool
});

// Helper function to execute queries
async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return { rows: result.rows };
  } finally {
    client.release();
  }
}

// Password hashing utility
async function hashPassword(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

async function createSuperAdmin() {
  try {
    // Super admin credentials
    const email = 'admin@system.com';
    const password = 'admin123';
    const firstName = 'System';
    const lastName = 'Administrator';
    
    console.log('Creating super admin user...');
    
    // Check if email already exists
    const existingUserResult = await query(
      'SELECT id FROM staff_users WHERE email = $1',
      [email]
    );
    
    if (existingUserResult.rows.length > 0) {
      console.log('Super admin user already exists!');
      return;
    }
    
    // Create super admin user
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    
    await query(
      `INSERT INTO staff_users (id, school_id, email, password_hash, role, first_name, last_name, phone, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, null, email, passwordHash, "superadmin", firstName, lastName, "", true]
    );
    
    console.log('Super admin user created successfully!');
    console.log('Email: admin@system.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

createSuperAdmin();