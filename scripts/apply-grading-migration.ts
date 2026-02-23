
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL or DIRECT_URL not found in environment variables');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Connected to database. Applying migration...');

    const migrationPath = path.join(__dirname, '../supabase/migrations/0020_create_grading_system.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    await client.query(migrationSql);
    
    console.log('Migration 0020_create_grading_system.sql applied successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
