
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Loader2, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { ReportCardContent } from '@/components/shared/ReportCardContent';

interface ReportCardProps {
  studentId: string;
  term: string;
  examType: string;
  academicYear: string;
}

// ReportCardContent component has been moved to @/components/shared/ReportCardContent.tsx

export default function ReportCardPreview({ studentId, term, examType, academicYear }: ReportCardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(`/api/school/results/report-card/${studentId}?term=${encodeURIComponent(term)}&examType=${encodeURIComponent(examType)}&academicYear=${encodeURIComponent(academicYear)}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to load report card');
        }

        const reportData = await response.json();
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

  // Set document title for PDF filename
  useEffect(() => {
    if (data?.student?.name) {
      const originalTitle = document.title;
      document.title = `${data.student.name} - Report Card`;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [data]);

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  if (!data) return null;

  return (
    <>
      {/* On-Screen Version */}
      <div className="print:hidden">
        <ReportCardContent data={data} term={term} examType={examType} academicYear={academicYear} />
        {/* Print Controls */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print Report Card
          </Button>
        </div>
      </div>

      {/* Print-Only Portal Version - Rendered directly to body to bypass layout constraints */}
      {ReactDOM.createPortal(
        <div className="print-portal">
          <ReportCardContent
            data={data}
            term={term}
            examType={examType}
            academicYear={academicYear}
            className="border-none shadow-none w-full max-w-none print:w-full print:max-w-none" 
          />
        </div>,
        document.body
      )}
    </>
  );
}
