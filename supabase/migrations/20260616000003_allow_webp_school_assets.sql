-- Update storage configuration for school-assets bucket
-- Allows image/webp and sets size limit to 5MB (5242880 bytes)
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'],
    file_size_limit = 5242880
WHERE id = 'school-assets';
