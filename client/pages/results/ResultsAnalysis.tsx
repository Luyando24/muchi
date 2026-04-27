
import React from 'react';
import ReportsManagement from '@/components/school-admin/ReportsManagement';
import { TrendingUp } from 'lucide-react';

export default function ResultsAnalysis() {
  // We use the ReportsManagement component but pass a prop or use it in a way
  // that focuses on analysis. For now, it handles its own internal tabs.
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
          <TrendingUp className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Results Analysis</h1>
          <p className="text-slate-500 text-sm font-medium">Detailed performance analytics and statistics.</p>
        </div>
      </div>

      <ReportsManagement isTeacherPortal={true} defaultTab="results-analysis" />
    </div>
  );
}
