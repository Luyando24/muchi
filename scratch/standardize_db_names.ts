import dotenv from 'dotenv';
import { supabaseAdmin } from '../server/lib/supabase.js';
import {
  standardizeSubjectName,
  standardizeClassName,
  standardizeDepartmentName
} from '../shared/name-standardization.js';

dotenv.config();

async function run() {
  console.log('--- STARTING DATABASE NAME STANDARDIZATION ---');

  // 1. Standardize Departments
  console.log('\nProcessing departments...');
  const { data: depts, error: deptsErr } = await supabaseAdmin
    .from('departments')
    .select('id, name');

  if (deptsErr) {
    console.error('Error fetching departments:', deptsErr);
  } else if (depts) {
    let deptCount = 0;
    for (const dept of depts) {
      const stdName = standardizeDepartmentName(dept.name);
      if (stdName !== dept.name) {
        console.log(`  Updating department: "${dept.name}" -> "${stdName}"`);
        const { error } = await supabaseAdmin
          .from('departments')
          .update({ name: stdName })
          .eq('id', dept.id);
        if (error) console.error(`  Error updating dept ${dept.id}:`, error);
        else deptCount++;
      }
    }
    console.log(`Successfully standardized ${deptCount} departments.`);
  }

  // 2. Standardize Subjects
  console.log('\nProcessing subjects...');
  const { data: subjects, error: subErr } = await supabaseAdmin
    .from('subjects')
    .select('id, name, department');

  if (subErr) {
    console.error('Error fetching subjects:', subErr);
  } else if (subjects) {
    let subCount = 0;
    for (const sub of subjects) {
      const stdName = standardizeSubjectName(sub.name);
      const stdDept = sub.department ? standardizeDepartmentName(sub.department) : null;
      if (stdName !== sub.name || stdDept !== sub.department) {
        console.log(`  Updating subject: "${sub.name}" (${sub.department || 'No Dept'}) -> "${stdName}" (${stdDept || 'No Dept'})`);
        const { error } = await supabaseAdmin
          .from('subjects')
          .update({ name: stdName, department: stdDept })
          .eq('id', sub.id);
        if (error) console.error(`  Error updating subject ${sub.id}:`, error);
        else subCount++;
      }
    }
    console.log(`Successfully standardized ${subCount} subjects.`);
  }

  // 3. Standardize Classes
  console.log('\nProcessing classes...');
  const { data: classes, error: classErr } = await supabaseAdmin
    .from('classes')
    .select('id, name');

  if (classErr) {
    console.error('Error fetching classes:', classErr);
  } else if (classes) {
    let classCount = 0;
    for (const cls of classes) {
      const stdName = standardizeClassName(cls.name);
      if (stdName !== cls.name) {
        console.log(`  Updating class: "${cls.name}" -> "${stdName}"`);
        const { error } = await supabaseAdmin
          .from('classes')
          .update({ name: stdName })
          .eq('id', cls.id);
        if (error) console.error(`  Error updating class ${cls.id}:`, error);
        else classCount++;
      }
    }
    console.log(`Successfully standardized ${classCount} classes.`);
  }

  // 4. Standardize School Settings
  console.log('\nProcessing school compulsory subjects...');
  const { data: schools, error: schoolErr } = await supabaseAdmin
    .from('schools')
    .select('id, name, compulsory_subjects_primary, compulsory_subjects_secondary');

  if (schoolErr) {
    console.error('Error fetching schools:', schoolErr);
  } else if (schools) {
    let schoolCount = 0;
    for (const school of schools) {
      const stdPrimary = Array.isArray(school.compulsory_subjects_primary)
        ? school.compulsory_subjects_primary.map((s: string) => standardizeSubjectName(s))
        : [];
      const stdSecondary = Array.isArray(school.compulsory_subjects_secondary)
        ? school.compulsory_subjects_secondary.map((s: string) => standardizeSubjectName(s))
        : [];

      // Check if primary changed
      const primaryChanged = JSON.stringify(stdPrimary) !== JSON.stringify(school.compulsory_subjects_primary || []);
      // Check if secondary changed
      const secondaryChanged = JSON.stringify(stdSecondary) !== JSON.stringify(school.compulsory_subjects_secondary || []);

      if (primaryChanged || secondaryChanged) {
        console.log(`  Updating school "${school.name}" compulsory subjects`);
        const { error } = await supabaseAdmin
          .from('schools')
          .update({
            compulsory_subjects_primary: stdPrimary,
            compulsory_subjects_secondary: stdSecondary
          })
          .eq('id', school.id);
        if (error) console.error(`  Error updating school ${school.id}:`, error);
        else schoolCount++;
      }
    }
    console.log(`Successfully standardized compulsory subjects for ${schoolCount} schools.`);
  }

  // 5. Sync Student Profiles grade with their Class Name
  console.log('\nSynchronizing student profile grades with their active enrollment class...');
  const { data: enrollments, error: enrollErr } = await supabaseAdmin
    .from('enrollments')
    .select('student_id, classes(name)')
    .eq('status', 'Active');

  if (enrollErr) {
    console.error('Error fetching enrollments:', enrollErr);
  } else if (enrollments) {
    let syncCount = 0;
    for (const enroll of enrollments) {
      const className = (enroll.classes as any)?.name;
      if (className) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('grade')
          .eq('id', enroll.student_id)
          .single();

        if (profile && profile.grade !== className) {
          console.log(`  Updating student profile grade: "${profile.grade || ''}" -> "${className}"`);
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({ grade: className })
            .eq('id', enroll.student_id);
          if (error) console.error(`  Error updating student profile ${enroll.student_id}:`, error);
          else syncCount++;
        }
      }
    }
    console.log(`Successfully synchronized ${syncCount} student profile grades.`);
  }

  console.log('\n--- DATABASE STANDARDIZATION COMPLETE ---');
}

run().catch(console.error);
