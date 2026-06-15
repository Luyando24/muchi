
import { supabaseAdmin } from './supabase.js';

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

  let expectedYear = school.academic_year;
  let expectedTerm = school.current_term;

  try {
    const today = new Date().toLocaleString('sv-SE', { timeZone: 'Africa/Lusaka' }).split(' ')[0];
    let { data: termData, error: termError } = await supabaseAdmin
      .from('ministry_calendar')
      .select('*')
      .eq('type', 'Term')
      .lte('start_date', today)
      .order('start_date', { ascending: false })
      .limit(1);

    if (termError) throw termError;

    if (!termData || termData.length === 0) {
      const { data: fallbackTerm, error: fallbackError } = await supabaseAdmin
        .from('ministry_calendar')
        .select('*')
        .eq('type', 'Term')
        .order('start_date', { ascending: true })
        .limit(1);
      
      if (!fallbackError && fallbackTerm && fallbackTerm.length > 0) {
        termData = fallbackTerm;
      }
    }

    if (termData && termData.length > 0) {
      expectedYear = termData[0].year;
      expectedTerm = termData[0].name;
    }
  } catch (err) {
    console.error('Failed to sync school settings with ministry calendar:', err);
  }

  if (!expectedYear) {
    expectedYear = new Date().getFullYear().toString();
  }
  if (!expectedTerm) {
    expectedTerm = 'Term 1';
  }

  if (school.academic_year !== expectedYear) {
    updates.academic_year = expectedYear;
    updated = true;
  }

  if (school.current_term !== expectedTerm) {
    updates.current_term = expectedTerm;
    updated = true;
  }

  const hasExactExamTypes = school.exam_types && 
    school.exam_types.length === 2 && 
    school.exam_types.includes('Mid Term') && 
    school.exam_types.includes('End of Term');

  if (!hasExactExamTypes) {
    updates.exam_types = ['Mid Term', 'End of Term'];
    updated = true;
  }

  if (!school.test_types || school.test_types.length === 0) {
    updates.test_types = ['Test 1', 'Test 2', 'Test 3'];
    updated = true;
  }

  if (school.test_types_enabled === undefined || school.test_types_enabled === null) {
    updates.test_types_enabled = true;
    updated = true;
  }

  if (school.simplified_assessment_mode === undefined || school.simplified_assessment_mode === null) {
    updates.simplified_assessment_mode = true;
    updated = true;
  }

  if (!school.school_type) {
    updates.school_type = 'Secondary';
    updated = true;
  }

  if (!school.compulsory_subjects_secondary || school.compulsory_subjects_secondary.length === 0) {
    updates.compulsory_subjects_secondary = ['English'];
    updated = true;
  }

  if (!school.compulsory_subjects_primary || school.compulsory_subjects_primary.length === 0) {
    updates.compulsory_subjects_primary = ['Special Paper 1', 'Special Paper 2'];
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
