-- Remove default values from boarding_status and gender_composition in schools
ALTER TABLE schools ALTER COLUMN boarding_status DROP DEFAULT;
ALTER TABLE schools ALTER COLUMN gender_composition DROP DEFAULT;

-- Clear defaults for existing schools
UPDATE schools SET boarding_status = NULL, gender_composition = NULL;
