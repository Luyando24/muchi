
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function applyMigration() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('DATABASE_URL is not set in .env');
        process.exit(1);
    }

    const client = new pg.Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/0036_add_signature_and_seal_to_schools.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Applying migration 0036...');
        await client.query(sql);
        console.log('Migration applied successfully.');

    } catch (error) {
        console.error('Error applying migration:', error);
    } finally {
        await client.end();
    }
}

applyMigration();
