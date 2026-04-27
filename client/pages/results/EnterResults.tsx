
import React from 'react';
import GradebookView from '@/components/school-admin/GradebookView';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PenTool } from 'lucide-react';

export default function EnterResults() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
          <PenTool className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Enter Results</h1>
          <p className="text-slate-500 text-sm font-medium">Input and manage student marks for your classes.</p>
        </div>
      </div>

      <GradebookView />
    </div>
  );
}
