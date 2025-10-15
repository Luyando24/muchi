// Database setup script for MUCHI School Management System
// Run this after installing PostgreSQL locally

import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PostgreSQL database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Don't specify database initially - we'll create it
};

const targetDbName = process.env.DB_NAME || 'muchi_db';

async function setupDatabase() {
  console.log('🚀 Setting up MUCHI School Management PostgreSQL database...');
  
  try {
    // Connect to PostgreSQL server (without specifying database)
    console.log(`🔍 Connecting to PostgreSQL as user: ${dbConfig.user}`);
    const client = new Client(dbConfig);
    await client.connect();
    console.log(`✅ Successfully connected to PostgreSQL server`);
    
    // Create database if it doesn't exist
    console.log(`📝 Creating database ${targetDbName} if it doesn't exist...`);
    await client.query(`CREATE DATABASE "${targetDbName}"`).catch(err => {
      if (err.code !== '42P04') { // Database already exists error code
        throw err;
      }
      console.log(`ℹ️ Database ${targetDbName} already exists`);
    });
    console.log(`✅ Database ${targetDbName} is ready`);
    
    // Close the initial connection
    await client.end();
    
    // Connect to the specific database
    const dbClient = new Client({
      ...dbConfig,
      database: targetDbName
    });
    await dbClient.connect();
    
    console.log(`✅ Connected to ${targetDbName} database`);
    
    // Read and execute the PostgreSQL schema
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Dropping existing tables if they exist...');
    
    // Drop tables in reverse order to handle foreign key constraints
    const dropStatements = [
      'DROP TABLE IF EXISTS assignments CASCADE',
      'DROP TABLE IF EXISTS subjects CASCADE',
      'DROP TABLE IF EXISTS class_enrollments CASCADE',
      'DROP TABLE IF EXISTS classes CASCADE',
      'DROP TABLE IF EXISTS website_media CASCADE',
      'DROP TABLE IF EXISTS website_components CASCADE',
      'DROP TABLE IF EXISTS website_pages CASCADE',
      'DROP TABLE IF EXISTS website_themes CASCADE',
      'DROP TABLE IF EXISTS school_websites CASCADE',
      'DROP TABLE IF EXISTS sync_ingest CASCADE',
      'DROP TABLE IF EXISTS attendance CASCADE',
      'DROP TABLE IF EXISTS academic_records CASCADE',
      'DROP TABLE IF EXISTS teachers CASCADE',
      'DROP TABLE IF EXISTS students CASCADE',
      'DROP TABLE IF EXISTS staff_users CASCADE',
      'DROP TABLE IF EXISTS schools CASCADE'
    ];
    
    for (const dropStmt of dropStatements) {
      await dbClient.query(dropStmt);
    }
    
    console.log('📋 Executing database schema...');
    
    // Split schema into individual statements and execute them
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        await dbClient.query(statement.trim());
      }
    }
    
    // Insert sample data
    console.log('🌱 Inserting sample data...');
    
    // Create a sample school
    const schoolId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    await dbClient.query(`
      INSERT INTO schools (id, name, code, address, district, province, phone)
      VALUES ($1, 'MUCHI Demo School', 'DEMO01', '123 Education Street', 'Lusaka', 'Lusaka', '+260-123-456789')
      ON CONFLICT (id) DO NOTHING
    `, [schoolId]);
    
    // Create a sample admin user
    const bcrypt = await import('bcrypt');
    const adminPassword = await bcrypt.default.hash('admin123', 12);
    const adminId = 'a47ac10b-58cc-4372-a567-0e02b2c3d480';
    
    await dbClient.query(`
      INSERT INTO staff_users (id, school_id, email, password_hash, role, first_name, last_name, is_active)
      VALUES ($1, $2, 'admin@muchi.demo', $3, 'admin', 'Admin', 'User', true)
      ON CONFLICT (id) DO NOTHING
    `, [adminId, schoolId, adminPassword]);

    // Create a super admin user
    const superAdminPassword = await bcrypt.default.hash('admin123', 12);
    const superAdminId = 'b47ac10b-58cc-4372-a567-0e02b2c3d481';
    
    await dbClient.query(`
      INSERT INTO staff_users (id, school_id, email, password_hash, role, first_name, last_name, is_active)
      VALUES ($1, NULL, 'admin@system.com', $2, 'superadmin', 'Super', 'Admin', true)
      ON CONFLICT (id) DO NOTHING
    `, [superAdminId, superAdminPassword]);
    
    console.log('✅ Sample data inserted');
    console.log('✅ Database schema executed successfully!');
    console.log('🎉 MUCHI School Management PostgreSQL database setup complete!');
    console.log('');
    console.log('Sample login credentials:');
    console.log('School Admin:');
    console.log('  Email: admin@muchi.demo');
    console.log('  Password: admin123');
    console.log('');
    console.log('Super Admin:');
    console.log('  Email: admin@system.com');
    console.log('  Password: admin123');
    console.log('  Login URL: /admin/login');
    
    await dbClient.end();
    
  } catch (error) {
    console.error('❌ Error setting up PostgreSQL database:', error.message);
    console.log('💡 Make sure PostgreSQL is installed and running');
    console.log('💡 You can download PostgreSQL from: https://www.postgresql.org/download/');
    process.exit(1);
  }
}

// Run the setup function
setupDatabase();

export { setupDatabase };