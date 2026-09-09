import React, { useEffect, useState } from 'react';
import { Loader2, Download, CheckCircle2 } from 'lucide-react';
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
      <ReportCardContent data={data} term={term} examType={examType} academicYear={academicYear} />

      {/* Export Controls - Pre-built PDF only, no browser print dialog */}
      <div className="flex justify-end items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
        {isPdfReady ? (
          <Button
            variant="default"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
          >
            {isDownloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Download Pre-Built PDF ⚡
          </Button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600 shrink-0" />
            <span>Pre-built PDF compiling in background…</span>
          </div>
        )}
      </div>
    </div>
  );
}
