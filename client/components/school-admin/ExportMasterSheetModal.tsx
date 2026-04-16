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
  CheckCircle2
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
import { Card } from "@/components/ui/card";
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
  classId: string;
  className: string;
  schoolName: string;
  disabled?: boolean;
}

type ExportFormat = 'excel' | 'pdf' | 'csv';

export default function ExportMasterSheetModal({ 
  term, 
  year, 
  examType, 
  classId, 
  className,
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
        classId,
        export: "true"
      });

      const res = await syncFetch(`/api/school/reports/master-scoresheet?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cacheKey: `export-cache-${term}-${year}-${examType}-${classId}`
      });

      if (!res.students || res.students.length === 0) {
        throw new Error("No student records found to export.");
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
    const { subjects, students } = data;
    
    // 1. Prepare Headers
    const headers = ["Rank", "Student Name", "Class", ...subjects.map((s: any) => s.name), "Total", "Average (%)"];
    
    // 2. Prepare Data Rows
    const rows = students.map((s: any) => [
      s.rank,
      s.name,
      s.className,
      ...subjects.map((sub: any) => s.grades[sub.id] !== undefined ? s.grades[sub.id] : "-"),
      s.total,
      s.average
    ]);

    // 3. Create Workbook
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Master Score Sheet");

    // 4. Basic Styling (using SheetJS standard properties)
    const wscols = [
      { wch: 6 }, // Rank
      { wch: 30 }, // Name
      { wch: 15 }, // Class
      ...subjects.map(() => ({ wch: 10 })), // Subjects
      { wch: 8 }, // Total
      { wch: 10 } // Average
    ];
    worksheet['!cols'] = wscols;

    // 5. Save File
    const fileName = `Master_Score_Sheet_${term}_${year}_${examType.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportToPDF = async (data: any) => {
    const { subjects, students } = data;
    const doc = new jsPDF({ orientation: 'landscape' });
    
    const getGradePDFInfo = (pct: number) => {
      if (pct >= 75) return { label: 'DISTINCTION', color: [16, 185, 129] }; // Emerald
      if (pct >= 60) return { label: 'MERIT', color: [37, 99, 235] };       // Blue
      if (pct >= 50) return { label: 'CREDIT', color: [79, 70, 229] };     // Indigo
      if (pct >= 40) return { label: 'PASS', color: [249, 115, 22] };       // Orange
      return { label: 'FAIL', color: [239, 68, 68] };                      // Red
    };

    const tableColumn = ["Rank", "Student Name", "Class", ...subjects.map((s: any) => s.name), "Avg (%)"];
    
    const tableRows = students.map((s: any) => {
      const avgInfo = getGradePDFInfo(s.average);
      return [
        `#${s.rank}`,
        [s.name, s.studentNumber || ""],
        s.className,
        ...subjects.map((sub: any) => {
          const score = s.grades[sub.id];
          if (score === undefined) return "-";
          const info = getGradePDFInfo(score);
          return [`${score}%`, info.label];
        }),
        [`${s.average}%`, avgInfo.label]
      ];
    });

    const addHeader = (doc: any) => {
      // School Info (Left)
      doc.setFont(undefined, 'bold');
      doc.setFontSize(22);
      doc.setTextColor(40);
      doc.text(schoolName || "SCHOOL MASTER SCORE SHEET", 14, 18);
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100);
      const metaStr = `${term} | ${year} | ${examType} | Class: ${className}`;
      doc.text(metaStr, 14, 25);
      doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);

      // Performance Summary (Right)
      const stats = {
        distinction: students.filter((s: any) => s.average >= 75).length,
        merit: students.filter((s: any) => s.average >= 60 && s.average < 75).length,
        credit: students.filter((s: any) => s.average >= 50 && s.average < 60).length,
        pass: students.filter((s: any) => s.average >= 40 && s.average < 50).length,
        fail: students.filter((s: any) => s.average < 40).length,
      };

      const startX = 220;
      doc.setFontSize(9);
      doc.setTextColor(40);
      doc.setFont(undefined, 'bold');
      doc.text("PERFORMANCE SUMMARY", startX, 15);
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80);
      
      const summaryItems = [
        { label: "Distinctions:", value: stats.distinction },
        { label: "Merits:", value: stats.merit },
        { label: "Credits:", value: stats.credit },
        { label: "Passes:", value: stats.pass },
        { label: "Fails:", value: stats.fail }
      ];

      summaryItems.forEach((item, index) => {
        const y = 20 + (index * 3.5);
        doc.text(item.label, startX, y);
        doc.setFont(undefined, 'bold');
        doc.text(item.value.toString(), startX + 25, y);
        doc.setFont(undefined, 'normal');
      });
      
      doc.setLineWidth(0.3);
      doc.line(14, 38, 282, 38);
    };

    const totalCols = tableColumn.length;
    let fontSize = totalCols > 20 ? 6 : totalCols > 15 ? 7 : totalCols > 10 ? 8 : 9;

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 42,
      theme: 'grid',
      styles: { 
        fontSize: fontSize, 
        cellPadding: 2,
        lineWidth: 0.05,
        lineColor: [220, 220, 220],
        valign: 'middle',
        halign: 'center',
        minCellHeight: 12
      },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, halign: 'center', fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 12, fontStyle: 'bold', textColor: [100, 116, 139] }, // Rank (#)
        1: { cellWidth: 45, halign: 'left', fontStyle: 'bold' }, // Student Name
        2: { cellWidth: 18 }, // Class
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const isScoreColumn = data.column.index >= 3;
          if (isScoreColumn && Array.isArray(data.cell.raw)) {
             // Suppress default text so we can draw custom badges in didDrawCell
             data.cell.text = [];
          }
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'body') {
          const isScoreColumn = data.column.index >= 3;
          if (isScoreColumn && Array.isArray(data.cell.raw)) {
            const [scoreStr, label] = data.cell.raw;
            if (scoreStr === "-") {
              // Draw simple hyphen for missing grades
              doc.setTextColor(200, 200, 200);
              doc.setFontSize(fontSize);
              doc.text("-", data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: 'center' });
              return;
            }

            const score = parseFloat(scoreStr.replace('%', ''));
            const info = getGradePDFInfo(score);
            const { x, y, width, height } = data.cell;

            // 1. Draw Percentage (Top)
            doc.setFont(undefined, 'bold');
            doc.setFontSize(fontSize);
            doc.setTextColor(info.color[0], info.color[1], info.color[2]);
            doc.text(scoreStr, x + width / 2, y + 4.5, { align: 'center' });

            // 2. Draw Badge Background (Bottom)
            const badgeW = width * 0.85;
            const badgeH = 3.5;
            const badgeX = x + (width - badgeW) / 2;
            const badgeY = y + 6;
            
            doc.setFillColor(info.color[0], info.color[1], info.color[2]);
            // doc.roundedRect is available in standard jsPDF
            (doc as any).roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'F');

            // 3. Draw Grade Label (Inside Badge)
            doc.setFont(undefined, 'bold');
            doc.setFontSize(fontSize - 3); // Smaller for badge
            doc.setTextColor(255, 255, 255);
            doc.text(label, x + width / 2, badgeY + 2.5, { align: 'center' });
          }
        }
      },
      didDrawPage: (data) => {
        if (data.pageNumber === 1) addHeader(doc);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height || pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("MUCHI LMS - Official Academic Score Sheet", 14, pageHeight - 10);
        doc.text(`Page ${data.pageNumber}`, pageSize.width - 25, pageHeight - 10);
      },
    });

    // Add Grading Scale Legend at the end of PDF
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    const pageHeight = doc.internal.pageSize.height;
    
    // Add new page if legend won't fit
    if (finalY + 30 > pageHeight) {
      doc.addPage();
      addHeader(doc);
    }

    const legendY = finalY + 10 > pageHeight ? 45 : finalY;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(40);
    doc.text("ACADEMIC GRADING SCALE LEGEND", 14, legendY);

    const grades = [
      { label: "DISTINCTION", range: "75% - 100%", color: [16, 185, 129] },
      { label: "MERIT", range: "60% - 74%", color: [37, 99, 235] },
      { label: "CREDIT", range: "50% - 59%", color: [79, 70, 229] },
      { label: "PASS", range: "40% - 49%", color: [249, 115, 22] },
      { label: "FAIL", range: "Below 40%", color: [239, 68, 68] }
    ];

    grades.forEach((g, index) => {
      const gx = 14 + (index * 55);
      const gy = legendY + 8;
      
      // Draw Color Badge
      doc.setFillColor(g.color[0], g.color[1], g.color[2]);
      (doc as any).roundedRect(gx, gy, 12, 5, 1, 1, 'F');
      
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text(g.label, gx + 6, gy + 3.5, { align: 'center' });
      
      doc.setTextColor(80);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(g.range, gx + 15, gy + 3.5);
    });

    doc.save(`Master_Sheet_${term}_${year}.pdf`);
  };

  const exportToCSV = async (data: any) => {
    const { subjects, students } = data;
    const headers = ["Rank", "Name", "Class", ...subjects.map((s: any) => s.name), "Total", "Average"];
    const rows = students.map((s: any) => [
      s.rank,
      `"${s.name}"`,
      `"${s.className}"`,
      ...subjects.map((sub: any) => s.grades[sub.id] !== undefined ? s.grades[sub.id] : "-"),
      s.total,
      s.average
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(r => r.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_Score_Sheet_${term}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="bg-blue-600 text-white hover:bg-blue-700 hover:text-white border-none shadow-md"
          disabled={disabled}
        >
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] bg-white dark:bg-slate-950 p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">Export Results</DialogTitle>
          <DialogDescription className="text-slate-500">
            Select your preferred file format for the master score sheet.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Metadata Summary */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm">
                <GraduationCap className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Class</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{className || 'All Classes'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Academic Period</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{term} {year}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm">
                <BookOpen className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Assessment</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{examType}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Status</p>
                <p className="text-sm font-semibold text-emerald-600">Marks Finalized</p>
              </div>
            </div>
          </div>

          {/* Format Selection */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedFormat('excel')}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 group",
                selectedFormat === 'excel' 
                  ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/10" 
                  : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
              )}
            >
              <div className={cn(
                "p-3 rounded-full transition-colors",
                selectedFormat === 'excel' ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-600"
              )}>
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <span className={cn(
                "text-xs font-bold",
                selectedFormat === 'excel' ? "text-blue-700 dark:text-blue-400" : "text-slate-500"
              )}>Excel</span>
            </button>

            <button
              onClick={() => setSelectedFormat('pdf')}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 group",
                selectedFormat === 'pdf' 
                  ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/10" 
                  : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
              )}
            >
              <div className={cn(
                "p-3 rounded-full transition-colors",
                selectedFormat === 'pdf' ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-600"
              )}>
                <FileText className="h-6 w-6" />
              </div>
              <span className={cn(
                "text-xs font-bold",
                selectedFormat === 'pdf' ? "text-blue-700 dark:text-blue-400" : "text-slate-500"
              )}>PDF Doc</span>
            </button>

            <button
              onClick={() => setSelectedFormat('csv')}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 group",
                selectedFormat === 'csv' 
                  ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/10" 
                  : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
              )}
            >
              <div className={cn(
                "p-3 rounded-full transition-colors",
                selectedFormat === 'csv' ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-600"
              )}>
                <TableIcon className="h-6 w-6" />
              </div>
              <span className={cn(
                "text-xs font-bold",
                selectedFormat === 'csv' ? "text-blue-700 dark:text-blue-400" : "text-slate-500"
              )}>Simple CSV</span>
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
            className="px-8 bg-blue-600 text-white hover:bg-blue-700 shadow-[0_4px_10px_rgba(37,99,235,0.3)] transition-all active:scale-95"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
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
