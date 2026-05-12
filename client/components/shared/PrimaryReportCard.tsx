
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PrimaryReportCardProps {
  data: any;
  term: string;
  examType: string;
  academicYear: string;
  className?: string;
}

export const PrimaryReportCard = ({ data, term, examType, academicYear, className = "" }: PrimaryReportCardProps) => {
  const { student, grades: rawGrades, gradingScale, school } = data;

  // Group grades by subject to handle multiple tests
  const subjectsMap = new Map();
  rawGrades.forEach((g: any) => {
    const subjectId = g.subject_id;
    if (!subjectsMap.has(subjectId)) {
      subjectsMap.set(subjectId, {
        name: g.subjects?.name || 'Unknown',
        tests: {
          'Test 1': null,
          'Test 2': null,
          'Test 3': null,
          'Mid Term': null,
          'End of Term': null
        },
        allGrades: []
      });
    }
    const subData = subjectsMap.get(subjectId);
    subData.allGrades.push(g);
    
    // Map existing exam types to our test columns
    if (g.exam_type.includes('1')) subData.tests['Test 1'] = g.percentage;
    else if (g.exam_type.includes('2')) subData.tests['Test 2'] = g.percentage;
    else if (g.exam_type.includes('3')) subData.tests['Test 3'] = g.percentage;
    else if (g.exam_type.toLowerCase().includes('mid')) subData.tests['Mid Term'] = g.percentage;
    else if (g.exam_type.toLowerCase().includes('end')) subData.tests['End of Term'] = g.percentage;
  });

  const subjectList = Array.from(subjectsMap.values());

  // Calculate Metrics
  const totalPercentage = rawGrades.reduce((sum: number, g: any) => sum + (g.percentage || 0), 0);
  const average = rawGrades.length > 0 ? (totalPercentage / rawGrades.length).toFixed(1) : 0;

  const studentGrade = (student.className || student.grade || student.class || "").toLowerCase();
  
  // Robust Grade Detection
  const isSecondary = studentGrade.includes("form") || /\b(8|9|10|11|12)\b/.test(studentGrade);
  const isG57 = !isSecondary && 
                /\b(5|6|7)\b/.test(studentGrade) && 
                !/\b(1|2|3|4)\b/.test(studentGrade);
                
  const maxMark = isG57 ? 150 : 100;

  const getScaleMatch = (percentage: number) => {
    if (gradingScale && gradingScale.length > 0) {
      return gradingScale.find((s: any) => percentage >= s.min_percentage && percentage <= s.max_percentage);
    }
    return null;
  };

  const getGradeColor = (percentage: number) => {
    const scale = getScaleMatch(percentage);
    if (scale) {
      const g = scale.grade.toUpperCase();
      if (g.includes('RED') || g === 'A+' || g === 'A') return { name: "Red", class: "text-red-600 font-bold" };
      if (g.includes('ORANGE') || g === 'B+' || g === 'B') return { name: "Orange", class: "text-orange-500 font-bold" };
      if (g.includes('YELLOW') || g === 'C+' || g === 'C') return { name: "Yellow", class: "text-yellow-600 font-bold" };
      return { name: "Blue", class: "text-blue-600 font-bold" };
    }
    
    // Fallback
    const pct = (percentage / maxMark) * 100;
    if (pct >= 75) return { name: "Red", class: "text-red-600 font-bold" };
    if (pct >= 60) return { name: "Orange", class: "text-orange-500 font-bold" };
    if (pct >= 50) return { name: "Yellow", class: "text-yellow-600 font-bold" };
    return { name: "Blue", class: "text-blue-600 font-bold" };
  };

  const getGradeLetter = (percentage: number) => {
    const scale = getScaleMatch(percentage);
    if (scale) return scale.grade;
    
    // Fallback
    const pct = (percentage / maxMark) * 100;
    if (pct >= 86) return "A+";
    if (pct >= 76) return "A";
    if (pct >= 66) return "B+";
    if (pct >= 56) return "B";
    if (pct >= 46) return "C+";
    if (pct >= 40) return "C";
    return "F";
  };

  const getGradeDescription = (percentage: number) => {
    const scale = getScaleMatch(percentage);
    if (scale) return scale.description || scale.remark || "Satisfactory";
    
    // Fallback
    const pct = (percentage / maxMark) * 100;
    if (pct >= 76) return "Distinction";
    if (pct >= 66) return "Merit";
    if (pct >= 56) return "Credit";
    if (pct >= 46) return "Definite Pass";
    if (pct >= 40) return "Pass";
    return "Fail";
  };

  const rawData = `VERIFY|${student.studentNumber}|${student.name}|${term}|${examType}|${academicYear}|${average}|${school?.name || 'School'}`;
  const verificationUrl = `${window.location.origin}/verify/${btoa(encodeURIComponent(rawData))}`;

  return (
    <div className={`relative flex flex-col bg-[#fdfcf7] text-[#2c3e50] overflow-hidden print:overflow-hidden print:w-[210mm] print:h-[297mm] mx-auto my-8 print:my-0 shadow-2xl print:shadow-none border-[12px] border-double border-[#8e44ad]/20 rounded-lg ${className}`}>
      <style type="text/css" media="print">
        {`
          @page { size: A4; margin: 0; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .primary-report-table th, .primary-report-table td { border: 1px solid #bdc3c7 !important; }
        `}
      </style>

      {/* Decorative Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col p-8 sm:p-12 print:p-8 space-y-6">
        
        {/* Header Section */}
        <div className="text-center space-y-2 border-b-2 border-[#8e44ad] pb-6">
          <h1 className="text-3xl font-serif font-black tracking-widest text-[#8e44ad] uppercase">
            Progress Report Book G 5-7
          </h1>
          <div className="flex justify-center items-center gap-8 text-sm font-bold">
            <div className="flex gap-2">
              <span className="text-slate-500 uppercase tracking-wider">Grade:</span>
              <span className="border-b border-dashed border-slate-400 min-w-[60px]">{student.className || student.grade || student.class || student.gradeName}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 uppercase tracking-wider">Term:</span>
              <span className="border-b border-dashed border-slate-400 min-w-[60px]">{term.replace('Term ', '')}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 uppercase tracking-wider">Year:</span>
              <span className="border-b border-dashed border-slate-400 min-w-[80px]">{academicYear}</span>
            </div>
          </div>
        </div>

        {/* Student Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm font-medium">
          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="text-slate-500 min-w-[120px]">Name of Pupil:</span>
              <span className="flex-1 border-b border-dashed border-slate-400 font-bold">{student.name}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-500 min-w-[120px]">Examination Number:</span>
              <span className="flex-1 border-b border-dashed border-slate-400 font-mono">{student.studentNumber}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-500 min-w-[120px]">Term commences:</span>
              <span className="flex-1 border-b border-dashed border-slate-400">.............................</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="text-slate-500 min-w-[120px]">Position in Class:</span>
              <span className="flex-1 border-b border-dashed border-slate-400 font-bold text-lg">{student.position || '-'}</span>
              <span className="text-slate-500">Out of</span>
              <span className="border-b border-dashed border-slate-400 min-w-[40px] text-center font-bold">{student.totalStudents || '-'}</span>
              <span className="text-slate-500 ml-2">Pupils</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-500 min-w-[60px]">Colour:</span>
              <span className="flex-1 border-b border-dashed border-slate-400">{getGradeColor(parseFloat(average as string)).name}</span>
            </div>
            <div className="flex gap-6 mt-2">
              <div className="flex gap-2 items-center">
                <span className="text-slate-500">Days Attended:</span>
                <span className="border-b border-dashed border-slate-400 min-w-[50px] text-center">...</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-slate-500">No of Days:</span>
                <span className="border-b border-dashed border-slate-400 min-w-[50px] text-center">...</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="flex-1 min-h-0 overflow-auto">
          <Table className="primary-report-table border-collapse">
            <TableHeader className="bg-slate-100">
              <TableRow className="h-12 text-[10px] sm:text-xs font-black uppercase text-slate-700">
                <TableHead className="w-[30%] border border-slate-300">SUBJECT</TableHead>
                <TableHead className="w-[10%] border border-slate-300 text-center">TEST 1 %</TableHead>
                <TableHead className="w-[10%] border border-slate-300 text-center">TEST 2 %</TableHead>
                <TableHead className="w-[10%] border border-slate-300 text-center">TEST 3 %</TableHead>
                <TableHead className="w-[10%] border border-slate-300 text-center">AV MARKS</TableHead>
                <TableHead className="w-[10%] border border-slate-300 text-center">MARKS SCORED</TableHead>
                <TableHead className="w-[10%] border border-slate-300 text-center">OUT OF</TableHead>
                <TableHead className="w-[10%] border border-slate-300 text-center">COLOUR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjectList.map((sub: any, i: number) => {
                // Determine which percentage to use for "AV MARKS" and "MARKS SCORED"
                // If "End of Term" exists, use that, otherwise use "Mid Term", otherwise average of tests
                const endOfTerm = sub.tests['End of Term'];
                const midTerm = sub.tests['Mid Term'];
                const tests = [sub.tests['Test 1'], sub.tests['Test 2'], sub.tests['Test 3']].filter(v => v !== null);
                const testAvg = tests.length > 0 ? tests.reduce((a: any, b: any) => a + b, 0) / tests.length : null;
                
                const finalPercentage = endOfTerm ?? midTerm ?? testAvg ?? 0;
                const color = getGradeColor(finalPercentage);
                
                return (
                  <TableRow key={i} className="h-10 text-xs sm:text-sm">
                    <TableCell className="border border-slate-300 font-bold text-slate-800 py-1 pl-4 uppercase">
                      {sub.name}
                    </TableCell>
                    <TableCell className="border border-slate-300 text-center py-1">{sub.tests['Test 1'] ?? '-'}</TableCell>
                    <TableCell className="border border-slate-300 text-center py-1">{sub.tests['Test 2'] ?? '-'}</TableCell>
                    <TableCell className="border border-slate-300 text-center py-1">{sub.tests['Test 3'] ?? '-'}</TableCell>
                    <TableCell className="border border-slate-300 text-center py-1 font-bold">{finalPercentage ? Math.round(finalPercentage) + '%' : '-'}</TableCell>
                    <TableCell className="border border-slate-300 text-center py-1 font-bold">{finalPercentage ? Math.round(finalPercentage) : '-'}</TableCell>
                    <TableCell className="border border-slate-300 text-center py-1">{maxMark}</TableCell>
                    <TableCell className={`border border-slate-300 text-center py-1 ${color.class}`}>
                      {color.name}
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Fill remaining space with empty rows to look like the book */}
              {Array.from({ length: Math.max(0, 12 - subjectList.length) }).map((_, i) => (
                <TableRow key={`empty-${i}`} className="h-10">
                  <TableCell className="border border-slate-300 py-1"></TableCell>
                  <TableCell className="border border-slate-300 py-1"></TableCell>
                  <TableCell className="border border-slate-300 py-1"></TableCell>
                  <TableCell className="border border-slate-300 py-1"></TableCell>
                  <TableCell className="border border-slate-300 py-1"></TableCell>
                  <TableCell className="border border-slate-300 py-1"></TableCell>
                  <TableCell className="border border-slate-300 py-1"></TableCell>
                  <TableCell className="border border-slate-300 py-1"></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Legend Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-200">
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grading Scale (Performance Category)</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-bold uppercase">
              <div className="flex justify-between items-center bg-red-50 p-1 px-2 rounded">
                <span className="text-red-700">A. Red - Excellent</span>
                <span>{Math.round(maxMark * 0.75)}-{maxMark}%</span>
              </div>
              <div className="flex justify-between items-center bg-orange-50 p-1 px-2 rounded">
                <span className="text-orange-700">B. Orange - Very Good</span>
                <span>{Math.round(maxMark * 0.60)}-{Math.round(maxMark * 0.74)}%</span>
              </div>
              <div className="flex justify-between items-center bg-yellow-50 p-1 px-2 rounded">
                <span className="text-yellow-700">C. Yellow - Good</span>
                <span>{Math.round(maxMark * 0.50)}-{Math.round(maxMark * 0.59)}%</span>
              </div>
              <div className="flex justify-between items-center bg-blue-50 p-1 px-2 rounded">
                <span className="text-blue-700">D. Blue - B. Average</span>
                <span>{Math.round(maxMark * 0.49)}-Below</span>
              </div>
            </div>
            
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Academic Standard</h4>
            <div className="flex flex-wrap gap-2 text-[9px] font-bold">
               <span className="bg-slate-100 px-2 py-0.5 rounded">A+ ({Math.round(maxMark * 0.86)}-{maxMark}) DISTINCTION</span>
               <span className="bg-slate-100 px-2 py-0.5 rounded">A ({Math.round(maxMark * 0.76)}-{Math.round(maxMark * 0.85)}) DISTINCTION</span>
               <span className="bg-slate-100 px-2 py-0.5 rounded">B+ ({Math.round(maxMark * 0.66)}-{Math.round(maxMark * 0.75)}) MERIT</span>
               <span className="bg-slate-100 px-2 py-0.5 rounded">B ({Math.round(maxMark * 0.56)}-{Math.round(maxMark * 0.65)}) CREDIT</span>
               <span className="bg-slate-100 px-2 py-0.5 rounded">C+ ({Math.round(maxMark * 0.46)}-{Math.round(maxMark * 0.55)}) DEF. PASS</span>
               <span className="bg-slate-100 px-2 py-0.5 rounded">C ({Math.round(maxMark * 0.40)}-{Math.round(maxMark * 0.45)}) PASS</span>
               <span className="bg-slate-100 px-2 py-0.5 rounded">F (0-{Math.round(maxMark * 0.39)}) FAIL</span>
            </div>
          </div>

          <div className="flex flex-col justify-end items-end space-y-4">
             <div className="flex flex-col items-center">
                <QRCodeSVG value={verificationUrl} size={64} className="opacity-80" />
                <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Scan to Verify</p>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 italic">"Progressing with Excellence"</p>
             </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="space-y-6 pt-4 border-t-2 border-[#8e44ad]/20">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Class teacher's comments:</p>
            <p className="text-sm font-serif italic border-b border-dashed border-slate-300 min-h-[3rem] pt-1">
               {/* Automated comment or empty lines */}
               Wonderful results. Keep on working hard. There is more potential.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Head teacher's comments:</p>
            <p className="text-sm font-serif italic border-b border-dashed border-slate-300 min-h-[3rem] pt-1">
               Well done.
            </p>
          </div>
        </div>

        {/* Signatures Section */}
        <div className="flex justify-between items-end pt-12">
          <div className="space-y-1 flex-1 max-w-[250px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Parents/Guardian's Signature:</p>
            <div className="border-b border-slate-400 w-full"></div>
          </div>
          <div className="flex items-end gap-12">
             <div className="flex flex-col items-center">
                <div className="h-12 flex items-end">
                   {school?.signature_url && <img src={school.signature_url} className="max-h-full" />}
                </div>
                <div className="border-b border-slate-400 w-32 mt-1"></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Head Teacher</p>
             </div>
             <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center">
                   <p className="text-[8px] text-slate-300 text-center px-2">School Stamp</p>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sign</p>
             </div>
          </div>
        </div>

        <div className="text-[8px] text-slate-300 text-center pt-4 uppercase tracking-[0.2em]">
          Official Primary School Progress Report
        </div>
      </div>
    </div>
  );
};
