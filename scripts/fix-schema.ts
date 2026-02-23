
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

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
    console.log('Connected to database. Applying schema fixes...');

    // 1. Fix attendance table columns
    console.log('Adding missing columns to attendance table...');
    await client.query(`
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS remarks TEXT;
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
    `);
    console.log('Attendance columns fixed.');

    // 2. Add unique constraint to attendance
    console.log('Checking/Adding unique constraint to attendance table...');
    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_student_id_date_key') THEN
              ALTER TABLE attendance ADD CONSTRAINT attendance_student_id_date_key UNIQUE (student_id, date);
              RAISE NOTICE 'Added constraint attendance_student_id_date_key';
          ELSE
              RAISE NOTICE 'Constraint attendance_student_id_date_key already exists';
          END IF;
      END $$;
    `);
    console.log('Attendance unique constraint checked.');

    // 3. Drop failing check constraint on students table
    console.log('Dropping restrictive check constraint on students table...');
    await client.query(`
      ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_card_id_check;
    `);
    console.log('Students check constraint dropped.');

    console.log('Schema fixes applied successfully!');
  } catch (error) {
    console.error('Error applying schema fixes:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
