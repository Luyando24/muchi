import React from 'react';
import { Calendar } from 'lucide-react';

interface ActiveTermBannerProps {
  activeTerm: {
    name: string;
    year: string;
    start_date: string;
    end_date: string;
    isUpcoming?: boolean;
  } | null;
}

export const ActiveTermBanner: React.FC<ActiveTermBannerProps> = ({ activeTerm }) => {
  if (!activeTerm) return null;

  return (
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
        <h3 className="text-lg font-bold text-slate-955 mt-1">
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
  );
};
