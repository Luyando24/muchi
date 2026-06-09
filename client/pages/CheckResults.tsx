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
      // Force desktop layout for capture
      const element = reportRef.current;
      const originalWidth = element.style.width;
      element.style.width = '1200px';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 1200
      });

      // Restore original layout
      element.style.width = originalWidth;

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 text-slate-900 font-inter">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/80 shadow-sm">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <Link to="/" className="flex items-center gap-2 group">
            <School className="h-8 w-8 text-blue-600 group-hover:text-blue-500 transition-colors" />
            <div>
              <span className="text-xl font-bold text-slate-900">MUCHI</span>
              <p className="text-xs text-slate-500 font-medium">School Management System</p>
            </div>
          </Link>
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-2 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        {!resultData ? (
          /* Search Form */
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 mb-4">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">Check Student Results</h1>
              <p className="text-slate-600 text-lg">
                Enter your student details below to view and download your report card.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-md">
              <form onSubmit={handleSearch} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="studentNumber" className="text-slate-700 font-semibold">
                    Student Number
                  </Label>
                  <Input
                    id="studentNumber"
                    placeholder="e.g. 20269239"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    required
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20 h-12 text-base rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="term" className="text-slate-700 font-semibold">Term</Label>
                    <Select value={term} onValueChange={setTerm}>
                      <SelectTrigger id="term" className="bg-white border-slate-200 text-slate-900 h-12 rounded-xl">
                        <SelectValue placeholder="Select Term" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-slate-900">
                        <SelectItem value="Term 1">Term 1</SelectItem>
                        <SelectItem value="Term 2">Term 2</SelectItem>
                        <SelectItem value="Term 3">Term 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="academicYear" className="text-slate-700 font-semibold">Academic Year</Label>
                    <Select value={academicYear} onValueChange={setAcademicYear}>
                      <SelectTrigger id="academicYear" className="bg-white border-slate-200 text-slate-900 h-12 rounded-xl">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-slate-900">
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="examType" className="text-slate-700 font-semibold">Assessment Type</Label>
                    <Select value={examType} onValueChange={setExamType}>
                      <SelectTrigger id="examType" className="bg-white border-slate-200 text-slate-900 h-12 rounded-xl">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-slate-900">
                        <SelectItem value="Mid Term">Mid Term</SelectItem>
                        <SelectItem value="End of Term">End of Term</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-150 text-red-700 rounded-xl text-sm flex items-center gap-3 font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/10 rounded-xl transition-all active:scale-95"
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
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="text-center md:text-left">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{resultData.student.name}</h2>
                <p className="text-slate-600 mt-1 text-lg font-medium">Student No: {resultData.student.studentNumber} · {resultData.student.class}</p>
                <p className="text-slate-500 mt-1 font-semibold">
                  {resultData.termResults[0].term} · {examType} · Academic Year {resultData.termResults[0].academicYear}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
                <Button
                  onClick={handleDownloadPDF}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl shadow-lg shadow-emerald-600/10 h-12 px-6 flex-1 sm:flex-none font-bold"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                <Button
                  onClick={handlePrint}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl shadow-lg shadow-blue-600/10 h-12 px-6 flex-1 sm:flex-none font-bold"
                >
                  <Printer className="h-4 w-4" />
                  Print Report
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setResultData(null)}
                  className="border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl h-12 px-6 flex-1 sm:flex-none font-semibold"
                >
                  <Search className="h-4 w-4 mr-2" />
                  New Search
                </Button>
              </div>
            </div>

            {/* Report Card Preview */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-x-auto overflow-y-hidden lg:overflow-hidden">
              <div ref={reportRef} className="w-full min-w-[350px] sm:min-w-0 bg-white text-black">
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
