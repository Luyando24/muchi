import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcrypt';

// Database connection pool
const connectionConfig: any = {
  max: 20, // Maximum number of connections in the pool
};

if (process.env.DATABASE_URL) {
  connectionConfig.connectionString = process.env.DATABASE_URL;
  // Enable SSL for production (required for Supabase/Vercel)
  if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL.includes('supabase')) {
    connectionConfig.ssl = { rejectUnauthorized: false };
  }
} else {
  connectionConfig.host = process.env.DB_HOST || 'localhost';
  connectionConfig.port = parseInt(process.env.DB_PORT || '5432');
  connectionConfig.user = process.env.DB_USER || 'postgres';
  connectionConfig.password = process.env.DB_PASSWORD || '';
  connectionConfig.database = process.env.DB_NAME || 'muchi_db';
}

const pool = new Pool(connectionConfig);

// Helper function to execute queries
import { QueryResultRow } from 'pg';

// ... (rest of the file)

export async function query(text: string, params?: (string | number | boolean)[]): Promise<{ rows: QueryResultRow[] }> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return { rows: result.rows };
  } finally {
    client.release();
  }
}

// Helper function to execute transactions
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
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

// NRC hashing utilities for student lookup
// Use a deterministic approach for consistent lookups
export function hashNrc(nrc: string): string {
  // Use a fixed salt for NRC hashing to ensure consistent lookups
  const fixedSalt = process.env.NRC_SALT || 'muchi_nrc_salt_2024';
  return bcrypt.hashSync(nrc + fixedSalt, 10);
}

// National ID hashing utilities for resident lookup
export function hashNationalId(nationalId: string): string {
  // Use a fixed salt for National ID hashing to ensure consistent lookups
  const fixedSalt = process.env.NRC_SALT || 'muchi_nrc_salt_2024';
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