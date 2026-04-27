
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PenTool, TrendingUp, FileSpreadsheet, ChevronRight, ClipboardList } from 'lucide-react';

interface ResultsOptionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  color: string;
}

const ResultsOption = ({ title, description, icon: Icon, onClick, color }: ResultsOptionProps) => (
  <Card 
    className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 overflow-hidden relative"
    onClick={onClick}
  >
    <div className={`absolute top-0 left-0 w-1 h-full ${color}`} />
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <div className={`p-3 rounded-2xl ${color.replace('bg-', 'bg-').replace('500', '100 dark:bg-').replace('600', '900/30')} ${color.replace('bg-', 'text-')}`}>
            <Icon className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-[240px]">
              {description}
            </p>
          </div>
        </div>
        <div className="h-10 w-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
          <ChevronRight className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function ResultsHub({ onNavigate }: { onNavigate: (tab: string) => void }) {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-2">
          <ClipboardList className="h-3 w-3" />
          Academic Management
        </div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Results Center</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto font-medium">
          Manage assessments, track student progress, and generate comprehensive school reports.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ResultsOption
          title="Enter Results"
          description="Input marks for exams, tests and assignments across your assigned subjects."
          icon={PenTool}
          color="bg-blue-600"
          onClick={() => onNavigate('enter-results')}
        />
        <ResultsOption
          title="Results Analysis"
          description="Visualize performance trends, pass rates, and subject-wise distribution."
          icon={TrendingUp}
          color="bg-indigo-600"
          onClick={() => onNavigate('results-analysis')}
        />
        <ResultsOption
          title="Master Sheet"
          description="View and export the complete grid of student scores for all subjects."
          icon={FileSpreadsheet}
          color="bg-emerald-600"
          onClick={() => onNavigate('master-sheet')}
        />
      </div>

      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-none shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ClipboardList className="h-40 w-40 text-white" />
        </div>
        <CardContent className="p-8 sm:p-12 relative z-10">
          <div className="max-w-2xl space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Need to verify published results?</h2>
            <p className="text-slate-300 font-medium">
              Head over to the Verification portal to cross-check results that have been officially submitted to the administration.
            </p>
            <Button 
              className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-6 h-11"
              onClick={() => window.location.href = '/teacher-portal/verify'}
            >
              Go to Verification
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
