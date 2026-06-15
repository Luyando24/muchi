import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const schoolId = '00146011-bc35-49da-9655-79498a72e037';

async function main() {
  const { data: classes } = await supabase.from('classes').select('id, name, level').eq('school_id', schoolId);
  console.log('CLASSES:', JSON.stringify(classes, null, 2));

  const { data: scales } = await supabase.from('grading_scales').select('id, grade, min_percentage, max_percentage, section, description').eq('school_id', schoolId);
  console.log('SCALES:', JSON.stringify(scales, null, 2));
}

main();
