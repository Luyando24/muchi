
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const { Pool } = pg;

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL or DIRECT_URL not found in environment variables');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false } // Required for Supabase
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Connected to database. Adding updated_at column to attendance table...');

    await client.query(`
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);
    
    console.log('Successfully added updated_at column to attendance table.');

  } catch (error) {
    console.error('Error applying schema fix:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
