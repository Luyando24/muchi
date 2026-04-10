import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { syncFetch } from '@/lib/syncService';
import { supabase } from '@/lib/supabase';

interface Anomaly {
  id: string;
  studentName: string;
  studentNumber: string;
  subject: string;
  term: string;
  examType: string;
  academicYear: string;
  percentage: number;
  grade: string;
  className?: string;
  teacherName?: string;
}

export function GradeAnomalies() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const fetchAnomalies = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No authorization token");

      const data = await syncFetch('/api/school/grades/anomalies', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      setAnomalies(data || []);
    } catch (error) {
      console.error("Failed to fetch anomalies:", error);
      toast({
        title: "Error",
        description: "Failed to load grade anomalies.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const reportContent = (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="print:block print:pb-4 pb-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg print:hidden">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Anomalous Grades Report</CardTitle>
              <CardDescription>
                Scores exceeding the maximum 100% threshold
              </CardDescription>
            </div>
          </div>
          {anomalies.length > 0 && (
            <Badge variant="destructive" className="print:hidden">
              {anomalies.length} Issue{anomalies.length !== 1 ? 's' : ''} Detected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Scanning database for anomalies...</p>
          </div>
        ) : anomalies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-slate-50/30">
            <div className="p-4 bg-green-100 rounded-full mb-4">
              <AlertTriangle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No Anomalies Detected</h3>
            <p>All recorded grades are within the valid 0-100% range.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead className="font-semibold">Student</TableHead>
                    <TableHead className="font-semibold">Class</TableHead>
                    <TableHead className="font-semibold">Subject</TableHead>
                    <TableHead className="font-semibold">Teacher</TableHead>
                    <TableHead className="font-semibold">Period</TableHead>
                    <TableHead className="font-semibold text-right text-red-600">Recorded Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomalies.map((anomaly) => (
                    <TableRow key={anomaly.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium text-slate-900">{anomaly.studentName}</TableCell>
                      <TableCell className="text-slate-600">{anomaly.className || '-'}</TableCell>
                      <TableCell>{anomaly.subject}</TableCell>
                      <TableCell className="text-slate-600">{anomaly.teacherName || '-'}</TableCell>
                    <TableCell className="text-slate-600">
                      {anomaly.term} - {anomaly.examType} ({anomaly.academicYear})
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive" className="font-mono text-sm px-2 py-0.5">
                        {anomaly.percentage}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="space-y-6 print:hidden">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Data Audit</h2>
            <p className="text-slate-500 mt-1">Review and manage anomalous grades (over 100%) across the school.</p>
          </div>
          <Button onClick={handlePrint} className="gap-2" disabled={loading || anomalies.length === 0}>
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
        </div>

        {reportContent}
      </div>

      {typeof document !== 'undefined' && ReactDOM.createPortal(
        <div className="print-portal">
          <div className="p-8 max-w-full">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Data Audit</h2>
              <p className="text-slate-500 mt-1">Anomalous grades (over 100%) across the school.</p>
            </div>
            {reportContent}
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              /* Ensure table prints completely across multiple pages */
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
              .shadow-sm { box-shadow: none !important; }
              .border-slate-200 { border-color: #e2e8f0 !important; }
            }
          `}} />
        </div>,
        document.body
      )}
    </>
  );
}