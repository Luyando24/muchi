import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Table as TableIcon, 
  Calendar, 
  BookOpen, 
  GraduationCap,
  Loader2,
  CheckCircle2,
  Users
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { syncFetch } from '@/lib/syncService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils";

interface ExportModalProps {
  term: string;
  year: string;
  examType: string;
  gradeLevel: string;
  classId: string;
  className?: string;
  subjectId?: string;
  subjectName?: string;
  schoolName?: string;
  genderComposition?: string;
  disabled?: boolean;
}

type ExportFormat = 'excel' | 'pdf' | 'csv';

export const SECONDARY_EQUIVALENTS: Record<string, string> = {
  'ONE': '1', 'TWO': '2', 'THREE': '3', 'FOUR': '4', 'FIVE': '5',
  'SIX': '6', 'SEVEN': '7', 'EIGHT': '8', 'NINE': '9',
  '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four', '5': 'Five',
  '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine',
};

export const getGradeCounts = (a: any, grade: string) => {
  if (a.grades && a.grades[grade]) return a.grades[grade];
  const upper = String(grade || '').toUpperCase().trim();
  if (upper && a.grades && a.grades[upper]) return a.grades[upper];
  const alt = SECONDARY_EQUIVALENTS[upper];
  if (alt && a.grades && a.grades[alt]) return a.grades[alt];
  for (const k of Object.keys(a.grades || {})) {
    if (k.toUpperCase().trim() === upper) return a.grades[k];
  }
  return { f: 0, m: 0, tot: 0 };
};

export const getUniqueScales = (scales: any[]) => {
  return (scales || []).filter((s: any, idx: number, arr: any[]) => {
    const g = String(s?.grade || '').trim().toUpperCase();
    if (!g) return false;
    return arr.findIndex((x: any) => String(x?.grade || '').trim().toUpperCase() === g) === idx;
  });
};

export function classifyGrade(grade: string, description?: string): string {
  const g = String(grade || '').toUpperCase().trim();
  const desc = String(description || '').toLowerCase().trim();

  // Preschool checks
  if (desc.includes('excelling') || g === 'EXCELLING') return 'Excelling';
  if (desc.includes('achieving') || g === 'ACHIEVING') return 'Achieving';
  if (desc.includes('developing') || g === 'DEVELOPING') return 'Developing';
  if (desc.includes('emerging') || g === 'EMERGING') return 'Emerging';

  // Standard classifications
  if (desc.includes('distinction') || desc.includes('excellent') || ['1', '2', 'ONE', 'TWO', 'A+', 'A', 'A RED'].includes(g)) {
    return 'Distinction';
  }
  if (desc.includes('merit') || desc.includes('very good') || ['3', '4', 'THREE', 'FOUR', 'B+', 'B ORANGE'].includes(g)) {
    return 'Merit';
  }
  if (desc.includes('credit') || (desc.includes('good') && !desc.includes('very good')) || ['5', '6', 'FIVE', 'SIX', 'B', 'C YELLOW'].includes(g)) {
    return 'Credit';
  }
  if (desc.includes('unsatisfactory') || desc.includes('fail') || desc.includes('average below') || ['9', 'NINE', 'U9', 'U', 'F', 'E', 'D BLUE'].includes(g)) {
    return 'Fail';
  }
  if ((desc.includes('satisfactory') && !desc.includes('unsatisfactory')) || desc.includes('pass') || ['7', '8', 'SEVEN', 'EIGHT', 'C+', 'C', 'D'].includes(g)) {
    return 'Pass';
  }

  if (description && description.trim()) return description.trim();
  return g || 'Other';
}

export interface GrandTotals {
  reg: { f: number; m: number; tot: number };
  wrote: { f: number; m: number; tot: number };
  abs: { f: number; m: number; tot: number };
  grades: Record<string, { f: number; m: number; tot: number }>;
  totalPasses: { f: number; m: number; tot: number };
  percentagePass: { f: number; m: number; tot: number };
  totalFails: { f: number; m: number; tot: number };
  percentageFail: { f: number; m: number; tot: number };
  totalGradesAwarded: number;
}

export interface ClassificationGroup {
  name: string;
  grades: string[];
  f: number;
  m: number;
  tot: number;
  percentage: number;
}

export interface SpecificGradeSummary {
  grade: string;
  description: string;
  classification: string;
  min_percentage?: number;
  max_percentage?: number;
  f: number;
  m: number;
  tot: number;
  percentage: number;
}

