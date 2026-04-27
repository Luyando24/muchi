
import React from 'react';
import ReportsManagement from '@/components/school-admin/ReportsManagement';
import { FileSpreadsheet } from 'lucide-react';

export default function MasterSheet() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Master Sheet</h1>
          <p className="text-slate-500 text-sm font-medium">Comprehensive grid view of all student scores across subjects.</p>
        </div>
      </div>

      <ReportsManagement isTeacherPortal={true} defaultTab="master-sheet" />
    </div>
  );
}
