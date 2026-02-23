
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
  console.error('DATABASE_URL or DIRECT_URL not found');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Connected. Fixing attendance FK...');

    // 1. Drop incorrect constraint
    console.log('Dropping constraint attendance_student_id_fkey...');
    await client.query(`
      ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_fkey;
    `);

    // 2. Clean up any attendance records that reference non-existent profiles
    // This prevents the ADD CONSTRAINT from failing if bad data exists.
    console.log('Cleaning up orphaned attendance records...');
    const { rowCount } = await client.query(`
      DELETE FROM attendance 
      WHERE student_id NOT IN (SELECT id FROM profiles);
    `);
    console.log(`Deleted ${rowCount} orphaned attendance records.`);

    // 3. Add correct constraint
    console.log('Adding constraint referencing profiles(id)...');
    await client.query(`
      ALTER TABLE attendance 
      ADD CONSTRAINT attendance_student_id_fkey 
      FOREIGN KEY (student_id) 
      REFERENCES profiles(id) 
      ON DELETE CASCADE;
    `);

    console.log('Constraint updated successfully!');

  } catch (error) {
    console.error('Error fixing FK:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
