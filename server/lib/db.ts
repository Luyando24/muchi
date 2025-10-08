import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'flova_db',
  connectionLimit: 20, // Maximum number of connections in the pool
});

// Helper function to execute queries
export async function query(text: string, params?: any[]): Promise<any> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(text, params);
    return { rows };
  } finally {
    connection.release();
  }
}

// Helper function to execute transactions
export async function transaction<T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Password hashing utilities
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// NRC hashing utilities for patient lookup
// Use a deterministic approach for consistent lookups
export function hashNrc(nrc: string): string {
  // Use a fixed salt for NRC hashing to ensure consistent lookups
  const fixedSalt = process.env.NRC_SALT || 'flova_nrc_salt_2024';
  return bcrypt.hashSync(nrc + fixedSalt, 10);
}

// National ID hashing utilities for resident lookup
export function hashNationalId(nationalId: string): string {
  // Use a fixed salt for National ID hashing to ensure consistent lookups
  const fixedSalt = process.env.NRC_SALT || 'flova_nrc_salt_2024';
  return bcrypt.hashSync(nationalId + fixedSalt, 10);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});

export { pool };
export default pool;