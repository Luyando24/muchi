import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarEntry } from '../../lib/calendar-utils.js';

interface TermsGridProps {
  terms: CalendarEntry[];
  activeTerm: any;
}

export const TermsGrid: React.FC<TermsGridProps> = ({ terms, activeTerm }) => {
  if (terms.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">Official Term Timelines</h3>
        <div className="text-center py-8 text-sm text-slate-400 italic bg-white border border-slate-200 rounded-2xl">
          No terms matched the active filters.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">Official Term Timelines</h3>
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
    </div>
  );
};
