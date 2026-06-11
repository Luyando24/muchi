import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Calendar, 
  Share2, 
  ArrowLeft, 
  School, 
  ExternalLink 
} from 'lucide-react';
import { useSchoolCalendar } from '../hooks/useSchoolCalendar.js';
import { ActiveTermBanner } from '../components/school-calendar/ActiveTermBanner.js';
import { Filters } from '../components/school-calendar/Filters.js';
import { TermsGrid } from '../components/school-calendar/TermsGrid.js';
import { HolidaysGrid } from '../components/school-calendar/HolidaysGrid.js';

export default function SchoolCalendar() {
  const navigate = useNavigate();
  const {
    loading,
    yearFilter,
    setYearFilter,
    typeFilter,
    setTypeFilter,
    activeTerm,
    terms,
    holidays,
    uniqueYears,
    filteredCalendar,
    handleShareWhatsApp,
  } = useSchoolCalendar();

  const showTerms = typeFilter === 'All' || typeFilter === 'Term';
  const showHolidays = typeFilter === 'All' || typeFilter === 'Holiday';

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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mb-2">
              Ministry School Calendar
            </h1>
            <p className="text-slate-600 text-lg">
              Official academic year term dates, mid-term breaks, and national holidays.
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <ActiveTermBanner activeTerm={activeTerm} />

        {/* Filter Card - Sticky on scroll */}
        <Filters
          yearFilter={yearFilter}
          setYearFilter={setYearFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          uniqueYears={uniqueYears}
        />

        {/* Timeline Grid (Terms and Holidays cards) */}
        {loading ? (
          <div className="flex items-center justify-center p-12 h-64 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredCalendar.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 h-64 text-slate-400 bg-white border border-slate-200 rounded-2xl shadow-sm italic">
            <Calendar className="h-12 w-12 text-slate-300 mb-4" />
            <p>No calendar entries matches your selection.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {showTerms && <TermsGrid terms={terms} activeTerm={activeTerm} />}
            {showHolidays && <HolidaysGrid holidays={holidays} />}
          </div>
        )}

        {/* Credit Footnote */}
        <div className="mt-8 text-center text-xs text-slate-500 font-medium">
          <p>Official timelines issued by the Ministry of Education.</p>
          <p className="mt-1.5 flex items-center justify-center gap-1 flex-wrap">
            <span>Powered by</span> 
            <a 
              href="https://muchi.edu.zm" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-600 hover:text-blue-500 font-bold inline-flex items-center gap-0.5 transition-colors"
            >
              Muchi School Management System
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </main>

      {/* Floating WhatsApp Share Button */}
      <button
        onClick={handleShareWhatsApp}
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#128C7E] text-white h-14 w-14 rounded-full shadow-lg shadow-[#25D366]/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center animate-fade-in"
        aria-label="Share on WhatsApp"
      >
        <Share2 className="h-6 w-6" />
      </button>
    </div>
  );
}
