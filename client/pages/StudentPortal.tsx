import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Loader2, 
  Home, 
  BookOpen, 
  Award, 
  ClipboardCheck, 
  FileText, 
  User, 
  Settings, 
  Bell, 
  Megaphone,
  LogOut, 
  ChevronRight,
  TrendingUp,
  Clock,
  Calendar,
  Download,
  Lock,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { ReportCardContent } from '@/components/shared/ReportCardContent';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { OfflineIndicator } from '@/components/navigation/OfflineIndicator';
import { syncFetch, offlineQuery } from '@/lib/syncService';

export default function StudentPortal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const studentId = id;
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [gradesData, setGradesData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [printingTerm, setPrintingTerm] = useState<any>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (studentId) {
      fetchStudentData();
    }
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        window.location.href = '/login';
        return;
      }

      // Fetch student profile
      const { data: profile } = await offlineQuery(
        supabase
          .from('profiles')
          .select('*')
          .eq('id', studentId)
          .single(),
        `student-profile:${studentId}`
      );

      if (!profile) throw new Error('Profile not found');
      
      // Normalize profile data to handle both snake_case (DB) and camelCase (potential legacy)
      // Also fallback to full_name splitting if first/last names are missing
      const fullName = profile.full_name || '';
      const nameParts = fullName.split(' ');
      const fallbackFirstName = nameParts[0] || '';
      const fallbackLastName = nameParts.slice(1).join(' ') || '';

      const normalizedProfile = {
        ...profile,
        firstName: profile.first_name || profile.firstName || fallbackFirstName,
        lastName: profile.last_name || profile.lastName || fallbackLastName,
        studentNumber: profile.student_number || profile.studentNumber,
        avatarUrl: profile.avatar_url || profile.avatarUrl,
        class: profile.class // Assuming class might be directly on profile or fetched separately
      };
      
      setStudent(normalizedProfile);

      // Fetch grades and related data using syncFetch
      try {
        const data = await syncFetch(`/api/student/${studentId}/portal-data`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          cacheKey: `student-portal-data:${studentId}`
        });
        
        if (data) {
          setGradesData(data);
          
          // Re-apply student data from the portal-data response if available,
          // as it might be fresher or more complete (e.g. includes class name)
          if (data.student) {
            const fullName = data.student.full_name || '';
            const nameParts = fullName.split(' ');
            const fallbackFirstName = nameParts[0] || '';
            const fallbackLastName = nameParts.slice(1).join(' ') || '';

            const enhancedProfile = {
              ...normalizedProfile,
              ...data.student,
              // Ensure these fields persist if missing in data.student
              firstName: data.student.first_name || data.student.firstName || normalizedProfile.firstName || fallbackFirstName,
              lastName: data.student.last_name || data.student.lastName || normalizedProfile.lastName || fallbackLastName,
              studentNumber: data.student.student_number || data.student.studentNumber || normalizedProfile.studentNumber,
              avatarUrl: data.student.avatar_url || data.student.avatarUrl || normalizedProfile.avatarUrl,
            };
            setStudent(enhancedProfile);
          }
        }
      } catch (e) {
        console.error('Failed to fetch portal data', e);
      }

      // Fetch announcements
      try {
        const announcementsData = await syncFetch('/api/school/announcements', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cacheKey: `school-announcements:${profile.school_id || 'all'}`
        });
        setAnnouncements(announcementsData || []);
      } catch (e) {
        console.error('Failed to fetch announcements', e);
      }

    } catch (error: any) {
      console.error('Error fetching student data:', error);
      toast({
        title: "Error",
        description: "Failed to load student data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (termResult: any) => {
    // Check if we have the necessary data
    if (!termResult || !gradesData) {
      console.error("Missing data for PDF generation");
      return;
    }
    
    // Set the term to print to trigger the hidden ReportCardContent render
    setPrintingTerm(termResult);

    // Give React time to render the hidden component
    setTimeout(async () => {
      if (reportRef.current) {
        try {
          const canvas = await html2canvas(reportRef.current, {
            scale: 2, // Improve quality
            useCORS: true, // Handle cross-origin images if configured
            logging: false
          });

          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
          const imgX = (pdfWidth - imgWidth * ratio) / 2;
          const imgY = 0; // Top align

          // Calculate height to fit A4 ratio, usually fits one page for standard reports
          // For multi-page, more complex logic is needed, but ReportCardContent is designed for single page A4
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          
          const fileName = `${student?.firstName || 'Student'}_Report_Term${termResult.term}_${termResult.academicYear}.pdf`;
          pdf.save(fileName);
        } catch (error) {
          console.error("PDF Generation Error:", error);
          toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
        } finally {
           setPrintingTerm(null);
        }
      } else {
        console.error("Report element not found");
        setPrintingTerm(null);
      }
    }, 500); // Wait for DOM update
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const getGradeColor = (grade: string) => {
    if (!grade) return 'bg-slate-100 text-slate-800';
    const g = grade.toUpperCase();
    if (['1', '2', 'A*', 'A'].includes(g)) return 'bg-green-100 text-green-800 border-green-200';
    if (['3', '4', 'B'].includes(g)) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (['5', '6', 'C'].includes(g)) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (['7', '8', 'D', 'E'].includes(g)) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getStandardFromScale = (percentage: number) => {
    // If we have access to the grading scale from props/state, use it
    if (gradesData?.gradingScale && gradesData.gradingScale.length > 0) {
      const sortedScale = [...gradesData.gradingScale].sort((a: any, b: any) => b.min_percentage - a.min_percentage);
      for (const scale of sortedScale) {
        if (percentage >= scale.min_percentage) {
          return scale.description.toUpperCase();
        }
      }
      return 'FAIL';
    }
    
    // Fallback logic if no scale provided
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "subjects", label: "Subjects", icon: BookOpen },
    { id: "grades", label: "Results", icon: Award },
    { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    // { id: "assignments", label: "Assignments", icon: FileText },
    { id: "profile", label: "Profile", icon: User },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  // Derive recent data
  const currentResult = gradesData?.results?.[0]; // Most recent term
  const currentGrades = currentResult?.grades || [];
  const currentAverage = currentResult?.average || 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <BookOpen className="h-6 w-6" />
              <span className="font-bold text-xl">Student Portal</span>
            </div>
          </div>
          
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.id 
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Top Navigation Bar */}
          <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6">
            <div className="flex justify-between items-center max-w-7xl mx-auto">
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  {student?.firstName || "Student"}
                </h1>
                <p className="text-[10px] sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {currentResult ? `${String(currentResult.term).toLowerCase().includes('term') ? '' : 'Term '}${currentResult.term} • ${currentResult.academicYear}` : 'No active term'}
                </p>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="hidden xs:block">
                  <OfflineIndicator />
                </div>
                
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <Bell className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full ring-2 ring-blue-50 dark:ring-blue-900/20 p-0 overflow-hidden">
                      <Avatar className="h-full w-full">
                        <AvatarImage src={student?.avatarUrl} />
                        <AvatarFallback className="bg-blue-600 text-white text-xs sm:text-sm font-black">
                          {student?.firstName?.[0] || 'S'}{student?.lastName?.[0] || ''}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 mt-2">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-bold leading-none">{student?.firstName} {student?.lastName}</p>
                        <p className="text-xs leading-none text-muted-foreground">{student?.studentNumber}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setActiveTab('profile')} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveTab('settings')} className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsContent value="dashboard" className="space-y-6 m-0">
              {student?.is_temp_password && (
                <Alert variant="default" className="bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-bold">Security Reminder</AlertTitle>
                  <AlertDescription className="text-sm">
                    You are currently using a temporary password. Please set a permanent password in your 
                    <Button variant="link" className="p-0 h-auto text-amber-900 dark:text-amber-300 font-bold ml-1" onClick={() => navigate('/force-password-reset')}>
                      Security Settings
                    </Button>.
                  </AlertDescription>
                </Alert>
              )}
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full text-blue-600 dark:text-blue-400">
                      <Award className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Average Score</p>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{currentAverage}%</h3>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full text-green-600 dark:text-green-400">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Subjects</p>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{currentGrades.length}</h3>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full text-purple-600 dark:text-purple-400">
                      <ClipboardCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Attendance</p>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {(() => {
                          const total = gradesData?.attendance?.length || 0;
                          const present = gradesData?.attendance?.filter((r: any) => r.status === 'present').length || 0;
                          return total > 0 ? Math.round((present / total) * 100) : 0;
                        })()}%
                      </h3>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full text-orange-600 dark:text-orange-400">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Overall Standard</p>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                        {getStandardFromScale(parseFloat(currentAverage as string))}
                      </h3>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Grades */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Academic Performance</CardTitle>
                      <CardDescription>Your latest assessment results</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('grades')}>
                      View All
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {currentGrades.slice(0, 5).map((grade: any, i: number) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${getGradeColor(grade.grade).split(' ')[0]}`}>
                            <BookOpen className={`h-5 w-5 ${getGradeColor(grade.grade).split(' ')[1]}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <h4 className="font-semibold text-slate-900 dark:text-white">{grade.subjects?.name}</h4>
                              <span className="font-bold text-slate-700 dark:text-slate-300">{grade.percentage}%</span>
                            </div>
                            <Progress value={grade.percentage} className={`h-2 ${getGradeColor(grade.grade)}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Head Teacher's Remark (Mini) */}
                <Card>
                  <CardHeader>
                    <CardTitle>Teacher's Remark</CardTitle>
                    <CardDescription>Term Summary</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 italic">
                        {(() => {
                          if (!currentGrades || currentGrades.length === 0) return "No grades available for analysis.";

                          const avg = parseFloat(currentAverage as string);
                          const firstName = student?.firstName || "Student";
                          const fullName = `${student?.firstName} ${student?.lastName}`;

                          // Filter out absent subjects before sorting
                          const validGrades = currentGrades.filter((g: any) => g.percentage !== null && g.percentage !== undefined && g.percentage !== '' && g.grade !== 'ABSENT');
                          
                          const sortedGrades = [...validGrades].sort((a: any, b: any) => (b.percentage || 0) - (a.percentage || 0));
                          const bestSubjects = sortedGrades.slice(0, 3).map((g: any) => g.subjects?.name);
                          
                          // Expand weak subjects coverage: Take up to 3 subjects with scores < 50%
                          const weakSubjects = sortedGrades.slice(-3).filter((g: any) => (g.percentage || 0) < 50).map((g: any) => g.subjects?.name);
                          
                          // 1. Opening Statement based on Average
                          let opening = "";
                          if (avg >= 75) opening = `${fullName} has produced an outstanding set of results this term, demonstrating exceptional academic maturity and diligence.`;
                          else if (avg >= 65) opening = `${fullName} has achieved a very good standard of performance, showing consistent effort across most subjects.`;
                          else if (avg >= 55) opening = `${fullName} has performed satisfactorily, though there is room for greater consistency in their application.`;
                          else if (avg >= 45) opening = `${fullName} has made a fair attempt this term, but will need to significantly increase their study hours to reach their full potential.`;
                          else opening = `${fullName}'s performance is below the expected standard. An urgent review of study habits and class engagement is recommended.`;

                          // 2. Strengths Analysis
                          let strengths = "";
                          if (bestSubjects.length > 0) {
                            const subjectText = bestSubjects.join(', ').replace(/, ([^,]*)$/, ' and $1');
                            if (avg >= 65) strengths = `Particular aptitude is noted in ${subjectText}, where ${firstName} displays keen insight and mastery.`;
                            else strengths = `${firstName} shows encouraging promise in ${subjectText}, which should serve as a motivation for other areas.`;
                          }

                          // 3. Areas for Improvement (only if relevant)
                          let improvements = "";
                          if (weakSubjects.length > 0) {
                            const weakText = weakSubjects.join(', ').replace(/, ([^,]*)$/, ' and $1');
                            improvements = `However, urgent attention is required in ${weakText} to prevent these subjects from pulling down the overall grade.`;
                          } else if (weakSubjects.length === 0 && bestSubjects.length > 0 && bestSubjects.length !== sortedGrades.length) {
                             improvements = `Performance across all subjects was generally consistent.`;
                          }

                          // 4. Closing Encouragement
                          let closing = "";
                          if (avg >= 60) closing = "An excellent term overall. Keep up this high standard!";
                          else if (avg >= 50) closing = "With consistent effort, better results can be achieved next term.";
                          else closing = "We encourage more dedicated study time and seeking help in difficult subjects.";

                          // Combine parts
                          return [opening, strengths, improvements, closing].filter(Boolean).join(" ");
                        })()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Announcements Section */}
                <Card className="col-span-1 lg:col-span-2 hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Megaphone className="h-5 w-5 text-blue-600" />
                      School Announcements
                    </CardTitle>
                    <CardDescription>Stay updated with the latest school news</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {announcements && announcements.length > 0 ? (
                      <div className="space-y-4">
                        {announcements.map((announcement) => (
                          <div key={announcement.id} className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className={`p-2 rounded-full mt-1 ${
                              announcement.priority === 'High' ? 'bg-red-100 text-red-600' : 
                              announcement.priority === 'Low' ? 'bg-slate-100 text-slate-600' : 
                              'bg-blue-100 text-blue-600'
                            }`}>
                              <Megaphone className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-slate-900 dark:text-white">{announcement.title}</h4>
                                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">
                                  {announcement.date}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{announcement.content}</p>
                              <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-bold uppercase">
                                <span>Posted by: {announcement.author}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 space-y-3">
                        <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Megaphone className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-500 text-center italic">No announcements at this time.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="grades" className="space-y-6 m-0">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Results & Reports</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">View detailed breakdown of your academic performance</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Select defaultValue={currentResult?.term}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Select Term" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradesData?.results?.map((r: any, i: number) => (
                        <SelectItem key={i} value={r.term}>
                          {String(r.term).toLowerCase().includes('term') ? r.term : `Term ${r.term}`} - {r.academicYear}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => currentResult && handlePrint(currentResult)}
                    disabled={!currentResult}
                    className="w-full sm:w-auto"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>

              <Card className="border-none sm:border shadow-none sm:shadow-sm">
                <CardContent className="p-0">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-bold text-slate-900 dark:text-slate-100 py-4">Subject</TableHead>
                          <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-center w-[80px] sm:w-[100px] py-4">Score</TableHead>
                          <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-center w-[70px] sm:w-[80px] py-4">Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentGrades.map((grade: any) => (
                          <TableRow key={grade.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <TableCell className="py-4">
                              <div className="space-y-1">
                                <p className="font-bold text-slate-900 dark:text-white leading-none">
                                  {grade.subjects?.name}
                                </p>
                                <p className="text-[10px] sm:text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                  {grade.grade === 'ABSENT' ? 'NOT RECORDED' : getStandardFromScale(grade.percentage)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col items-center justify-center gap-1.5">
                                <span className="font-black text-slate-900 dark:text-white">{grade.percentage}%</span>
                                <div className="w-12 sm:w-16 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden hidden xs:block">
                                  <div 
                                    className={`h-full ${getGradeColor(grade.grade)}`} 
                                    style={{ width: `${grade.percentage}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <div className={`inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 font-black text-sm ${getGradeColor(grade.grade).replace('bg-', 'text-')} ${getGradeColor(grade.grade).replace('bg-', 'border-').replace('-600', '-200').replace('-500', '-200')}`}>
                                {grade.grade}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {currentGrades.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-12 text-slate-500 italic">
                              No results found for this term.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subjects" className="space-y-6 m-0">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Subjects</h2>
                  <p className="text-slate-500 dark:text-slate-400">Overview of your enrolled subjects</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentGrades.map((grade: any) => (
                  <Card key={grade.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className={`p-2 rounded-lg ${getGradeColor(grade.grade).split(' ')[0]}`}>
                           <BookOpen className={`h-5 w-5 ${getGradeColor(grade.grade).split(' ')[1]}`} />
                        </div>
                        <Badge variant="outline">{grade.subjects?.code}</Badge>
                      </div>
                      <CardTitle className="mt-4">{grade.subjects?.name}</CardTitle>
                      <CardDescription>{grade.subjects?.department || 'General'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mt-2 space-y-2">
                         <div className="flex justify-between text-sm">
                           <span className="text-slate-500">Current Score</span>
                           <span className="font-bold">{grade.percentage}%</span>
                         </div>
                         <Progress value={grade.percentage} className={`h-2 ${getGradeColor(grade.grade)}`} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {currentGrades.length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-500">
                    No subjects found for this term.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="space-y-6 m-0">
               {/* Attendance Summary Stats */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Card className="bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20">
                   <CardContent className="p-6 flex items-center gap-4">
                     <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                       <ClipboardCheck className="h-6 w-6" />
                     </div>
                     <div>
                       <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Days Present</p>
                       <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                         {gradesData?.attendance?.filter((r: any) => r.status === 'present').length || 0}
                       </h3>
                     </div>
                   </CardContent>
                 </Card>

                 <Card className="bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20">
                   <CardContent className="p-6 flex items-center gap-4">
                     <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                       <Clock className="h-6 w-6" />
                     </div>
                     <div>
                       <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Days Absent</p>
                       <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                         {gradesData?.attendance?.filter((r: any) => r.status === 'absent').length || 0}
                       </h3>
                     </div>
                   </CardContent>
                 </Card>

                 <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
                   <CardContent className="p-6 flex items-center gap-4">
                     <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                       <TrendingUp className="h-6 w-6" />
                     </div>
                     <div>
                       <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Attendance Rate</p>
                       <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                         {(() => {
                           const total = gradesData?.attendance?.length || 0;
                           const present = gradesData?.attendance?.filter((r: any) => r.status === 'present').length || 0;
                           return total > 0 ? Math.round((present / total) * 100) : 0;
                         })()}%
                       </h3>
                     </div>
                   </CardContent>
                 </Card>
               </div>

               <Card>
                 <CardHeader className="flex flex-row items-center justify-between">
                   <div>
                     <CardTitle>Attendance History</CardTitle>
                     <CardDescription>Detailed log of your school presence</CardDescription>
                   </div>
                 </CardHeader>
                 <CardContent>
                    {gradesData?.attendance && gradesData.attendance.length > 0 ? (
                      <div className="rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-slate-50 dark:bg-slate-800">
                            <TableRow>
                              <TableHead className="w-[200px]">Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Remarks</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {gradesData.attendance.map((record: any, index: number) => (
                              <TableRow key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    {new Date(record.date).toLocaleDateString(undefined, { 
                                      weekday: 'short', 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={record.status === 'present' ? 'default' : record.status === 'absent' ? 'destructive' : 'secondary'}
                                    className={record.status === 'present' 
                                      ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200 shadow-sm' 
                                      : record.status === 'absent'
                                      ? 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200 shadow-sm'
                                      : 'bg-slate-100 text-slate-800 border-slate-200 shadow-sm'
                                    }
                                  >
                                    <div className="flex items-center gap-1">
                                      <div className={`h-1.5 w-1.5 rounded-full ${
                                        record.status === 'present' ? 'bg-green-600' : 
                                        record.status === 'absent' ? 'bg-red-600' : 'bg-slate-600'
                                      }`} />
                                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                    </div>
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-slate-600 dark:text-slate-400 italic text-sm">
                                  {record.remarks || <span className="text-slate-300 dark:text-slate-600">No remarks</span>}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-20 text-slate-500 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-dashed rounded-xl">
                         <ClipboardCheck className="h-16 w-16 mx-auto mb-4 opacity-10" />
                         <p className="text-lg font-medium">No attendance records found</p>
                         <p className="text-sm">Attendance data will appear here once recorded by your teachers.</p>
                      </div>
                    )}
                 </CardContent>
               </Card>
            </TabsContent>

            <TabsContent value="assignments" className="space-y-6 m-0">
               <Card>
                 <CardHeader>
                   <CardTitle>Assignments</CardTitle>
                   <CardDescription>Upcoming and past assignments</CardDescription>
                 </CardHeader>
                 <CardContent className="text-center py-12 text-slate-500">
                   <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                   <p>No pending assignments.</p>
                 </CardContent>
               </Card>
            </TabsContent>

            <TabsContent value="profile" className="space-y-6 m-0">
               <Card>
                 <CardHeader>
                   <CardTitle>Student Profile</CardTitle>
                   <CardDescription>Your personal information</CardDescription>
                 </CardHeader>
                 <CardContent>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
                      <Avatar className="h-24 w-24 border-4 border-slate-50 dark:border-slate-800 shadow-lg">
                        <AvatarImage src={student?.avatar_url || student?.avatarUrl} />
                        <AvatarFallback className="text-3xl bg-blue-600 text-white font-bold">
                          {(student?.firstName?.[0] || 'S').toUpperCase()}
                          {(student?.lastName?.[0] || '').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                          {student?.firstName} {student?.lastName}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="px-3 py-1 text-sm">
                            ID: {student?.studentNumber || 'N/A'}
                          </Badge>
                          <Badge className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">
                            {(student?.role || 'student').replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 dark:border-slate-800 pt-8">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <User className="h-4 w-4" /> Personal Details
                        </h4>
                        <div className="space-y-3">
                          <div className="group p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Full Name</label>
                            <p className="font-medium text-slate-900 dark:text-white">{student?.firstName} {student?.lastName}</p>
                          </div>
                          <div className="group p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Email Address</label>
                            <p className="font-medium text-slate-900 dark:text-white break-all">{student?.email || 'No email registered'}</p>
                          </div>
                          <div className="group p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Phone Number</label>
                            <p className="font-medium text-slate-900 dark:text-white">{student?.phone || 'Not provided'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <BookOpen className="h-4 w-4" /> Academic Info
                        </h4>
                        <div className="space-y-3">
                          <div className="group p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Current Class</label>
                            <p className="font-medium text-slate-900 dark:text-white text-lg">{student?.class || 'Not Assigned'}</p>
                          </div>
                          <div className="group p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Student Number</label>
                            <p className="font-medium text-slate-900 dark:text-white">{student?.studentNumber || 'N/A'}</p>
                          </div>
                          <div className="group p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Admission Year</label>
                            <p className="font-medium text-slate-900 dark:text-white">{new Date(student?.created_at || Date.now()).getFullYear()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                 </CardContent>
               </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6 m-0">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card>
                   <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" /> Profile Settings
                     </CardTitle>
                     <CardDescription>Update your personal information</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-4">
                     <p className="text-sm text-slate-500">To update your profile details, please contact the school administration.</p>
                     <Button variant="outline" className="w-full justify-start" disabled>
                        Change Profile Picture
                     </Button>
                     <Button variant="outline" className="w-full justify-start" disabled>
                        Update Contact Info
                     </Button>
                   </CardContent>
                 </Card>

                 <Card>
                   <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" /> Security
                     </CardTitle>
                     <CardDescription>Manage your account security</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-4">
                     <Button variant="outline" className="w-full justify-start">
                        Change Password
                     </Button>
                     <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
                        Sign Out Everywhere
                     </Button>
                   </CardContent>
                 </Card>

                 <Card>
                   <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" /> Notifications
                     </CardTitle>
                     <CardDescription>Configure how you receive alerts</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-4">
                     <div className="flex items-center justify-between">
                       <label className="text-sm font-medium">Email Notifications</label>
                       <div className="h-6 w-11 bg-slate-200 rounded-full relative cursor-not-allowed">
                         <div className="h-5 w-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"></div>
                       </div>
                     </div>
                     <div className="flex items-center justify-between">
                       <label className="text-sm font-medium">SMS Alerts</label>
                       <div className="h-6 w-11 bg-slate-200 rounded-full relative cursor-not-allowed">
                         <div className="h-5 w-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"></div>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               </div>
            </TabsContent>
          </Tabs>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-40 px-2 py-2 safe-area-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center">
          {sidebarItems.slice(0, 5).map((item) => {
             if (!item) return null; // Handle potential hidden items
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
      {printingTerm && (
        <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
          <div ref={reportRef} style={{ width: '210mm', minHeight: '297mm', background: 'white' }}>
            <ReportCardContent
              data={{
                student: {
                  ...gradesData.student,
                  // Ensure student number and class are passed correctly if missing
                  name: `${gradesData.student.firstName || student.firstName || ''} ${gradesData.student.lastName || student.lastName || ''}`.trim() || 'Student',
                  studentNumber: gradesData.student.studentNumber || student?.studentNumber,
                  class: gradesData.student.class || student?.class,
                },
                school: gradesData.school,
                gradingScale: gradesData.gradingScale,
                grades: printingTerm.grades
              }}
              term={`${String(printingTerm.term).toLowerCase().includes('term') ? '' : 'Term '}${printingTerm.term}`}
              examType={printingTerm.grades?.[0]?.exam_type || 'End of Term'}
              academicYear={printingTerm.academicYear}
              className="w-full h-full shadow-none border-none m-0 p-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
