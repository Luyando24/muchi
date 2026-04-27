
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from "@/lib/utils";

interface ReportCardProps {
  data: {
    student: any;
    grades: any[];
    gradingScale: any[];
    school: any;
  };
}

export const ReportCard: React.FC<ReportCardProps> = ({ data }) => {
  const { student, grades, school } = data;

  // Group grades by subject and handle the standard layout
  const subjectGrades = grades.reduce((acc: any, curr: any) => {
    const subjectName = curr.subjects?.name || curr.subjectName || "Unknown";
    if (!acc[subjectName]) {
      acc[subjectName] = {
        name: subjectName,
        score: '-',
        grade: '-',
        comments: '-'
      };
    }

    if (curr.exam_type === 'End of Term' || curr.examType === 'End of Term') {
      acc[subjectName].score = curr.percentage;
      acc[subjectName].grade = curr.grade || '-';
      acc[subjectName].comments = curr.comments || '-';
    }

    return acc;
  }, {});

  const subjectsList = Object.values(subjectGrades);

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-0">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b-2 border-slate-900 pb-6">
        <div className="flex items-center gap-6">
          {school?.logo_url && (
            <img src={school.logo_url} alt="Logo" className="h-24 w-24 object-contain" />
          )}
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none mb-2">{school?.name}</h1>
            <p className="text-sm text-slate-600 font-medium">{school?.address}</p>
            <p className="text-sm text-slate-600 font-medium">{school?.phone} | {school?.email}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="inline-block border-2 border-slate-900 px-4 py-2 bg-slate-900 text-white">
            <h2 className="text-xl font-black tracking-tighter uppercase">Academic Report</h2>
          </div>
        </div>
      </div>

      {/* Student Details */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Name</p>
          <p className="text-sm font-bold text-slate-900 uppercase">{student.full_name || student.name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grade / Class</p>
          <p className="text-sm font-bold text-slate-900 uppercase">{student.className || student.grade}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Term / Year</p>
          <p className="text-sm font-bold text-slate-900 uppercase">
            {grades[0]?.term || 'N/A'} - {grades[0]?.academic_year || new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Main Results Table */}
      <div className="mb-8 border-2 border-slate-900 rounded-lg overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="p-3 text-left font-black uppercase tracking-wider">Subject</th>
              <th className="p-3 text-center font-black uppercase tracking-wider w-24">Score (%)</th>
              <th className="p-3 text-center font-black uppercase tracking-wider w-24">Grade</th>
              <th className="p-3 text-left font-black uppercase tracking-wider">Teacher's Comments</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-100">
            {subjectsList.map((subject: any, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 font-bold text-slate-800">{subject.name}</td>
                <td className="p-3 text-center font-black text-slate-900">{subject.score}</td>
                <td className="p-3 text-center">
                  <span className="inline-block px-3 py-1 bg-slate-100 rounded font-black text-slate-900">
                    {subject.grade}
                  </span>
                </td>
                <td className="p-3 text-slate-600 italic text-xs">{subject.comments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Section */}
      <div className="grid grid-cols-2 gap-8 mt-12">
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Class Teacher's Remarks</p>
            <p className="text-sm text-slate-700 italic">Excellent performance this term. Keep up the hard work.</p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Head Teacher's Remarks</p>
            <p className="text-sm text-slate-700 italic">Promoted to the next level. Congratulations.</p>
          </div>
        </div>
        
        <div className="flex flex-col justify-end items-end space-y-6">
          <div className="text-center w-64 border-t-2 border-slate-900 pt-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Head Teacher Signature</p>
            {school?.signature_url && <img src={school.signature_url} className="h-12 mx-auto mt-2" alt="Signature" />}
          </div>
          <div className="text-center w-64 pt-2">
            {school?.seal_url && <img src={school.seal_url} className="h-20 mx-auto opacity-80" alt="Official Seal" />}
          </div>
        </div>
      </div>
    </div>
  );
};
