import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'muchi_db',
};

async function main() {
  const client = new Client(cfg);
  await client.connect();
  const sql = `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='classes'
    ORDER BY ordinal_position
  `;
  const res = await client.query(sql);
  console.log('classes columns:', res.rows);
  await client.end();
}

main().catch(err => {
  console.error('inspect-classes error:', err);
  process.exit(1);
});