// Script to create classes tables for MUCHI School Management System
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// PostgreSQL database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'muchi_db',
};

async function createClassesTables() {
  console.log('🚀 Creating classes tables...');
  
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Create classes table
    const createClassesTable = `
      CREATE TABLE IF NOT EXISTS classes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        class_name VARCHAR(100) NOT NULL,
        grade_level VARCHAR(20) NOT NULL,
        section VARCHAR(10),
        subject VARCHAR(100) NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 30,
        room_number VARCHAR(20),
        teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
        academic_year VARCHAR(20) NOT NULL,
        term VARCHAR(20) NOT NULL DEFAULT 'Fall',
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createClassesTable);
    console.log('✅ Classes table created successfully');

    // Create class_enrollments table
    const createEnrollmentsTable = `
      CREATE TABLE IF NOT EXISTS class_enrollments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        grade VARCHAR(5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(class_id, student_id)
      );
    `;

    await client.query(createEnrollmentsTable);
    console.log('✅ Class enrollments table created successfully');

    // Create indexes
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);',
      'CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON classes(academic_year);',
      'CREATE INDEX IF NOT EXISTS idx_classes_grade_level ON classes(grade_level);',
      'CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON class_enrollments(class_id);',
      'CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON class_enrollments(student_id);'
    ];

    for (const indexQuery of createIndexes) {
      await client.query(indexQuery);
    }
    console.log('✅ Indexes created successfully');

    // Create trigger for updated_at
    const createTrigger = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;
      CREATE TRIGGER update_classes_updated_at
        BEFORE UPDATE ON classes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_class_enrollments_updated_at ON class_enrollments;
      CREATE TRIGGER update_class_enrollments_updated_at
        BEFORE UPDATE ON class_enrollments
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;

    await client.query(createTrigger);
    console.log('✅ Triggers created successfully');

    // Insert sample data
    const sampleClasses = `
      INSERT INTO classes (class_name, grade_level, section, subject, capacity, room_number, academic_year, term, description, is_active)
      VALUES 
        ('Mathematics 101', '9th Grade', 'A', 'Mathematics', 30, 'Room 101', '2024-2025', 'Fall', 'Basic algebra and geometry', true),
        ('English Literature', '10th Grade', 'B', 'English', 25, 'Room 205', '2024-2025', 'Fall', 'Classic literature analysis', true),
        ('Physics Fundamentals', '11th Grade', 'A', 'Physics', 28, 'Lab 301', '2024-2025', 'Fall', 'Introduction to physics concepts', true),
        ('Chemistry Lab', '12th Grade', 'C', 'Chemistry', 20, 'Lab 302', '2024-2025', 'Fall', 'Advanced chemistry experiments', true),
        ('World History', '9th Grade', 'B', 'History', 32, 'Room 150', '2024-2025', 'Fall', 'Ancient civilizations to modern era', true)
      ON CONFLICT DO NOTHING;
    `;

    await client.query(sampleClasses);
    console.log('✅ Sample classes inserted successfully');
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully');
    
    console.log('🎉 Classes tables setup completed successfully!');
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('❌ Error creating classes tables:', error);
    console.error('⚠️ Transaction rolled back');
  } finally {
    // Close client connection
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Execute the function
createClassesTables().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});