export function computeResultsAnalysisTotals(analysis: any[], scales: any[]) {
  const uniqueScales = getUniqueScales(scales);

  const totals: GrandTotals = {
    reg: { f: 0, m: 0, tot: 0 },
    wrote: { f: 0, m: 0, tot: 0 },
    abs: { f: 0, m: 0, tot: 0 },
    grades: {},
    totalPasses: { f: 0, m: 0, tot: 0 },
    percentagePass: { f: 0, m: 0, tot: 0 },
    totalFails: { f: 0, m: 0, tot: 0 },
    percentageFail: { f: 0, m: 0, tot: 0 },
    totalGradesAwarded: 0
  };

  uniqueScales.forEach((s: any) => {
    totals.grades[s.grade] = { f: 0, m: 0, tot: 0 };
  });

  (analysis || []).forEach((a: any) => {
    totals.reg.f += a.reg?.f || 0;
    totals.reg.m += a.reg?.m || 0;
    totals.reg.tot += a.reg?.tot || 0;

    totals.wrote.f += a.wrote?.f || 0;
    totals.wrote.m += a.wrote?.m || 0;
    totals.wrote.tot += a.wrote?.tot || 0;

    totals.abs.f += a.abs?.f || 0;
    totals.abs.m += a.abs?.m || 0;
    totals.abs.tot += a.abs?.tot || 0;

    totals.totalPasses.f += a.totalPasses?.f || 0;
    totals.totalPasses.m += a.totalPasses?.m || 0;
    totals.totalPasses.tot += a.totalPasses?.tot || 0;

    totals.totalFails.f += a.totalFails?.f || 0;
    totals.totalFails.m += a.totalFails?.m || 0;
    totals.totalFails.tot += a.totalFails?.tot || 0;

    uniqueScales.forEach((s: any) => {
      const gc = getGradeCounts(a, s.grade);
      if (!totals.grades[s.grade]) {
        totals.grades[s.grade] = { f: 0, m: 0, tot: 0 };
      }
      totals.grades[s.grade].f += gc.f || 0;
      totals.grades[s.grade].m += gc.m || 0;
      totals.grades[s.grade].tot += gc.tot || 0;
      totals.totalGradesAwarded += gc.tot || 0;
    });
  });

  totals.percentagePass.tot = totals.wrote.tot > 0 ? Math.round((totals.totalPasses.tot / totals.wrote.tot) * 100) : 0;
  totals.percentagePass.f = totals.wrote.f > 0 ? Math.round((totals.totalPasses.f / totals.wrote.f) * 100) : 0;
  totals.percentagePass.m = totals.wrote.m > 0 ? Math.round((totals.totalPasses.m / totals.wrote.m) * 100) : 0;

  totals.percentageFail.tot = totals.wrote.tot > 0 ? Math.round((totals.totalFails.tot / totals.wrote.tot) * 100) : 0;
  totals.percentageFail.f = totals.wrote.f > 0 ? Math.round((totals.totalFails.f / totals.wrote.f) * 100) : 0;
  totals.percentageFail.m = totals.wrote.m > 0 ? Math.round((totals.totalFails.m / totals.wrote.m) * 100) : 0;

  const specificGrades: SpecificGradeSummary[] = uniqueScales.map((s: any) => {
    const counts = totals.grades[s.grade] || { f: 0, m: 0, tot: 0 };
    const classification = classifyGrade(s.grade, s.description);
    return {
      grade: s.grade,
      description: s.description || classification,
      classification,
      min_percentage: s.min_percentage,
      max_percentage: s.max_percentage,
      f: counts.f,
      m: counts.m,
      tot: counts.tot,
      percentage: totals.totalGradesAwarded > 0 
        ? Math.round((counts.tot / totals.totalGradesAwarded) * 1000) / 10 
        : 0
    };
  });

  const classificationMap = new Map<string, { grades: string[]; f: number; m: number; tot: number }>();
  const standardOrder = ['Distinction', 'Merit', 'Credit', 'Pass', 'Fail', 'Excelling', 'Achieving', 'Developing', 'Emerging'];

  specificGrades.forEach(sg => {
    const cls = sg.classification;
    if (!classificationMap.has(cls)) {
      classificationMap.set(cls, { grades: [], f: 0, m: 0, tot: 0 });
    }
    const group = classificationMap.get(cls)!;
    if (!group.grades.includes(sg.grade)) {
      group.grades.push(sg.grade);
    }
    group.f += sg.f;
    group.m += sg.m;
    group.tot += sg.tot;
  });

  const classifications: ClassificationGroup[] = Array.from(classificationMap.entries())
    .map(([name, data]) => ({
      name,
      grades: data.grades,
      f: data.f,
      m: data.m,
      tot: data.tot,
      percentage: totals.totalGradesAwarded > 0 
        ? Math.round((data.tot / totals.totalGradesAwarded) * 1000) / 10 
        : 0
    }))
    .sort((a, b) => {
      const idxA = standardOrder.indexOf(a.name);
      const idxB = standardOrder.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });

  return {
    totals,
    classifications,
    specificGrades,
    uniqueScales
  };
}

