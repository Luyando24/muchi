-- MySQL schema for EHR SaaS (Zambia)
-- Compatible with MySQL/MariaDB

-- Create all tables first without foreign key constraints

-- Hospitals / Clinics (Base table)
CREATE TABLE IF NOT EXISTS hospitals (
  id VARCHAR(36) PRIMARY KEY,
  name TEXT NOT NULL,
  code VARCHAR(255) NOT NULL UNIQUE,
  address TEXT,
  district VARCHAR(255),
  province VARCHAR(255),
  phone VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Staff Users (RBAC)
CREATE TABLE IF NOT EXISTS staff_users (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role ENUM('admin', 'doctor', 'nurse', 'lab_technician') NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Patients: PII columns stored encrypted-at-rest (ciphertext)
CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36) NOT NULL,
  -- Hospital ID card (6 unique characters) for secure authentication
  hospital_card_id VARCHAR(6) NOT NULL UNIQUE,
  
  -- NRC stored as salted hash for lookups without exposing raw NRC
  nrc_hash VARCHAR(255) NOT NULL UNIQUE,
  nrc_salt VARCHAR(255) NOT NULL,

  -- Additional authentication methods (optional, set after initial registration)
  email_cipher TEXT,
  phone_auth_cipher TEXT, -- phone number for authentication
  password_hash TEXT, -- optional password for login
  
  -- Encrypted columns (application encrypt/decrypt)
  first_name_cipher TEXT,
  last_name_cipher TEXT,
  gender VARCHAR(10),
  dob_cipher TEXT,
  phone_cipher TEXT,
  address_cipher TEXT,
  emergency_contact_name_cipher TEXT,
  emergency_contact_phone_cipher TEXT,
  
  -- Additional patient details
  occupation_cipher TEXT,
  marital_status ENUM('single', 'married', 'divorced', 'widowed'),
  blood_type ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
  allergies_cipher TEXT,
  medical_history_cipher TEXT,
  family_history_cipher TEXT,
  insurance_info_cipher TEXT,

  -- Digital card
  card_id VARCHAR(255) NOT NULL UNIQUE,
  card_qr_signature TEXT NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patients_card_id ON patients(card_id);

-- Medical Records
CREATE TABLE IF NOT EXISTS medical_records (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  staff_id VARCHAR(36) NOT NULL,
  visit_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  chief_complaint TEXT,
  history_present_illness TEXT,
  physical_examination TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id VARCHAR(36) PRIMARY KEY,
  medical_record_id VARCHAR(36) NOT NULL,
  medication_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(255) NOT NULL,
  frequency VARCHAR(255) NOT NULL,
  duration VARCHAR(255) NOT NULL,
  instructions TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Lab Tests
CREATE TABLE IF NOT EXISTS lab_tests (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  ordered_by VARCHAR(36) NOT NULL,
  test_name VARCHAR(255) NOT NULL,
  test_type VARCHAR(255) NOT NULL,
  status ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  ordered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  results TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  staff_id VARCHAR(36) NOT NULL,
  appointment_date TIMESTAMP NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  status ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Vital Signs
CREATE TABLE IF NOT EXISTS vital_signs (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  recorded_by VARCHAR(36) NOT NULL,
  temperature DECIMAL(4,1),
  blood_pressure_systolic INT,
  blood_pressure_diastolic INT,
  heart_rate INT,
  respiratory_rate INT,
  oxygen_saturation DECIMAL(5,2),
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  bmi DECIMAL(4,1),
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- Billing
CREATE TABLE IF NOT EXISTS billing (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  medical_record_id VARCHAR(36),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'ZMW',
  status ENUM('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL
);

-- Inventory (Medications & Supplies)
CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR(36) PRIMARY KEY,
  hospital_id VARCHAR(36) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  item_type ENUM('medication', 'supply', 'equipment') NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL,
  cost_per_unit DECIMAL(10,2),
  supplier VARCHAR(255),
  expiry_date DATE,
  minimum_stock_level INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  action VARCHAR(255) NOT NULL,
  table_name VARCHAR(255) NOT NULL,
  record_id VARCHAR(36),
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_hospital_id ON patients(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_nrc_hash ON patients(nrc_hash);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_staff_id ON medical_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_visit_date ON medical_records(visit_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_lab_tests_patient_id ON lab_tests(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_status ON lab_tests(status);
CREATE INDEX IF NOT EXISTS idx_vital_signs_patient_id ON vital_signs(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_patient_id ON billing(patient_id);
CREATE INDEX IF NOT EXISTS idx_inventory_hospital_id ON inventory(hospital_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);