-- Fix attendance table id column default value
-- This migration ensures the ID column is auto-generated using uuid_generate_v4()

ALTER TABLE attendance 
ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Verify extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
