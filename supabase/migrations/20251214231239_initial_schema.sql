-- PostgreSQL schema for School Management System (Zambia)
-- Requires: pgcrypto for encryption utilities and citext for case-insensitive text
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- Schools
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  email TEXT,
  address TEXT,
  district TEXT,
  province TEXT,
  phone TEXT,
  website TEXT,
  school_type TEXT CHECK (school_type IN ('primary', 'secondary', 'combined')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  principal_name TEXT,
  principal_email TEXT,
  principal_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff Users (RBAC)
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'teacher', 'staff');
CREATE TABLE IF NOT EXISTS staff_users (
  id UUID PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Students: PII columns stored encrypted-at-rest (ciphertext)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY,
  -- Student ID card (6 unique characters) for secure authentication
  student_card_id TEXT NOT NULL UNIQUE CHECK (LENGTH(student_card_id) = 6),
  
  -- NRC stored as salted hash for lookups without exposing raw NRC
  nrc_hash TEXT NOT NULL UNIQUE,
  nrc_salt TEXT NOT NULL,

  -- Additional authentication methods (optional, set after initial registration)
  email_cipher BYTEA,
  phone_auth_cipher BYTEA, -- phone number for authentication
  password_hash TEXT, -- optional password for login
  
  -- Encrypted columns (application encrypt/decrypt)
  first_name_cipher BYTEA,
  last_name_cipher BYTEA,
  gender TEXT,
  dob_cipher BYTEA,
  phone_cipher BYTEA,
  address_cipher BYTEA,
  guardian_contact_name_cipher BYTEA,
  guardian_contact_phone_cipher BYTEA,
  
  -- Additional student details
  grade_level TEXT,
  enrollment_date DATE,
  guardian_info_cipher BYTEA,
  health_info_cipher BYTEA,
  academic_history_cipher BYTEA,
  emergency_contact_cipher BYTEA,

  -- Digital card
  card_id TEXT NOT NULL UNIQUE,
  card_qr_signature TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_students_card_id ON students(card_id);

-- Teachers (extends staff_users with teacher-specific information)
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL UNIQUE,
  
  -- Teacher-specific information
  subject TEXT NOT NULL,
  qualification TEXT,
  experience_years INTEGER DEFAULT 0,
  specialization TEXT,
  department TEXT,
  
  -- Contact and personal details
  date_of_birth DATE,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  salary DECIMAL(10,2),
  
  -- Status and availability
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_head_teacher BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Additional information
  bio TEXT,
  certifications TEXT[],
  languages_spoken TEXT[],
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one teacher record per staff user
  UNIQUE(staff_user_id)
);
CREATE INDEX IF NOT EXISTS idx_teachers_school ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_staff_user ON teachers(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_employee_id ON teachers(employee_id);
CREATE INDEX IF NOT EXISTS idx_teachers_subject ON teachers(subject);

-- Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'core', -- core, elective, vocational, extracurricular
  credits INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, code)
);
CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
CREATE INDEX IF NOT EXISTS idx_subjects_active ON subjects(is_active);

