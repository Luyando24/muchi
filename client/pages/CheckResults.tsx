import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Download, AlertCircle, ArrowLeft, School, FileText, Printer } from 'lucide-react';
import { ReportCardContent } from '@/components/shared/ReportCardContent';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function CheckResults() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentNumber, setStudentNumber] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());
  const [examType, setExamType] = useState('End of Term');

  const [resultData, setResultData] = useState<any>(null);
  const [isPrinting, setIsPrinting] = useState(false);
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
      const response = await fetch(
        `/api/school/public-verify-results?studentNumber=${encodeURIComponent(studentNumber)}&term=${encodeURIComponent(term)}&academicYear=${encodeURIComponent(academicYear)}&examType=${encodeURIComponent(examType)}`
      );

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

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const fileName = `${resultData.student.studentNumber}_Report_${resultData.termResults[0].term}_${resultData.termResults[0].academicYear}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF generation error:", err);
      setError("Failed to generate PDF. Please try again.");
    }
  };

  const handlePrint = () => {
    if (!resultData) return;
    setIsPrinting(true);
    
    // Set document title for a cleaner print filename
    const originalTitle = document.title;
    const studentName = (resultData.student.name || 'Student').replace(/\s+/g, '_');
    document.title = `${studentName}_Report_${resultData.termResults[0].term}`;

    // Small delay to ensure the portal renders
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
      setIsPrinting(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-white/10 shadow-lg">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <Link to="/" className="flex items-center gap-2 group">
            <School className="h-8 w-8 text-blue-400 group-hover:text-blue-300 transition-colors" />
            <div>
              <span className="text-xl font-bold text-white">MUCHI</span>
              <p className="text-xs text-slate-400">School Management System</p>
            </div>
          </Link>
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-slate-300 hover:text-white hover:bg-white/10 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {!resultData ? (
          /* Search Form */
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 mb-4">
                <FileText className="h-8 w-8 text-blue-400" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Check Student Results</h1>
              <p className="text-slate-400 text-lg">
                Enter your student details below to view and download your report card.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
              <form onSubmit={handleSearch} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="studentNumber" className="text-slate-200 font-medium">
                    Student Number
                  </Label>
                  <Input
                    id="studentNumber"
                    placeholder="e.g. 20269239"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400 focus:ring-blue-400/20 h-12 text-base"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="term" className="text-slate-200 font-medium">Term</Label>
                    <Select value={term} onValueChange={setTerm}>
                      <SelectTrigger id="term" className="bg-white/10 border-white/20 text-white h-12">
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
                    <Label htmlFor="academicYear" className="text-slate-200 font-medium">Academic Year</Label>
                    <Select value={academicYear} onValueChange={setAcademicYear}>
                      <SelectTrigger id="academicYear" className="bg-white/10 border-white/20 text-white h-12">
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
                    <Label htmlFor="examType" className="text-slate-200 font-medium">Assessment Type</Label>
                    <Select value={examType} onValueChange={setExamType}>
                      <SelectTrigger id="examType" className="bg-white/10 border-white/20 text-white h-12">
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
                  <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-sm flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 rounded-xl transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Searching...</>
                  ) : (
                    <><Search className="mr-2 h-5 w-5" /> Check Results</>
                  )}
                </Button>
              </form>
            </div>
          </div>
        ) : (
          /* Results View */
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Result Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <div>
                <h2 className="text-2xl font-bold text-white">{resultData.student.name}</h2>
                <p className="text-slate-400 mt-1">Student No: {resultData.student.studentNumber} · {resultData.student.class}</p>
                <p className="text-slate-500 text-sm mt-1">
                  {resultData.termResults[0].term} · {examType} · Academic Year {resultData.termResults[0].academicYear}
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={handleDownloadPDF}
                  className="bg-emerald-600 hover:bg-emerald-500 gap-2 rounded-xl shadow-lg shadow-emerald-600/20"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                <Button
                  onClick={handlePrint}
                  className="bg-blue-600 hover:bg-blue-500 gap-2 rounded-xl shadow-lg shadow-blue-600/20"
                >
                  <Printer className="h-4 w-4" />
                  Print Report
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setResultData(null)}
                  className="border-white/20 text-slate-200 hover:bg-white/10 rounded-xl"
                >
                  <Search className="h-4 w-4 mr-2" />
                  New Search
                </Button>
              </div>
            </div>

            {/* Report Card Preview */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div ref={reportRef} className="w-full bg-white text-black">
                <ReportCardContent
                  data={{
                    student: resultData.student,
                    school: resultData.school,
                    gradingScale: resultData.gradingScale,
                    grades: resultData.termResults[0].grades
                  }}
                  term={resultData.termResults[0].term}
                  examType={resultData.termResults[0].grades?.[0]?.exam_type || examType}
                  academicYear={resultData.termResults[0].academicYear}
                  className="shadow-none border-none m-0"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Print Portal */}
      {isPrinting && resultData && createPortal(
        <div className="print-portal">
          <style>
            {`
              @media screen {
                .print-portal { display: none !important; }
              }
              @media print {
                @page { size: A4; margin: 10mm; }
                #root, header, nav, footer { display: none !important; }
                body { background: white !important; margin: 0; padding: 0; }
                .print-portal {
                  display: block !important;
                  position: static !important;
                  width: 100% !important;
                  background: white !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
              }
            `}
          </style>
          <div className="bg-white p-0 m-0">
            <ReportCardContent
              data={{
                student: resultData.student,
                school: resultData.school,
                gradingScale: resultData.gradingScale,
                grades: resultData.termResults[0].grades
              }}
              term={resultData.termResults[0].term}
              examType={resultData.termResults[0].grades?.[0]?.exam_type || examType}
              academicYear={resultData.termResults[0].academicYear}
              className="shadow-none border-none m-0 p-0 w-full"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
