export interface CalendarEntry {
  id: string;
  year: string;
  type: 'Term' | 'Holiday';
  name: string;
  start_date: string;
  end_date: string;
  midterm_begin: string | null;
  midterm_end: string | null;
}

export function filterCalendar(entries: CalendarEntry[], yearFilter: string, typeFilter: string): CalendarEntry[] {
  return entries.filter(item => {
    const matchYear = yearFilter === 'All' || item.year === yearFilter;
    const matchType = typeFilter === 'All' || item.type === typeFilter;
    return matchYear && matchType;
  });
}

export function sortCalendarEntries(entries: CalendarEntry[]): CalendarEntry[] {
  return [...entries].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
}

export function determineActiveTerm(data: CalendarEntry[], nowTimestamp: number) {
  const termsOnly = data.filter(item => item.type === 'Term');
  
  const current = termsOnly.find(item => {
    const start = new Date(item.start_date).getTime();
    const end = new Date(item.end_date).getTime();
    return start <= nowTimestamp && nowTimestamp <= end;
  });
  
  if (current) {
    return current;
  }
  
  const upcoming = termsOnly
    .filter(item => new Date(item.start_date).getTime() > nowTimestamp)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];
    
  if (upcoming) {
    return { ...upcoming, isUpcoming: true };
  }
  
  return null;
}
