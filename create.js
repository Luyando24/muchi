const fs = require('fs');
const content = `import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, Clock, BookOpen, ChevronRight, Trophy, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { syncFetch } from '@/lib/syncService';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

interface VerifyStatus {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  examType: string;
  status: 'Not Entered' | 'Draft' | 'Submitted' | 'Published';
  term: string;
  academicYear: string;
  completedCount: number;
  expectedCount: number;
}

export default function VerifyGrades() {
  const [statuses, setStatuses] = useState<VerifyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await syncFetch('/api/teacher/verify-status');
      setStatuses(data);
    } catch (error) {
      console.error('Failed to fetch verify status:', error);
      toast({ title: "Error", description: "Failed to load gradebook status.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Published': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      case 'Submitted': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
      case 'Draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
      default: return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Published':
      case 'Submitted': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'Draft': return <Clock className="h-5 w-5 text-yellow-500" />;
      default: return <AlertCircle className="h-5 w-5 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500">Checking your gradebooks...</p>
      </div>
    );
  }

  const submittedCount = statuses.filter(s => s.status === 'Submitted' || s.status === 'Published').length;
  const totalCount = statuses.length;
  const progress = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;
  
  const isPerfect = progress === 100 && totalCount > 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className={\`rounded-xl p-6 text-white flex flex-col md:flex-row items-center justify-between shadow-lg relative overflow-hidden \${isPerfect ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}\`}>
        <div className="relative z-10 space-y-2 text-center md:text-left mb-6 md:mb-0">
          <div className="flex items-center justify-center md:justify-start gap-2">
            {isPerfect ? <Trophy className="h-8 w-8 text-yellow-300" /> : <BookOpen className="h-8 w-8 text-blue-200" />}
            <h2 className="text-2xl font-bold">Gradebook Verification</h2>
          </div>
          <p className="text-blue-100 max-w-md">
            {isPerfect 
              ? "Incredible work! All of your gradebooks are submitted and up to date." 
              : "Review the status of your assigned classes and ensure all grades are submitted on time."}
          </p>
        </div>

        <div className="relative z-10 bg-white/20 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center min-w-[200px]">
          <div className="text-sm font-medium text-white/90 uppercase tracking-wider mb-1">Completion</div>
          <div className="text-4xl font-black">{progress}%</div>
          <div className="w-full bg-black/20 rounded-full h-2 mt-3">
            <div className="bg-white rounded-full h-2 transition-all duration-1000" style={{ width: \`\${progress}%\` }}></div>
          </div>
          <div className="text-xs font-medium text-white/80 mt-2">{submittedCount} of {totalCount} Submitted</div>
        </div>

        {/* Decorative Elements */}
        {isPerfect && <Sparkles className="absolute top-4 right-1/4 h-16 w-16 text-yellow-300/30 animate-pulse" />}
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-black/10 rounded-full blur-2xl"></div>
      </div>

      {totalCount === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-48">
            <BookOpen className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No Assignments Found</h3>
            <p className="text-slate-500 text-center max-w-sm mt-2">
              You don't have any classes or subjects assigned to you yet. Please ask the school admin to assign your classes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statuses.map((status) => (
            <Card key={status.id} className={\`overflow-hidden transition-all duration-200 hover:shadow-md border-t-4 \${
              status.status === 'Published' || status.status === 'Submitted' ? 'border-t-green-500' :
              status.status === 'Draft' ? 'border-t-yellow-500' : 'border-t-slate-300'
            }\`}>
              <CardHeader className="pb-3 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{status.subjectName}</CardTitle>
                    <CardDescription className="font-medium mt-1">{status.className}</CardDescription>
                  </div>
                  {getStatusIcon(status.status)}
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Assessment</span>
                  <span className="font-bold">{status.examType}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Status</span>
                  <span className={\`px-2.5 py-1 rounded-full text-xs font-bold border \${getStatusColor(status.status)}\`}>
                    {status.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Graded Students</span>
                    <span className="font-medium">{status.completedCount} / {status.expectedCount}</span>
                  </div>
                  <Progress value={status.expectedCount > 0 ? (status.completedCount / status.expectedCount) * 100 : 0} className="h-1.5" />
                </div>

                <div className="pt-2">
                  <Button 
                    className="w-full justify-between group" 
                    variant={status.status === 'Not Entered' ? 'default' : 'outline'}
                    onClick={() => {
                      navigate('/teacher-portal?tab=gradebook', { 
                        state: { 
                          defaultClassId: status.classId, 
                          defaultSubjectId: status.subjectId,
                          defaultExamType: status.examType
                        } 
                      });
                    }}
                  >
                    <span>
                      {status.status === 'Not Entered' ? 'Start Grading' : 
                       status.status === 'Draft' ? 'Continue Grading' : 'View Gradebook'}
                    </span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
`;
fs.writeFileSync('client/components/teacher/VerifyGrades.tsx', content);
