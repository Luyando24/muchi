import React from 'react';
import { cn } from '@/lib/utils';
import { filterScalesForSection } from '@shared/gradingScale';

interface PreschoolReportCardProps {
  data: {
    student: any;
    grades: any[];
    gradingScale: any[];
    school: any;
  };
}

// Star rating component for developmental levels
const StarRating = ({ level }: { level: number }) => (
  <div className="flex gap-0.5 justify-center">
    {[1, 2, 3, 4].map((star) => (
      <span
        key={star}
        className={cn(
          'text-lg leading-none',
          star <= level ? 'text-amber-400' : 'text-slate-200',
        )}
      >
        ★
      </span>
    ))}
  </div>
);

// Map grade descriptor → star count & colour
function gradeToLevel(grade: string): { stars: number; colour: string; label: string } {
  const g = (grade || '').toLowerCase().trim();
  if (g.includes('excelling'))  return { stars: 4, colour: 'bg-emerald-500 text-white', label: 'EXCELLING' };
  if (g.includes('achieving'))  return { stars: 3, colour: 'bg-blue-500 text-white',    label: 'ACHIEVING' };
  if (g.includes('developing')) return { stars: 2, colour: 'bg-amber-500 text-white',   label: 'DEVELOPING' };
  return                               { stars: 1, colour: 'bg-rose-500 text-white',    label: 'EMERGING' };
}

