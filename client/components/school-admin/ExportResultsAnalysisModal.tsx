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
  schoolName: string;
  disabled?: boolean;
}

type ExportFormat = 'excel' | 'pdf' | 'csv';

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
  disabled 
}: ExportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('excel');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

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

  const exportToExcel = async (data: any) => {
    const { scales, analysis } = data;
    
    // Preparation for Ministry of Education Format
    // Row 1: Headers
    const headers = [
      "SUBJECTS", 
      "REG F", "REG M", "REG TOT",
      "WROTE F", "WROTE M", "WROTE TOT",
      "ABS F", "ABS M", "ABS TOT",
      ...scales.flatMap((s: any) => [`${s.grade} F`, `${s.grade} M`, `${s.grade} TOT`]),
      "PASS F", "PASS M", "PASS TOT",
      "% PASS F", "% PASS M", "% PASS TOT",
      "FAIL F", "FAIL M", "FAIL TOT",
      "% FAIL F", "% FAIL M", "% FAIL TOT"
    ];
    
    // Prepare Data Rows
    const rows = analysis.map((a: any) => [
      a.subjectName,
      a.reg.f, a.reg.m, a.reg.tot,
      a.wrote.f, a.wrote.m, a.wrote.tot,
      a.abs.f, a.abs.m, a.abs.tot,
      ...scales.flatMap((s: any) => [
        a.grades[s.grade]?.f || 0, 
        a.grades[s.grade]?.m || 0, 
        a.grades[s.grade]?.tot || 0
      ]),
      a.totalPasses.f, a.totalPasses.m, a.totalPasses.tot,
      a.percentagePass.f, a.percentagePass.m, a.percentagePass.tot,
      a.totalFails?.f || 0, a.totalFails?.m || 0, a.totalFails?.tot || 0,
      a.percentageFail?.f || 0, a.percentageFail?.m || 0, a.percentageFail?.tot || 0
    ]);

    // Create Workbook
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results Analysis");
    
    // Add Grading Scale Sheet
    const scaleHeaders = ["Grade", "Min %", "Max %", "Points", "Description"];
    const scaleRows = scales.map((s: any) => [
      s.grade, 
      s.min_percentage, 
      s.max_percentage, 
      s.points || "-", 
      s.description || "-"
    ]);
    const scaleSheet = XLSX.utils.aoa_to_sheet([scaleHeaders, ...scaleRows]);
    XLSX.utils.book_append_sheet(workbook, scaleSheet, "Grading Scale");

    // Save File
    const fileName = `Results_Analysis_${gradeLevel}_${classId !== 'all' ? className : ''}_${subjectName || 'All'}_${term}_${year}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportToPDF = async (data: any) => {
    const { scales, analysis } = data;
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
      doc.setFontSize(22);
      doc.text(schoolName.toUpperCase(), margin, 18);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text("OFFICIAL RESULTS ANALYSIS REPORT", margin, 25);
      
      // Meta Info Box
      doc.setFillColor(255, 255, 255, 0.2);
      doc.roundedRect(margin, 28, pageWidth - (margin * 2), 8, 1, 1, 'F');
      doc.setFontSize(8);
      const metaStr = `GRADE: ${gradeLevel} | CLASS: ${className || 'ALL'} | TERM: ${term} | YEAR: ${year} | ASSESSMENT: ${examType}`;
      doc.text(metaStr, margin + 4, 33.5);
    };

    addHeader(doc);

    // --- 2. EXECUTIVE SUMMARY ---
    const totalReg = analysis.reduce((sum: number, a: any) => sum + a.reg.tot, 0);
    const totalWrote = analysis.reduce((sum: number, a: any) => sum + a.wrote.tot, 0);
    const avgPassRate = analysis.length > 0 ? Math.round(analysis.reduce((sum: number, a: any) => sum + a.percentagePass.tot, 0) / analysis.length) : 0;
    const totalAbs = totalReg - totalWrote;

    let currentY = 50;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("Performance Overview", margin, currentY);
    
    currentY += 6;
    const cardWidth = (pageWidth - (margin * 2) - 10) / 2;
    const cardHeight = 20;

    const drawCard = (x: number, y: number, label: string, value: string, color: [number, number, number]) => {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'S');
      
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(label.toUpperCase(), x + 4, y + 7);
      
      doc.setFontSize(14);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(value, x + 4, y + 16);
    };

    drawCard(margin, currentY, "Total Registered", totalReg.toString(), [30, 41, 59]);
    drawCard(margin + cardWidth + 10, currentY, "Total Wrote", totalWrote.toString(), [79, 70, 229]);
    
    currentY += cardHeight + 5;
    drawCard(margin, currentY, "Avg Pass Rate", `${avgPassRate}%`, [16, 185, 129]);
    drawCard(margin + cardWidth + 10, currentY, "Total Absent", totalAbs.toString(), [239, 68, 68]);

    currentY += cardHeight + 10;

    // --- 3. RESULTS TABLE ---
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("Subject Breakdown", margin, currentY);

    const tableColumn = [
      "Subject", 
      "REG", "WRT", "ABS", 
      ...scales.map((s: any) => s.grade),
      "PASS", "%"
    ];
    
    const tableRows = analysis.map((a: any) => [
      a.subjectName,
      a.reg.tot,
      a.wrote.tot,
      a.abs.tot,
      ...scales.map((s: any) => a.grades[s.grade]?.tot || 0),
      a.totalPasses.tot,
      `${a.percentagePass.tot}%`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: currentY + 5,
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

    // --- 4. GRADING SCALE ---
    const finalY = (doc as any).lastAutoTable.finalY || currentY;
    if (finalY > 240) doc.addPage();
    
    const scaleY = finalY > 240 ? 20 : finalY + 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("Grading Scale Reference", margin, scaleY);

    autoTable(doc, {
      head: [["Grade", "Range", "Description"]],
      body: scales.map((s: any) => [
        s.grade, 
        `${s.min_percentage}% - ${s.max_percentage}%`, 
        s.description || "-"
      ]),
      startY: scaleY + 5,
      theme: 'plain',
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fontStyle: 'bold', textColor: [100, 116, 139] }
    });

    doc.save(`Results_Analysis_${gradeLevel}_${className || 'All'}_${term}_${year}.pdf`);
  };

  const exportToCSV = async (data: any) => {
    const { scales, analysis } = data;
    const headers = ["Subject", "REG", "WROTE", "ABS", ...scales.map((s: any) => s.grade), "Pass", "% Pass", "Fail", "% Fail"];
    const rows = analysis.map((a: any) => [
      `"${a.subjectName}"`,
      a.reg.tot,
      a.wrote.tot,
      a.abs.tot,
      ...scales.map((s: any) => a.grades[s.grade]?.tot || 0),
      a.totalPasses.tot,
      a.percentagePass.tot,
      a.totalFails?.tot || 0,
      a.percentageFail?.tot || 0
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(r => r.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Results_Analysis_${gradeLevel}_${classId !== 'all' ? className : ''}_${subjectName || 'All'}_${term}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
