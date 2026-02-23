
import { supabaseAdmin } from './supabase';

// Helper to ensure settings exist (auto-set logic)
export async function ensureSchoolSettings(schoolId: string) {
  let { data: school, error } = await supabaseAdmin
    .from('schools')
    .select('*')
    .eq('id', schoolId)
    .single();

  if (error || !school) return null;

  let updated = false;
  const updates: any = {};

  if (!school.academic_year) {
    updates.academic_year = new Date().getFullYear().toString();
    updated = true;
  }

  if (!school.current_term) {
    const month = new Date().getMonth(); // 0-11
    if (month <= 3) updates.current_term = 'Term 1';
    else if (month <= 7) updates.current_term = 'Term 2';
    else updates.current_term = 'Term 3';
    updated = true;
  }

  if (updated) {
    const { data: updatedSchool, error: updateError } = await supabaseAdmin
      .from('schools')
      .update(updates)
      .eq('id', schoolId)
      .select()
      .single();
    
    if (!updateError && updatedSchool) {
      return updatedSchool;
    }
  }

  return school;
}
