/**
 * reportCardCacheService.ts
 *
 * Background pre-computation cache for bulk report cards.
 *
 * Flow:
 *  1. Teacher submits or admin publishes a subject → route calls schedulePrecompute()
 *  2. schedulePrecompute queues a fire-and-forget job for that (classId, term, examType, year)
 *  3. The job runs computeBatchReportCards (same logic as the batch endpoint) and upserts
 *     the result into report_card_cache.
 *  4. GET /api/school/results/batch-report-cards checks the cache first; on hit it returns
 *     instantly (~50ms). On miss it falls through to live computation.
 *  5. Any grade edit/delete calls invalidateCache() to remove the stale row.
 *
 * Backfill:
 *  startBackfillScheduler() is called once at server start.  It iterates all schools,
 *  then all distinct (class, term, examType, year) combos that have ≥1 grade but no
 *  cache entry, and pre-computes them — one combo at a time, with a small delay between
 *  each to avoid hammering the DB.
 */

import { supabaseAdmin } from '../lib/supabase.js';
import {
  generateClassPdf,
  deleteClassPdf,
  isClassPdfReady,
  getPdfStorageObjectPath,
  listReadyClassPdfPaths,
  queueSchoolPdfBuild,
  getQueuedPdfSchoolIds,
  dequeueSchoolPdfBuild,
  getPdfWorkerState,
} from './pdfGenerationService.js';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CacheKey {
  schoolId: string;
  classId: string;
  term: string;
  examType: string;
  academicYear: string;
}

// ─── In-process queue ─────────────────────────────────────────────────────────
// A simple Set of serialised keys prevents duplicate parallel jobs for the
// same (class, term, examType, year) while a computation is still running.

const inFlight = new Set<string>();

