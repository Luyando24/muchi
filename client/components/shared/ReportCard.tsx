
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

interface ReportCardProps {
  data: any;
  term: string;
  examType: string;
  academicYear: string;
  className?: string;
}

// ─── Senior Secondary Detection ───────────────────────────────────────────────
// Senior secondary = Form 1, Form 2 (Forms 1-6) AND Grades 10-12
function isSeniorSecondary(className: string): boolean {
  const raw = (className || '').toLowerCase().trim();
  // "form" keyword → secondary
  if (/\bform\b/.test(raw)) return true;
  // Grade 10, 11, 12
  const digitMatch = raw.match(/(?:grade|gr|g|std|standard|class|year)?\s*(\d{1,2})/);
  if (digitMatch) {
    const level = parseInt(digitMatch[1], 10);
    return level >= 8 && level <= 12;
  }
  return false;
}

// ─── Grade → Points conversion ────────────────────────────────────────────────
// Converts ECZ grade (string like "1", "One", "TWO", "3", etc.) → number point
// Lower point = better (ECZ: 1 = Distinction, 9 = Fail)
function gradeToPoints(grade: string): number | null {
  if (!grade || grade === '-' || grade === 'ABSENT' || grade === 'NOT RECORDED') return null;
  const g = grade.trim().toUpperCase();
  const wordMap: Record<string, number> = {
    ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
    SIX: 6, SEVEN: 7, EIGHT: 8, NINE: 9,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
    '6': 6, '7': 7, '8': 8, '9': 9,
  };
  return wordMap[g] ?? null;
}

// ─── Compulsory Subject Matching ──────────────────────────────────────────────
// Checks if a subject name matches the configured compulsory subject name.
// Special logic for English to match "English", "Eng", "English Language", etc.
function matchesCompulsorySubject(subjectName: string, configuredSubject: string): boolean {
  const normSub = subjectName.trim().toLowerCase();
  const normConfig = configuredSubject.trim().toLowerCase();
  
  if (!normSub || !normConfig) return false;
  
  // Intelligent English detection:
  const isConfigEnglish = /^(eng|english|english\s+language|english\s+lang)$/i.test(normConfig);
  if (isConfigEnglish) {
    return /\b(english|eng|english\s+language|english\s+lang)\b/i.test(normSub);
  }

  // Intelligent Special Paper 1 detection:
  const isConfigSpecial1 = /^(special\s*paper\s*(1|i\b)|sp\s*1|sp\s*i\b|sp\.\s*1|sp\.\s*paper\s*(1|i\b))$/i.test(normConfig);
  if (isConfigSpecial1) {
    return /\b(special\s*paper\s*(1|i\b)|sp\s*1|sp\s*i\b|sp\.\s*1|sp\.\s*paper\s*(1|i\b))\b/i.test(normSub);
  }

  // Intelligent Special Paper 2 detection:
  const isConfigSpecial2 = /^(special\s*paper\s*(2|ii\b)|sp\s*2|sp\s*ii\b|sp\.\s*2|sp\.\s*paper\s*(2|ii\b))$/i.test(normConfig);
  if (isConfigSpecial2) {
    return /\b(special\s*paper\s*(2|ii\b)|sp\s*2|sp\s*ii\b|sp\.\s*2|sp\.\s*paper\s*(2|ii\b))\b/i.test(normSub);
  }
  
  // Exact match
  if (normSub === normConfig) return true;
  
  // Word boundary check (e.g., config "Math" matches "Math 10" but not "Polymath")
  try {
    const escaped = normConfig.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(normSub)) return true;
  } catch (e) {}
  
  // Fallback to substring matching
  return normSub.includes(normConfig) || normConfig.includes(normSub);
}

// ─── Primary G5-7 Helpers ─────────────────────────────────────────────────────
function isPrimaryG57(className: string): boolean {
  const raw = (className || '').toLowerCase().trim();
  const digitMatch = raw.match(/(?:grade|gr|g|std|standard|class|year)?\s*(\d{1,2})/);
  if (digitMatch) {
    const level = parseInt(digitMatch[1], 10);
    return level >= 5 && level <= 7;
  }
  return false;
}

function isGrade7(className: string): boolean {
  const raw = (className || '').toLowerCase().trim();
  const digitMatch = raw.match(/(?:grade|gr|g|std|standard|class|year)?\s*(\d{1,2})/);
  if (digitMatch) {
    const level = parseInt(digitMatch[1], 10);
    return level === 7;
  }
  return false;
}

