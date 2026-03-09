
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
    console.log('Checking for school-assets bucket...');

    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
        console.error('Error listing buckets:', listError.message);
        return;
    }

    const bucketExists = buckets.find(b => b.name === 'school-assets');

    if (!bucketExists) {
        console.log('Creating school-assets bucket...');
        const { data, error } = await supabase.storage.createBucket('school-assets', {
            public: true,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'],
            fileSizeLimit: 2 * 1024 * 1024 // 2MB
        });

        if (error) {
            console.error('Error creating bucket:', error.message);
        } else {
            console.log('Bucket created successfully.');
        }
    } else {
        console.log('Bucket already exists.');
    }
}

setupStorage();
