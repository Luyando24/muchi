import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarEntry } from '../../lib/calendar-utils.js';

interface HolidaysGridProps {
  holidays: CalendarEntry[];
}

export const HolidaysGrid: React.FC<HolidaysGridProps> = ({ holidays }) => {
  if (holidays.length === 0) {
    return (
      <div className="space-y-4 border-t border-slate-200/60 pt-8">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">National Public Holidays</h3>
        <div className="text-center py-8 text-sm text-slate-400 italic bg-white border border-slate-200 rounded-2xl">
          No public holidays matched the active filters.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t border-slate-200/60 pt-8">
      <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">National Public Holidays</h3>
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
    </div>
  );
};
