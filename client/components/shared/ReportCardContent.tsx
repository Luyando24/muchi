
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

interface ReportCardContentProps {
  data: any;
  term: string;
  academicYear: string;
  className?: string;
}

export const ReportCardContent = ({ data, term, academicYear, className = "" }: ReportCardContentProps) => {
  const { student, grades, gradingScale, school } = data;

  // Calculate GPA or Average if needed
  const totalPercentage = grades.reduce((sum: number, g: any) => sum + (g.percentage || 0), 0);
  const average = grades.length > 0 ? (totalPercentage / grades.length).toFixed(1) : 0;
  // const hasDraftGrades = grades.some((g: any) => g.status === 'Draft');

  return (
    <div className={`space-y-6 p-8 border rounded-lg bg-white dark:bg-slate-900 print:bg-white print:text-black relative overflow-hidden print:overflow-visible print:rounded-none max-w-4xl mx-auto ${className}`}>
      {/* {hasDraftGrades && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 z-0 select-none">
          <span className="text-[10rem] font-bold uppercase -rotate-45 text-slate-900 dark:text-slate-100 print:text-black transform translate-y-10">DRAFT</span>
        </div>
      )} */}
      
      {/* Header with School Branding */}
      <div className="text-center space-y-4 border-b-2 border-slate-200 pb-6 mb-8">
        <div className="flex flex-col items-center justify-center gap-4">
            {/* {school?.logo_url ? (
                <img src={school.logo_url} alt="School Logo" className="h-24 w-24 object-contain" />
            ) : (
                 <div className="h-24 w-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 print:bg-slate-100 print:text-slate-400">
                    <span className="text-xs">No Logo</span>
                 </div>
            )} */}
            <div className="space-y-1">
                <h1 className="text-3xl font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100 print:text-black">{school?.name || 'School Name'}</h1>
                <div className="text-sm text-slate-500 flex flex-col items-center gap-1 print:text-slate-600">
                    {school?.address && <p>{school.address}</p>}
                    <div className="flex gap-4">
                        {school?.email && <p>Email: {school.email}</p>}
                        {school?.phone && <p>Tel: {school.phone}</p>}
                    </div>
                    {school?.website && <p>{school.website}</p>}
                </div>
            </div>
        </div>
        <div className="pt-4">
             <Badge variant="outline" className="px-6 py-1 text-lg uppercase tracking-widest border-slate-300 print:text-black print:border-slate-400">Student Report Card</Badge>
        </div>
      </div>

      {/* Student Details Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 print:bg-slate-50 rounded-xl border border-slate-100 dark:border-slate-800 print:border-slate-200">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
                <span className="text-sm font-medium text-slate-500 print:text-slate-600 uppercase tracking-wider">Student Name</span>
                <span className="col-span-2 font-semibold text-slate-900 dark:text-slate-100 print:text-black">{student.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <span className="text-sm font-medium text-slate-500 print:text-slate-600 uppercase tracking-wider">Student ID</span>
                <span className="col-span-2 font-mono text-slate-700 dark:text-slate-300 print:text-black">{student.studentNumber}</span>
            </div>
          </div>
          <div className="space-y-3">
             <div className="grid grid-cols-3 gap-2">
                <span className="text-sm font-medium text-slate-500 print:text-slate-600 uppercase tracking-wider">Class</span>
                <span className="col-span-2 font-semibold text-slate-900 dark:text-slate-100 print:text-black">{student.class}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <span className="text-sm font-medium text-slate-500 print:text-slate-600 uppercase tracking-wider">Term / Year</span>
                <span className="col-span-2 text-slate-700 dark:text-slate-300 print:text-black">{term} / {academicYear}</span>
            </div>
          </div>
      </div>

      {/* Grades Table */}
      <div>
        <h3 className="font-semibold mb-2 print:text-black">Academic Performance</h3>
        <Table className="border print:border-slate-200">
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800 print:bg-slate-50 print:text-black">
              <TableHead className="print:text-black">Subject</TableHead>
              <TableHead className="text-center print:text-black">Score (%)</TableHead>
              <TableHead className="text-center print:text-black">Grade</TableHead>
              <TableHead className="print:text-black">Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grades.length > 0 ? (
              grades.map((g: any) => (
                <TableRow key={g.id} className="print:border-slate-200">
                  <TableCell className="font-medium print:text-black">{g.subjects?.name || 'Unknown'}</TableCell>
                  <TableCell className="text-center print:text-black">{g.percentage}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`${g.grade === 'F' ? 'text-red-500 border-red-200' : 'print:text-black print:border-slate-300'}`}>
                      {g.grade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground print:text-slate-700">{g.comments || '-'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground print:text-slate-500">
                  No grades recorded for this term.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 pt-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-800 print:bg-slate-50 rounded-lg">
          <h4 className="font-semibold text-sm mb-2 print:text-black">Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between print:text-black">
              <span>Subjects Taken:</span>
              <span className="font-medium">{grades.length}</span>
            </div>
            <div className="flex justify-between print:text-black">
              <span>Average Score:</span>
              <span className="font-medium">{average}%</span>
            </div>
          </div>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800 print:bg-slate-50 rounded-lg">
          <h4 className="font-semibold text-sm mb-2 print:text-black">Grading Scale</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {gradingScale.slice(0, 6).map((s: any) => (
              <div key={s.id} className="flex justify-between print:text-black">
                <span>{s.grade}</span>
                <span className="text-muted-foreground print:text-slate-600">{s.min_percentage}-{s.max_percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Head Teacher's Remark */}
      <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800 print:bg-slate-50 mt-4 print:border-slate-200">
        <h4 className="font-semibold text-sm mb-2 uppercase tracking-wide text-slate-700 dark:text-slate-300 print:text-black">Head Teacher's Remark</h4>
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 italic print:text-black">
          {(() => {
            if (!grades || grades.length === 0) return "No grades available for analysis.";

            const avg = parseFloat(average as string);
            const firstName = student.name.split(' ')[0];
            
            // Overall Performance
            let overallRemark = "";
            if (avg >= 75) overallRemark = "an outstanding";
            else if (avg >= 65) overallRemark = "a very good";
            else if (avg >= 55) overallRemark = "a good";
            else if (avg >= 45) overallRemark = "a satisfactory";
            else overallRemark = "a below average";

            // Best and Weakest Subjects
            const sortedGrades = [...grades].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
            const bestSubject = sortedGrades[0];
            const weakestSubject = sortedGrades[sortedGrades.length - 1];
            
            let subjectRemark = "";
            if (bestSubject && (bestSubject.percentage || 0) >= 70) {
              subjectRemark += `${firstName} has shown particular strength in ${bestSubject.subjects?.name || 'their best subject'}, achieving a score of ${bestSubject.percentage}%. `;
            }
            
            if (weakestSubject && (weakestSubject.percentage || 0) < 50) {
              subjectRemark += `However, more attention is needed in ${weakestSubject.subjects?.name || 'some areas'}, where performance was lower (${weakestSubject.percentage}%). `;
            } else if (weakestSubject && weakestSubject !== bestSubject) {
              subjectRemark += `Performance across all subjects was generally consistent, with the lowest score being ${weakestSubject.percentage}% in ${weakestSubject.subjects?.name}. `;
            }

            // Closing
            let closing = "";
            if (avg >= 60) closing = "Keep up the excellent work!";
            else if (avg >= 50) closing = "With consistent effort, better results can be achieved next term.";
            else closing = "We encourage more dedicated study time and seeking help in difficult subjects.";

            return `${student.name} has achieved ${overallRemark} performance this term with an overall average of ${avg}%. ${subjectRemark}${closing}`;
          })()}
        </p>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-8 pt-12 mt-8 border-t border-slate-200">
          <div className="text-center space-y-8">
              <div className="h-px bg-slate-300 w-full"></div>
              <p className="text-sm font-medium uppercase tracking-wider text-slate-500 print:text-black">Class Teacher</p>
          </div>
          <div className="text-center space-y-8">
              <div className="h-px bg-slate-300 w-full"></div>
              <p className="text-sm font-medium uppercase tracking-wider text-slate-500 print:text-black">Head Teacher</p>
          </div>
          <div className="text-center space-y-8">
              <div className="h-px bg-slate-300 w-full"></div>
              <p className="text-sm font-medium uppercase tracking-wider text-slate-500 print:text-black">Parent / Guardian</p>
          </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-8 mt-4 border-t border-slate-100 text-xs text-slate-400 print:text-slate-600">
          <p>Generated by MUCHI School Management System</p>
          <p>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
};
