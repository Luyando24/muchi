import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CalendarEntry, 
  filterCalendar, 
  sortCalendarEntries, 
  determineActiveTerm 
} from '../lib/calendar-utils.js';

export function useSchoolCalendar() {
  const [calendar, setCalendar] = useState<CalendarEntry[]>([]);
  const [activeTerm, setActiveTerm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [typeFilter, setTypeFilter] = useState('All');

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
          
          const active = determineActiveTerm(data, now);
          if (active) {
            setActiveTerm(active);
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

  const handleShareWhatsApp = () => {
    const url = window.location.href;
    const text = encodeURIComponent(`Check out the Ministry School Calendar: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const filteredCalendar = filterCalendar(calendar, yearFilter, typeFilter);

  const terms = sortCalendarEntries(
    filteredCalendar.filter(item => item.type === 'Term')
  );

  const holidays = sortCalendarEntries(
    filteredCalendar.filter(item => item.type === 'Holiday')
  );

  const uniqueYears = Array.from(new Set(calendar.map(entry => entry.year))).sort();

  return {
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
  };
}
