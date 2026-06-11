import React from 'react';
import { Filter } from 'lucide-react';

interface FiltersProps {
  yearFilter: string;
  setYearFilter: (year: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  uniqueYears: string[];
}

export const Filters: React.FC<FiltersProps> = ({
  yearFilter,
  setYearFilter,
  typeFilter,
  setTypeFilter,
  uniqueYears
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 mb-8 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between sticky top-[73px] z-30 backdrop-blur-md bg-white/95 transition-all">
      <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 w-full md:w-80">
        <Filter className="h-5 w-5 text-slate-400" />
        <span className="text-sm text-slate-600 font-semibold">Filters</span>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full md:flex md:w-auto md:justify-end">
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
          <span className="text-[10px] md:text-xs text-slate-500 font-semibold uppercase tracking-wider">Academic Year:</span>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="h-10 w-full md:w-auto rounded-xl border border-slate-200 bg-white text-slate-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold cursor-pointer"
          >
            <option value="All">All Years</option>
            {uniqueYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
          <span className="text-[10px] md:text-xs text-slate-500 font-semibold uppercase tracking-wider">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 w-full md:w-auto rounded-xl border border-slate-200 bg-white text-slate-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold cursor-pointer"
          >
            <option value="All">All Types</option>
            <option value="Term">Term</option>
            <option value="Holiday">Holiday</option>
          </select>
        </div>
      </div>
    </div>
  );
};