function cacheKey(k: CacheKey) {
  return `${k.schoolId}|${k.classId}|${k.term}|${k.examType}|${k.academicYear}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Call this (fire-and-forget) from the submit/publish route after a successful
 * grade status update.  The computation runs in the background; the HTTP
 * response is already sent before this finishes.
 */
export function schedulePrecompute(key: CacheKey): void {
  const k = cacheKey(key);
  if (inFlight.has(k)) {
    // Already computing for this combo — skip duplicate
    return;
  }
  inFlight.add(k);
  runPrecompute(key)
    .catch(err => console.warn('[ReportCardCache] precompute failed:', err))
    .finally(() => inFlight.delete(k));
}

/**
 * Returns the cached report card array for a class/term/year, or null on miss.
 */
export async function getCachedReportCards(key: CacheKey): Promise<any[] | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('report_card_cache')
      .select('data')
      .eq('school_id', key.schoolId)
      .eq('class_id', key.classId)
      .eq('term', key.term)
      .eq('exam_type', key.examType)
      .eq('academic_year', key.academicYear)
      .maybeSingle();

    if (error) {
      console.warn('[ReportCardCache] cache read error:', error.message);
      return null;
    }
    return data?.data ?? null;
  } catch (err: any) {
    console.warn('[ReportCardCache] cache read exception:', err.message);
    return null;
  }
}

/**
 * Deletes the cache entry for a class/term/year so the next print request
 * recomputes fresh data.  Call this whenever a grade is edited or deleted.
 */
export async function invalidateCache(key: Omit<CacheKey, 'schoolId'> & { schoolId?: string }): Promise<void> {
  try {
    let q = supabaseAdmin
      .from('report_card_cache')
      .delete()
      .eq('class_id', key.classId)
      .eq('term', key.term)
      .eq('academic_year', key.academicYear);
    if (key.schoolId) q = q.eq('school_id', key.schoolId);
    if (key.examType) q = q.eq('exam_type', key.examType);
    await q;

    if (key.schoolId) {
      await deleteClassPdf({
        schoolId: key.schoolId,
        classId: key.classId,
        term: key.term,
        examType: key.examType || '',
        academicYear: key.academicYear,
      });
      await queueSchoolPdfBuild(key.schoolId);
    }
  } catch (e: any) {
    console.warn('[ReportCardCache] invalidate error:', e.message);
  }
}

/**
 * Call this when a teacher submits/publishes a gradebook or edits marks:
 * Invalidates and re-triggers background calculation and PDF updates for the school.
 */
export function invalidateAndRecomputeSchool(schoolId: string): void {
  prioritizeSchool(schoolId);
  triggerSchedulerWake();
}

/**
 * Returns cache metadata (whether a warm cache exists and when it was built)
 * for the given filters.  Used by the UI "⚡ Pre-loaded" badge.
 */
export async function getCacheStatus(key: CacheKey): Promise<{
  cached: boolean;
  cachedAt: string | null;
  studentCount: number;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('report_card_cache')
      .select('cached_at, student_count')
      .eq('school_id', key.schoolId)
      .eq('class_id', key.classId)
      .eq('term', key.term)
      .eq('exam_type', key.examType)
      .eq('academic_year', key.academicYear)
      .maybeSingle();

    if (error) {
      return { cached: false, cachedAt: null, studentCount: 0 };
    }

    return {
      cached: !!data,
      cachedAt: data?.cached_at ?? null,
      studentCount: data?.student_count ?? 0,
    };
  } catch {
    return { cached: false, cachedAt: null, studentCount: 0 };
  }
}

// ─── Core computation ─────────────────────────────────────────────────────────

async function runPrecompute(key: CacheKey): Promise<void> {
  const { schoolId, classId, term, examType, academicYear } = key;
  const label = `[ReportCardCache] ${classId}/${term}/${examType}/${academicYear}`;
  console.log(`${label} — starting pre-computation`);

  try {
    const cards = await computeBatchReportCards(schoolId, classId, term, examType, academicYear);
    if (!cards || cards.length === 0) {
      console.log(`${label} — no cards produced, skipping cache write`);
      return;
    }

    const { error } = await supabaseAdmin
      .from('report_card_cache')
      .upsert(
        {
          school_id: schoolId,
          class_id: classId,
          term,
          exam_type: examType,
          academic_year: academicYear,
          student_count: cards.length,
          data: cards,
          cached_at: new Date().toISOString(),
        },
        { onConflict: 'school_id,class_id,term,exam_type,academic_year' },
      );

    if (error) {
      console.warn(`${label} — cache write error:`, error.message);
      return;
    }
    console.log(`${label} — cached ${cards.length} cards ✓`);
  } catch (err: any) {
    console.warn(`${label} — error:`, err.message);
  }
}

// ─── Batch computation (shared with the route handler) ───────────────────────

/**
 * Computes the full array of report card objects for every student in a class.
 * This is the single source of truth used by BOTH the cache pre-builder and
 * the on-demand batch endpoint, so cached and live outputs are always identical.
 */
export async function computeBatchReportCards(
  schoolId: string,
  classId: string,
  term: string,
  examType: string,
  academicYear: string,
): Promise<any[]> {
  // 1. School details + grading scales
  const [{ data: schoolDetails }, { data: scales }] = await Promise.all([
    supabaseAdmin
      .from('schools')
      .select(
        'name, address, email, phone, website, logo_url, signature_url, seal_url, coat_of_arms_url, school_type, headteacher_name, headteacher_title, compulsory_subjects_primary, compulsory_subjects_secondary, test_types, test_types_enabled, show_teacher_on_report_card',
      )
      .eq('id', schoolId)
      .single(),
    supabaseAdmin
      .from('grading_scales')
      .select('*')
      .eq('school_id', schoolId)
      .order('min_percentage', { ascending: false }),
  ]);

  // 2. Enrollments
  const enrollmentsQuery = supabaseAdmin
    .from('enrollments')
    .select(
      'id, student_id, profiles!enrollments_student_id_fkey(full_name, student_number, gender), classes(name, class_teacher_id, class_teacher_name, teacher:class_teacher_id(full_name))',
    )
    .eq('class_id', classId)
    .eq('academic_year', academicYear)
    .order('id', { ascending: true });

  const enrollments = await fetchAll(enrollmentsQuery);
  if (!enrollments || enrollments.length === 0) return [];

  const studentIds = enrollments.map((e: any) => e.student_id);

  // 3. Class subjects
  const classSubjectsQuery = supabaseAdmin
    .from('class_subjects')
    .select('id, subject_id, teacher_name, subjects(id, name, code, department), profiles(id, full_name)')
    .eq('class_id', classId)
    .order('id', { ascending: true });

  const classSubjects = await fetchAll(classSubjectsQuery);

  const allClassSubjects = (classSubjects || [])
    .map((cs: any) => {
      const rawName =
        cs.teacher_name ||
        (Array.isArray(cs.profiles) ? cs.profiles[0]?.full_name : cs.profiles?.full_name);
      let formattedTeacher = '';
      if (rawName) {
        const parts = rawName.trim().split(/\s+/);
        formattedTeacher =
          parts.length === 1
            ? parts[0]
            : `${parts[0].charAt(0).toUpperCase()}. ${parts[parts.length - 1]}`;
      }
      return cs.subjects ? { ...cs.subjects, teacherName: formattedTeacher || null } : null;
    })
    .filter(Boolean);

  // 4. Rankings + all grades in PARALLEL
  const allGradesQuery = supabaseAdmin
    .from('student_grades')
    .select('*, subjects(id, name, code, department)')
    .in('student_id', studentIds)
    .eq('term', term)
    .eq('academic_year', academicYear)
    .order('id', { ascending: true });

  const [rankingsData, allGrades] = await Promise.all([
    getClassRankings(classId, term, examType, academicYear),
    fetchAll(allGradesQuery),
  ]);

  const classGradesKeysSet = new Set<string>(
    (allGrades || [])
      .filter((g: any) => g.percentage !== null && g.percentage !== undefined && g.percentage !== '')
      .map((g: any) => `${g.subject_id}-${g.exam_type}-${g.test_type || ''}`),
  );
  const classGradesKeys = Array.from(classGradesKeysSet);

  const filteredGrades = (allGrades || []).filter((g: any) => {
    if (!examType) return true;
    if (g.exam_type === examType) return true;
    if (['Test 1', 'Test 2', 'Test 3'].includes(g.exam_type)) return true;
    if (g.exam_type === 'Term' && g.test_type && ['Test 1', 'Test 2', 'Test 3'].includes(g.test_type))
      return true;
    return false;
  });

  // 5. Assemble one card per student
  return enrollments.map((enrollment: any) => {
    const studentId = enrollment.student_id;
    const studentRawGrades = filteredGrades?.filter((g: any) => g.student_id === studentId) || [];

    const gradesMap = new Map<string, any>();
    [...studentRawGrades]
      .sort(
        (a: any, b: any) =>
          new Date(b.calculated_at || b.created_at).getTime() -
          new Date(a.calculated_at || a.created_at).getTime(),
      )
      .forEach((grade: any) => {
        const subId = grade.subject_id || grade.subjects?.id || grade.subjects?.code;
        if (!subId) return;
        const key = `${subId}-${grade.exam_type}-${grade.test_type || ''}`;
        if (!gradesMap.has(key)) gradesMap.set(key, grade);
      });

    const gradesBySubject = new Map<string, any[]>();
    for (const grade of gradesMap.values()) {
      const subId = grade.subject_id;
      if (!gradesBySubject.has(subId)) gradesBySubject.set(subId, []);
      gradesBySubject.get(subId)!.push(grade);
    }

    const finalGrades: any[] = [];
    allClassSubjects.forEach((subject: any) => {
      const subjectGrades = gradesBySubject.get(subject.id) || [];
      if (subjectGrades.length > 0) {
        subjectGrades.forEach((g: any) =>
          finalGrades.push({ ...g, subjects: { ...g.subjects, teacherName: subject.teacherName } }),
        );
      } else {
        finalGrades.push({
          student_id: studentId,
          subject_id: subject.id,
          subjects: subject,
          grade: 'ABSENT',
          percentage: null,
          exam_type: examType || 'End of Term',
          test_type: '',
          status: 'Published',
        });
      }
    });

    const processedSubjectIds = new Set(allClassSubjects.map((s: any) => s.id));
    for (const grade of gradesMap.values()) {
      if (grade.subject_id && !processedSubjectIds.has(grade.subject_id)) finalGrades.push(grade);
    }

    const rawTeacherName =
      enrollment.classes?.class_teacher_name || enrollment.classes?.teacher?.full_name;
    let classTeacherName = '';
    if (rawTeacherName) {
      const parts = rawTeacherName.trim().split(/\s+/);
      classTeacherName =
        parts.length === 1
          ? parts[0]
          : `${parts[0].charAt(0).toUpperCase()}. ${parts[parts.length - 1]}`;
    }

    return {
      school: schoolDetails,
      student: {
        id: studentId,
        name: enrollment.profiles?.full_name,
        studentNumber: enrollment.profiles?.student_number,
        gender: enrollment.profiles?.gender,
        class: enrollment.classes?.name || 'N/A',
        classTeacherName,
        attendance: 0,
        position: rankingsData.rankings[studentId] || 0,
        totalStudents: rankingsData.totalStudents,
        classAverage: rankingsData.classAverage,
      },
      term,
      academicYear,
      grades: finalGrades,
      gradingScale: scales || [],
      classGradesKeys,
    };
  });
}

// ─── fetchAll helper (duplicated from school.ts to keep the service self-contained) ──

async function fetchAll(queryBuilder: any, limit = 1000): Promise<any[]> {
  let allData: any[] = [];
  const seenIds = new Set<any>();
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await queryBuilder.range(from, from + limit - 1);
    if (error) throw error;
    if (data && data.length > 0) {
      for (const item of data) {
        if (item && item.id !== undefined && item.id !== null) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            allData.push(item);
          }
        } else {
          allData.push(item);
        }
      }
      hasMore = data.length === limit;
      from += limit;
    } else {
      hasMore = false;
    }
  }
  return allData;
}

// ─── getClassRankings (duplicated from school.ts to keep the service self-contained) ─

function isSeniorSecondaryLevel(level: string): boolean {
  const raw = (level || '').toLowerCase().trim();
  if (/\bform\b/.test(raw)) return true;
  const match = raw.match(/(\d{1,2})/);
  if (match) {
    const lvl = parseInt(match[1], 10);
    return lvl >= 8 && lvl <= 12;
  }
  return false;
}

function matchesCompulsorySubject(subjectName: string, configuredSubject: string): boolean {
  const normSub = subjectName.trim().toLowerCase();
  const normConfig = configuredSubject.trim().toLowerCase();
  if (!normSub || !normConfig) return false;
  const isConfigEnglish = /^(eng|english|english\s+language|english\s+lang)$/i.test(normConfig);
  if (isConfigEnglish) return /\b(english|eng|english\s+language|english\s+lang)\b/i.test(normSub);
  if (normSub === normConfig) return true;
  try {
    const escaped = normConfig.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(normSub)) return true;
  } catch (_) { /* noop */ }
  return normSub.includes(normConfig) || normConfig.includes(normSub);
}

async function getClassRankings(classId: string, term: string, examType: string, academicYear: string) {
  const { data: classObj } = await supabaseAdmin
    .from('classes')
    .select('school_id, level')
    .eq('id', classId)
    .single();
  const schoolId = classObj?.school_id;
  const classLevel: string = classObj?.level || '';

  const { data: school } = schoolId
    ? await supabaseAdmin
        .from('schools')
        .select('test_types, test_types_enabled, school_type, compulsory_subjects_secondary')
        .eq('id', schoolId)
        .single()
    : { data: null };
  const activeTestTypes = school?.test_types_enabled ? (school?.test_types || []) : [];

  const seniorSec = isSeniorSecondaryLevel(classLevel);
  const compulsorySubjects: string[] =
    Array.isArray(school?.compulsory_subjects_secondary) &&
    school.compulsory_subjects_secondary.length > 0
      ? school.compulsory_subjects_secondary
      : ['English'];

  const { data: enrollments } = await supabaseAdmin
    .from('enrollments')
    .select('student_id')
    .eq('class_id', classId)
    .eq('academic_year', academicYear);

  if (!enrollments || enrollments.length === 0)
    return { rankings: {} as Record<string, number>, classAverage: 0, totalStudents: 0 };

  const studentIds = enrollments.map((e: any) => e.student_id);
  const gradesQuery = supabaseAdmin
    .from('student_grades')
    .select('id, student_id, subject_id, percentage, exam_type, test_type, subjects(id, name)')
    .in('student_id', studentIds)
    .eq('term', term)
    .eq('academic_year', academicYear)
    .order('id', { ascending: true });

  const grades = await fetchAll(gradesQuery);

  const studentGradesMap: Record<string, Record<string, any[]>> = {};
  studentIds.forEach((id: string) => { studentGradesMap[id] = {}; });

  grades.forEach((g: any) => {
    if (studentGradesMap[g.student_id]) {
      if (!studentGradesMap[g.student_id][g.subject_id])
        studentGradesMap[g.student_id][g.subject_id] = [];
      studentGradesMap[g.student_id][g.subject_id].push(g);
    }
  });

  function resolveSubjectPercentage(subjectGrades: any[]): number | null {
    if (activeTestTypes.length > 0) {
      const scores = activeTestTypes
        .map((tt: string) =>
          subjectGrades.find((g: any) => g.test_type === tt || g.exam_type === tt)?.percentage,
        )
        .filter((p: any) => p !== null && p !== undefined && p !== '') as number[];
      return scores.length > 0 ? scores.reduce((s: number, p: number) => s + Number(p), 0) / scores.length : null;
    }
    const match = subjectGrades.find(
      (g: any) => g.exam_type === examType && (!g.test_type || g.test_type === '' || g.test_type === 'none'),
    );
    if (match) return match.percentage;
    const scores = ['Test 1', 'Test 2', 'Test 3']
      .map(tt => subjectGrades.find((g: any) => g.test_type === tt || g.exam_type === tt)?.percentage)
      .filter((p: any) => p !== null && p !== undefined && p !== '') as number[];
    return scores.length > 0 ? scores.reduce((s: number, p: number) => s + Number(p), 0) / scores.length : null;
  }

  const studentScores: Record<string, { score: number; hasGrades: boolean }> = {};
  studentIds.forEach((studentId: string) => {
    const subjectsMap = studentGradesMap[studentId];
    if (seniorSec) {
      const subjectPercentages = Object.entries(subjectsMap)
        .map(([, subjectGrades]) => {
          const pct = resolveSubjectPercentage(subjectGrades as any[]);
          if (pct === null || pct === undefined) return null;
          const subjectName = ((subjectGrades as any[])[0]?.subjects?.name || '').trim();
          return { subjectName, percentage: Number(pct) };
        })
        .filter(Boolean) as { subjectName: string; percentage: number }[];
      if (subjectPercentages.length === 0) {
        studentScores[studentId] = { score: 0, hasGrades: false };
        return;
      }
      const compulsoryEntries = subjectPercentages.filter(s =>
        compulsorySubjects.some(cs => matchesCompulsorySubject(s.subjectName, cs)),
      );
      const nonCompulsoryEntries = subjectPercentages
        .filter(s => !compulsorySubjects.some(cs => matchesCompulsorySubject(s.subjectName, cs)))
        .sort((a, b) => b.percentage - a.percentage);
      const selected: { subjectName: string; percentage: number }[] = [];
      for (const e of [...compulsoryEntries, ...nonCompulsoryEntries]) {
        if (selected.length >= 6) break;
        selected.push(e);
      }
      studentScores[studentId] = {
        score: selected.reduce((s, e) => s + e.percentage, 0),
        hasGrades: true,
      };
    } else {
      const scores = Object.values(subjectsMap)
        .map(sg => resolveSubjectPercentage(sg as any[]))
        .filter((p): p is number => p !== null && p !== undefined);
      studentScores[studentId] = {
        score: scores.length > 0 ? scores.reduce((s, p) => s + Number(p), 0) / scores.length : 0,
        hasGrades: scores.length > 0,
      };
    }
  });

  const scoresList = Object.entries(studentScores)
    .map(([id, d]) => ({ id, ...d }))
    .sort((a, b) => b.score - a.score);
  const rankings: Record<string, number> = {};
  scoresList.forEach((item, i) => { rankings[item.id] = i + 1; });
  const validScores = scoresList.filter(s => s.hasGrades);
  const classAverage =
    validScores.length > 0
      ? validScores.reduce((s, e) => s + e.score, 0) / validScores.length
      : 0;

  return { rankings, classAverage, totalStudents: studentIds.length };
}

// ─── Backfill Scheduler & Queue Management ─────────────────────────────────────

const BACKFILL_DELAY_MS = 600; // 600ms between each class computation during backfill
const SCHOOL_DELAY_MS   = 1000; // 1 s between schools

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let schedulerWakeResolver: (() => void) | null = null;

function waitForWake(ms: number): Promise<void> {
  return new Promise<void>(resolve => {
    let timer: NodeJS.Timeout;
    const resolver = () => {
      clearTimeout(timer);
      schedulerWakeResolver = null;
      resolve();
    };
    schedulerWakeResolver = resolver;
    timer = setTimeout(resolver, ms);
  });
}

export function triggerSchedulerWake() {
  if (schedulerWakeResolver) {
    schedulerWakeResolver();
  }
}

interface SchedulerSchoolItem {
  id: string;
  name: string;
}

interface SchedulerState {
  currentSchoolId: string | null;
  currentSchoolName: string | null;
  currentClassLabel: string | null;
  schoolQueue: SchedulerSchoolItem[];
  priorityQueue: string[]; // schoolIds requested to be processed next
  isCalculating: boolean;
}

const schedulerState: SchedulerState = {
  currentSchoolId: null,
  currentSchoolName: null,
  currentClassLabel: null,
  schoolQueue: [],
  priorityQueue: [],
  isCalculating: false,
};

/**
 * Request that calculations & PDF compilation for this school run next in line.
 * If jumpToFront is true (default), this school is placed at index 0 of the priority queue.
 */
export function prioritizeSchool(schoolId: string, jumpToFront: boolean = true): boolean {
  if (schedulerState.currentSchoolId === schoolId) {
    // Already actively running
    return true;
  }

  // If already in queue, remove so we can place it at the front (or new priority position)
  const existingIdx = schedulerState.priorityQueue.indexOf(schoolId);
  if (existingIdx !== -1) {
    schedulerState.priorityQueue.splice(existingIdx, 1);
  }

  if (jumpToFront) {
    schedulerState.priorityQueue.unshift(schoolId);
  } else {
    schedulerState.priorityQueue.push(schoolId);
  }

  console.log(`[ReportCardCache] School ${schoolId} set as NEXT priority! Current priority queue:`, schedulerState.priorityQueue);
  triggerSchedulerWake();
  return true;
}

/**
 * Robust helper to discover all distinct (classId, term, examType, academicYear) combinations
 * that have submitted or published grades for a given school.
 */
async function getSchoolCombos(schoolId: string): Promise<{
  combos: (CacheKey & { className: string })[];
  classNameMap: Map<string, string>;
  schoolName: string;
}> {
  const [{ data: school }, { data: allClasses }] = await Promise.all([
    supabaseAdmin.from('schools').select('name').eq('id', schoolId).single(),
    supabaseAdmin.from('classes').select('id, name').eq('school_id', schoolId).order('name'),
  ]);

  const schoolName = school?.name || 'School';
  const classNameMap = new Map<string, string>((allClasses || []).map((c: any) => [c.id, c.name || 'Class']));
  const classIds = (allClasses || []).map((c: any) => c.id);

  if (classIds.length === 0) {
    return { combos: [], classNameMap, schoolName };
  }

  // 1. Fetch all enrollments for classes belonging to this school (paginated)
  const allEnrollments: { student_id: string; class_id: string; academic_year: string }[] = [];
  let ePage = 0;
  const pageSize = 1000;
  while (true) {
    const { data: batch, error: bErr } = await supabaseAdmin
      .from('enrollments')
      .select('student_id, class_id, academic_year')
      .in('class_id', classIds)
      .range(ePage * pageSize, (ePage + 1) * pageSize - 1);

    if (bErr || !batch || batch.length === 0) break;
    allEnrollments.push(...batch);
    if (batch.length < pageSize) break;
    ePage++;
  }

  if (allEnrollments.length === 0) {
    return { combos: [], classNameMap, schoolName };
  }

  const studentClassMap = new Map<string, Map<string, string>>();
  for (const e of allEnrollments) {
    if (!studentClassMap.has(e.student_id)) studentClassMap.set(e.student_id, new Map());
    studentClassMap.get(e.student_id)!.set(String(e.academic_year), e.class_id);
  }

  // 2. Fetch distinct submitted/published student grades for this school
  const gradeDistinct: { term: string; exam_type: string; academic_year: string; student_id: string }[] = [];
  let gPage = 0;
  while (true) {
    const { data: gBatch, error: gErr } = await supabaseAdmin
      .from('student_grades')
      .select('term, exam_type, academic_year, student_id')
      .eq('school_id', schoolId)
      .in('status', ['Submitted', 'Published'])
      .range(gPage * pageSize, (gPage + 1) * pageSize - 1);

    if (gErr || !gBatch || gBatch.length === 0) break;
    gradeDistinct.push(...gBatch);
    if (gBatch.length < pageSize || gradeDistinct.length >= 30000) break;
    gPage++;
  }

  const comboMap = new Map<string, CacheKey & { className: string }>();
  for (const g of gradeDistinct) {
    const classId = studentClassMap.get(g.student_id)?.get(String(g.academic_year));
    if (!classId) continue;
    const key = `${classId}|${g.term}|${g.exam_type}|${g.academic_year}`;
    if (!comboMap.has(key)) {
      comboMap.set(key, {
        schoolId,
        classId,
        className: classNameMap.get(classId) || 'Class',
        term: g.term,
        examType: g.exam_type,
        academicYear: String(g.academic_year),
      });
    }
  }

  return {
    combos: Array.from(comboMap.values()),
    classNameMap,
    schoolName,
  };
}

/**
 * Detailed report card calculation progress across all terms for a specific school.
 */
export async function getSchoolPrecomputeStatus(schoolId: string, skipActiveMetrics: boolean = false) {
  try {
    const { combos, schoolName } = await getSchoolCombos(schoolId);

    // 5. Fetch existing cache entries
    const { data: existingCache, error: cacheErr } = await supabaseAdmin
      .from('report_card_cache')
      .select('class_id, term, exam_type, academic_year, cached_at, student_count')
      .eq('school_id', schoolId);

    const cacheMap = new Map<string, { cachedAt: string; studentCount: number }>();
    if (!cacheErr && existingCache) {
      for (const row of existingCache) {
        cacheMap.set(`${row.class_id}|${row.term}|${row.exam_type}|${row.academic_year}`, {
          cachedAt: row.cached_at,
          studentCount: row.student_count,
        });
      }
    }

    let pdfStorageError: string | null = null;
    let readyPdfPaths = new Set<string>();
    try {
      readyPdfPaths = await listReadyClassPdfPaths(schoolId);
    } catch (error: any) {
      pdfStorageError = error.message || 'Unable to read PDF storage';
    }
    const queuedPdfSchoolIds = await getQueuedPdfSchoolIds().catch(() => [] as string[]);

    // 6. Group by term & academic year
    const termGroupsMap = new Map<string, {
      term: string;
      academicYear: string;
      totalClasses: number;
      calculatedClasses: number;
      remainingClasses: number;
      classes: {
        classId: string;
        className: string;
        examType: string;
        isCalculated: boolean;
        isPdfReady?: boolean;
        cachedAt: string | null;
        studentCount: number;
      }[];
    }>();

    let totalClasses = 0;
    let calculatedClasses = 0;
    let totalPdfs = 0;

    for (const c of combos) {
      totalClasses++;
      const cacheKeyStr = `${c.classId}|${c.term}|${c.examType}|${c.academicYear}`;
      const cacheItem = cacheMap.get(cacheKeyStr);
      const isCalculated = !!cacheItem;
      if (isCalculated) calculatedClasses++;
      if (!cacheItem || cacheItem.studentCount > 0) totalPdfs++;

      const groupKey = `${c.term} - ${c.academicYear}`;
      if (!termGroupsMap.has(groupKey)) {
        termGroupsMap.set(groupKey, {
          term: c.term,
          academicYear: c.academicYear,
          totalClasses: 0,
          calculatedClasses: 0,
          remainingClasses: 0,
          classes: [],
        });
      }

      const group = termGroupsMap.get(groupKey)!;
      group.totalClasses++;
      if (isCalculated) group.calculatedClasses++;
      else group.remainingClasses++;

      group.classes.push({
        classId: c.classId,
        className: c.className,
        examType: c.examType,
        isCalculated,
        isPdfReady: readyPdfPaths.has(getPdfStorageObjectPath({
          schoolId,
          classId: c.classId,
          term: c.term,
          examType: c.examType,
          academicYear: c.academicYear,
        })),
        cachedAt: cacheItem?.cachedAt || null,
        studentCount: cacheItem?.studentCount || 0,
      });
    }

    // Sort classes inside groups alphabetically
    for (const group of termGroupsMap.values()) {
      group.classes.sort((a, b) => a.className.localeCompare(b.className));
    }

    const remainingClasses = totalClasses - calculatedClasses;
    const progressPercentage = totalClasses > 0 ? Math.round((calculatedClasses / totalClasses) * 100) : 100;
    const isCompleted = remainingClasses === 0;

    // 7. Queue position & wait status
    const isCurrentlyCalculating = schedulerState.currentSchoolId === schoolId;
    const isPriorityQueued = schedulerState.priorityQueue.includes(schoolId)
      || queuedPdfSchoolIds.includes(schoolId);

    let queuePosition = 0;
    let waitStatusText = '';

    if (isCompleted) {
      waitStatusText = 'All submitted classes calculated ✓';
    } else if (isCurrentlyCalculating) {
      waitStatusText = schedulerState.currentClassLabel
        ? `Actively calculating: ${schedulerState.currentClassLabel}`
        : 'Actively calculating report cards for this school…';
    } else if (isPriorityQueued) {
      queuePosition = 1;
      const currentName = schedulerState.currentSchoolName;
      waitStatusText = currentName
        ? `Prioritized: To start immediately after current school (${currentName})`
        : 'Prioritized: Next school in queue to start momentarily';
    } else {
      // Find school index in scheduler queue
      const currentIdx = schedulerState.schoolQueue.findIndex(s => s.id === schedulerState.currentSchoolId);
      const myIdx = schedulerState.schoolQueue.findIndex(s => s.id === schoolId);

      let schoolsAhead = 0;
      if (myIdx >= 0) {
        if (currentIdx >= 0 && myIdx > currentIdx) {
          schoolsAhead = (myIdx - currentIdx) + schedulerState.priorityQueue.length;
        } else if (currentIdx >= 0 && myIdx <= currentIdx) {
          schoolsAhead = (schedulerState.schoolQueue.length - currentIdx + myIdx) + schedulerState.priorityQueue.length;
        } else {
          schoolsAhead = myIdx + schedulerState.priorityQueue.length;
        }
      } else {
        schoolsAhead = schedulerState.schoolQueue.length + schedulerState.priorityQueue.length;
      }

      queuePosition = Math.max(1, schoolsAhead);

      if (queuePosition === 1) {
        const currentName = schedulerState.currentSchoolName;
        waitStatusText = currentName
          ? `Waiting: To start after the current school (${currentName})`
          : 'Waiting: To start after the current school';
      } else {
        waitStatusText = `Waiting: To start after ${queuePosition} schools in queue`;
      }
    }

    // 8. Estimated completion time
    let estimatedSeconds = 0;
    let estimatedTimeText = '';

    if (isCompleted) {
      estimatedTimeText = 'Complete';
    } else if (isCurrentlyCalculating) {
      estimatedSeconds = remainingClasses * 3.5;
      estimatedTimeText = estimatedSeconds < 60
        ? `~${Math.max(3, Math.ceil(estimatedSeconds))}s remaining`
        : `~${Math.ceil(estimatedSeconds / 60)} min remaining`;
    } else {
      // Waiting
      estimatedSeconds = (queuePosition * 12) + (remainingClasses * 3.5);
      if (estimatedSeconds < 60) {
        estimatedTimeText = `~${Math.max(10, Math.ceil(estimatedSeconds))}s`;
      } else if (estimatedSeconds < 3600) {
        estimatedTimeText = `~${Math.ceil(estimatedSeconds / 60)} min`;
      } else {
        const hrs = Math.floor(estimatedSeconds / 3600);
        const mins = Math.ceil((estimatedSeconds % 3600) / 60);
        estimatedTimeText = `~${hrs}h ${mins}m`;
      }
    }

    const terms = Array.from(termGroupsMap.values()).sort((a, b) => a.term.localeCompare(b.term));

    // 9. PDF compilation progress
    let builtPdfs = 0;
    for (const group of termGroupsMap.values()) {
      for (const cls of group.classes) {
        if (cls.studentCount > 0 && cls.isPdfReady) builtPdfs++;
      }
    }
    const remainingPdfs = Math.max(0, totalPdfs - builtPdfs);
    const pdfProgressPercentage = totalPdfs > 0 ? Math.round((builtPdfs / totalPdfs) * 100) : 100;
    const isPdfCompleted = totalPdfs > 0 ? (remainingPdfs === 0) : true;

    const pdfWorker = getPdfWorkerState();
    const isCurrentlyBuildingPdf = pdfWorker.currentSchoolId === schoolId && pdfWorker.isCompiling;
    const activePdfLabel = isCurrentlyBuildingPdf ? pdfWorker.currentClassLabel : null;
    const estPdfSeconds = remainingPdfs * (process.env.VERCEL ? 60 : 3.5);
    const estPdfTimeText = isPdfCompleted
      ? 'Complete'
      : estPdfSeconds < 60
      ? `~${Math.max(3, Math.ceil(estPdfSeconds))}s remaining`
      : `~${Math.ceil(estPdfSeconds / 60)} min remaining`;

    // 10. Live metrics of the active running school (scores & pre-built PDF progress)
    let activeSchoolMetrics: any = null;
    if (!skipActiveMetrics && schedulerState.currentSchoolId) {
      if (schedulerState.currentSchoolId === schoolId) {
        activeSchoolMetrics = {
          schoolId,
          schoolName,
          isSameSchool: true,
          totalClasses,
          calculatedClasses,
          calcPercentage: progressPercentage,
          totalPdfs,
          builtPdfs,
          pdfPercentage: pdfProgressPercentage,
          isPdfCompleted,
          isCurrentlyBuildingPdf,
          activePdfLabel,
          currentClassLabel: schedulerState.currentClassLabel,
        };
      } else {
        try {
          const activeStatus = await getSchoolPrecomputeStatus(schedulerState.currentSchoolId, true);
          activeSchoolMetrics = {
            schoolId: activeStatus.schoolId,
            schoolName: activeStatus.schoolName,
            isSameSchool: false,
            totalClasses: activeStatus.totalClasses,
            calculatedClasses: activeStatus.calculatedClasses,
            calcPercentage: activeStatus.progressPercentage,
            totalPdfs: activeStatus.totalPdfs,
            builtPdfs: activeStatus.builtPdfs,
            pdfPercentage: activeStatus.pdfProgressPercentage,
            isPdfCompleted: activeStatus.isPdfCompleted,
            isCurrentlyBuildingPdf: activeStatus.isCurrentlyBuildingPdf,
            activePdfLabel: activeStatus.activePdfLabel,
            currentClassLabel: schedulerState.currentClassLabel,
          };
        } catch (_) {
          activeSchoolMetrics = {
            schoolId: schedulerState.currentSchoolId,
            schoolName: schedulerState.currentSchoolName,
            isSameSchool: false,
            totalClasses: 0,
            calculatedClasses: 0,
            calcPercentage: 0,
            totalPdfs: 0,
            builtPdfs: 0,
            pdfPercentage: 0,
            isPdfCompleted: false,
            isCurrentlyBuildingPdf: pdfWorker.isCompiling && pdfWorker.currentSchoolId === schedulerState.currentSchoolId,
            activePdfLabel: pdfWorker.currentClassLabel,
            currentClassLabel: schedulerState.currentClassLabel,
          };
        }
      }
    }

    const priorityIndex = schedulerState.priorityQueue.indexOf(schoolId);

    return {
      schoolId,
      schoolName,
      totalClasses,
      calculatedClasses,
      remainingClasses,
      progressPercentage,
      isCompleted,
      isCurrentlyCalculating,
      currentClassLabel: isCurrentlyCalculating ? schedulerState.currentClassLabel : null,
      currentRunningSchoolName: schedulerState.currentSchoolName,
      activeSchoolMetrics,
      queuePosition,
      waitStatusText,
      estimatedTimeText,
      estimatedSeconds,
      canPrioritize: !isCurrentlyCalculating && priorityIndex !== 0,
      isPriorityQueued,
      priorityQueuePosition: priorityIndex !== -1 ? priorityIndex + 1 : null,
      isNextPriority: priorityIndex === 0,
      terms,
      // Pre-built PDF compilation metrics
      totalPdfs,
      builtPdfs,
      remainingPdfs,
      pdfProgressPercentage,
      isPdfCompleted,
      isCurrentlyBuildingPdf,
      pdfWorkerPhase: isCurrentlyBuildingPdf ? pdfWorker.phase : 'queued',
      pdfStorageError,
      activePdfLabel,
      estPdfTimeText,
    };
  } catch (err: any) {
    console.error('[ReportCardCache] getSchoolPrecomputeStatus error:', err.message);
    return {
      schoolId,
      schoolName: 'School',
      totalClasses: 0,
      calculatedClasses: 0,
      remainingClasses: 0,
      progressPercentage: 100,
      isCompleted: true,
      isCurrentlyCalculating: false,
      currentClassLabel: null,
      currentRunningSchoolName: null,
      queuePosition: 0,
      waitStatusText: 'Ready',
      estimatedTimeText: 'Complete',
      estimatedSeconds: 0,
      canPrioritize: false,
      isPriorityQueued: false,
      terms: [],
      totalPdfs: 0,
      builtPdfs: 0,
      remainingPdfs: 0,
      pdfProgressPercentage: 100,
      isPdfCompleted: true,
      isCurrentlyBuildingPdf: false,
      activePdfLabel: null,
      estPdfTimeText: 'Complete',
    };
  }
}

/**
 * Called once at server start (in server/index.ts).
 * Runs continuously in background:
 *  - Iterates schools one-by-one, checking priority queue first
 *  - Pre-computes classes one-by-one with delays to prevent DB spikes
 *  - Responds immediately to prioritization or grade submissions
 */
export async function startBackfillScheduler(): Promise<void> {
  // Initial startup delay
  await sleep(8000);
  console.log('[ReportCardCache] Backfill scheduler loop active');

  while (true) {
    try {
      // 1. Fetch active schools
      const { data: schools, error } = await supabaseAdmin
        .from('schools')
        .select('id, name')
        .order('name');

      if (error || !schools || schools.length === 0) {
        await waitForWake(30000);
        continue;
      }

      schedulerState.schoolQueue = schools.map((s: any) => ({ id: s.id, name: s.name }));

      // 2. Loop through schools (checking priority queue first at each iteration)
      let index = 0;
      while (index < schools.length || schedulerState.priorityQueue.length > 0) {
        let targetSchoolId: string;
        let targetSchoolName: string;
        let isNormalPass = false;

        // Check if there is an explicit priority request
        if (schedulerState.priorityQueue.length > 0) {
          targetSchoolId = schedulerState.priorityQueue.shift()!;
          const match = schools.find((s: any) => s.id === targetSchoolId);
          targetSchoolName = match?.name || 'Prioritized School';
          isNormalPass = false;
          console.log(`[ReportCardCache] Executing PRIORITY backfill for: ${targetSchoolName}`);
        } else {
          const current = schools[index];
          targetSchoolId = current.id;
          targetSchoolName = current.name;
          isNormalPass = true;
          index++;
        }

        schedulerState.currentSchoolId = targetSchoolId;
        schedulerState.currentSchoolName = targetSchoolName;
        schedulerState.isCalculating = true;

        try {
          await processSchoolBackfill(targetSchoolId, targetSchoolName, isNormalPass);
        } catch (schoolErr: any) {
          console.warn(`[ReportCardCache] Error processing ${targetSchoolName}:`, schoolErr.message);
        }

        schedulerState.currentSchoolId = null;
        schedulerState.currentSchoolName = null;
        schedulerState.currentClassLabel = null;
        schedulerState.isCalculating = false;

        await sleep(SCHOOL_DELAY_MS);
      }

      // Completed full pass — wait 5 minutes before checking again, or wake immediately on priority
      await waitForWake(300000);
    } catch (err: any) {
      console.error('[ReportCardCache] Backfill scheduler loop error:', err.message);
      schedulerState.currentSchoolId = null;
      schedulerState.currentSchoolName = null;
      schedulerState.currentClassLabel = null;
      schedulerState.isCalculating = false;
      await waitForWake(15000);
    }
  }
}

async function processSchoolBackfill(schoolId: string, schoolNameFallback: string, isNormalPass: boolean): Promise<void> {
  const { combos, schoolName } = await getSchoolCombos(schoolId);
  if (combos.length === 0) return;

  // ─── STAGE 1: Calculate & Cache Scores for THIS School ───────────────────────
  const { data: existingCache } = await supabaseAdmin
    .from('report_card_cache')
    .select('class_id, term, exam_type, academic_year, student_count')
    .eq('school_id', schoolId);

  const cacheMap = new Map<string, number>();
  if (existingCache) {
    for (const row of existingCache) {
      cacheMap.set(`${row.class_id}|${row.term}|${row.exam_type}|${row.academic_year}`, row.student_count || 0);
    }
  }

  const pendingCalcs = combos.filter(
    c => !cacheMap.has(`${c.classId}|${c.term}|${c.examType}|${c.academicYear}`),
  );

  if (pendingCalcs.length > 0) {
    console.log(`[ReportCardCache] ${schoolName} — ${pendingCalcs.length} classes need score calculation`);

    for (const combo of pendingCalcs) {
      // If a priority school was requested during a regular pass, yield to priority queue
      if (isNormalPass && schedulerState.priorityQueue.length > 0) {
        console.log(`[ReportCardCache] Yielding regular pass for ${schoolName} to higher priority school`);
        return;
      }

      const k = cacheKey(combo);
      if (inFlight.has(k)) {
        await sleep(BACKFILL_DELAY_MS);
        continue;
      }

      schedulerState.currentClassLabel = `Calculating: ${combo.className || 'Class'} (${combo.term} - ${combo.examType})`;
      try {
        await runPrecompute(combo);
      } catch (_) {
        // Don't abort for one failed class
      }
      await sleep(BACKFILL_DELAY_MS);
    }
  }

  // ─── STAGE 2: Compile Pre-Built PDFs ONE SCHOOL AT A TIME ─────────────────────
  // Re-fetch cache to get accurate student count for each class
  const { data: updatedCache } = await supabaseAdmin
    .from('report_card_cache')
    .select('class_id, term, exam_type, academic_year, student_count')
    .eq('school_id', schoolId);

  const updatedCacheMap = new Map<string, number>();
  if (updatedCache) {
    for (const row of updatedCache) {
      updatedCacheMap.set(`${row.class_id}|${row.term}|${row.exam_type}|${row.academic_year}`, row.student_count || 0);
    }
  }

  const readyPdfPaths = await listReadyClassPdfPaths(schoolId);

  // Find calculated classes with students that do not yet have a verified Storage object.
  const pendingPdfs = combos.filter(c => {
    const studentCount = updatedCacheMap.get(`${c.classId}|${c.term}|${c.examType}|${c.academicYear}`);
    if (!studentCount) return false;
    return !readyPdfPaths.has(getPdfStorageObjectPath({
      schoolId,
      classId: c.classId,
      term: c.term,
      examType: c.examType,
      academicYear: c.academicYear,
    }));
  });

  if (pendingPdfs.length > 0) {
    console.log(`[ReportCardCache] ${schoolName} — Compiling ${pendingPdfs.length} class PDFs sequentially (ONE SCHOOL AT A TIME)`);

    for (let i = 0; i < pendingPdfs.length; i++) {
      const combo = pendingPdfs[i];

      // If a priority school was requested during a regular background pass, yield
      if (isNormalPass && schedulerState.priorityQueue.length > 0) {
        console.log(`[ReportCardCache] Yielding regular PDF compilation for ${schoolName} to higher priority school`);
        return;
      }

      const classLabel = combo.className ? `${combo.className} (${combo.term})` : `${combo.term} - ${combo.examType}`;
      schedulerState.currentClassLabel = `Compiling PDF [${i + 1}/${pendingPdfs.length}]: ${classLabel}`;
      console.log(`[ReportCardCache] ${schoolName} — PDF [${i + 1}/${pendingPdfs.length}]: ${classLabel}`);

      try {
        await generateClassPdf({
          schoolId,
          classId: combo.classId,
          term: combo.term,
          examType: combo.examType,
          academicYear: combo.academicYear,
          className: combo.className,
        });
      } catch (pdfErr: any) {
        console.warn(`[ReportCardCache] PDF generation error for ${classLabel}:`, pdfErr.message);
      }

      await sleep(1000); // 1s cooldown between PDF compilations
    }

    console.log(`[ReportCardCache] ${schoolName} — Finished compiling all class PDFs ✓`);
  }

  const refreshedReadyPaths = await listReadyClassPdfPaths(schoolId);
  const hasPendingPdf = combos.some(c => {
    const count = updatedCacheMap.get(`${c.classId}|${c.term}|${c.examType}|${c.academicYear}`);
    return !!count && !refreshedReadyPaths.has(getPdfStorageObjectPath(c));
  });
  if (!hasPendingPdf) await dequeueSchoolPdfBuild(schoolId);
}

/**
 * Processes one durable unit of report-card work for a serverless cron run.
 * Supabase cache rows, Storage PDFs, and Storage queue markers survive between
 * invocations, so no in-memory scheduler state is required on Vercel.
 */
export async function processNextPendingReportCardJob(): Promise<{
  processed: boolean;
  action?: 'calculated' | 'pdf';
  schoolId?: string;
  schoolName?: string;
  classLabel?: string;
  message: string;
}> {
  const { data: schools, error } = await supabaseAdmin
    .from('schools')
    .select('id, name')
    .order('name');
  if (error) throw new Error(`Unable to load schools for PDF worker: ${error.message}`);
  if (!schools?.length) return { processed: false, message: 'No schools found.' };

  const queuedIds = await getQueuedPdfSchoolIds().catch(() => [] as string[]);
  const schoolById = new Map(schools.map((school: any) => [school.id, school]));
  const orderedSchools = [
    ...queuedIds.map(id => schoolById.get(id)).filter(Boolean),
    ...schools.filter((school: any) => !queuedIds.includes(school.id)),
  ] as { id: string; name: string }[];

  for (const school of orderedSchools) {
    const { combos } = await getSchoolCombos(school.id);
    if (combos.length === 0) {
      if (queuedIds.includes(school.id)) await dequeueSchoolPdfBuild(school.id);
      continue;
    }

    const { data: cacheRows, error: cacheError } = await supabaseAdmin
      .from('report_card_cache')
      .select('class_id, term, exam_type, academic_year, student_count')
      .eq('school_id', school.id);
    if (cacheError) throw new Error(`Unable to load report-card cache: ${cacheError.message}`);

    const cacheMap = new Map<string, number>();
    for (const row of cacheRows || []) {
      cacheMap.set(`${row.class_id}|${row.term}|${row.exam_type}|${row.academic_year}`, row.student_count || 0);
    }

    const missingCalculation = combos.find(combo =>
      !cacheMap.has(`${combo.classId}|${combo.term}|${combo.examType}|${combo.academicYear}`),
    );
    if (missingCalculation) {
      await runPrecompute(missingCalculation);
      return {
        processed: true,
        action: 'calculated',
        schoolId: school.id,
        schoolName: school.name,
        classLabel: `${missingCalculation.className} (${missingCalculation.term} - ${missingCalculation.examType})`,
        message: 'Calculated one missing report-card cache.',
      };
    }

    const readyPaths = await listReadyClassPdfPaths(school.id);
    const pendingPdfs = combos.filter(combo => {
      const count = cacheMap.get(`${combo.classId}|${combo.term}|${combo.examType}|${combo.academicYear}`);
      return !!count && !readyPaths.has(getPdfStorageObjectPath(combo));
    });

    if (pendingPdfs.length === 0) {
      if (queuedIds.includes(school.id)) await dequeueSchoolPdfBuild(school.id);
      continue;
    }

    const combo = pendingPdfs[0];
    const classLabel = `${combo.className} (${combo.term} - ${combo.examType})`;
    await generateClassPdf(combo);
    if (!(await isClassPdfReady(combo))) {
      throw new Error(`PDF upload verification failed for ${classLabel}.`);
    }
    if (pendingPdfs.length === 1 && queuedIds.includes(school.id)) {
      await dequeueSchoolPdfBuild(school.id);
    }
    return {
      processed: true,
      action: 'pdf',
      schoolId: school.id,
      schoolName: school.name,
      classLabel,
      message: 'Generated and stored one report-card PDF.',
    };
  }

  return { processed: false, message: 'All report-card calculations and PDFs are ready.' };
}

/**
 * System Admin manual trigger:
 * Forces a full system-wide precompute cycle across all schools and all submitted classes.
 */
export async function triggerFullSystemPrecompute() {
  // 1. Check if report_card_cache table exists and is accessible
  const { error: tableCheckError } = await supabaseAdmin
    .from('report_card_cache')
    .select('id')
    .limit(1);

  if (tableCheckError) {
    throw new Error(`Database table 'report_card_cache' is not ready: ${tableCheckError.message}. Please verify the SQL migration has been executed in Supabase.`);
  }

  // 2. Fetch all schools
  const { data: schools, error: schoolsError } = await supabaseAdmin
    .from('schools')
    .select('id, name')
    .order('name');

  if (schoolsError || !schools || schools.length === 0) {
    throw new Error(`No schools found: ${schoolsError?.message || 'Empty school list'}`);
  }

  // 3. Populate priority queue with all schools so they process immediately
  for (const s of schools) {
    if (!schedulerState.priorityQueue.includes(s.id)) {
      schedulerState.priorityQueue.push(s.id);
    }
  }

  // 4. Wake the scheduler immediately
  triggerSchedulerWake();

  return {
    success: true,
    message: `Triggered background calculation for ${schools.length} schools.`,
    totalSchools: schools.length,
    queuedSchools: schedulerState.priorityQueue.length,
    isCalculating: schedulerState.isCalculating,
    currentSchoolName: schedulerState.currentSchoolName,
    currentClassLabel: schedulerState.currentClassLabel,
  };
}

/**
 * System Admin summary:
 * Returns system-wide calculation stats (how many schools, classes cached, active worker status).
 */
export async function getSystemPrecomputeSummary() {
  try {
    const [{ count: cachedRows, error: cacheErr }, { count: totalSchools }] = await Promise.all([
      supabaseAdmin.from('report_card_cache').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('schools').select('*', { count: 'exact', head: true }),
    ]);

    return {
      tableReady: !cacheErr,
      cachedReportCardCount: cachedRows || 0,
      totalSchools: totalSchools || 0,
      isCalculating: schedulerState.isCalculating,
      currentSchoolName: schedulerState.currentSchoolName,
      currentClassLabel: schedulerState.currentClassLabel,
      queuedSchoolsCount: schedulerState.priorityQueue.length,
    };
  } catch (err: any) {
    return {
      tableReady: false,
      cachedReportCardCount: 0,
      totalSchools: 0,
      isCalculating: false,
      currentSchoolName: null,
      currentClassLabel: null,
      queuedSchoolsCount: 0,
      error: err.message,
    };
  }
}

/**
 * Retrieve details of the current scheduler queue, priority order, and all schools.
 */
export async function getSchedulerQueueInfo() {
  const currentSchoolId = schedulerState.currentSchoolId;
  const currentSchoolName = schedulerState.currentSchoolName;
  const priorityQueueIds = [...schedulerState.priorityQueue];

  const { data: allSchools } = await supabaseAdmin
    .from('schools')
    .select('id, name')
    .order('name');

  const schoolMap = new Map((allSchools || []).map((s: any) => [s.id, s.name]));

  const priorityQueue = priorityQueueIds.map((id, idx) => ({
    position: idx + 1,
    schoolId: id,
    schoolName: schoolMap.get(id) || 'School',
    isNext: idx === 0,
  }));

  const schools = (allSchools || []).map((s: any) => {
    const isCurrent = s.id === currentSchoolId;
    const priorityIndex = priorityQueueIds.indexOf(s.id);
    const isPrioritized = priorityIndex !== -1;
    return {
      id: s.id,
      name: s.name,
      isCurrent,
      isPrioritized,
      priorityPosition: isPrioritized ? priorityIndex + 1 : null,
      isNextPriority: priorityIndex === 0,
    };
  });

  return {
    currentSchoolId,
    currentSchoolName,
    currentClassLabel: schedulerState.currentClassLabel,
    isCalculating: schedulerState.isCalculating,
    priorityQueue,
    schools,
  };
}

/**
 * Real-time progress of the school currently being processed by the background calculation worker.
 */
export async function getActiveWorkerProgress() {
  const currentSchoolId = schedulerState.currentSchoolId;
  const currentSchoolName = schedulerState.currentSchoolName;
  const currentClassLabel = schedulerState.currentClassLabel;
  const isCalculating = schedulerState.isCalculating;
  const queuedSchoolsCount = schedulerState.priorityQueue.length;

  let activeSchoolStatus: any = null;
  if (currentSchoolId) {
    try {
      activeSchoolStatus = await getSchoolPrecomputeStatus(currentSchoolId, true);
    } catch (_) {
      // Fallback if status calculation encounters temporary read error
    }
  }

  const pdfWorker = getPdfWorkerState();
  const queueInfo = await getSchedulerQueueInfo();

  return {
    isCalculating,
    currentSchoolId,
    currentSchoolName,
    currentClassLabel,
    queuedSchoolsCount,
    activeSchoolStatus,
    isCompilingPdf: pdfWorker.isCompiling,
    activePdfSchoolId: pdfWorker.currentSchoolId,
    activePdfClassLabel: pdfWorker.currentClassLabel,
    priorityQueue: queueInfo.priorityQueue,
    schools: queueInfo.schools,
  };
}