export const PreschoolReportCard: React.FC<PreschoolReportCardProps> = ({ data }) => {
  const { student, grades, school } = data;

  // ── Group grades by subject ──────────────────────────────────────────────────
  const subjectGrades = grades.reduce((acc: any, curr: any) => {
    const subjectName = curr.subjects?.name || curr.subjectName || 'Unknown';
    if (!acc[subjectName]) {
      acc[subjectName] = {
        name: subjectName,
        test1: '-',
        test2: '-',
        test3: '-',
        marksScored: '-',
        percentage: 0,
        grade: '',
        teacherName: curr.subjects?.teacherName || null,
      };
    }

    const type  = curr.exam_type  || curr.examType  || '';
    const tType = curr.test_type  || curr.testType  || '';
    const score = curr.percentage;

    if (tType === 'Test 1' || type === 'Test 1') acc[subjectName].test1 = score;
    else if (tType === 'Test 2' || type === 'Test 2') acc[subjectName].test2 = score;
    else if (tType === 'Test 3' || type === 'Test 3') acc[subjectName].test3 = score;
    else if (type === 'End of Term' || type === 'Final Exam' || type === 'Term') {
      acc[subjectName].marksScored = score;
      acc[subjectName].percentage  = score;
    }

    // Recalculate average if tests exist but no final mark
    const tests = [acc[subjectName].test1, acc[subjectName].test2, acc[subjectName].test3]
      .filter((v) => v !== '-');
    if (tests.length > 0 && (acc[subjectName].marksScored === '-' || type === 'Term')) {
      const avg = tests.reduce((a, b) => Number(a) + Number(b), 0) / tests.length;
      acc[subjectName].marksScored = Math.round(avg);
      acc[subjectName].percentage  = avg;
    }

    // Resolve grade descriptor
    const p = parseFloat(acc[subjectName].percentage);
    if (!isNaN(p)) {
      if (data.gradingScale && data.gradingScale.length > 0) {
        const filteredScales = filterScalesForSection(data.gradingScale, 'preschool');
        const match = filteredScales.find((s) => p >= s.min_percentage && p <= s.max_percentage);
        if (match) acc[subjectName].grade = match.grade;
      }
      if (!acc[subjectName].grade) {
        if (p >= 75) acc[subjectName].grade = 'Excelling';
        else if (p >= 50) acc[subjectName].grade = 'Achieving';
        else if (p >= 25) acc[subjectName].grade = 'Developing';
        else acc[subjectName].grade = 'Emerging';
      }
    }

    return acc;
  }, {});

  const subjectsList = Object.values(subjectGrades) as any[];
  const term = grades[0]?.term || 'ONE';
  const academicYear = grades[0]?.academic_year || new Date().getFullYear();

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-0 font-sans">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
        <div className="flex gap-4 items-center">
          {school?.logo_url && (
            <img src={school.logo_url} alt="School Logo" className="h-20 w-20 object-contain" />
          )}
          <div>
            <h1 className="text-2xl font-black text-black uppercase">{school?.name}</h1>
            <p className="text-sm text-slate-600">{school?.address}</p>
            <p className="text-sm text-slate-600">{school?.phone}{school?.email ? ` | ${school.email}` : ''}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="inline-block border-2 border-black p-2 bg-amber-50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Early Childhood Development</p>
            <h2 className="text-lg font-black text-amber-700 uppercase">Progress Report</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pre-School</p>
          </div>
        </div>
      </div>

      {/* ── Student Info ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-y-3 mb-6 text-sm">
        <div className="flex border-b border-dotted border-black pb-1 mr-4">
          <span className="font-bold mr-2 uppercase w-28">Pupil Name:</span>
          <span className="flex-1 font-bold">{student.full_name || student.name}</span>
        </div>
        <div className="flex border-b border-dotted border-black pb-1">
          <span className="font-bold mr-2 uppercase w-20">Class:</span>
          <span className="flex-1">{student.className || student.grade || student.class || student.gradeName}</span>
        </div>
        <div className="flex border-b border-dotted border-black pb-1 mr-4">
          <span className="font-bold mr-2 uppercase w-28">Academic Year:</span>
          <span className="flex-1">{academicYear}</span>
        </div>
        <div className="flex border-b border-dotted border-black pb-1">
          <span className="font-bold mr-2 uppercase w-20">Term:</span>
          <span className="flex-1">{term}</span>
        </div>
        {school?.show_teacher_on_report_card && student.classTeacherName && (
          <div className="flex border-b border-dotted border-black pb-1 mr-4 col-span-2">
            <span className="font-bold mr-2 uppercase w-28">Class Teacher:</span>
            <span className="flex-1">{student.classTeacherName}</span>
          </div>
        )}
      </div>

      {/* ── Learning Areas Table ───────────────────────────────────────────── */}
      <div className="mb-6 overflow-hidden border-2 border-black">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-amber-50 border-b-2 border-black">
              <th className="border-r border-black p-2 text-left text-xs font-black uppercase w-8">#</th>
              <th className="border-r border-black p-2 text-left text-xs font-black uppercase">Learning Area</th>
              <th className="border-r border-black p-2 text-center text-xs font-black uppercase w-16">Term 1</th>
              <th className="border-r border-black p-2 text-center text-xs font-black uppercase w-16">Term 2</th>
              <th className="border-r border-black p-2 text-center text-xs font-black uppercase w-16">Term 3</th>
              <th className="border-r border-black p-2 text-center text-xs font-black uppercase w-24">Stars</th>
              <th className={cn(
                'text-center text-xs font-black uppercase w-28',
                school?.show_teacher_on_report_card ? 'border-r border-black p-2' : 'p-2',
              )}>Level</th>
              {school?.show_teacher_on_report_card && (
                <th className="p-2 text-center text-xs font-black uppercase w-28">Teacher</th>
              )}
            </tr>
          </thead>
          <tbody>
            {subjectsList.map((subject: any, idx: number) => {
              const { stars, colour, label } = gradeToLevel(subject.grade);
              return (
                <tr key={idx} className="border-b border-black last:border-0 hover:bg-amber-50/40 transition-colors">
                  <td className="border-r border-black p-2 text-center text-xs font-bold">{idx + 1}</td>
                  <td className="border-r border-black p-2 text-xs font-bold uppercase">{subject.name}</td>
                  <td className="border-r border-black p-2 text-center text-sm">{subject.test1 !== '-' ? subject.test1 : '-'}</td>
                  <td className="border-r border-black p-2 text-center text-sm">{subject.test2 !== '-' ? subject.test2 : '-'}</td>
                  <td className="border-r border-black p-2 text-center text-sm">{subject.test3 !== '-' ? subject.test3 : '-'}</td>
                  <td className="border-r border-black p-2">
                    {subject.grade ? <StarRating level={stars} /> : <span className="text-slate-300 text-xs text-center block">—</span>}
                  </td>
                  <td className={cn(
                    'text-center text-[10px] font-black tracking-tight py-1 px-2',
                    school?.show_teacher_on_report_card ? 'border-r border-black' : '',
                    subject.grade ? colour : 'text-slate-400',
                  )}>
                    {label || '—'}
                  </td>
                  {school?.show_teacher_on_report_card && (
                    <td className="p-2 text-center text-xs font-semibold capitalize italic">
                      {subject.teacherName || '-'}
                    </td>
                  )}
                </tr>
              );
            })}
            {subjectsList.length === 0 && (
              <tr>
                <td
                  colSpan={school?.show_teacher_on_report_card ? 8 : 7}
                  className="p-12 text-center text-slate-400 italic"
                >
                  No learning area data found for this term.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Developmental Scale Key ────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Developmental Scale</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'EXCELLING',  desc: 'Outstanding progress (75–100%)',     colour: 'bg-emerald-500', stars: 4 },
            { label: 'ACHIEVING',  desc: 'Meeting expectations (50–74%)',       colour: 'bg-blue-500',    stars: 3 },
            { label: 'DEVELOPING', desc: 'Working towards goals (25–49%)',      colour: 'bg-amber-500',   stars: 2 },
            { label: 'EMERGING',   desc: 'Beginning to show awareness (0–24%)', colour: 'bg-rose-500',    stars: 1 },
          ].map((band) => (
            <div key={band.label} className="border border-black p-2 space-y-1">
              <div className={cn('text-white text-[10px] font-black text-center py-0.5', band.colour)}>{band.label}</div>
              <StarRating level={band.stars} />
              <p className="text-[9px] text-slate-600 text-center leading-tight">{band.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Comments ──────────────────────────────────────────────────────── */}
      <div className="space-y-4 mb-6">
        <div>
          <p className="text-xs font-black uppercase mb-1 flex items-center gap-2">
            <span className="bg-amber-500 text-white px-1 py-0.5 text-[10px]">01</span>
            Class Teacher's Comments
          </p>
          <div className="border-b-2 border-black min-h-[40px] italic text-sm pt-2">
            {student.teacher_comment || 'Well done! Keep exploring and learning.'}
          </div>
        </div>
        <div>
          <p className="text-xs font-black uppercase mb-1 flex items-center gap-2">
            <span className="bg-amber-500 text-white px-1 py-0.5 text-[10px]">02</span>
            Head Teacher's Comments
          </p>
          <div className="border-b-2 border-black min-h-[40px] italic text-sm pt-2">
            {student.head_teacher_comment || 'Great participation this term.'}
          </div>
        </div>
        <div>
          <p className="text-xs font-black uppercase mb-1 flex items-center gap-2">
            <span className="bg-amber-500 text-white px-1 py-0.5 text-[10px]">03</span>
            Parent / Guardian Feedback
          </p>
          <div className="border-b-2 border-black min-h-[40px]" />
        </div>
      </div>

      {/* ── Next Term Info ─────────────────────────────────────────────────── */}
      {(student.next_term_begins || school?.next_term_date) && (
        <div className="mb-4 p-2 border border-dashed border-amber-400 bg-amber-50 text-center">
          <p className="text-xs font-bold text-amber-800">
            Next Term Begins: {student.next_term_begins || school?.next_term_date}
          </p>
        </div>
      )}

      {/* ── Signatures ────────────────────────────────────────────────────── */}
      <div className="mt-8 pt-6 flex justify-between items-end text-xs font-bold border-t border-slate-200">
        <div className="text-center w-44">
          <div className="border-b border-black mb-1 h-10" />
          <p>CLASS TEACHER SIGN</p>
        </div>
        <div className="text-center w-44">
          <div className="border-b border-black mb-1 h-10 flex items-end justify-center">
            {school?.signature_url && (
              <img src={school.signature_url} className="h-10" alt="Head Teacher Signature" />
            )}
          </div>
          <p>HEAD TEACHER SIGN</p>
        </div>
        <div className="text-center w-44">
          <div className="border-b border-black mb-1 h-10 flex items-end justify-center">
            {school?.seal_url && (
              <img src={school.seal_url} className="h-12" alt="School Seal" />
            )}
          </div>
          <p>SCHOOL STAMP</p>
        </div>
      </div>
    </div>
  );
};
