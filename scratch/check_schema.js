
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  try {
    const { data: school, error } = await supabaseAdmin
      .from('schools')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error("Schools Error:", error.message);
    } else {
      console.log("Schools keys:", Object.keys(school));
      console.log("Exam Types sample:", school.exam_types);
    }

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('school_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error("Settings Error:", settingsError.message);
    } else if (settings) {
      console.log("Settings keys:", Object.keys(settings));
    } else {
      console.log("No school_settings found.");
    }

  } catch (err) {
    console.error("Script Error:", err);
  }
}

checkSchema();
