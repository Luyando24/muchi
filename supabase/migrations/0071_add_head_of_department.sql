-- Add head_of_department_id to departments table
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS head_of_department_id UUID REFERENCES profiles(id) ON DELETE SET NULL;