
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from "@/lib/utils";

interface JuniorReportCardProps {
  data: {
    student: any;
    grades: any[];
    gradingScale: any[];
    school: any;
  };
}

export const JuniorReportCard: React.FC<JuniorReportCardProps> = ({ data }) => {
  const { student, grades, school } = data;

  // Group grades by subject
  const subjectGrades = grades.reduce((acc: any, curr: any) => {
    const subjectName = curr.subjects?.name || curr.subjectName || "Unknown";
    if (!acc[subjectName]) {
      acc[subjectName] = {
        name: subjectName,
        test1: '-',
        test2: '-',
        test3: '-',
        avMarks: '-',
        marksScored: '-',
        outOf: '100',
        colour: '-',
        percentage: 0
      };
    }

    const type = curr.exam_type || curr.examType;
    const score = curr.percentage;

    if (type === 'Test 1') acc[subjectName].test1 = score;
    else if (type === 'Test 2') acc[subjectName].test2 = score;
    else if (type === 'Test 3') acc[subjectName].test3 = score;
    else if (type === 'End of Term' || type === 'Final Exam') {
      acc[subjectName].marksScored = score;
      acc[subjectName].percentage = score;
    }

    return acc;
  }, {});

  const subjectsList = Object.values(subjectGrades);

  // Helper to get color label from percentage
  const getColorLabel = (percentage: any) => {
    const p = parseFloat(percentage);
    if (isNaN(p)) return '-';
    if (p >= 75) return 'RED';
    if (p >= 60) return 'ORANGE';
    if (p >= 50) return 'YELLOW';
    return 'BLUE';
  };

  const getPerformanceColor = (label: string) => {
    switch (label.toUpperCase()) {
      case 'RED': return 'bg-red-500 text-white';
      case 'ORANGE': return 'bg-orange-500 text-white';
      case 'YELLOW': return 'bg-yellow-400 text-black';
      case 'BLUE': return 'bg-blue-500 text-white';
      default: return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-0">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
        <div className="flex gap-4">
          {school?.logo_url && (
            <img src={school.logo_url} alt="Logo" className="h-20 w-20 object-contain" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-black uppercase">{school?.name}</h1>
            <p className="text-sm text-slate-600">{school?.address}</p>
            <p className="text-sm text-slate-600">{school?.phone} | {school?.email}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="inline-block border-2 border-black p-2 bg-slate-50">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Progress Report</p>
            <h2 className="text-xl font-black">GRADES 1 - 4</h2>
          </div>
        </div>
      </div>

      {/* Student Info Grid */}
      <div className="grid grid-cols-2 gap-y-4 mb-8 text-sm">
        <div className="flex border-b border-dotted border-black pb-1 mr-4">
          <span className="font-bold mr-2 uppercase w-32">Grade:</span>
          <span className="flex-1">{student.className || student.grade || student.class || student.gradeName}</span>
        </div>
        <div className="flex border-b border-dotted border-black pb-1">
          <span className="font-bold mr-2 uppercase w-20">Term:</span>
          <span className="flex-1">{grades[0]?.term || 'ONE'}</span>
        </div>
        <div className="flex border-b border-dotted border-black pb-1 mr-4">
          <span className="font-bold mr-2 uppercase w-32">Year:</span>
          <span className="flex-1">{grades[0]?.academic_year || new Date().getFullYear()}</span>
        </div>
        <div className="flex border-b border-dotted border-black pb-1">
          <span className="font-bold mr-2 uppercase w-20">Name:</span>
          <span className="flex-1 font-bold">{student.full_name || student.name}</span>
        </div>
      </div>

      {/* Results Table */}
      <div className="mb-8 overflow-hidden border-2 border-black">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-black">
              <th className="border-r border-black p-2 text-left text-xs font-black uppercase w-8">#</th>
              <th className="border-r border-black p-2 text-left text-xs font-black uppercase">Subject</th>
              <th className="border-r border-black p-2 text-center text-xs font-black uppercase w-16">Test 1</th>
              <th className="border-r border-black p-2 text-center text-xs font-black uppercase w-16">Test 2</th>
              <th className="border-r border-black p-2 text-center text-xs font-black uppercase w-16">Test 3</th>
              <th className="border-r border-black p-2 text-center text-xs font-black uppercase w-16">AV Marks</th>
              <th className="border-r border-black p-2 text-center text-xs font-black uppercase w-16 whitespace-pre-wrap">Marks Scored</th>
              <th className="border-r border-black p-2 text-center text-xs font-black uppercase w-16">Out Of</th>
              <th className="p-2 text-center text-xs font-black uppercase w-20">Colour</th>
            </tr>
          </thead>
          <tbody>
            {subjectsList.map((subject: any, idx) => {
              const colorLabel = getColorLabel(subject.percentage);
              return (
                <tr key={idx} className="border-b border-black last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="border-r border-black p-2 text-center text-xs font-bold">{idx + 1}</td>
                  <td className="border-r border-black p-2 text-xs font-bold uppercase">{subject.name}</td>
                  <td className="border-r border-black p-2 text-center text-sm">{subject.test1}</td>
                  <td className="border-r border-black p-2 text-center text-sm">{subject.test2}</td>
                  <td className="border-r border-black p-2 text-center text-sm">{subject.test3}</td>
                  <td className="border-r border-black p-2 text-center text-sm">{subject.avMarks}</td>
                  <td className="border-r border-black p-2 text-center text-sm font-bold">{subject.marksScored}</td>
                  <td className="border-r border-black p-2 text-center text-sm">{subject.outOf}</td>
                  <td className={cn("p-2 text-center text-[10px] font-black tracking-tight", getPerformanceColor(colorLabel))}>
                    {colorLabel}
                  </td>
                </tr>
              );
            })}
            {subjectsList.length === 0 && (
              <tr>
                <td colSpan={9} className="p-12 text-center text-slate-400 italic">No academic data found for this term.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Grading Key */}
      <div className="mb-8 grid grid-cols-4 gap-2">
        <div className="border border-black p-2 flex items-center justify-between">
          <span className="text-[10px] font-bold">RED: EXCELLENT (75-100%)</span>
          <div className="w-3 h-3 bg-red-500 border border-black"></div>
        </div>
        <div className="border border-black p-2 flex items-center justify-between">
          <span className="text-[10px] font-bold">ORANGE: VERY GOOD (60-74%)</span>
          <div className="w-3 h-3 bg-orange-500 border border-black"></div>
        </div>
        <div className="border border-black p-2 flex items-center justify-between">
          <span className="text-[10px] font-bold">YELLOW: GOOD (50-59%)</span>
          <div className="w-3 h-3 bg-yellow-400 border border-black"></div>
        </div>
        <div className="border border-black p-2 flex items-center justify-between">
          <span className="text-[10px] font-bold">BLUE: AVERAGE (BELOW 50%)</span>
          <div className="w-3 h-3 bg-blue-500 border border-black"></div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="space-y-6">
        <div>
          <p className="text-xs font-black uppercase mb-1 flex items-center gap-2">
            <span className="bg-black text-white px-1 py-0.5">01</span> Class Teacher's Comments
          </p>
          <div className="border-b-2 border-black min-h-[40px] italic text-sm pt-2">
            {student.teacher_comment || "Good results, keep it up."}
          </div>
        </div>
        <div>
          <p className="text-xs font-black uppercase mb-1 flex items-center gap-2">
            <span className="bg-black text-white px-1 py-0.5">02</span> Head Teacher's Comments
          </p>
          <div className="border-b-2 border-black min-h-[40px] italic text-sm pt-2">
            {student.head_teacher_comment || "Great work display."}
          </div>
        </div>
        <div>
          <p className="text-xs font-black uppercase mb-1 flex items-center gap-2">
            <span className="bg-black text-white px-1 py-0.5">03</span> Support Plan
          </p>
          <div className="border-b-2 border-black min-h-[40px] italic text-sm pt-2">
            {student.support_plan || "Continue working hard in all subjects."}
          </div>
        </div>
      </div>

      {/* Footer / Signatures */}
      <div className="mt-12 pt-8 flex justify-between items-center text-xs font-bold border-t border-slate-200">
        <div className="text-center w-48">
          <div className="border-b border-black mb-1 h-8"></div>
          <p>CLASS TEACHER SIGN</p>
        </div>
        <div className="text-center w-48">
          <div className="border-b border-black mb-1 h-8 flex items-end justify-center">
            {school?.signature_url && <img src={school.signature_url} className="h-10" alt="Sign" />}
          </div>
          <p>HEAD TEACHER SIGN</p>
        </div>
        <div className="text-center w-48">
          <div className="border-b border-black mb-1 h-8 flex items-end justify-center">
             {school?.seal_url && <img src={school.seal_url} className="h-12" alt="Seal" />}
          </div>
          <p>SCHOOL STAMP</p>
        </div>
      </div>
    </div>
  );
};
