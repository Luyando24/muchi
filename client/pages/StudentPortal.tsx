import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Award,
  ClipboardCheck,
  FileText,
  User,
  Settings,
  Download,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { ReportCardContent } from '@/components/shared/ReportCardContent';

export default function StudentPortal() {
  const [student, setStudent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [gradesData, setGradesData] = useState<any>(null);
  const [printingTerm, setPrintingTerm] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "subjects", label: "Subjects", icon: BookOpen },
    { id: "grades", label: "Results", icon: Award },
    { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    { id: "assignments", label: "Assignments", icon: FileText },
    { id: "profile", label: "Profile", icon: User },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  useEffect(() => {
    fetchStudentProfile();
  }, []);

  useEffect(() => {
    if (student) {
      fetchGrades();
    }
  }, [student]);

  const fetchStudentProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      // Fetch student profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      setStudent(profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      navigate('/login');
    }
  };

  const fetchGrades = async () => {
    try {
      // This endpoint needs to exist or use appropriate logic
      // Assuming a similar structure to school admin
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/school/results/student/${student.id}`, {
         headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGradesData(data);
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  const handlePrint = (termResult: any) => {
    if (!termResult || !gradesData) {
      console.error("Missing data for printing");
      return;
    }

    const originalTitle = document.title;
    if (student) {
      document.title = `${student.firstName || student.full_name}_ReportCard_${termResult.term}_${termResult.academicYear}`;
    }
    
    setPrintingTerm(termResult);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
        setPrintingTerm(null);
      }, 500);
    }, 100);
  };

  const getStandardFromScale = (percentage: number) => {
    if (gradesData?.gradingScale && gradesData.gradingScale.length > 0) {
      const sortedScale = [...gradesData.gradingScale].sort((a: any, b: any) => b.min_percentage - a.min_percentage);
      for (const scale of sortedScale) {
        if (percentage >= scale.min_percentage) {
          return scale.description.toUpperCase();
        }
      }
      return 'FAIL';
    }
    
    if (percentage >= 75) return 'DISTINCTION';
    if (percentage >= 70) return 'DISTINCTION';
    if (percentage >= 65) return 'MERIT';
    if (percentage >= 60) return 'MERIT';
    if (percentage >= 55) return 'CREDIT';
    if (percentage >= 50) return 'CREDIT';
    if (percentage >= 45) return 'PASS';
    if (percentage >= 40) return 'PASS';
    return 'FAIL';
  };

  const getGradeColor = (grade: string) => {
    if (['1', '2', '3', '4', '5', '6'].includes(grade)) return 'bg-green-500 text-green-700';
    if (['7', '8'].includes(grade)) return 'bg-yellow-500 text-yellow-700';
    return 'bg-red-500 text-red-700';
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!student) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-screen sticky top-0">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Student Portal</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 pb-24 lg:pb-6 overflow-x-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Student Portal</h1>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">100%</div>
                  <p className="text-xs text-muted-foreground">Current Term</p>
                </CardContent>
              </Card>
              {/* Add more dashboard cards as needed */}
            </div>
            
            {/* Recent Results or Head Teacher Remark could go here */}
          </TabsContent>

          <TabsContent value="grades" className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Results</h2>
             </div>
             {gradesData?.results?.map((termResult: any, index: number) => (
               <Card key={index} className="mb-6">
                 <CardHeader className="flex flex-row items-center justify-between">
                   <div>
                     <CardTitle>{termResult.term} - {termResult.academicYear}</CardTitle>
                     <CardDescription>Average: {termResult.average}%</CardDescription>
                   </div>
                   <Button
                    variant="outline"
                    onClick={() => handlePrint(termResult)}
                    title="Download as PDF"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                 </CardHeader>
                 <CardContent>
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-800">
                        <TableRow>
                          <TableHead className="font-semibold">Subject</TableHead>
                          <TableHead className="font-semibold text-center w-[100px] hidden md:table-cell">Code</TableHead>
                          <TableHead className="font-semibold text-center w-[100px]">Score</TableHead>
                          <TableHead className="font-semibold text-center w-[80px]">Grade</TableHead>
                          <TableHead className="font-semibold text-center hidden lg:table-cell">Standard</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {termResult.grades.map((grade: any) => (
                          <TableRow key={grade.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <TableCell className="font-medium text-slate-900 dark:text-white">
                              {grade.subjects?.name}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground text-sm hidden md:table-cell">
                              {grade.subjects?.code}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className="font-bold">{grade.percentage}%</span>
                                <Progress
                                  value={grade.percentage}
                                  className={`h-1.5 w-16 hidden sm:block ${getGradeColor(grade.grade)}`}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={`${getGradeColor(grade.grade).replace('bg-', 'text-')} border-current font-bold`}>
                                {grade.grade}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-sm font-medium text-slate-600 dark:text-slate-400 hidden lg:table-cell uppercase tracking-wider">
                                {grade.grade === 'ABSENT' ? (
                                    <span className="text-muted-foreground italic">NOT RECORDED</span>
                                ) : (
                                    getStandardFromScale(grade.percentage)
                                )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                 </CardContent>
               </Card>
             ))}
          </TabsContent>

          {/* Other tabs placeholders */}
          <TabsContent value="subjects">Subjects Content</TabsContent>
          <TabsContent value="attendance">Attendance Content</TabsContent>
          <TabsContent value="assignments">Assignments Content</TabsContent>
          <TabsContent value="profile">Profile Content</TabsContent>
          <TabsContent value="settings">Settings Content</TabsContent>
        </Tabs>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-40 px-2 py-2 safe-area-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center">
          {sidebarItems.slice(0, 5).map((item) => {
             const Icon = item.icon;
             return (
               <button
                 key={item.id}
                 onClick={() => setActiveTab(item.id)}
                 className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[64px] ${
                   activeTab === item.id 
                     ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" 
                     : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                 }`}
               >
                 <Icon className={`h-5 w-5 mb-1 ${activeTab === item.id ? "scale-110" : "scale-100"} transition-transform`} />
                 <span className="text-[10px] font-medium truncate max-w-full">{item.label}</span>
               </button>
             );
          })}
        </div>
      </div>

      {/* Print Portal */}
      {printingTerm && createPortal(
        <div className="fixed inset-0 z-[9999] bg-white hidden print:block print:bg-white print:h-screen print:w-screen print:overflow-hidden">
          <style type="text/css" media="print">
            {`
              @page { size: A4; margin: 0; }
              body { margin: 0; padding: 0; background: white; }
              body > *:not(.print-portal) { display: none !important; }
              .print-portal { display: block !important; position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
            `}
          </style>
          <div className="print-portal w-full h-full">
            <ReportCardContent
                data={{
                student: {
                    ...gradesData.student,
                    // Ensure student number and class are passed correctly if missing
                    studentNumber: gradesData.student?.studentNumber || student?.student_number,
                    class: gradesData.student?.class || student?.class || 'N/A',
                },
                school: gradesData.school,
                gradingScale: gradesData.gradingScale,
                grades: printingTerm.grades
                }}
                term={printingTerm.term}
                academicYear={printingTerm.academicYear}
                className="w-full h-full shadow-none border-none m-0 p-0"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