function computePrimaryMarks(grades: any[], className: string, compulsorySubjects?: string[]): {
  bestSubjects: { name: string; percentage: number; isCompulsory: boolean }[];
  totalMarks: number;
} | null {
  const isG7 = isGrade7(className);
  
  // Extract all valid grades with percentage scores
  const subjectMarks = grades.map(g => {
    const name = (g.subjects?.name || '').trim();
    const pct = (g.percentage !== null && g.percentage !== undefined) ? g.percentage : 0;
    return { name, percentage: pct };
  }).filter(s => s.name);

  if (subjectMarks.length === 0) return null;

  // Define compulsory subjects list
  const compulsoryConfig = (compulsorySubjects && compulsorySubjects.length > 0)
    ? compulsorySubjects
    : ['Special Paper 1', 'Special Paper 2'];

  const selected: { name: string; percentage: number; isCompulsory: boolean }[] = [];
  const handledIndices = new Set<number>();

  // If G7, force add compulsory subjects first
  if (isG7) {
    for (const compSub of compulsoryConfig) {
      const entry = subjectMarks.find(s => matchesCompulsorySubject(s.name, compSub));
      if (entry) {
        const idx = subjectMarks.indexOf(entry);
        if (!handledIndices.has(idx)) {
          selected.push({ ...entry, isCompulsory: true });
          handledIndices.add(idx);
        }
      }
    }
  }

  // Get remaining subjects sorted by percentage descending
  const remaining = subjectMarks
    .map((s, idx) => ({ ...s, idx }))
    .filter(s => !handledIndices.has(s.idx))
    .sort((a, b) => b.percentage - a.percentage);

  // Pick remaining best subjects to reach total best 6
  // (or all available if less than 6 total)
  for (const s of remaining) {
    if (selected.length >= 6) break;
    selected.push({ name: s.name, percentage: s.percentage, isCompulsory: false });
  }

  const totalMarks = selected.reduce((sum, s) => sum + s.percentage, 0);

  return {
    bestSubjects: selected,
    totalMarks
  };
}

// ─── Best-5 Points Calculator ─────────────────────────────────────────────────
interface SubjectPoints {
  displayName: string;
  subjectNames: string[]; // original subject name(s) involved
  points: number;
  isCombined?: boolean;   // true for Science (Phy+Chem)
}

function computeBestFivePoints(grades: any[], gradingScale: any[], compulsorySubjects?: string[]): {
  subjectPoints: SubjectPoints[];
  bestFive: SubjectPoints[];
  totalBestFivePoints: number;
  englishIncluded: boolean;
} {
  // Helper: get grade string from a grade entry
  const getGradeStr = (g: any): string => {
    if (!g) return '';
    return g.grade || '';
  };

  // Build a map: normalised subject name → grade entry
  const nameMap = new Map<string, any>();
  for (const g of grades) {
    const name = (g.subjects?.name || '').trim();
    if (!name) continue;
    const normalised = name.toLowerCase();
    // Keep the one with a real percentage (not absent)
    if (!nameMap.has(normalised) || (nameMap.get(normalised).percentage === null && g.percentage !== null)) {
      nameMap.set(normalised, g);
    }
  }

  // Identify Physics and Chemistry entries
  const physicsEntry = [...nameMap.entries()].find(([k]) => k.includes('physics'))?.[1];
  const chemEntry = [...nameMap.entries()].find(([k]) => k.includes('chem'))?.[1];

  // Build the final list of SubjectPoints
  const subjectPointsList: SubjectPoints[] = [];
  const handledKeys = new Set<string>();

  // --- Science: combine Physics + Chemistry ---
  if (physicsEntry || chemEntry) {
    const phyPoints = physicsEntry ? gradeToPoints(getGradeStr(physicsEntry)) : null;
    const chePoints = chemEntry ? gradeToPoints(getGradeStr(chemEntry)) : null;
    let sciPoints: number | null = null;
    if (phyPoints !== null && chePoints !== null) {
      sciPoints = (phyPoints + chePoints) / 2;
    } else if (phyPoints !== null) {
      sciPoints = phyPoints;
    } else if (chePoints !== null) {
      sciPoints = chePoints;
    }
    if (sciPoints !== null) {
      subjectPointsList.push({
        displayName: 'Science',
        subjectNames: [
          physicsEntry?.subjects?.name,
          chemEntry?.subjects?.name,
        ].filter(Boolean),
        points: sciPoints,
        isCombined: true,
      });
    }
    if (physicsEntry) handledKeys.add((physicsEntry.subjects?.name || '').toLowerCase());
    if (chemEntry) handledKeys.add((chemEntry.subjects?.name || '').toLowerCase());
  }

  // --- All other subjects ---
  for (const [key, g] of nameMap.entries()) {
    if (handledKeys.has(key)) continue;
    const pts = gradeToPoints(getGradeStr(g));
    if (pts !== null) {
      subjectPointsList.push({
        displayName: g.subjects?.name || key,
        subjectNames: [g.subjects?.name || key],
        points: pts,
      });
    }
  }

  // Define compulsory subjects list
  const compulsoryConfig = (compulsorySubjects && compulsorySubjects.length > 0)
    ? compulsorySubjects
    : ['English'];

  // Identify compulsory entries
  const compulsoryEntries: SubjectPoints[] = [];
  for (const compSub of compulsoryConfig) {
    const entry = subjectPointsList.find(s =>
      s.subjectNames.some(n => matchesCompulsorySubject(n, compSub))
    );
    if (entry) {
      compulsoryEntries.push(entry);
    }
  }

  // --- Select Best 5 (Compulsory subjects included first) ---
  const sorted = [...subjectPointsList].sort((a, b) => a.points - b.points); // lower = better

  const bestFive: SubjectPoints[] = [];
  // Add compulsory entries first
  for (const entry of compulsoryEntries) {
    if (bestFive.length >= 5) break;
    bestFive.push(entry);
  }

  // Add the remaining best subjects
  for (const s of sorted) {
    if (bestFive.length >= 5) break;
    if (bestFive.some(b => b.displayName === s.displayName)) continue;
    bestFive.push(s);
  }

  const totalBestFivePoints = bestFive.reduce((sum, s) => sum + Math.round(s.points), 0);

  return {
    subjectPoints: subjectPointsList,
    bestFive,
    totalBestFivePoints,
    englishIncluded: compulsoryEntries.length > 0,
  };
}

