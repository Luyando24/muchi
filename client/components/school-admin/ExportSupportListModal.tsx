import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  Loader2,
  AlertCircle,
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

interface ExportSupportListProps {
  term: string;
  year: string;
  examType: string;
  schoolName: string;
  disabled?: boolean;
}

export default function ExportSupportListModal({ 
  term, 
  year, 
  examType, 
  schoolName,
  disabled 
}: ExportSupportListProps) {
  const [isOpen, setIsOpen] = useState(false);
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
        limit: "1000" // Fetch a large enough batch for export
      });

      const res = await syncFetch(`/api/school/reports/academic-support?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cacheKey: `export-support-${term}-${year}-${examType}`
      });

      if (!res.data || res.data.length === 0) {
        throw new Error("No students found requiring academic support.");
      }

      await exportToPDF(res.data);

      toast({
        title: "Export Successful",
        description: `Academic Support List has been generated.`,
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

  const exportToPDF = async (students: any[]) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;
    
    // Group by class
    const groupedByClass: Record<string, any[]> = {};
    students.forEach(s => {
      if (!groupedByClass[s.class]) groupedByClass[s.class] = [];
      groupedByClass[s.class].push(s);
    });

    const addHeader = (doc: any) => {
      doc.setFillColor(239, 68, 68); // Red 500
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(20);
      doc.text(schoolName.toUpperCase(), margin, 18);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text("ACADEMIC SUPPORT & INTERVENTION LIST", margin, 25);
      
      doc.setFillColor(255, 255, 255, 0.2);
      doc.roundedRect(margin, 28, pageWidth - (margin * 2), 8, 1, 1, 'F');
      doc.setFontSize(8);
      const metaStr = `TERM: ${term} | YEAR: ${year} | ASSESSMENT: ${examType} | TARGET: BELOW 50%`;
      doc.text(metaStr, margin + 4, 33.5);
    };

    addHeader(doc);

    let currentY = 50;

    Object.entries(groupedByClass).sort(([a], [b]) => a.localeCompare(b)).forEach(([className, classStudents], idx) => {
      if (currentY > 250) {
        doc.addPage();
        addHeader(doc);
        currentY = 50;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Class: ${className}`, margin, currentY);
      
      autoTable(doc, {
        head: [["Student Name", "Average Score", "Status"]],
        body: classStudents.map(s => [
          s.name,
          `${s.average}%`,
          s.average < 40 ? "CRITICAL" : "AT RISK"
        ]),
        startY: currentY + 4,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [51, 65, 85], textColor: 255 },
        columnStyles: {
          1: { halign: 'center', fontStyle: 'bold' },
          2: { halign: 'center', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 2) {
            if (data.cell.text[0] === 'CRITICAL') {
              data.cell.styles.textColor = [239, 68, 68];
            } else {
              data.cell.styles.textColor = [245, 158, 11];
            }
          }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, doc.internal.pageSize.height - 10);
      doc.text("CONFIDENTIAL - FOR ACADEMIC INTERVENTION ONLY", margin, doc.internal.pageSize.height - 10);
    }

    doc.save(`Academic_Support_List_${term}_${year}.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
          disabled={disabled}
        >
          <Download className="h-4 w-4 mr-2" />
          Export Support List
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Support List</DialogTitle>
          <DialogDescription>
            Download a PDF report of all students performing below 50%, grouped by their respective classes.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Academic Year:</span>
              <span className="font-bold">{year}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Current Term:</span>
              <span className="font-bold">{term}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Assessment:</span>
              <span className="font-bold">{examType}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleExport}
            disabled={isGenerating}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              "Download PDF"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
