/**
 * fix-class-enrollment.ts
 *
 * One-time repair script: scans all students with a grade field and
 * fuzzy-matches them to classes, fixing missing or wrong enrollments.
 *
 * Run: npx tsx scripts/fix-class-enrollment.ts
 */

import { supabaseAdmin } from '../server/lib/supabase';

// ── normalizer (mirrors server/lib/class-matching.ts) ──────────────────────
function normalizeClassName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/^(Grade|Form|Class|Level|Year)\s*/i, '')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function findBestClassMatch(
  input: string,
  classes: { id: string; name: string }[]
): { id: string; name: string } | null {
  if (!input || !classes.length) return null;
  const trimmed = input.trim();

  // 1. Exact (case-insensitive)
  const exact = classes.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;

  // 2. Normalized
  const normInput = normalizeClassName(trimmed);
  if (!normInput) return null;
  const norm = classes.find(c => normalizeClassName(c.name) === normInput);
  if (norm) return norm;

  // 3. Partial
  return classes.find(c => {
    const nc = normalizeClassName(c.name);
    return nc.includes(normInput) || normInput.includes(nc);
  }) || null;
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Class Enrollment Fix Script ===\n');

  // 1. List all schools
  const { data: schools, error: schoolsErr } = await supabaseAdmin
    .from('schools')
    .select('id, name, academic_year');
  if (schoolsErr) { console.error('Failed to fetch schools:', schoolsErr); process.exit(1); }
  console.log(`Found ${schools!.length} school(s)\n`);

  let totalFixed = 0;

  for (const school of schools!) {
    const academicYear = school.academic_year || new Date().getFullYear().toString();
    console.log(`\n--- School: ${school.name} (year: ${academicYear}) ---`);

    // 2. Fetch classes
    const { data: classes } = await supabaseAdmin
      .from('classes')
      .select('id, name')
      .eq('school_id', school.id);
    if (!classes || classes.length === 0) {
      console.log('  No classes found, skipping.');
      continue;
    }
    console.log(`  Classes: ${classes.map(c => c.name).join(', ')}`);

    // 3. Fetch students with a grade value
    const { data: students } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, grade')
      .eq('school_id', school.id)
      .eq('role', 'student')
      .not('grade', 'is', null);
    if (!students || students.length === 0) {
      console.log('  No students with grade info, skipping.');
      continue;
    }
    console.log(`  Students with grade field: ${students.length}`);

    let schoolFixed = 0;

    for (const student of students) {
      const match = findBestClassMatch(student.grade, classes);
      if (!match) {
        console.log(`  [SKIP] "${student.full_name}" — grade "${student.grade}" has no class match`);
        continue;
      }

      // Check existing enrollment
      const { data: existing } = await supabaseAdmin
        .from('enrollments')
        .select('id, class_id')
        .eq('student_id', student.id)
        .eq('academic_year', academicYear)
        .maybeSingle();

      const needsEnrollmentFix = !existing || existing.class_id !== match.id;
      const needsGradeTextFix = student.grade !== match.name;

      if (needsEnrollmentFix) {
        if (existing) {
          const { error } = await supabaseAdmin
            .from('enrollments')
            .update({ class_id: match.id, status: 'Active' })
            .eq('id', existing.id);
          if (error) { console.error(`  [ERROR] enrollment update for ${student.full_name}:`, error.message); continue; }
          console.log(`  [FIXED-enrollment] "${student.full_name}": "${student.grade}" → ${match.name}`);
        } else {
          const { error } = await supabaseAdmin
            .from('enrollments')
            .insert({ student_id: student.id, class_id: match.id, school_id: school.id, academic_year: academicYear, status: 'Active' });
          if (error) { console.error(`  [ERROR] enrollment insert for ${student.full_name}:`, error.message); continue; }
          console.log(`  [CREATED-enrollment] "${student.full_name}": "${student.grade}" → ${match.name}`);
        }
        schoolFixed++;
      }

      if (needsGradeTextFix) {
        await supabaseAdmin
          .from('profiles')
          .update({ grade: match.name })
          .eq('id', student.id);
        if (!needsEnrollmentFix) {
          console.log(`  [FIXED-grade-text] "${student.full_name}": "${student.grade}" → ${match.name}`);
          schoolFixed++;
        }
      }
    }

    console.log(`  → Fixed ${schoolFixed} student(s) in ${school.name}`);
    totalFixed += schoolFixed;
  }

  console.log(`\n=== Done. Total fixed: ${totalFixed} ===`);
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
