import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Loader2, 
  Calendar, 
  Download, 
  ArrowLeft, 
  School, 
  Filter, 
  Info,
  ExternalLink
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CalendarEntry {
  id: string;
  year: string;
  type: 'Term' | 'Holiday';
  name: string;
  start_date: string;
  end_date: string;
  midterm_begin: string | null;
  midterm_end: string | null;
}

export default function SchoolCalendar() {
  const navigate = useNavigate();
  const [calendar, setCalendar] = useState<CalendarEntry[]>([]);
  const [activeTerm, setActiveTerm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [typeFilter, setTypeFilter] = useState('All');
  
  // Download Modal State
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [selectedDownloadYear, setSelectedDownloadYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    async function loadCalendar() {
      try {
        const { data, error } = await supabase
          .from('ministry_calendar')
          .select('*')
          .order('start_date', { ascending: true });
        if (error) throw error;
        if (data) {
          setCalendar(data);
          
          const nowStr = new Date().toLocaleString('sv-SE', { timeZone: 'Africa/Lusaka' }).split(' ')[0];
          const now = new Date(nowStr).getTime();
          
          const current = data.find(item => {
            if (item.type !== 'Term') return false;
            const start = new Date(item.start_date).getTime();
            const end = new Date(item.end_date).getTime();
            return start <= now && now <= end;
          });
          
          if (current) {
            setActiveTerm(current);
          } else {
            const upcoming = data
              .filter(item => item.type === 'Term')
              .find(item => new Date(item.start_date).getTime() > now);
            if (upcoming) {
              setActiveTerm({ ...upcoming, isUpcoming: true });
            }
          }
        }
      } catch (err) {
        console.error('Failed to load public calendar:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCalendar();
  }, []);

  const handleDownloadPDF = () => {
    if (yearFilter === 'All') {
      setSelectedDownloadYear(uniqueYears[0] || new Date().getFullYear().toString());
      setIsDownloadOpen(true);
    } else {
      generatePDF(yearFilter);
    }
  };

  const handleConfirmDownload = () => {
    setIsDownloadOpen(false);
    generatePDF(selectedDownloadYear);
  };

  const generatePDF = (year: string) => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('MINISTRY OF EDUCATION - OFFICIAL SCHOOL CALENDAR', 14, 20);
    
    // Subtitle
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Official guidelines for academic year ${year}`, 14, 26);
    
    // Credit to Muchi
    doc.setFontSize(9);
    doc.setTextColor(59, 130, 246); // Muchi blue color
    doc.text('Powered by Muchi School Management System (https://muchi.edu.zm)', 14, 32);
    
    // Generate headers and rows
    const pdfData = calendar
      .filter(item => item.year === year)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    const headers = ['Year', 'Type', 'Event Name', 'Start Date', 'End Date', 'Mid-Term Break'];
    const rows = pdfData.map(item => [
      item.year,
      item.type,
      item.name,
      new Date(item.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      new Date(item.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      item.midterm_begin && item.midterm_end
        ? `${new Date(item.midterm_begin).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${new Date(item.midterm_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
        : 'N/A'
    ]);
    
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 38,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }, // blue-600 color
      styles: { fontSize: 9 },
      didDrawPage: (data: any) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        if (data.pageNumber > 1) {
          doc.text(`Zambia School Calendar (${year})`, data.settings.margin.left, 10);
        }
        doc.text(
          'Generated by Muchi School Management System. All calendar details are official Ministry data.',
          data.settings.margin.left,
          doc.internal.pageSize.getHeight() - 10
        );
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          doc.internal.pageSize.getWidth() - data.settings.margin.right - 15,
          doc.internal.pageSize.getHeight() - 10
        );
      }
    });
    
    doc.save(`Zambia_Official_School_Calendar_${year}.pdf`);
  };

  const filteredCalendar = calendar.filter(item => {
    const matchYear = yearFilter === 'All' || item.year === yearFilter;
    const matchType = typeFilter === 'All' || item.type === typeFilter;
    return matchYear && matchType;
  });

  const terms = filteredCalendar
    .filter(item => item.type === 'Term')
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const holidays = filteredCalendar
    .filter(item => item.type === 'Holiday')
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const uniqueYears = Array.from(new Set(calendar.map(entry => entry.year))).sort();

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
          
          <Button
            onClick={handleDownloadPDF}
            disabled={calendar.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl shadow-lg shadow-blue-600/10 h-12 px-6 w-full md:w-auto text-base font-semibold transition-all active:scale-95 animate-fade-in"
          >
            <Download className="h-5 w-5" />
            Download PDF
          </Button>
        </div>

        {/* Status Indicator */}
        {activeTerm && (
          <div className="mb-8 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start gap-4 animate-fade-in">
            <div className="p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="font-extrabold uppercase tracking-wider text-xs text-blue-600">
                  {activeTerm.isUpcoming ? 'Next Term Alert' : 'Active Term Period'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-950 mt-1">
                {activeTerm.name} ({activeTerm.year})
              </h3>
              <p className="text-sm text-slate-600 mt-1 font-medium leading-relaxed">
                {activeTerm.isUpcoming 
                  ? `This term officially opens on ${new Date(activeTerm.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`
                  : `This term runs from ${new Date(activeTerm.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} until ${new Date(activeTerm.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`
                }
              </p>
            </div>
          </div>
        )}

        {/* Filter Card - Sticky on scroll */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 mb-8 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between sticky top-[73px] z-30 backdrop-blur-md bg-white/95 transition-all">
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 w-full md:w-80">
            <Filter className="h-5 w-5 text-slate-400" />
            <span className="text-sm text-slate-600 font-semibold">Filters</span>
          </div>

          <div className="flex flex-wrap gap-6 items-center w-full md:w-auto justify-end">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Academic Year:</span>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white text-slate-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold cursor-pointer"
              >
                <option value="All">All Years</option>
                {uniqueYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white text-slate-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold cursor-pointer"
              >
                <option value="All">All Types</option>
                <option value="Term">Term</option>
                <option value="Holiday">Holiday</option>
              </select>
            </div>
          </div>
        </div>

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
            {/* Terms Timeline Section */}
            {showTerms && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">Official Term Timelines</h3>
                {terms.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-400 italic bg-white border border-slate-200 rounded-2xl">No terms matched the active filters.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {terms.map((term) => {
                      const isCurrent = activeTerm && activeTerm.id === term.id;
                      return (
                        <Card 
                          key={term.id} 
                          className={`border shadow-sm transition-all ${
                            isCurrent 
                              ? 'bg-blue-50/50 border-blue-200 shadow-sm ring-1 ring-blue-500/10' 
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-base font-bold text-slate-900">
                              {term.name} ({term.year})
                            </CardTitle>
                            {isCurrent && (
                              <Badge className="bg-blue-600 text-white font-bold text-[9px] uppercase tracking-wider py-0.5 px-2">Active</Badge>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-3 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Opens</span>
                              <span className="font-semibold text-slate-700">
                                {new Date(term.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Closes</span>
                              <span className="font-semibold text-slate-700">
                                {new Date(term.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            {term.midterm_begin && term.midterm_end && (
                              <div className="border-t border-slate-100 pt-3 mt-3">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Mid-Term Break</span>
                                <div className="flex justify-between mt-1 text-[11px]">
                                  <span className="text-slate-400">Starts</span>
                                  <span className="font-semibold text-slate-700">
                                    {new Date(term.midterm_begin).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                  </span>
                                </div>
                                <div className="flex justify-between text-[11px] mt-0.5">
                                  <span className="text-slate-400">Ends</span>
                                  <span className="font-semibold text-slate-700">
                                    {new Date(term.midterm_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                  </span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Public Holidays Section */}
            {showHolidays && (
              <div className="space-y-4 border-t border-slate-200/60 pt-8">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">National Public Holidays</h3>
                {holidays.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-400 italic bg-white border border-slate-200 rounded-2xl">No public holidays matched the active filters.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {holidays.map((holiday) => (
                      <Card key={holiday.id} className="border border-slate-200 bg-white text-center shadow-sm">
                        <CardContent className="p-3.5">
                          <p className="text-xs font-bold text-slate-800 truncate">{holiday.name}</p>
                          <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                            {new Date(holiday.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
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

      {/* Select Year Modal before PDF download */}
      <Dialog open={isDownloadOpen} onOpenChange={setIsDownloadOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Select Academic Year</DialogTitle>
            <DialogDescription className="text-slate-500 mt-1">
              Please choose a specific year to download the official Ministry School Calendar PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="downloadYearSelect" className="text-sm font-semibold text-slate-700">Academic Year</label>
              <select
                id="downloadYearSelect"
                value={selectedDownloadYear}
                onChange={(e) => setSelectedDownloadYear(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold cursor-pointer"
              >
                {uniqueYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDownloadOpen(false)}
              className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDownload}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/10"
            >
              Confirm & Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
