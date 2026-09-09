import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ReportCardContent } from '@/components/shared/ReportCardContent';
import { Loader2 } from 'lucide-react';

export default function RenderClassReportCards() {
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get('schoolId') || '';
  const classId = searchParams.get('classId') || '';
  const term = searchParams.get('term') || '';
  const examType = searchParams.get('examType') || '';
  const academicYear = searchParams.get('academicYear') || '';
  const token = searchParams.get('token') || '';

  const [cards, setCards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRenderComplete, setIsRenderComplete] = useState(false);

  useEffect(() => {
    document.body.classList.add('headless-pdf-render');
    let isCancelled = false;

    const fetchCards = async () => {
      try {
        const query = new URLSearchParams({
          schoolId,
          classId,
          term,
          examType,
          academicYear,
          token,
        });

        const res = await fetch(`/api/school/results/internal-class-report-cards?${query.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ message: 'Failed to fetch report cards' }));
          throw new Error(errData.message || 'Failed to fetch report cards');
        }

        const data = await res.json();
        if (!isCancelled) {
          setCards(Array.isArray(data) ? data : []);
          setIsLoading(false);

          // Allow DOM and fonts to settle before signaling completion
          setTimeout(() => {
            if (!isCancelled) {
              setIsRenderComplete(true);
            }
          }, 800);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    fetchCards();
    return () => {
      isCancelled = true;
      document.body.classList.remove('headless-pdf-render');
    };
  }, [schoolId, classId, term, examType, academicYear, token]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
        <p className="text-sm font-semibold text-slate-600">Rendering class report cards for PDF capture…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 font-bold bg-white min-h-screen">
        <p>Render Error: {error}</p>
        <div id="render-error" style={{ display: 'none' }} />
      </div>
    );
  }

  return (
    <div className="bg-white text-black min-h-screen font-sans">
      <style>
        {`
        @page {
          size: A4;
          margin: 10mm;
        }
        body {
          background: white !important;
          margin: 0;
          padding: 0;
        }
        @media print {
          body.headless-pdf-render,
          body.headless-pdf-render #root {
            display: block !important;
            visibility: visible !important;
          }
        }
        .page-break {
          break-before: page;
          page-break-before: always;
          display: block !important;
          clear: both;
        }
        .report-card-wrapper {
          width: 100% !important;
          min-height: 280mm;
          break-inside: avoid;
          margin: 0 auto;
          padding: 0 !important;
          background: white !important;
          display: flex !important;
          flex-direction: column;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        
        `}
      </style>

      <div className="w-full">
        {cards.map((cardData, idx) => (
          <div
            key={idx}
            className={`${idx > 0 ? 'page-break' : ''} report-card-wrapper`}
          >
            <ReportCardContent
              data={cardData}
              term={term}
              examType={examType}
              academicYear={academicYear}
              className="border-none shadow-none w-full max-w-none p-0 !bg-white !text-black"
            />
          </div>
        ))}
      </div>

      {/* Headless browser waits for this signal */}
      {isRenderComplete && <div id="render-complete" style={{ display: 'none' }} />}
    </div>
  );
}
