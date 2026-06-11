import { describe, it, expect } from 'vitest';
import { 
  filterCalendar, 
  sortCalendarEntries, 
  determineActiveTerm, 
  CalendarEntry 
} from './calendar-utils';

const mockEntries: CalendarEntry[] = [
  {
    id: '1',
    year: '2026',
    type: 'Term',
    name: 'Term 1',
    start_date: '2026-01-15',
    end_date: '2026-04-15',
    midterm_begin: '2026-02-25',
    midterm_end: '2026-03-02',
  },
  {
    id: '2',
    year: '2026',
    type: 'Holiday',
    name: 'Youth Day',
    start_date: '2026-03-12',
    end_date: '2026-03-12',
    midterm_begin: null,
    midterm_end: null,
  },
  {
    id: '3',
    year: '2025',
    type: 'Term',
    name: 'Term 3',
    start_date: '2025-09-01',
    end_date: '2025-12-05',
    midterm_begin: null,
    midterm_end: null,
  }
];

describe('calendar-utils', () => {
  describe('filterCalendar', () => {
    it('should filter by year and type correctly', () => {
      const result = filterCalendar(mockEntries, '2026', 'All');
      expect(result).toHaveLength(2);
      expect(result.map(r => r.name)).toContain('Term 1');
      expect(result.map(r => r.name)).toContain('Youth Day');
    });

    it('should filter by type and allow All years', () => {
      const result = filterCalendar(mockEntries, 'All', 'Term');
      expect(result).toHaveLength(2);
      expect(result.map(r => r.name)).toContain('Term 1');
      expect(result.map(r => r.name)).toContain('Term 3');
    });

    it('should return empty array when no matches', () => {
      const result = filterCalendar(mockEntries, '2024', 'Holiday');
      expect(result).toHaveLength(0);
    });
  });

  describe('sortCalendarEntries', () => {
    it('should sort entries by start_date ascending', () => {
      const result = sortCalendarEntries(mockEntries);
      expect(result[0].name).toBe('Term 3'); // 2025-09-01
      expect(result[1].name).toBe('Term 1'); // 2026-01-15
      expect(result[2].name).toBe('Youth Day'); // 2026-03-12
    });
  });

  describe('determineActiveTerm', () => {
    it('should detect current active term', () => {
      const nowTime = new Date('2026-02-01').getTime();
      const active = determineActiveTerm(mockEntries, nowTime);
      expect(active).not.toBeNull();
      expect(active?.name).toBe('Term 1');
      expect((active as any).isUpcoming).toBeUndefined();
    });

    it('should detect upcoming term if none active', () => {
      const nowTime = new Date('2026-01-01').getTime();
      const active = determineActiveTerm(mockEntries, nowTime);
      expect(active).not.toBeNull();
      expect(active?.name).toBe('Term 1');
      expect((active as any).isUpcoming).toBe(true);
    });

    it('should return null if no current or upcoming term', () => {
      const nowTime = new Date('2027-01-01').getTime();
      const active = determineActiveTerm(mockEntries, nowTime);
      expect(active).toBeNull();
    });
  });
});
