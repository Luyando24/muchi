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
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' }); // A3 for wide report
    
    const tableColumn = [
      "Subject", 
      "REG", "WROTE", "ABS", 
      ...scales.map((s: any) => s.grade),
      "PASS", "% PASS", "FAIL", "% FAIL"
    ];
    
    const tableRows = analysis.map((a: any) => [
      a.subjectName,
      a.reg.tot,
      a.wrote.tot,
      a.abs.tot,
      ...scales.map((s: any) => a.grades[s.grade]?.tot || 0),
      a.totalPasses.tot,
      `${a.percentagePass.tot}%`,
      a.totalFails?.tot || 0,
      `${a.percentageFail?.tot || 0}%`
    ]);

    const addHeader = (doc: any) => {
      doc.setFont(undefined, 'bold');
      doc.setFontSize(24);
      doc.setTextColor(40);
      doc.text(schoolName || "RESULTS ANALYSIS REPORT", 14, 20);
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(12);
      doc.setTextColor(100);
      const metaStr = `Grade: ${gradeLevel} | Class: ${className || 'All'} | Subject: ${subjectName || 'All'} | Term: ${term} | Year: ${year} | Assessment: ${examType}`;
      doc.text(metaStr, 14, 28);
      doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 34);
      
      doc.setLineWidth(0.5);
      doc.line(14, 40, doc.internal.pageSize.width - 14, 40);
    };

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      styles: { 
        fontSize: 10, 
        cellPadding: 3,
        halign: 'center'
      },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 60, halign: 'left', fontStyle: 'bold' },
      },
      didDrawPage: (data) => {
        if (data.pageNumber === 1) addHeader(doc);
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text("MUCHI LMS - Official Results Analysis Report", 14, pageHeight - 10);
        doc.text(`Page ${data.pageNumber}`, doc.internal.pageSize.width - 25, pageHeight - 10);
      },
    });

    doc.save(`Results_Analysis_${gradeLevel}_${classId !== 'all' ? className : ''}_${subjectName || 'All'}_${term}_${year}.pdf`);
    
    // Add Grading Scale to PDF on a new page
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(40);
    doc.text("Grading Scale Reference", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text("The following scale was used to categorize marks and determine pass/fail status.", 14, 26);

    autoTable(doc, {
      head: [["Grade", "Min %", "Max %", "Points", "Description"]],
      body: scales.map((s: any) => [
        s.grade, 
        `${s.min_percentage}%`, 
        `${s.max_percentage}%`, 
        s.points || "-", 
        s.description || "-"
      ]),
      startY: 32,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [51, 65, 85], textColor: 255 }
    });
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
          className="bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white border-none shadow-md"
          disabled={disabled}
        >
          <Download className="h-4 w-4 mr-2" />
          Export Analysis
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] bg-white dark:bg-slate-950 p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">Export Results Analysis</DialogTitle>
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