export const ReportCard = ({ data, term, examType, academicYear, className = "" }: ReportCardProps) => {
  const { student, grades, gradingScale, school } = data;

  // Calculate Metrics
  const totalPercentage = grades.reduce((sum: number, g: any) => sum + (g.percentage || 0), 0);
  const average = grades.length > 0 ? (totalPercentage / grades.length).toFixed(1) : 0;

  // Generate a deterministic verification string
  const rawData = `VERIFY|${student.studentNumber}|${student.name}|${term}|${examType}|${academicYear}|${average}|${school?.name || 'School'}`;
  const verificationUrl = `${window.location.origin}/verify/${btoa(encodeURIComponent(rawData))}`;

  // Senior secondary detection
  const isSeniorSec = isSeniorSecondary(student.class || '');

  // Compute points only for senior secondary
  const pointsData = isSeniorSec ? computeBestFivePoints(grades, gradingScale, school?.compulsory_subjects_secondary) : null;

  // Primary G5-7 detection
  const isG57 = isPrimaryG57(student.class || '');

  // Compute marks for G5-7
  const primaryMarksData = isG57 ? computePrimaryMarks(grades, student.class || '', school?.compulsory_subjects_primary) : null;

  // Build a display name map for Physics/Chemistry → Science
  // Maps original subject id → display name override
  const subjectDisplayOverride = new Map<string, string>();
  if (isSeniorSec) {
    for (const g of grades) {
      const name = (g.subjects?.name || '').toLowerCase();
      if (name.includes('physics') || name.includes('chem')) {
        subjectDisplayOverride.set(g.subject_id, 'Science');
      }
    }
  }

  return (
    <div className={`relative flex flex-col bg-white overflow-hidden print:overflow-hidden print:w-[210mm] print:h-[297mm] mx-auto my-8 print:my-0 shadow-2xl print:shadow-none rounded-3xl print:rounded-none ${className}`}>
      <style type="text/css" media="print">
        {`
          @page { size: A4; margin: 0; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        `}
      </style>

      {/* Decorative Background Flourish (Watermark Style) */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none print:hidden" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-50/30 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none print:hidden" />

      {/* Global Watermark */}
      {school?.logo_url && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0 overflow-hidden">
          <img src={school.logo_url} alt="" className="w-[80%] object-contain grayscale" />
        </div>
      )}

      {/* Document Content */}
      <div className="relative z-10 flex-1 flex flex-col p-12 print:p-6 print:pt-4 space-y-8 print:space-y-2 h-full justify-between">

        {/* Minimal Header Section */}
        <div className="flex justify-between items-start pb-8 print:pb-2">
          {/* Left Side: School Logo */}
          <div className="w-24">
            {school?.logo_url ? (
              <div className="h-24 w-24 bg-white rounded-full shadow-sm border border-slate-100 p-4 flex items-center justify-center text-slate-400">
                <img src={school.logo_url} alt="School Logo" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div className="h-24 w-24 bg-white rounded-full shadow-sm border border-slate-100 p-4 flex items-center justify-center">
                <img src="/images/arakan-logo.png" alt="Logo" className="max-h-full max-w-full object-contain" />
              </div>
            )}
          </div>

          {/* Center: School Name, Term, Year, Address */}
          <div className="flex-1 flex flex-col items-center text-center px-4 space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">{school?.name || 'MUCHI ACADEMY'}</h1>
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-900">
              <span>{term} - {examType}</span>
              <span className="text-slate-300">&bull;</span>
              <span>Academic Year {academicYear}</span>
            </div>
            <div className="text-sm font-medium text-slate-500 flex flex-col items-center gap-1 mt-1">
              {school?.address && <p>{school.address}</p>}
              <div className="flex gap-4 text-slate-400 text-xs tracking-wider">
                {school?.email && <p className="lowercase">{school.email}</p>}
                {school?.phone && <p>{school.phone}</p>}
              </div>
            </div>
          </div>

          {/* Right Side: Coat of Arms */}
          <div className="w-24 flex justify-end">
            {school?.coat_of_arms_url && (
              <div className="h-24 w-24 bg-white rounded-full shadow-sm border border-slate-100 p-4 flex items-center justify-center text-slate-400">
                <img src={school.coat_of_arms_url} alt="Coat of Arms" className="max-h-full max-w-full object-contain" />
              </div>
            )}
          </div>
        </div>

        {/* Minimal Student Information */}
        <div className="flex justify-between items-end pb-4 print:pb-2 border-b border-slate-100">
          <div className="space-y-4 print:space-y-1">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Student Name</p>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{student.name}</h2>
            </div>
          </div>
          <div className="text-right space-y-4 print:space-y-1">
            <div className="flex gap-8 justify-end">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 print:mb-0">Student ID</p>
                <p className="text-sm font-bold text-slate-700 font-mono">{student.studentNumber}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 print:mb-0">Class</p>
                <p className="text-sm font-bold text-slate-700">{student.class}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grades Analysis Section */}
        <div className="flex-1 print:flex-none min-h-0 space-y-6 print:space-y-2 my-6 print:my-2">
          {/* ECZ-Style Results Slip Section */}
          <div className="flex-1 print:flex-none min-h-0 space-y-4 print:space-y-2 relative">
            <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-4 print:mb-2 print:pb-2">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Academic Results</h3>
              <span className="text-xs font-mono text-slate-400">{Math.floor(1000000 + Math.random() * 9000000)}</span>
            </div>

            <div className="relative isolate">
              <div className="overflow-hidden print:overflow-visible">
                <Table>
                  <TableHeader className="border-b border-slate-900">
                    <TableRow className="hover:bg-transparent border-none h-12">
                      <TableHead className="w-[40%] text-xs font-bold text-slate-900 uppercase tracking-widest pl-0">Subject</TableHead>
                      <TableHead className="w-[20%] text-xs font-bold text-slate-900 uppercase tracking-widest text-center">Score %</TableHead>
                      <TableHead className="w-[20%] text-xs font-bold text-slate-900 uppercase tracking-widest text-center">Grade</TableHead>
                      <TableHead className="w-[20%] text-xs font-bold text-slate-900 uppercase tracking-widest text-right pr-0">Standard</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const getStandardFromScale = (percentage: any) => {
                        const isAbsent = percentage === null || percentage === undefined || percentage === '';
                        if (isAbsent) return { grade: 'ABSENT', standard: 'NOT RECORDED' };

                        const score = Number(percentage);
                        
                        if (gradingScale && gradingScale.length > 0) {
                          const sortedScale = [...gradingScale].sort((a: any, b: any) => b.min_percentage - a.min_percentage);
                          for (const scale of sortedScale) {
                            if (score >= scale.min_percentage) {
                              return { grade: scale.grade, standard: scale.description.toUpperCase() };
                            }
                          }
                          return { grade: 'F', standard: 'FAIL' };
                        }

                        // Fallback to ECZ-style
                        if (score >= 75) return { grade: 'ONE', standard: 'DISTINCTION' };
                        if (score >= 70) return { grade: 'TWO', standard: 'DISTINCTION' };
                        if (score >= 65) return { grade: 'THREE', standard: 'MERIT' };
                        if (score >= 60) return { grade: 'FOUR', standard: 'MERIT' };
                        if (score >= 55) return { grade: 'FIVE', standard: 'CREDIT' };
                        if (score >= 50) return { grade: 'SIX', standard: 'CREDIT' };
                        if (score >= 45) return { grade: 'SEVEN', standard: 'PASS' };
                        if (score >= 40) return { grade: 'EIGHT', standard: 'PASS' };
                        return { grade: 'NINE', standard: 'FAIL' };
                      };

                      // For senior secondary, group Physics+Chemistry together as "Science"
                      // Build display rows — merge Physics+Chemistry into one Science row
                      type DisplayRow = {
                        key: string;
                        displayName: string;
                        percentage: number | null;
                        gradeStr: string;
                        points: number | null;
                        isAbsent: boolean;
                        isCombined?: boolean;
                        combinedNote?: string;
                      };

                      const displayRows: DisplayRow[] = [];
                      const scienceHandled = new Set<string>();

                      if (isSeniorSec) {
                        // Find Physics and Chemistry
                        const physGrade = grades.find((g: any) =>
                          (g.subjects?.name || '').toLowerCase().includes('physics')
                        );
                        const chemGrade = grades.find((g: any) =>
                          (g.subjects?.name || '').toLowerCase().includes('chem')
                        );

                        // If either exists, emit one Science row
                        if (physGrade || chemGrade) {
                          if (physGrade) scienceHandled.add(physGrade.subject_id || physGrade.id);
                          if (chemGrade) scienceHandled.add(chemGrade.subject_id || chemGrade.id);

                          const phyPts = physGrade ? gradeToPoints(getStandardFromScale(physGrade.percentage).grade) : null;
                          const chePts = chemGrade ? gradeToPoints(getStandardFromScale(chemGrade.percentage).grade) : null;
                          let sciPts: number | null = null;
                          if (phyPts !== null && chePts !== null) sciPts = (phyPts + chePts) / 2;
                          else if (phyPts !== null) sciPts = phyPts;
                          else if (chePts !== null) sciPts = chePts;

                          // Use lower (better) percentage for display
                          const phyPct = physGrade?.percentage ?? null;
                          const chePct = chemGrade?.percentage ?? null;
                          const combinedPct = phyPct !== null && chePct !== null
                            ? ((Number(phyPct) + Number(chePct)) / 2)
                            : (phyPct ?? chePct);

                          const sciAbsent = combinedPct === null;
                          const sciGradeStr = sciAbsent ? 'ABSENT' : getStandardFromScale(combinedPct).grade;

                          displayRows.push({
                            key: 'science-combined',
                            displayName: 'Science',
                            percentage: combinedPct !== null ? parseFloat(combinedPct.toFixed(1)) : null,
                            gradeStr: sciGradeStr,
                            points: sciPts !== null ? parseFloat(sciPts.toFixed(1)) : null,
                            isAbsent: sciAbsent,
                            isCombined: true,
                            combinedNote: [physGrade?.subjects?.name, chemGrade?.subjects?.name].filter(Boolean).join(' + '),
                          });
                        }
                      }

                      // All other subjects
                      for (const g of grades) {
                        const gKey = g.subject_id || g.id;
                        if (isSeniorSec && scienceHandled.has(gKey)) continue;

                        const isAbsent = g.percentage === null || g.percentage === undefined || g.percentage === '' || g.grade === 'ABSENT';
                        const stdData = getStandardFromScale(g.percentage);
                        const pts = isSeniorSec ? gradeToPoints(stdData.grade) : null;

                        displayRows.push({
                          key: gKey || `row-${displayRows.length}`,
                          displayName: g.subjects?.name || 'Unknown Subject',
                          percentage: isAbsent ? null : g.percentage,
                          gradeStr: stdData.grade,
                          points: pts,
                          isAbsent,
                        });
                      }

                      const subjectsRecorded = displayRows.filter(r => !r.isAbsent).length;
                      const subjectsPassed = displayRows.filter(r => {
                        if (r.isAbsent) return false;
                        const std = getStandardFromScale(r.percentage).standard;
                        return !['FAIL', 'ABSENT', 'NOT RECORDED', 'UNKNOWN', 'UNSATISFACTORY'].includes(std.toUpperCase());
                      }).length;

                      return (
                        <>
                          {displayRows.length > 0 ? (
                            displayRows.map((row) => (
                              <TableRow
                                key={row.key}
                                className="border-b border-slate-100 last:border-0 hover:bg-transparent h-10 print:h-8"
                              >
                                <TableCell className="py-1 pl-0 font-bold text-slate-700">
                                  <div className="flex flex-col">
                                    <span className="uppercase tracking-tight text-sm print:text-[11px]">
                                      {row.displayName}
                                    </span>
                                    {row.isCombined && row.combinedNote && (
                                      <span className="text-[9px] print:text-[8px] text-slate-400 font-normal italic">
                                        ({row.combinedNote})
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-1 px-4 text-center font-bold text-slate-700 text-sm print:text-[11px]">
                                  {row.isAbsent ? '-' : `${row.percentage}%`}
                                </TableCell>
                                <TableCell className="py-1 px-4 text-center font-black text-slate-900 text-lg print:text-sm">
                                  {row.gradeStr}
                                </TableCell>
                                <TableCell className="py-1 pr-0 text-right font-bold text-slate-500 text-[10px] print:text-[9px] uppercase tracking-widest">
                                  {row.isAbsent ? (
                                    <span className="text-slate-300 italic font-medium">
                                      {getStandardFromScale(null).standard}
                                    </span>
                                  ) : (
                                    getStandardFromScale(row.percentage).standard
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-16">
                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                  <p className="text-sm font-medium">No academic records found</p>
                                  <p className="text-xs opacity-70">Grades for this term have not been published yet.</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          {displayRows.length > 0 && (
                            <TableRow className="border-t border-slate-900 mt-8 print:mt-4 block">
                              <TableCell colSpan={4} className="p-4 print:p-2 pl-0">
                                <div className="flex justify-between items-center text-xs font-bold text-slate-900 uppercase tracking-widest gap-4">
                                  <div>RECORDED: {subjectsRecorded}</div>
                                  {school?.school_type === 'Basic' && (
                                    <div className="bg-slate-900 text-white px-3 py-1 rounded-sm">TOTAL MARKS: {totalPercentage}</div>
                                  )}
                                  <div>PASSED: {subjectsPassed}</div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>



        {/* Summary Analytics */}
        <div className="grid grid-cols-12 gap-6 print:gap-4 print:space-y-0 relative">
          <div className="col-span-8 print:col-span-8 flex flex-col gap-4">
            <div className="flex-1 py-4 print:py-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 print:mb-1">
                Class Insights
              </h4>
              <p className="text-sm leading-relaxed text-slate-600 font-medium italic border-l-2 border-slate-300 pl-4">
                 Position {student.position || '-'} out of {student.totalStudents || '-'} students. Class Average: {student.classAverage ? student.classAverage.toFixed(1) : '-'}%.
              </p>
              {/* Best-5 Points — Senior Secondary only */}
              {isSeniorSec && pointsData && pointsData.bestFive.length > 0 && (() => {
                const compulsoryConfig = school?.compulsory_subjects && school.compulsory_subjects.length > 0
                  ? school.compulsory_subjects
                  : ['English'];
                return (
                  <div className="mt-3 print:mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-l-2 border-slate-900 pl-4">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                      Best 5 Points:
                    </span>
                    {pointsData.bestFive.map((s, idx) => (
                      <span key={idx} className="text-[10px] font-bold text-slate-700">
                        {s.displayName}
                        {s.isCombined ? <span className="font-normal text-slate-400"> (avg)</span> : null}
                        {' '}<span className="font-black text-slate-900">{Number.isInteger(s.points) ? s.points : s.points.toFixed(1)}</span>
                        {compulsoryConfig.some(comp => s.subjectNames.some(n => n.toLowerCase().includes(comp.toLowerCase()))) ? <span className="text-indigo-500">★</span> : null}
                        {idx < pointsData.bestFive.length - 1 ? <span className="text-slate-300 mx-1">|</span> : null}
                      </span>
                    ))}
                    <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-sm ml-1">
                      TOTAL: {pointsData.totalBestFivePoints}
                    </span>
                    {pointsData.englishIncluded && (
                      <span className="text-[9px] text-indigo-500 font-bold">★ {compulsoryConfig.join(', ')} compulsory</span>
                    )}
                  </div>
                );
              })()}

              {/* Best-6 Marks — G5-7 only */}
              {isG57 && primaryMarksData && primaryMarksData.bestSubjects.length > 0 && (
                <div className="mt-3 print:mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-l-2 border-emerald-600 pl-4">
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                    Best 6 Subjects Marks:
                  </span>
                  {primaryMarksData.bestSubjects.map((s, idx) => (
                    <span key={idx} className="text-[10px] font-bold text-slate-700">
                      {s.name}
                      {' '}<span className="font-black text-slate-900">{s.percentage}%</span>
                      {s.isCompulsory ? <span className="text-emerald-600">★</span> : null}
                      {idx < primaryMarksData.bestSubjects.length - 1 ? <span className="text-slate-300 mx-1">|</span> : null}
                    </span>
                  ))}
                  <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-sm ml-1">
                    TOTAL MARKS: {primaryMarksData.totalMarks} / 600
                  </span>
                  {isGrade7(student.class || '') && (
                    <span className="text-[9px] text-emerald-600 font-bold">★ Special Paper 1 & 2 compulsory</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-4 print:col-span-4 space-y-4 print:space-y-2 pt-4 print:pt-2">
            <div className="flex flex-col items-end text-right">
              {school?.seal_url && (
                 <div className="mb-2 print:mb-1 absolute right-0 -top-12 print:-top-16 z-0">
                    <img src={school.seal_url} alt="Seal" className="h-28 w-28 print:h-28 print:w-28 object-contain opacity-80 mix-blend-multiply" />
                 </div>
              )}
              <div className="flex justify-end items-center mb-2 print:mb-1 gap-4 mt-8 print:mt-6 relative z-10">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white/90 dark:bg-slate-950/90 px-1 rounded shadow-sm">Attendance</span>
                <span className="text-sm font-bold text-slate-900 bg-white/90 dark:bg-slate-950/90 px-1 rounded shadow-sm">100%</span>
              </div>
              <div className="h-1 w-32 bg-slate-100 rounded-full overflow-hidden relative z-10 shadow-sm">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Grade Teacher's Remark Box - Hidden per request
        <div className="w-full py-4 print:py-2 border-t border-slate-100 mt-2">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 print:mb-1">
            Grade Teacher's Remark
          </h4>
          <p className="text-sm leading-relaxed text-slate-800 font-medium font-serif italic border-l-2 border-slate-900 pl-4">
            "{(() => {
              if (!grades || grades.length === 0) return "Academic data unavailable for this period.";
              
              const firstName = student.name.split(' ')[0];
              const gender = student.gender?.toLowerCase() || '';
              const subjPronoun = gender === 'male' ? 'He' : (gender === 'female' ? 'She' : 'They');
              const objPronoun = gender === 'male' ? 'him' : (gender === 'female' ? 'her' : 'them');
              const possAdj = gender === 'male' ? 'his' : (gender === 'female' ? 'her' : 'their');
              const shows = gender === 'male' || gender === 'female' ? 'shows' : 'show';
              
              const avg = parseFloat(average as string);
              const validGrades = grades.filter((g: any) => g.percentage !== null && g.percentage !== undefined && g.percentage !== '' && g.grade !== 'ABSENT');
              
              const position = student.position || 0;
              const totalStudents = student.totalStudents || 0;
              const classAvg = student.classAverage || 0;
              const percentile = (position > 0 && totalStudents > 0) ? (position / totalStudents) * 100 : 0;
              
              const isTopRank = percentile > 0 && percentile <= 25;
              const isBottomRank = percentile >= 75;
              const isPassing = avg >= 50;
              const isExcellent = avg >= 75;
              
              let opening = "";
              if (position > 0 && totalStudents > 0) {
                if (isExcellent) {
                  if (isTopRank) {
                    opening = `${firstName} has demonstrated an outstanding grasp of the curriculum, ranking ${position} out of ${totalStudents} and setting a high benchmark for the class.`;
                  } else {
                    opening = `${firstName} has achieved excellent individual results (${avg}%), maintaining high academic standards within a highly competitive cohort.`;
                  }
                } else if (isPassing) {
                  if (isTopRank) {
                    opening = `${firstName} secured a commendable position of ${position} out of ${totalStudents}. While this relative standing is strong, pushing for higher absolute scores will unlock ${possAdj} full potential.`;
                  } else if (!isBottomRank) {
                    if (avg >= classAvg) {
                      opening = `${firstName} has shown satisfactory progress, performing slightly above the class average of ${classAvg.toFixed(1)}%. Continuous effort will help elevate ${possAdj} overall grade.`;
                    } else {
                      opening = `${firstName} has maintained a passing grade but fell slightly below the class average. A more focused approach during lessons would yield better results.`;
                    }
                  } else {
                    opening = `${firstName} managed to pass overall, but ranking ${position} out of ${totalStudents} suggests they are finding the competitive pace challenging. More active participation is encouraged.`;
                  }
                } else {
                  if (isTopRank) {
                    opening = `Although ${firstName} ranks ${position} out of ${totalStudents}, the overall score of ${avg}% indicates significant challenges with this term's material. A much stronger academic focus is needed.`;
                  } else {
                    opening = `${firstName} has struggled significantly this term, placing below the class average with ${avg}%. Urgent attention to study habits and seeking extra help is highly recommended.`;
                  }
                }
              } else {
                if (isExcellent) opening = `${firstName} has demonstrated an excellent grasp of the curriculum this term, standing out as a highly dedicated student.`;
                else if (avg >= 60) opening = `${firstName} is a very capable student who actively participates and maintains a good standard of work.`;
                else if (isPassing) opening = `${firstName} has shown steady progress this term, though a more focused approach would yield better results.`;
                else opening = `${firstName} has found the term's concepts challenging. An urgent review of study habits is necessary.`;
              }

              let advice = "";
              const strongSubjectsCount = validGrades.filter((g: any) => (g.percentage || 0) >= 70).length;
              const totalSubjects = validGrades.length;
              
              if (strongSubjectsCount >= totalSubjects * 0.7 && totalSubjects > 0) {
                advice = `Consistency across most subjects is a major strength. `;
              } else if (strongSubjectsCount > 0) {
                advice = `${subjPronoun} ${shows} promising capability in ${possAdj} stronger subjects, which should be used as motivation to improve weaker areas. `;
              } else {
                advice = `We need to work on building foundational understanding across all core subjects. `;
              }

              if (avg < classAvg && avg >= 50) {
                advice += `To improve ${possAdj} class standing, ${firstName} should focus on daily revision and completing all assignments promptly.`;
              } else if (avg < 50) {
                advice += `Attending remedial sessions and asking more questions during class will be crucial steps toward recovery.`;
              } else if (isExcellent) {
                advice += `Maintaining this level of intellectual curiosity will serve ${objPronoun} very well in the future.`;
              } else {
                advice += `Staying organized and maintaining current study routines will ensure continued success.`;
              }

              return [opening, advice].filter(Boolean).join(" ");
            })()}"
          </p>
        </div>
        */}

        {/* Head Teacher's Remark Box - Full Width */}
        <div className="w-full py-4 print:py-2 border-t border-slate-100 mt-2">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 print:mb-1">
            Head Teacher's Remark
          </h4>
          <p className="text-sm leading-relaxed text-slate-800 font-medium font-serif italic border-l-2 border-slate-900 pl-4">
            "{(() => {
              if (!grades || grades.length === 0) return "Academic data unavailable for this period.";
              
              const firstName = student.name.split(' ')[0];
              const gender = student.gender?.toLowerCase() || '';
              const subjPronoun = gender === 'male' ? 'He' : (gender === 'female' ? 'She' : 'They');
              const possAdj = gender === 'male' ? 'his' : (gender === 'female' ? 'her' : 'their');
              const shows = gender === 'male' || gender === 'female' ? 'shows' : 'show';
              
              const avg = parseFloat(average as string);
              const validGrades = grades.filter((g: any) => g.percentage !== null && g.percentage !== undefined && g.percentage !== '' && g.grade !== 'ABSENT');
              
              const sortedGrades = [...validGrades].sort((a: any, b: any) => (b.percentage || 0) - (a.percentage || 0));
              const bestSubjects = sortedGrades.slice(0, 3).map((g: any) => g.subjects?.name);
              const weakSubjects = sortedGrades.slice(-3).filter((g: any) => (g.percentage || 0) < 50).map((g: any) => g.subjects?.name);
              
              let opening = "";
              if (avg >= 75) opening = `${student.name} has produced an outstanding set of results this term, demonstrating exceptional academic maturity and diligence.`;
              else if (avg >= 65) opening = `${student.name} has achieved a very good standard of performance, showing consistent effort across most subjects.`;
              else if (avg >= 55) opening = `${student.name} has performed satisfactorily, though there is room for greater consistency in ${possAdj} application.`;
              else if (avg >= 45) opening = `${student.name} has made a fair attempt this term, but will need to significantly increase ${possAdj} study hours to reach ${possAdj} full potential.`;
              else opening = `${student.name}'s performance is below the expected standard. An urgent review of study habits and class engagement is recommended.`;

              let strengths = "";
              if (bestSubjects.length > 0) {
                const subjectText = bestSubjects.join(', ').replace(/, ([^,]*)$/, ' and $1');
                if (avg >= 65) strengths = `Particular aptitude is noted in ${subjectText}, where ${firstName} displays keen insight and mastery.`;
                else strengths = `${firstName} ${shows} encouraging promise in ${subjectText}, which should serve as a motivation for other areas.`;
              }

              let improvements = "";
              if (weakSubjects.length > 0) {
                const weakText = weakSubjects.join(', ').replace(/, ([^,]*)$/, ' and $1');
                improvements = `However, urgent attention is required in ${weakText} to prevent these subjects from pulling down the overall grade.`;
              } else if (weakSubjects.length === 0 && bestSubjects.length > 0 && bestSubjects.length !== sortedGrades.length) {
                 improvements = `Performance across all subjects was generally consistent.`;
              }

              return [opening, strengths, improvements].filter(Boolean).join(" ");
            })()}"
          </p>
        </div>

        {/* Minimal Footer / Authenticity Section */}
        <div className="pt-4 print:pt-2 mt-auto">
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-2 print:space-y-1">
              <div className="h-16 print:h-12 flex items-end">
                {school?.signature_url ? (
                  <img src={school.signature_url} alt="Signature" className="max-h-16 print:max-h-12 object-contain" />
                ) : (
                  <div className="w-full border-b border-slate-300"></div>
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-end gap-2 mt-1 border-b border-slate-800 w-fit pb-0.5">
                  <span className="text-sm font-serif font-semibold text-slate-900 border-b border-slate-900 pb-0.5 inline-block min-w-[80px]">
                    {school?.headteacher_name || ""}
                  </span>
                  {school?.headteacher_name && (
                     <span className="text-sm font-serif text-slate-800">,</span>
                  )}
                  <span className="text-sm font-serif italic text-slate-700">
                    {school?.headteacher_title || ""}
                  </span>
                </div>
                <p className="text-[12px] font-black text-slate-900 uppercase tracking-widest mt-1">
                  HEADTEACHER
                </p>
              </div>
            </div>
            
            <div className="flex flex-col justify-end items-end pb-1 gap-2">
              <QRCodeSVG value={verificationUrl} size={64} className="opacity-80" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Official Document</p>
            </div>
          </div>

          <div className="flex justify-between items-end mt-8 print:mt-4 pt-4 border-t border-slate-100 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            <p>® {new Date().getFullYear()} {school?.name}</p>
            <p>Generated by MUCHI LMS on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
