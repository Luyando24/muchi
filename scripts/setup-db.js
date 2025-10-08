// Database setup script for Flova
// Run this after installing PostgreSQL locally

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MySQL database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  // Don't specify database initially - we'll create it
};

const targetDbName = process.env.DB_NAME || 'flova_db';

async function setupDatabase() {
  console.log('🚀 Setting up Flova MySQL database...');
  
  try {
    // Connect to MySQL server (without specifying database)
    console.log(`🔍 Connecting to MySQL as user: ${dbConfig.user}`);
    const connection = await mysql.createConnection(dbConfig);
    console.log(`✅ Successfully connected to MySQL server`);
    
    // Create database if it doesn't exist
    console.log(`📝 Creating database ${targetDbName} if it doesn't exist...`);
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${targetDbName}\``);
    console.log(`✅ Database ${targetDbName} is ready`);
    
    // Close the initial connection
    await connection.end();
    
    // Connect to the specific database
    const dbConnection = await mysql.createConnection({
      ...dbConfig,
      database: targetDbName
    });
    
    console.log(`✅ Connected to ${targetDbName} database`);
    
    // Read and execute the MySQL schema
    const schemaPath = path.join(__dirname, '..', 'db', 'schema-mysql.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Dropping existing tables if they exist...');
    
    // Drop tables in reverse order to handle foreign key constraints
    const dropStatements = [
      'DROP TABLE IF EXISTS test_results',
      'DROP TABLE IF EXISTS lab_tests',
      'DROP TABLE IF EXISTS prescriptions',
      'DROP TABLE IF EXISTS medical_records',
      'DROP TABLE IF EXISTS patients',
      'DROP TABLE IF EXISTS staff_users',
      'DROP TABLE IF EXISTS hospitals'
    ];
    
    for (const dropStmt of dropStatements) {
      await dbConnection.execute(dropStmt);
    }
    
    console.log('📋 Executing database schema...');
    
    // Split schema into individual statements and execute them
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        await dbConnection.execute(statement.trim());
      }
    }
    
    // Insert sample data
    console.log('🌱 Inserting sample data...');
    
    // Create a sample hospital
    const hospitalId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    await dbConnection.execute(`
      INSERT INTO hospitals (id, name, code, address, district, province, phone)
      VALUES (?, 'Flova Demo Clinic', 'DEMO01', '123 Health Street', 'Lusaka', 'Lusaka', '+260-123-456789')
      ON DUPLICATE KEY UPDATE name = name
    `, [hospitalId]);
    
    // Create a sample admin user
    const bcrypt = await import('bcrypt');
    const adminPassword = await bcrypt.default.hash('admin123', 12);
    const adminId = 'a47ac10b-58cc-4372-a567-0e02b2c3d480';
    
    await dbConnection.execute(`
      INSERT INTO staff_users (id, hospital_id, email, password_hash, role, first_name, last_name, is_active)
      VALUES (?, ?, 'admin@flova.demo', ?, 'admin', 'Admin', 'User', true)
      ON DUPLICATE KEY UPDATE email = email
    `, [adminId, hospitalId, adminPassword]);
    
    console.log('✅ Sample data inserted');
    console.log('✅ Database schema executed successfully!');
    console.log('🎉 Flova MySQL database setup complete!');
    console.log('');
    console.log('Sample login credentials:');
    console.log('Email: admin@flova.demo');
    console.log('Password: admin123');
    
    await dbConnection.end();
    
  } catch (error) {
    console.error('❌ Error setting up MySQL database:', error.message);
    console.log('💡 Make sure MySQL is installed and running');
    console.log('💡 You can download MySQL from: https://dev.mysql.com/downloads/mysql/');
    process.exit(1);
  }
}

// Run the setup function
setupDatabase();

export { setupDatabase };