-- PostgreSQL schema for EHR SaaS (Zambia)
-- Requires: pgcrypto for encryption utilities
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hospitals / Clinics
CREATE TABLE IF NOT EXISTS hospitals (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  district TEXT,
  province TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff Users (RBAC)
CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'nurse', 'lab_technician');
CREATE TABLE IF NOT EXISTS staff_users (
  id UUID PRIMARY KEY,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
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

-- Patients: PII columns stored encrypted-at-rest (ciphertext)
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY,
  -- Hospital ID card (6 unique characters) for secure authentication
  hospital_card_id TEXT NOT NULL UNIQUE CHECK (LENGTH(hospital_card_id) = 6),
  
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
  emergency_contact_name_cipher BYTEA,
  emergency_contact_phone_cipher BYTEA,
  
  -- Additional patient details
  occupation_cipher BYTEA,
  marital_status TEXT CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
  blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  allergies_cipher BYTEA,
  medical_history_cipher BYTEA,
  family_history_cipher BYTEA,
  insurance_info_cipher BYTEA,

  -- Digital card
  card_id TEXT NOT NULL UNIQUE,
  card_qr_signature TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patients_card_id ON patients(card_id);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status TEXT NOT NULL CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id, scheduled_for);

-- Lab Tests / Results (JSONB for flexible result formats)
CREATE TABLE IF NOT EXISTS lab_tests (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  ordered_by_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ordered','in_progress','completed','cancelled')),
  result JSONB,
  result_summary TEXT,
  collected_at TIMESTAMPTZ,
  resulted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lab_tests_patient ON lab_tests(patient_id, updated_at DESC);

-- Offline sync queue (server side ingestion auditing)
CREATE TABLE IF NOT EXISTS sync_ingest (
  id UUID PRIMARY KEY,
  source_hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
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

-- Hospital Website Builder Tables

-- Website configurations for each hospital
CREATE TABLE IF NOT EXISTS hospital_websites (
  id UUID PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  domain_name TEXT UNIQUE, -- custom domain or subdomain
  subdomain TEXT NOT NULL UNIQUE, -- flova subdomain like "hospital-name.flova.com"
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
CREATE INDEX IF NOT EXISTS idx_hospital_websites_hospital ON hospital_websites(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_websites_subdomain ON hospital_websites(subdomain);

-- Pre-built themes for hospital websites
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

-- Website pages (home, about, services, contact, etc.)
CREATE TABLE IF NOT EXISTS website_pages (
  id UUID PRIMARY KEY,
  website_id UUID NOT NULL REFERENCES hospital_websites(id) ON DELETE CASCADE,
  slug TEXT NOT NULL, -- URL slug like "about", "services"
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

-- Website components/sections (hero, services, testimonials, etc.)
CREATE TABLE IF NOT EXISTS website_components (
  id UUID PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES website_pages(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL, -- "hero", "services", "testimonials", "contact_form"
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
  website_id UUID NOT NULL REFERENCES hospital_websites(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  alt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_website_media_website ON website_media(website_id);

-- Helper function concept (Laravel should implement application-level encryption using key rotation).
