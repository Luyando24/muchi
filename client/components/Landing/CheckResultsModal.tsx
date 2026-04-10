import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Download, AlertCircle } from 'lucide-react';
import { ReportCardContent } from '@/components/shared/ReportCardContent';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function CheckResultsModal({ trigger }: { trigger?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [studentNumber, setStudentNumber] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());
  const [examType, setExamType] = useState('End of Term');
  
  const [resultData, setResultData] = useState<any>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const availableYears = [
    (new Date().getFullYear() - 1).toString(),
    new Date().getFullYear().toString(),
    (new Date().getFullYear() + 1).toString()
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNumber.trim()) {
      setError("Please enter a student number.");
      return;
    }

    setLoading(true);
    setError(null);
    setResultData(null);

    try {
      const response = await fetch(`/api/school/public-verify-results?studentNumber=${encodeURIComponent(studentNumber)}&term=${encodeURIComponent(term)}&academicYear=${encodeURIComponent(academicYear)}&examType=${encodeURIComponent(examType)}`);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to find results.");
      }

      if (!data.termResults || data.termResults.length === 0) {
        throw new Error("No results found for this period.");
      }

      setResultData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current || !resultData) return;
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const fileName = `${resultData.student.studentNumber}_Report_Term${resultData.termResults[0].term}_${resultData.termResults[0].academicYear}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF generation error:", err);
      setError("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          // Reset state on close
          setResultData(null);
          setError(null);
        }
    }}>
      <DialogTrigger asChild>
        {trigger || <Button>Check Results</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>View Student Results</DialogTitle>
          <DialogDescription>
            Enter the student details to securely retrieve their published report card.
          </DialogDescription>
        </DialogHeader>

        {!resultData ? (
          <form onSubmit={handleSearch} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="studentNumber">Student Number</Label>
              <Input 
                id="studentNumber" 
                placeholder="e.g. 12345678" 
                value={studentNumber} 
                onChange={(e) => setStudentNumber(e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="term">Term</Label>
                <Select value={term} onValueChange={setTerm}>
                  <SelectTrigger id="term">
                    <SelectValue placeholder="Select Term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Term 1">Term 1</SelectItem>
                    <SelectItem value="Term 2">Term 2</SelectItem>
                    <SelectItem value="Term 3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="academicYear">Academic Year</Label>
                <Select value={academicYear} onValueChange={setAcademicYear}>
                  <SelectTrigger id="academicYear">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="examType">Assessment Type</Label>
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger id="examType">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mid Term">Mid Term</SelectItem>
                    <SelectItem value="End of Term">End of Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...</>
              ) : (
                <><Search className="mr-2 h-4 w-4" /> Check Results</>
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-6 mt-4">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border">
              <div>
                <h3 className="font-bold text-lg">{resultData.student.name}</h3>
                <p className="text-sm text-slate-500">Student No: {resultData.student.studentNumber}</p>
              </div>
              <Button onClick={handleDownloadPDF} variant="default" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
            
            <div className="border rounded-md p-4 bg-white shadow-sm overflow-hidden flex justify-center">
               <div style={{ transform: 'scale(0.8)', transformOrigin: 'top center' }}>
                  <div ref={reportRef} className="w-[210mm] min-h-[297mm] bg-white text-black p-8 relative">
                    <ReportCardContent 
                      data={{
                        student: resultData.student,
                        school: resultData.school,
                        gradingScale: resultData.gradingScale,
                        grades: resultData.termResults[0].grades
                      }}
                      term={`Term ${resultData.termResults[0].term}`}
                      examType={resultData.termResults[0].grades?.[0]?.exam_type || examType}
                      academicYear={resultData.termResults[0].academicYear}
                      className="w-full h-full shadow-none border-none m-0 p-0"
                    />
                  </div>
               </div>
            </div>

            <Button variant="outline" className="w-full" onClick={() => setResultData(null)}>
              Search Another Student
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
