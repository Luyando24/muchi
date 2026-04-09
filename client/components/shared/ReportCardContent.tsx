
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
  examType: string;
  academicYear: string;
  className?: string;
}

export const ReportCardContent = ({ data, term, examType, academicYear, className = "" }: ReportCardContentProps) => {
  const { student, grades, gradingScale, school } = data;

  // Calculate Metrics
  const totalPercentage = grades.reduce((sum: number, g: any) => sum + (g.percentage || 0), 0);
  const average = grades.length > 0 ? (totalPercentage / grades.length).toFixed(1) : 0;

  return (
    <div className={`relative flex flex-col bg-white overflow-hidden print:overflow-hidden print:w-[210mm] print:h-[297mm] mx-auto my-8 print:my-0 shadow-2xl print:shadow-none rounded-3xl print:rounded-none ${className}`}>
      <style type="text/css" media="print">
        {`
          @page { size: A4; margin: 0; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        `}
      </style>

      {/* Decorative Background Flourish (Watermark Style) */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none print:hidden" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-50/30 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none print:hidden" />

      {/* Global Watermark */}
      {school?.logo_url && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0 overflow-hidden">
          <img src={school.logo_url} alt="" className="w-[80%] object-contain grayscale" />
        </div>
      )}

      {/* Document Content */}
      <div className="relative z-10 flex-1 flex flex-col p-12 print:p-6 print:pt-4 space-y-8 print:space-y-2 h-full justify-between">

        {/* Minimal Header Section */}
        <div className="flex justify-between items-start pb-8 print:pb-2">
          <div className="flex gap-8 items-center">
            {school?.logo_url ? (
              <div className="h-24 w-24 bg-white rounded-full shadow-sm border border-slate-100 p-4 flex items-center justify-center text-slate-400">
                <img src={school.logo_url} alt="School Logo" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div className="h-24 w-24 bg-white rounded-full shadow-sm border border-slate-100 p-4 flex items-center justify-center">
                <img src="/images/arakan-logo.png" alt="Logo" className="max-h-full max-w-full object-contain" />
              </div>
            )}
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight text-slate-900">{school?.name || 'MUCHI ACADEMY'}</h1>
              <div className="text-sm font-medium text-slate-500 flex flex-col gap-1">
                {school?.address && <p>{school.address}</p>}
                <div className="flex gap-4 text-slate-400 text-xs uppercase tracking-wider">
                  {school?.email && <p>{school.email}</p>}
                  {school?.phone && <p>{school.phone}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="text-right space-y-2">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold tracking-widest uppercase">
              Official Report
            </div>
            <p className="text-xs font-bold text-slate-900">{term} - {examType}</p>
            <p className="text-xs text-slate-500">Academic Year {academicYear}</p>
          </div>
        </div>

        {/* Minimal Student Information */}
        <div className="flex justify-between items-end pb-8 print:pb-2 border-b border-slate-100">
          <div className="space-y-4 print:space-y-1">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Student Name</p>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">{student.name}</h2>
            </div>
          </div>
          <div className="text-right space-y-4 print:space-y-1">
            <div className="flex gap-8 justify-end">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 print:mb-0">Student ID</p>
                <p className="text-sm font-bold text-slate-700 font-mono">{student.studentNumber}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 print:mb-0">Class</p>
                <p className="text-sm font-bold text-slate-700">{student.class}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grades Analysis Section */}
        <div className="flex-1 print:flex-none min-h-0 space-y-8 print:space-y-2 my-8 print:my-2">
          {/* ECZ-Style Results Slip Section */}
          <div className="flex-1 print:flex-none min-h-0 space-y-4 print:space-y-2 relative">
            <div className="flex justify-between items-center border-b border-slate-900 pb-4 mb-8 print:mb-2 print:pb-2">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Academic Results</h3>
              <span className="text-xs font-mono text-slate-400">{Math.floor(1000000 + Math.random() * 9000000)}</span>
            </div>

            <div className="relative isolate">
              <div className="overflow-hidden print:overflow-visible">
                <Table>
                  <TableHeader className="border-b border-slate-900">
                    <TableRow className="hover:bg-transparent border-none h-12">
                      <TableHead className="w-[40%] text-xs font-bold text-slate-900 uppercase tracking-widest pl-0">Subject</TableHead>
                      <TableHead className="w-[20%] text-xs font-bold text-slate-900 uppercase tracking-widest text-center">Score %</TableHead>
                      <TableHead className="w-[20%] text-xs font-bold text-slate-900 uppercase tracking-widest text-center">Grade</TableHead>
                      <TableHead className="w-[20%] text-xs font-bold text-slate-900 uppercase tracking-widest text-right pr-0">Standard</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const getStandardFromScale = (percentage: any) => {
                        const isAbsent = percentage === null || percentage === undefined || percentage === '';
                        if (isAbsent) return { grade: 'ABSENT', standard: 'NOT RECORDED' };

                        const score = Number(percentage);
                        
                        if (gradingScale && gradingScale.length > 0) {
                          // Sort gradingScale by min_percentage descending to find the highest match first
                          const sortedScale = [...gradingScale].sort((a: any, b: any) => b.min_percentage - a.min_percentage);

                          for (const scale of sortedScale) {
                            if (score >= scale.min_percentage) {
                              return { grade: scale.grade, standard: scale.description.toUpperCase() };
                            }
                          }
                          // If score is lower than the lowest scale (usually Fail)
                          return { grade: 'F', standard: 'FAIL' };
                        }

                        // Fallback to ECZ-style if no custom scale is set
                        if (score >= 75) return { grade: 'ONE', standard: 'DISTINCTION' };
                        if (score >= 70) return { grade: 'TWO', standard: 'DISTINCTION' };
                        if (score >= 65) return { grade: 'THREE', standard: 'MERIT' };
                        if (score >= 60) return { grade: 'FOUR', standard: 'MERIT' };
                        if (score >= 55) return { grade: 'FIVE', standard: 'CREDIT' };
                        if (score >= 50) return { grade: 'SIX', standard: 'CREDIT' };
                        if (score >= 45) return { grade: 'SEVEN', standard: 'PASS' };
                        if (score >= 40) return { grade: 'EIGHT', standard: 'PASS' };
                        return { grade: 'NINE', standard: 'FAIL' };
                      };

                      const subjectsPassed = grades.filter((g: any) => {
                        const data = getStandardFromScale(g.percentage);
                        return !['FAIL', 'ABSENT', 'NOT RECORDED', 'UNKNOWN'].includes(data.standard);
                      }).length;

                      return (
                        <>
                          {grades.length > 0 ? (
                            grades.map((g: any, i: number) => {
                              const standardData = getStandardFromScale(g.percentage);
                              const isAbsent = g.percentage === null || g.percentage === undefined || g.percentage === '';
                              
                              return (
                                <TableRow key={g.id || `missing-${i}`} className="border-b border-slate-100 last:border-0 hover:bg-transparent h-14 print:h-10">
                                  <TableCell className="py-2 pl-0 font-bold text-slate-700">
                                    <div className="flex gap-6 items-center">
                                      <span className="uppercase tracking-tight text-sm print:text-xs">{g.subjects?.name || 'Unknown Subject'}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2 px-4 text-center font-bold text-slate-700 text-sm print:text-xs">
                                    {isAbsent ? '-' : `${g.percentage}%`}
                                  </TableCell>
                                  <TableCell className="py-2 px-4 text-center font-black text-slate-900 text-lg print:text-sm">
                                    {standardData.grade}
                                  </TableCell>
                                  <TableCell className="py-2 pr-0 text-right font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                                    {isAbsent ? (
                                      <span className="text-slate-300 italic font-medium">{standardData.standard}</span>
                                    ) : (
                                      standardData.standard
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-16">
                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                  <p className="text-sm font-medium">No academic records found</p>
                                  <p className="text-xs opacity-70">Grades for this term have not been published yet.</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          {grades.length > 0 && (
                            <TableRow className="border-t border-slate-900 mt-8 print:mt-4 block">
                              <TableCell colSpan={4} className="p-4 print:p-2 pl-0">
                                <div className="flex justify-between items-center text-xs font-bold text-slate-900 uppercase tracking-widest gap-4">
                                  <div>RECORDED: {grades.length}</div>
                                  {school?.school_type === 'Basic' && (
                                    <div className="bg-slate-900 text-white px-3 py-1 rounded-sm">TOTAL MARKS: {totalPercentage}</div>
                                  )}
                                  <div>PASSED: {subjectsPassed}</div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Analytics */}
        <div className="grid grid-cols-12 gap-6 print:gap-4 print:space-y-0">
          <div className="col-span-8 print:col-span-8 flex flex-col gap-4">
            <div className="flex-1 py-4 print:py-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 print:mb-1">
                Class Insights
              </h4>
              <p className="text-sm leading-relaxed text-slate-600 font-medium italic border-l-2 border-slate-300 pl-4">
                 Position {student.position || '-'} out of {student.totalStudents || '-'} students. Class Average: {student.classAverage ? student.classAverage.toFixed(1) : '-'}%.
              </p>
            </div>
          </div>

          <div className="col-span-4 print:col-span-4 space-y-4 print:space-y-2 pt-4 print:pt-2">
            <div className="flex flex-col items-end text-right">
              <div className="flex justify-end items-center mb-2 print:mb-1 gap-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendance</span>
                <span className="text-sm font-bold text-slate-900">100%</span>
              </div>
              <div className="h-1 w-32 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Grade Teacher's Remark Box - Full Width */}
        <div className="w-full py-4 print:py-2 border-t border-slate-100 mt-2">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 print:mb-1">
            Grade Teacher's Remark
          </h4>
          <p className="text-[13px] print:text-[11px] leading-relaxed text-slate-800 font-medium font-serif italic border-l-2 border-slate-900 pl-4">
            "{(() => {
              if (!grades || grades.length === 0) return "Academic data unavailable for this period.";
              
              // Helper for student reference
              const firstName = student.name.split(' ')[0];
              const gender = student.gender?.toLowerCase() || '';
              const subjPronoun = gender === 'male' ? 'He' : (gender === 'female' ? 'She' : 'They');
              const objPronoun = gender === 'male' ? 'him' : (gender === 'female' ? 'her' : 'them');
              const possAdj = gender === 'male' ? 'his' : (gender === 'female' ? 'her' : 'their');
              const shows = gender === 'male' || gender === 'female' ? 'shows' : 'show';
              
              // Analysis Variables
              const avg = parseFloat(average as string);
              const validGrades = grades.filter((g: any) => g.percentage !== null && g.percentage !== undefined && g.percentage !== '' && g.grade !== 'ABSENT');
              
              const position = student.position || 0;
              const totalStudents = student.totalStudents || 0;
              const classAvg = student.classAverage || 0;
              const percentile = (position > 0 && totalStudents > 0) ? (position / totalStudents) * 100 : 0;
              
              const isTopRank = percentile > 0 && percentile <= 25;
              const isBottomRank = percentile >= 75;
              const isPassing = avg >= 50;
              const isExcellent = avg >= 75;
              
              // 1. Opening Statement based on combining absolute and relative class-level performance
              let opening = "";
              if (position > 0 && totalStudents > 0) {
                if (isExcellent) {
                  if (isTopRank) {
                    opening = `${firstName} has demonstrated an outstanding grasp of the curriculum, ranking ${position} out of ${totalStudents}.`;
                  } else {
                    opening = `${firstName} has achieved excellent results (${avg}%) in a competitive cohort.`;
                  }
                } else if (isPassing) {
                  if (isTopRank) {
                    opening = `${firstName} secured a commendable rank of ${position} out of ${totalStudents}.`;
                  } else if (!isBottomRank) {
                    if (avg >= classAvg) {
                      opening = `${firstName} performed above the class average (${classAvg.toFixed(1)}%).`;
                    } else {
                      opening = `${firstName} passed but fell slightly below the class average.`;
                    }
                  } else {
                    opening = `${firstName} passed overall, but ranking ${position} out of ${totalStudents} suggests the pace is challenging.`;
                  }
                } else {
                  if (isTopRank) {
                    opening = `Despite ranking ${position}, ${firstName}'s score of ${avg}% indicates challenges with the material.`;
                  } else {
                    opening = `${firstName} struggled this term, placing below the class average (${avg}%).`;
                  }
                }
              } else {
                if (isExcellent) opening = `${firstName} demonstrated an excellent grasp of the curriculum.`;
                else if (avg >= 60) opening = `${firstName} is a capable student who actively participates.`;
                else if (isPassing) opening = `${firstName} showed steady progress this term.`;
                else opening = `${firstName} found the term's concepts challenging.`;
              }

              // 2. Advice & Strengths Analysis
              let advice = "";
              const strongSubjectsCount = validGrades.filter((g: any) => (g.percentage || 0) >= 70).length;
              const totalSubjects = validGrades.length;
              
              if (strongSubjectsCount >= totalSubjects * 0.7 && totalSubjects > 0) {
                advice = `Consistency is a major strength. `;
              } else if (strongSubjectsCount > 0) {
                advice = `${subjPronoun} ${shows} promise in ${possAdj} stronger subjects, which should motivate improvement in weaker areas. `;
              } else {
                advice = `Focus on building foundational understanding is needed. `;
              }

              if (avg < classAvg && avg >= 50) {
                advice += `Daily revision will improve ${possAdj} standing.`;
              } else if (avg < 50) {
                advice += `Remedial sessions are crucial for recovery.`;
              } else if (isExcellent) {
                advice += `Maintain this intellectual curiosity.`;
              } else {
                advice += `Consistent study routines will ensure success.`;
              }

              // Combine parts
              return [opening, advice].filter(Boolean).join(" ");
            })()}"
          </p>
        </div>

        {/* Head Teacher's Remark Box - Full Width */}
        <div className="w-full py-4 print:py-2 border-t border-slate-100 mt-2">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 print:mb-1">
            Head Teacher's Remark
          </h4>
          <p className="text-[13px] print:text-[11px] leading-relaxed text-slate-800 font-medium font-serif italic border-l-2 border-slate-900 pl-4">
            "{(() => {
              if (!grades || grades.length === 0) return "Academic data unavailable for this period.";
              
              // Helper for student reference
              const firstName = student.name.split(' ')[0];
              const gender = student.gender?.toLowerCase() || '';
              const subjPronoun = gender === 'male' ? 'He' : (gender === 'female' ? 'She' : 'They');
              const objPronoun = gender === 'male' ? 'him' : (gender === 'female' ? 'her' : 'them');
              const possAdj = gender === 'male' ? 'his' : (gender === 'female' ? 'her' : 'their');
              const shows = gender === 'male' || gender === 'female' ? 'shows' : 'show';
              
              // Analysis Variables
              const avg = parseFloat(average as string);
              // Filter out absent subjects before sorting
              const validGrades = grades.filter((g: any) => g.percentage !== null && g.percentage !== undefined && g.percentage !== '' && g.grade !== 'ABSENT');
              
              const sortedGrades = [...validGrades].sort((a: any, b: any) => (b.percentage || 0) - (a.percentage || 0));
              const bestSubjects = sortedGrades.slice(0, 3).map((g: any) => g.subjects?.name);
              
              // Expand weak subjects coverage: Take up to 3 subjects with scores < 50%
              const weakSubjects = sortedGrades.slice(-3).filter((g: any) => (g.percentage || 0) < 50).map((g: any) => g.subjects?.name);
              
              // 1. Opening Statement based on Average
              let opening = "";
              if (avg >= 75) opening = `${student.name} produced an outstanding set of results, demonstrating exceptional diligence.`;
              else if (avg >= 65) opening = `${student.name} achieved a very good standard, showing consistent effort.`;
              else if (avg >= 55) opening = `${student.name} performed satisfactorily, though greater consistency is needed.`;
              else if (avg >= 45) opening = `${student.name} made a fair attempt, but must significantly increase study hours.`;
              else opening = `${student.name}'s performance is below standard. An urgent review of study habits is recommended.`;

              // 2. Strengths Analysis
              let strengths = "";
              if (bestSubjects.length > 0) {
                const subjectText = bestSubjects.join(', ').replace(/, ([^,]*)$/, ' and $1');
                if (avg >= 65) strengths = `Particular aptitude is noted in ${subjectText}.`;
                else strengths = `${firstName} ${shows} promise in ${subjectText}.`;
              }

              // 3. Areas for Improvement (only if relevant)
              let improvements = "";
              if (weakSubjects.length > 0) {
                const weakText = weakSubjects.join(', ').replace(/, ([^,]*)$/, ' and $1');
                improvements = `Urgent attention is required in ${weakText}.`;
              } else if (weakSubjects.length === 0 && bestSubjects.length > 0 && bestSubjects.length !== sortedGrades.length) {
                 improvements = `Performance across subjects was consistent.`;
              }

              // Combine parts
              return [opening, strengths, improvements].filter(Boolean).join(" ");
            })()}"
          </p>
        </div>

        {/* Minimal Footer / Authenticity Section */}
        <div className="pt-8 print:pt-4 mt-auto">
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-2 print:space-y-1">
              <div className="h-16 print:h-12 flex items-end">
                {school?.signature_url ? (
                  <img src={school.signature_url} alt="Signature" className="max-h-16 print:max-h-12 object-contain" />
                ) : (
                  <div className="w-full border-b border-slate-300"></div>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Headteacher's Signature</p>
            </div>
            
            <div className="space-y-2 print:space-y-1 text-right flex flex-col items-end">
              <div className="h-20 print:h-16 flex items-end justify-end">
                 {/* Seal Placeholder or Image */}
                 {school?.seal_url ? (
                    <img src={school.seal_url} alt="Seal" className="max-h-20 print:max-h-16 object-contain" />
                 ) : (
                    <div className="h-12 w-12 border-2 border-slate-200 border-dashed rounded-full"></div>
                 )}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Official Seal</p>
            </div>
          </div>

          <div className="flex justify-between items-end mt-8 print:mt-4 pt-4 border-t border-slate-100 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            <p>© {new Date().getFullYear()} {school?.name}</p>
            <p>Generated on {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