export const getGenderFlags = (data: any, genderCompositionProp?: string, schoolNameProp?: string) => {
  const gc = data?.genderComposition || genderCompositionProp;
  const isBoysOnly = gc === 'Boys only' || 
    /\bboys\b/i.test(schoolNameProp || '') ||
    (data?.analysis?.length > 0 && data.analysis.every((a: any) => (a.reg?.f || 0) === 0 && (a.wrote?.f || 0) === 0 && ((a.reg?.m || 0) > 0 || (a.reg?.tot || 0) > 0)));

  const isGirlsOnly = gc === 'Girls only' || 
    /\bgirls\b/i.test(schoolNameProp || '') ||
    (data?.analysis?.length > 0 && data.analysis.every((a: any) => (a.reg?.m || 0) === 0 && (a.wrote?.m || 0) === 0 && ((a.reg?.f || 0) > 0 || (a.reg?.tot || 0) > 0)));

  return {
    isBoysOnly,
    isGirlsOnly,
    showFemale: !isBoysOnly,
    showMale: !isGirlsOnly
  };
};

export default function ExportResultsAnalysisModal({ 
  term, 
  year, 
  examType, 
  gradeLevel,
  classId,
  className,
  subjectId,
  subjectName,
  schoolName,
  genderComposition,
  disabled 
}: ExportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('excel');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const exportToExcel = async (data: any) => {
    const { scales, analysis } = data;
    const { totals, classifications, specificGrades, uniqueScales } = computeResultsAnalysisTotals(analysis, scales);
    const { showFemale, showMale } = getGenderFlags(data, genderComposition, schoolName);
    
    // Preparation for Ministry of Education Format
    // Row 1: Headers
    const headers = [
      "SUBJECTS", 
      ...(showFemale ? ["REG F"] : []),
      ...(showMale ? ["REG M"] : []),
      "REG TOT",
      ...(showFemale ? ["WROTE F"] : []),
      ...(showMale ? ["WROTE M"] : []),
      "WROTE TOT",
      ...(showFemale ? ["ABS F"] : []),
      ...(showMale ? ["ABS M"] : []),
      "ABS TOT",
      ...uniqueScales.flatMap((s: any) => [
        ...(showFemale ? [`${s.grade} F`] : []),
        ...(showMale ? [`${s.grade} M`] : []),
        `${s.grade} TOT`
      ]),
      ...(showFemale ? ["PASS F"] : []),
      ...(showMale ? ["PASS M"] : []),
      "PASS TOT",
      ...(showFemale ? ["% PASS F"] : []),
      ...(showMale ? ["% PASS M"] : []),
      "% PASS TOT",
      ...(showFemale ? ["FAIL F"] : []),
      ...(showMale ? ["FAIL M"] : []),
      "FAIL TOT",
      ...(showFemale ? ["% FAIL F"] : []),
      ...(showMale ? ["% FAIL M"] : []),
      "% FAIL TOT"
    ];
    
    // Prepare Data Rows
    const rows = analysis.map((a: any) => [
      a.subjectName,
      ...(showFemale ? [a.reg.f] : []),
      ...(showMale ? [a.reg.m] : []),
      a.reg.tot,
      ...(showFemale ? [a.wrote.f] : []),
      ...(showMale ? [a.wrote.m] : []),
      a.wrote.tot,
      ...(showFemale ? [a.abs.f] : []),
      ...(showMale ? [a.abs.m] : []),
      a.abs.tot,
      ...uniqueScales.flatMap((s: any) => {
        const gc = getGradeCounts(a, s.grade);
        return [
          ...(showFemale ? [gc.f || 0] : []),
          ...(showMale ? [gc.m || 0] : []),
          gc.tot || 0
        ];
      }),
      ...(showFemale ? [a.totalPasses.f] : []),
      ...(showMale ? [a.totalPasses.m] : []),
      a.totalPasses.tot,
      ...(showFemale ? [a.percentagePass.f] : []),
      ...(showMale ? [a.percentagePass.m] : []),
      a.percentagePass.tot,
      ...(showFemale ? [a.totalFails?.f || 0] : []),
      ...(showMale ? [a.totalFails?.m || 0] : []),
      a.totalFails?.tot || 0,
      ...(showFemale ? [a.percentageFail?.f || 0] : []),
      ...(showMale ? [a.percentageFail?.m || 0] : []),
      a.percentageFail?.tot || 0
    ]);

    // Grand Total Row
    const totalRow = [
      "TOTAL",
      ...(showFemale ? [totals.reg.f] : []),
      ...(showMale ? [totals.reg.m] : []),
      totals.reg.tot,
      ...(showFemale ? [totals.wrote.f] : []),
      ...(showMale ? [totals.wrote.m] : []),
      totals.wrote.tot,
      ...(showFemale ? [totals.abs.f] : []),
      ...(showMale ? [totals.abs.m] : []),
      totals.abs.tot,
      ...uniqueScales.flatMap((s: any) => [
        ...(showFemale ? [totals.grades[s.grade]?.f || 0] : []),
        ...(showMale ? [totals.grades[s.grade]?.m || 0] : []),
        totals.grades[s.grade]?.tot || 0
      ]),
      ...(showFemale ? [totals.totalPasses.f] : []),
      ...(showMale ? [totals.totalPasses.m] : []),
      totals.totalPasses.tot,
      ...(showFemale ? [`${totals.percentagePass.f}%`] : []),
      ...(showMale ? [`${totals.percentagePass.m}%`] : []),
      `${totals.percentagePass.tot}%`,
      ...(showFemale ? [totals.totalFails.f] : []),
      ...(showMale ? [totals.totalFails.m] : []),
      totals.totalFails.tot,
      ...(showFemale ? [`${totals.percentageFail.f}%`] : []),
      ...(showMale ? [`${totals.percentageFail.m}%`] : []),
      `${totals.percentageFail.tot}%`
    ];

    // Summary Section appended below the subject table
    const summaryRows = [
      [],
      ["GRADE CLASSIFICATION SUMMARY (e.g. Distinctions, Merits, Credits)"],
      [
        "Classification",
        "Grades Included",
        ...(showFemale ? ["Female (F)"] : []),
        ...(showMale ? ["Male (M)"] : []),
        "Total Count",
        "% of Total Grades Awarded"
      ],
      ...classifications.map(c => [
        c.name,
        c.grades.join(", "),
        ...(showFemale ? [c.f] : []),
        ...(showMale ? [c.m] : []),
        c.tot,
        `${c.percentage}%`
      ]),
      [],
      ["DETAILED SPECIFIC GRADE BREAKDOWN"],
      [
        "Grade",
        "Classification",
        "Description",
        "Score Range",
        ...(showFemale ? ["Female (F)"] : []),
        ...(showMale ? ["Male (M)"] : []),
        "Total Students Awarded",
        "% Share"
      ],
      ...specificGrades.map(sg => [
        sg.grade,
        sg.classification,
        sg.description,
        `${sg.min_percentage}% - ${sg.max_percentage}%`,
        ...(showFemale ? [sg.f] : []),
        ...(showMale ? [sg.m] : []),
        sg.tot,
        `${sg.percentage}%`
      ])
    ];

    // Create Workbook
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows, totalRow, ...summaryRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results Analysis");
    
    // Add Dedicated Performance Summary Sheet
    const perfSummarySheet = XLSX.utils.aoa_to_sheet([
      ["RESULTS PERFORMANCE SUMMARY"],
      [`School: ${schoolName || data?.schoolName || 'School'} | Grade: ${gradeLevel || 'All'} | Class: ${className || 'All'} | Term: ${term || ''} ${year || ''} | Assessment: ${examType || ''}`],
      [],
      ["OVERALL KEY METRICS"],
      ["Metric", "Value"],
      ["Total Subject Registrations", totals.reg.tot],
      ["Total Exams Written", totals.wrote.tot],
      ["Total Absentees", totals.abs.tot],
      ["Overall Pass Rate", `${totals.percentagePass.tot}%`],
      ["Total Passes", totals.totalPasses.tot],
      ["Total Fails", totals.totalFails.tot],
      [],
      ["PERFORMANCE CLASSIFICATION SUMMARY"],
      [
        "Classification",
        "Grades Included",
        ...(showFemale ? ["Female (F)"] : []),
        ...(showMale ? ["Male (M)"] : []),
        "Total Count",
        "% Share"
      ],
      ...classifications.map(c => [
        c.name,
        c.grades.join(", "),
        ...(showFemale ? [c.f] : []),
        ...(showMale ? [c.m] : []),
        c.tot,
        `${c.percentage}%`
      ]),
      [],
      ["DETAILED SPECIFIC GRADE BREAKDOWN"],
      [
        "Grade",
        "Classification",
        "Description",
        "Score Range",
        ...(showFemale ? ["Female (F)"] : []),
        ...(showMale ? ["Male (M)"] : []),
        "Total Students Awarded",
        "% Share"
      ],
      ...specificGrades.map(sg => [
        sg.grade,
        sg.classification,
        sg.description,
        `${sg.min_percentage}% - ${sg.max_percentage}%`,
        ...(showFemale ? [sg.f] : []),
        ...(showMale ? [sg.m] : []),
        sg.tot,
        `${sg.percentage}%`
      ])
    ]);
    XLSX.utils.book_append_sheet(workbook, perfSummarySheet, "Performance Summary");

    // Add Grading Scale Sheet with Total Counts
    const scaleHeaders = [
      "Grade", 
      "Min %", 
      "Max %", 
      "Points", 
      "Classification",
      "Description",
      ...(showFemale ? ["Total Female (F)"] : []),
      ...(showMale ? ["Total Male (M)"] : []),
      "Total Awarded",
      "% Share"
    ];
    const scaleRows = uniqueScales.map((s: any) => {
      const counts = totals.grades[s.grade] || { f: 0, m: 0, tot: 0 };
      const pct = totals.totalGradesAwarded > 0 
        ? Math.round((counts.tot / totals.totalGradesAwarded) * 1000) / 10 
        : 0;
      return [
        s.grade, 
        s.min_percentage, 
        s.max_percentage, 
        s.points || "-", 
        classifyGrade(s.grade, s.description),
        s.description || "-",
        ...(showFemale ? [counts.f] : []),
        ...(showMale ? [counts.m] : []),
        counts.tot,
        `${pct}%`
      ];
    });
    const scaleSheet = XLSX.utils.aoa_to_sheet([scaleHeaders, ...scaleRows]);
    XLSX.utils.book_append_sheet(workbook, scaleSheet, "Grading Scale");

    // Save File
    const fileName = `Results_Analysis_${gradeLevel || 'All'}_${classId !== 'all' ? (className || '') : ''}_${subjectName || 'All'}_${term || ''}_${year || ''}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportToPDF = async (data: any) => {
    const { scales, analysis } = data;
    const { totals, classifications, specificGrades, uniqueScales } = computeResultsAnalysisTotals(analysis, scales);
    const { isBoysOnly, isGirlsOnly, showFemale, showMale } = getGenderFlags(data, genderComposition, schoolName);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;
    
    // --- 1. HEADER SECTION ---
    const addHeader = (doc: any) => {
      // School Name Banner
      doc.setFillColor(79, 70, 229); // Indigo 600
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(20);
      const displaySchoolName = String(schoolName || data?.schoolName || 'OFFICIAL REPORT').toUpperCase();
      doc.text(displaySchoolName, margin, 18);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text("OFFICIAL RESULTS ANALYSIS REPORT", margin, 25);
      
      // Meta Info Box
      doc.setFillColor(255, 255, 255, 0.2);
      doc.roundedRect(margin, 28, pageWidth - (margin * 2), 8, 1, 1, 'F');
      doc.setFontSize(8);
      const genderTag = isBoysOnly ? ' | ENROLLMENT: BOYS ONLY' : isGirlsOnly ? ' | ENROLLMENT: GIRLS ONLY' : '';
      const metaStr = `GRADE: ${gradeLevel || 'ALL'} | CLASS: ${className || 'ALL'} | TERM: ${term || ''} | YEAR: ${year || ''} | ASSESSMENT: ${examType || ''}${genderTag}`;
      doc.text(metaStr, margin + 4, 33.5);
    };

    addHeader(doc);

    // --- 2. EXECUTIVE SUMMARY ---
    let currentY = 48;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("Executive Performance Overview", margin, currentY);
    
    currentY += 5;
    const cardWidth = (pageWidth - (margin * 2) - 10) / 2;
    const cardHeight = 16;

    const drawCard = (x: number, y: number, label: string, value: string, color: [number, number, number]) => {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, 'S');
      
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(String(label || '').toUpperCase(), x + 4, y + 5.5);
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(String(value ?? ''), x + 4, y + 12.5);
    };

    drawCard(margin, currentY, "Total Registered", totals.reg.tot.toString(), [30, 41, 59]);
    drawCard(margin + cardWidth + 10, currentY, "Total Exams Written", totals.wrote.tot.toString(), [79, 70, 229]);
    
    currentY += cardHeight + 4;
    drawCard(margin, currentY, "Overall Pass Rate", `${totals.percentagePass.tot}%`, [16, 185, 129]);
    drawCard(margin + cardWidth + 10, currentY, "Total Absent", totals.abs.tot.toString(), [239, 68, 68]);

    currentY += cardHeight + 6;

    // Classification summary stat cards (e.g. 56 Distinctions, 85 Merits, 110 Credits)
    if (classifications.length > 0) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text("Grade Classification Totals Across Class", margin, currentY);
      currentY += 4;

      const numCols = Math.min(classifications.length, 5);
      const gap = 3;
      const bWidth = (pageWidth - (margin * 2) - ((numCols - 1) * gap)) / numCols;
      const bHeight = 16;

      const categoryStyles: Record<string, { bg: [number, number, number]; border: [number, number, number]; text: [number, number, number] }> = {
        'Distinction': { bg: [236, 253, 245], border: [167, 243, 208], text: [5, 150, 105] },
        'Merit': { bg: [239, 246, 255], border: [191, 219, 254], text: [37, 99, 235] },
        'Credit': { bg: [238, 242, 255], border: [199, 210, 254], text: [79, 70, 229] },
        'Pass': { bg: [254, 243, 199], border: [253, 230, 138], text: [180, 83, 9] },
        'Fail': { bg: [255, 241, 242], border: [254, 205, 211], text: [225, 29, 72] },
      };

      classifications.slice(0, 5).forEach((c, idx) => {
        const bx = margin + (idx * (bWidth + gap));
        const style = categoryStyles[c.name] || { bg: [248, 250, 252], border: [226, 232, 240], text: [71, 85, 105] };
        
        doc.setFillColor(style.bg[0], style.bg[1], style.bg[2]);
        doc.roundedRect(bx, currentY, bWidth, bHeight, 1.5, 1.5, 'F');
        doc.setDrawColor(style.border[0], style.border[1], style.border[2]);
        doc.roundedRect(bx, currentY, bWidth, bHeight, 1.5, 1.5, 'S');

        doc.setFontSize(6.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(style.text[0], style.text[1], style.text[2]);
        const titleStr = `${c.name.toUpperCase()} (${c.grades.join(', ')})`;
        doc.text(titleStr, bx + 3, currentY + 5.5);

        doc.setFontSize(11);
        doc.text(`${c.tot}`, bx + 3, currentY + 11);

        doc.setFontSize(6);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`${c.percentage}% of total`, bx + 3, currentY + 14.5);
      });

      currentY += bHeight + 7;
    }

    // --- 3. RESULTS TABLE ---
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("Subject Breakdown & Totals", margin, currentY);

    const tableColumn = [
      "Subject", 
      "REG", "WRT", "ABS", 
      ...uniqueScales.map((s: any) => s.grade),
      "PASS", "%"
    ];
    
    const tableRows = analysis.map((a: any) => [
      a.subjectName,
      a.reg.tot,
      a.wrote.tot,
      a.abs.tot,
      ...uniqueScales.map((s: any) => getGradeCounts(a, s.grade).tot || 0),
      a.totalPasses.tot,
      `${a.percentagePass.tot}%`
    ]);

    const tableFootRow = [
      "TOTAL",
      totals.reg.tot,
      totals.wrote.tot,
      totals.abs.tot,
      ...uniqueScales.map((s: any) => totals.grades[s.grade]?.tot || 0),
      totals.totalPasses.tot,
      `${totals.percentagePass.tot}%`
    ];

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      foot: [tableFootRow],
      startY: currentY + 4,
      theme: 'grid',
      styles: { 
        fontSize: 7, 
        cellPadding: 1.5,
        halign: 'center',
        textColor: [51, 65, 85]
      },
      headStyles: { 
        fillColor: [51, 65, 85], 
        textColor: 255, 
        fontStyle: 'bold',
        fontSize: 7
      },
      footStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold' },
        [tableColumn.length - 1]: { fontStyle: 'bold', textColor: [16, 185, 129] }
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      didDrawPage: (data) => {
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`MUCHI LMS - Results Analysis • Page ${data.pageNumber}`, margin, pageHeight - 10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 30, pageHeight - 10);
      },
    });

    // --- 4. CLASSIFICATION & GRADING SCALE SUMMARY ---
    let finalY = (doc as any).lastAutoTable.finalY || currentY;
    if (finalY > 225) {
      doc.addPage();
      finalY = 20;
    } else {
      finalY += 10;
    }

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("Grade Classification & Distribution Summary", margin, finalY);

    const summaryColHeaders = [
      "Classification",
      "Grades",
      ...(showFemale ? ["F"] : []),
      ...(showMale ? ["M"] : []),
      "Total Count",
      "% Share"
    ];

    const summaryBody = classifications.map(c => [
      c.name,
      c.grades.join(", "),
      ...(showFemale ? [c.f] : []),
      ...(showMale ? [c.m] : []),
      c.tot,
      `${c.percentage}%`
    ]);

    autoTable(doc, {
      head: [summaryColHeaders],
      body: summaryBody,
      startY: finalY + 4,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, halign: 'center' },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left' }
      }
    });

    let scaleFinalY = (doc as any).lastAutoTable.finalY || finalY;
    if (scaleFinalY > 235) {
      doc.addPage();
      scaleFinalY = 20;
    } else {
      scaleFinalY += 8;
    }

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("Grading Scale Reference", margin, scaleFinalY);

    autoTable(doc, {
      head: [["Grade", "Score Range", "Classification", "Description", ...(showFemale ? ["F"] : []), ...(showMale ? ["M"] : []), "Total Awarded", "%"]],
      body: specificGrades.map(sg => [
        sg.grade, 
        `${sg.min_percentage}% - ${sg.max_percentage}%`, 
        sg.classification,
        sg.description,
        ...(showFemale ? [sg.f] : []),
        ...(showMale ? [sg.m] : []),
        sg.tot,
        `${sg.percentage}%`
      ]),
      startY: scaleFinalY + 4,
      theme: 'plain',
      styles: { fontSize: 7, cellPadding: 1.2, halign: 'center' },
      headStyles: { fontStyle: 'bold', textColor: [100, 116, 139], halign: 'center' },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left' },
        3: { halign: 'left' }
      }
    });

    doc.save(`Results_Analysis_${gradeLevel || 'All'}_${className || 'All'}_${term || ''}_${year || ''}.pdf`);
  };

  const exportToCSV = async (data: any) => {
    const { scales, analysis } = data;
    const { totals, classifications, specificGrades, uniqueScales } = computeResultsAnalysisTotals(analysis, scales);
    const { showFemale, showMale } = getGenderFlags(data, genderComposition, schoolName);

    const headers = [
      "Subject", 
      ...(showFemale ? ["REG F"] : []),
      ...(showMale ? ["REG M"] : []),
      "REG TOT",
      ...(showFemale ? ["WROTE F"] : []),
      ...(showMale ? ["WROTE M"] : []),
      "WROTE TOT",
      ...(showFemale ? ["ABS F"] : []),
      ...(showMale ? ["ABS M"] : []),
      "ABS TOT",
      ...uniqueScales.map((s: any) => s.grade),
      ...(showFemale ? ["Pass F"] : []),
      ...(showMale ? ["Pass M"] : []),
      "Pass TOT",
      "% Pass",
      ...(showFemale ? ["Fail F"] : []),
      ...(showMale ? ["Fail M"] : []),
      "Fail TOT",
      "% Fail"
    ];

    const rows = analysis.map((a: any) => [
      `"${a.subjectName}"`,
      ...(showFemale ? [a.reg.f] : []),
      ...(showMale ? [a.reg.m] : []),
      a.reg.tot,
      ...(showFemale ? [a.wrote.f] : []),
      ...(showMale ? [a.wrote.m] : []),
      a.wrote.tot,
      ...(showFemale ? [a.abs.f] : []),
      ...(showMale ? [a.abs.m] : []),
      a.abs.tot,
      ...uniqueScales.map((s: any) => getGradeCounts(a, s.grade).tot || 0),
      ...(showFemale ? [a.totalPasses.f] : []),
      ...(showMale ? [a.totalPasses.m] : []),
      a.totalPasses.tot,
      a.percentagePass.tot,
      ...(showFemale ? [a.totalFails?.f || 0] : []),
      ...(showMale ? [a.totalFails?.m || 0] : []),
      a.totalFails?.tot || 0,
      a.percentageFail?.tot || 0
    ]);

    const totalRow = [
      `"TOTAL"`,
      ...(showFemale ? [totals.reg.f] : []),
      ...(showMale ? [totals.reg.m] : []),
      totals.reg.tot,
      ...(showFemale ? [totals.wrote.f] : []),
      ...(showMale ? [totals.wrote.m] : []),
      totals.wrote.tot,
      ...(showFemale ? [totals.abs.f] : []),
      ...(showMale ? [totals.abs.m] : []),
      totals.abs.tot,
      ...uniqueScales.map((s: any) => totals.grades[s.grade]?.tot || 0),
      ...(showFemale ? [totals.totalPasses.f] : []),
      ...(showMale ? [totals.totalPasses.m] : []),
      totals.totalPasses.tot,
      `${totals.percentagePass.tot}%`,
      ...(showFemale ? [totals.totalFails?.f || 0] : []),
      ...(showMale ? [totals.totalFails?.m || 0] : []),
      totals.totalFails?.tot || 0,
      `${totals.percentageFail?.tot || 0}%`
    ];

    const summarySection = [
      "",
      `"--- GRADE CLASSIFICATION SUMMARY (e.g. Distinctions, Merits, Credits) ---"`,
      [
        "Classification",
        "Grades Included",
        ...(showFemale ? ["Female (F)"] : []),
        ...(showMale ? ["Male (M)"] : []),
        "Total Count",
        "% Share"
      ].map(h => `"${h}"`).join(","),
      ...classifications.map(c => [
        `"${c.name}"`,
        `"${c.grades.join(', ')}"`,
        ...(showFemale ? [c.f] : []),
        ...(showMale ? [c.m] : []),
        c.tot,
        `"${c.percentage}%"`
      ].join(",")),
      "",
      `"--- DETAILED SPECIFIC GRADE BREAKDOWN ---"`,
      [
        "Grade",
        "Classification",
        "Description",
        "Score Range",
        ...(showFemale ? ["Female (F)"] : []),
        ...(showMale ? ["Male (M)"] : []),
        "Total Students Awarded",
        "% Share"
      ].map(h => `"${h}"`).join(","),
      ...specificGrades.map(sg => [
        `"${sg.grade}"`,
        `"${sg.classification}"`,
        `"${sg.description}"`,
        `"${sg.min_percentage}% - ${sg.max_percentage}%"`,
        ...(showFemale ? [sg.f] : []),
        ...(showMale ? [sg.m] : []),
        sg.tot,
        `"${sg.percentage}%"`
      ].join(","))
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(r => r.join(",")).join("\n") + "\n"
      + totalRow.join(",") + "\n"
      + summarySection.join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Results_Analysis_${gradeLevel || 'All'}_${classId !== 'all' ? (className || '') : ''}_${subjectName || 'All'}_${term || ''}_${year || ''}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const queryParams = new URLSearchParams({
        term,
        academic_year: year,
        examType,
        gradeLevel,
        classId,
        subjectId: subjectId || "all",
        export: "true"
      });

      const res = await syncFetch(`/api/school/reports/results-analysis?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cacheKey: `export-analysis-${term}-${year}-${examType}-${gradeLevel}-${classId}-${subjectId}`
      });

      if (!res.analysis || res.analysis.length === 0) {
        throw new Error("No analysis data found to export.");
      }

      if (selectedFormat === 'excel') await exportToExcel(res);
      else if (selectedFormat === 'pdf') await exportToPDF(res);
      else if (selectedFormat === 'csv') await exportToCSV(res);

      toast({
        title: "Export Successful",
        description: `Your ${selectedFormat.toUpperCase()} file has been generated.`,
      });
      setIsOpen(false);
    } catch (error: any) {
      console.error("Export Error:", error);
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full md:w-auto bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white border-none shadow-md"
          disabled={disabled}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Analysis
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] bg-white dark:bg-slate-950 p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">Download Results Analysis</DialogTitle>
          <DialogDescription className="text-slate-500">
            Generate an official results analysis report for the Ministry of Education.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm">
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Target Grade</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{gradeLevel || 'All Grades'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm">
                <Calendar className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Academic Period</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{term} {year}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm">
                <BookOpen className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Assessment</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{examType}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm">
                <BookOpen className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Target Subject</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{subjectName || 'All Subjects'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedFormat('excel')}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 group",
                selectedFormat === 'excel' 
                  ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10" 
                  : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
              )}
            >
              <div className={cn(
                "p-3 rounded-full transition-colors",
                selectedFormat === 'excel' ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-600"
              )}>
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <span className={cn(
                "text-xs font-bold",
                selectedFormat === 'excel' ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500"
              )}>Excel (Full)</span>
            </button>

            <button
              onClick={() => setSelectedFormat('pdf')}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 group",
                selectedFormat === 'pdf' 
                  ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10" 
                  : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
              )}
            >
              <div className={cn(
                "p-3 rounded-full transition-colors",
                selectedFormat === 'pdf' ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-600"
              )}>
                <FileText className="h-6 w-6" />
              </div>
              <span className={cn(
                "text-xs font-bold",
                selectedFormat === 'pdf' ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500"
              )}>Official PDF</span>
            </button>

            <button
              onClick={() => setSelectedFormat('csv')}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 group",
                selectedFormat === 'csv' 
                  ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10" 
                  : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
              )}
            >
              <div className={cn(
                "p-3 rounded-full transition-colors",
                selectedFormat === 'csv' ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-600"
              )}>
                <TableIcon className="h-6 w-6" />
              </div>
              <span className={cn(
                "text-xs font-bold",
                selectedFormat === 'csv' ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500"
              )}>Raw CSV</span>
            </button>
          </div>
        </div>

        <DialogFooter className="p-6 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800">
          <Button 
            variant="ghost" 
            onClick={() => setIsOpen(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isGenerating}
            className="px-8 bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_4px_10px_rgba(16,185,129,0.3)] transition-all active:scale-95"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                Confirm & Download
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
