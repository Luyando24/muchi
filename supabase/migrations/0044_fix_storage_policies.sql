-- Create the storage bucket 'school-assets' if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-assets', 'school-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Enable RLS on the bucket (optional but good practice)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to all files in 'school-assets'
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'school-assets' );

-- Policy: Allow authenticated users to upload files to 'school-assets'
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'school-assets' );

-- Policy: Allow authenticated users to update their own files
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'school-assets' );

-- Policy: Allow authenticated users to delete their own files
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'school-assets' );