-- Classes
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  section TEXT, -- e.g., 'A', 'B', 'C' for multiple sections of same grade
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  room_number TEXT,
  capacity INTEGER DEFAULT 30,
  current_enrollment INTEGER DEFAULT 0,
  academic_year TEXT NOT NULL,
  term TEXT, -- e.g., 'Term 1', 'Term 2', 'Term 3'
  schedule JSONB, -- class schedule with days and times
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique class per school, grade, section, subject, and academic year
  UNIQUE(school_id, grade_level, section, subject_id, academic_year)
);
CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_grade_level ON classes(grade_level);
CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON classes(academic_year);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  assignment_number TEXT NOT NULL UNIQUE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  category TEXT NOT NULL CHECK (category IN ('homework','project','test','exam','quiz','other')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','submitted','graded','returned')),
  due_date TIMESTAMPTZ,
  total_marks INTEGER,
  related_files TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assignments_school ON assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

-- Class Enrollments (Many-to-Many relationship between students and classes)
CREATE TABLE IF NOT EXISTS class_enrollments (
  id UUID PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure a student can only be enrolled once per class
  UNIQUE(class_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student ON class_enrollments(student_id);

-- Academic Records
CREATE TABLE IF NOT EXISTS academic_records (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  grade TEXT,
  term TEXT,
  year INTEGER,
  teacher_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_academic_records_student ON academic_records(student_id, year DESC);

-- Attendance Records
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  recorded_by UUID REFERENCES staff_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date DESC);

-- Offline sync queue (server side ingestion auditing)
CREATE TABLE IF NOT EXISTS sync_ingest (
  id UUID PRIMARY KEY,
  source_school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  source_device_id TEXT,
  op_type TEXT NOT NULL CHECK (op_type IN ('create','update','delete')),
  entity TEXT NOT NULL,
  entity_id TEXT,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_ingest_processed ON sync_ingest(processed_at);

-- School Website Builder Tables

-- Website configurations for each school
CREATE TABLE IF NOT EXISTS school_websites (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  domain_name TEXT UNIQUE, -- custom domain or subdomain
  subdomain TEXT NOT NULL UNIQUE, -- flova subdomain like "school-name.flova.com"
  title TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  theme_id UUID, -- references website_themes
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  custom_css TEXT,
  analytics_code TEXT, -- Google Analytics, etc.
  contact_email TEXT,
  contact_phone TEXT,
  social_links JSONB, -- {"facebook": "url", "twitter": "url", etc.}
  seo_settings JSONB, -- meta tags, keywords, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_school_websites_school ON school_websites(school_id);
CREATE INDEX IF NOT EXISTS idx_school_websites_subdomain ON school_websites(subdomain);

-- Pre-built themes for school websites
CREATE TABLE IF NOT EXISTS website_themes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  preview_image_url TEXT,
  css_template TEXT NOT NULL,
  layout_config JSONB NOT NULL, -- defines available sections and components
  color_scheme JSONB, -- primary, secondary, accent colors
  font_settings JSONB, -- font families, sizes
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Website pages (home, about, programs, contact, etc.)
CREATE TABLE IF NOT EXISTS website_pages (
  id UUID PRIMARY KEY,
  website_id UUID NOT NULL REFERENCES school_websites(id) ON DELETE CASCADE,
  slug TEXT NOT NULL, -- URL slug like "about", "programs"
  title TEXT NOT NULL,
  meta_description TEXT,
  content JSONB NOT NULL, -- page content in structured format
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(website_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_website_pages_website ON website_pages(website_id, sort_order);

-- Website components/sections (hero, programs, testimonials, etc.)
CREATE TABLE IF NOT EXISTS website_components (
  id UUID PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES website_pages(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL, -- "hero", "programs", "testimonials", "contact_form"
  component_data JSONB NOT NULL, -- component-specific data
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_website_components_page ON website_components(page_id, sort_order);

-- Website media/assets
CREATE TABLE IF NOT EXISTS website_media (
  id UUID PRIMARY KEY,
  website_id UUID NOT NULL REFERENCES school_websites(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  alt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_website_media_website ON website_media(website_id);


-- Parents
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE,
  password_hash TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  nrc_number TEXT,
  address TEXT,
  occupation TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN ('father', 'mother', 'guardian', 'other')),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, parent_id)
);
CREATE INDEX IF NOT EXISTS idx_student_parents_student ON student_parents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_parent ON student_parents(parent_id);

-- Finance Module

CREATE TABLE IF NOT EXISTS fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. "Grade 8 Term 1 Fees"
  academic_year TEXT NOT NULL,
  term TEXT NOT NULL,
  grade_level TEXT, -- Optional, if applies to specific grade
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'ZMW',
  breakdown JSONB, -- detailed breakdown of fees (tuition, sports, etc)
  due_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fee_structures_school ON fee_structures(school_id);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  balance DECIMAL(10, 2) GENERATED ALWAYS AS (amount - amount_paid) STORED,
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'partial', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  issued_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, invoice_number)
);
CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_school ON invoices(school_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL, -- specific student if no invoice
  amount DECIMAL(10, 2) NOT NULL,
  method TEXT CHECK (method IN ('cash', 'bank_transfer', 'mobile_money', 'cheque', 'card', 'other')),
  reference_number TEXT, -- transaction ID, receipt no
  payment_date TIMESTAMPTZ DEFAULT now(),
  recorded_by UUID REFERENCES staff_users(id),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_school ON payments(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);


-- Timetable Module

CREATE TABLE IF NOT EXISTS time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Period 1", "Morning Break"
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_break BOOLEAN DEFAULT FALSE,
  category TEXT DEFAULT 'regular', -- regular, homeroom, assembly
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- typically unique per school? maybe not strict unique to allow flexibility
);

CREATE TABLE IF NOT EXISTS timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE, -- NULL for breaks/homeroom if needed
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable_entries(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON timetable_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetable_school ON timetable_entries(school_id);


-- Grades Module (Term-based)

CREATE TABLE IF NOT EXISTS term_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  term TEXT NOT NULL,
  marks DECIMAL(5, 2), -- e.g. 85.50
  grade TEXT, -- "A", "B", etc.
  remarks TEXT,
  recorded_by UUID REFERENCES staff_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id, class_id, academic_year, term)
);
CREATE INDEX IF NOT EXISTS idx_term_grades_student ON term_grades(student_id);

CREATE TABLE IF NOT EXISTS report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  term TEXT NOT NULL,
  generated_date DATE DEFAULT CURRENT_DATE,
  summary_data JSONB, -- Snapshot of grades, attendance summary, teacher comments
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- Admissions Module

CREATE TABLE IF NOT EXISTS admission_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "2025 Intake"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  academic_year TEXT NOT NULL
);
