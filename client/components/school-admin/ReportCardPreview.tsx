import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Download, Printer, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { syncFetch } from '@/lib/syncService';
import { ReportCardContent } from '@/components/shared/ReportCardContent';
import { useToast } from '@/hooks/use-toast';

interface ReportCardProps {
  studentId: string;
  term: string;
  examType: string;
  academicYear: string;
}

export default function ReportCardPreview({ studentId, term, examType, academicYear }: ReportCardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPdfReady, setIsPdfReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const reportData = await syncFetch(`/api/school/results/report-card/${studentId}?term=${encodeURIComponent(term)}&examType=${encodeURIComponent(examType)}&academicYear=${encodeURIComponent(academicYear)}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          cacheKey: `school-report-card-${studentId}-${term}-${examType}-${academicYear}`
        });

        setData(reportData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (studentId && term && examType && academicYear) {
      fetchReport();
    }
  }, [studentId, term, examType, academicYear]);

  // Set document title for PDF filename so when printing/saving as PDF, default filename is clean
  useEffect(() => {
    if (data?.student?.name) {
      const originalTitle = document.title;
      const studentName = (data.student.name || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
      document.title = `${studentName}_Report_Card_${term.replace(/\s+/g, '_')}_${academicYear}`;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [data, term, academicYear]);

  // Poll class pre-built PDF readiness status
  const classId = data?.student?.classId;
  useEffect(() => {
    if (!classId || !term || !examType || !academicYear) return;

    let cancelled = false;
    const checkPdfStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || cancelled) return;

        const query = new URLSearchParams({
          classId,
          term,
          examType,
          academicYear,
        });

        const res = await fetch(`/api/school/results/class-pdf-status?${query.toString()}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (res.ok && !cancelled) {
          const result = await res.json();
          setIsPdfReady(!!result?.ready);
        }
      } catch {
        if (!cancelled) setIsPdfReady(false);
      }
    };

    checkPdfStatus();
    const interval = setInterval(checkPdfStatus, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [classId, term, examType, academicYear]);

  const handlePrint = () => {
    if (!data) return;
    const originalTitle = document.title;
    const studentName = (data.student.name || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
    document.title = `${studentName}_Report_Card_${term.replace(/\s+/g, '_')}_${academicYear}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleDownloadPdf = async () => {
    if (!classId) return;
    setIsDownloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const query = new URLSearchParams({
        classId,
        term,
        examType,
        academicYear,
      });

      const res = await fetch(`/api/school/results/download-class-pdf?${query.toString()}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'PDF not ready on server yet.');
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const cleanClassName = (data?.student?.class || 'Class').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Report_Cards_${cleanClassName}_${term}_${examType}_${academicYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);

      toast({
        title: "PDF Downloaded ⚡",
        description: "Pre-compiled vector PDF downloaded directly from server.",
      });
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err.message || "Failed to download pre-built PDF.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* On-Screen Version */}
      <div className="print:hidden space-y-4">
        <ReportCardContent data={data} term={term} examType={examType} academicYear={academicYear} />

        {/* Export & Print Controls */}
        <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          {/* Background Pre-built Class PDF Status / Download */}
          <div className="flex items-center gap-2">
            {isPdfReady ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/50 font-bold text-xs shadow-sm flex items-center gap-1.5"
              >
                {isDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download Class PDF (Pre-built) ⚡
              </Button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600 shrink-0" />
                <span>Pre-built PDF compiling in background…</span>
              </div>
            )}
          </div>

          {/* Immediate Individual Print Button - Always available */}
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Report Card
            </Button>
          </div>
        </div>
      </div>

      {/* Print-Only Portal Version - Rendered directly to body to bypass modal/dialog layout constraints */}
      {createPortal(
        <div className="print-portal">
          <style>
            {`
              @media screen {
                .print-portal { display: none !important; }
              }
              @media print {
                @page { 
                  size: A4; 
                  margin: 8mm; 
                }
                body { 
                  background: white !important; 
                  margin: 0 !important; 
                  padding: 0 !important; 
                }
                body:not(.headless-pdf-render) > *:not(.print-portal) { 
                  display: none !important; 
                }
                .print-portal {
                  display: block !important;
                  position: static !important;
                  width: 100% !important;
                  background: white !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  visibility: visible !important;
                }
                .print-portal * {
                  visibility: visible !important;
                }
              }
            `}
          </style>
          <ReportCardContent
            data={data}
            term={term}
            examType={examType}
            academicYear={academicYear}
            className="border-none shadow-none w-full max-w-none print:w-full print:max-w-none !bg-white !text-black" 
          />
        </div>,
        document.body
      )}
    </div>
  );
}
