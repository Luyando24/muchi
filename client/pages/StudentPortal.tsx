import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { ReportCardContent } from '@/components/shared/ReportCardContent';
import { supabase } from '@/lib/supabase';
import { 
  BookOpen, 
  Calendar, 
  ClipboardCheck, 
  User, 
  Bell, 
  Award, 
  TrendingUp, 
  Clock, 
  FileText, 
  Download,
  Printer,
  Eye,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  Users,
  BarChart3,
  Home,
  Settings,
  LogOut,
  Menu,
  X,
  Loader2,
  Search,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import ThemeToggle from '@/components/navigation/ThemeToggle';

// Interfaces matching backend responses
interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  grade: string;
  class: string;
  studentNumber: string;
  profileImage?: string;
  guardian: {
    name: string;
    phone: string;
    email: string;
  };
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
}

interface AttendanceStats {
  overall: number;
  thisMonth: number;
  daysPresent: number;
  daysAbsent: number;
  totalDays: number;
  records: AttendanceRecord[];
}

interface Assignment {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'completed' | 'late';
  type: string;
  grade?: string;
}

interface DashboardStats {
  attendance: {
    overall: number;
    present: number;
    absent: number;
  };
  pendingTasks: number;
  performance: string;
  average: number;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  department: string;
}

const getGradeColor = (grade: string) => {
  if (['A+', 'A', 'A-'].includes(grade)) return 'bg-green-500';
  if (['B+', 'B', 'B-'].includes(grade)) return 'bg-blue-500';
  if (['C+', 'C', 'C-'].includes(grade)) return 'bg-yellow-500';
  if (['D+', 'D', 'D-'].includes(grade)) return 'bg-orange-500';
  return 'bg-green-500';
};

export default function StudentPortal() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // State for data
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [gradesData, setGradesData] = useState<any>(null);
  const [attendance, setAttendance] = useState<AttendanceStats | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [printingTerm, setPrintingTerm] = useState<any>(null);

  // Filter state for grades
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");

  useEffect(() => {
    if (gradesData?.termResults?.length > 0 && !selectedYear) {
      // Default to the most recent term (first one)
      const latest = gradesData.termResults[0];
      setSelectedYear(latest.academicYear);
      setSelectedTerm(latest.term);
    }
  }, [gradesData]);

  const handlePrint = (termResult: any) => {
    const originalTitle = document.title;
    if (student) {
      document.title = `${student.firstName}_${student.lastName}_ReportCard_${termResult.term}_${termResult.academicYear}`;
    }
    setPrintingTerm(termResult);
    setTimeout(() => {
      window.print();
      // Restore title and clear state after print dialog closes (or sufficiently long delay)
      // Note: In many browsers, JS pauses during print dialog.
      // We'll reset title immediately after print call returns (dialog closed)
      document.title = originalTitle;
      setPrintingTerm(null);
    }, 100);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Get User Session & Profile
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      const token = session.access_token;
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch Profile details directly from Supabase first to get basics
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setStudent({
          id: profile.id,
          firstName: profile.full_name?.split(' ')[0] || 'Student',
          lastName: profile.full_name?.split(' ').slice(1).join(' ') || '',
          email: session.user.email || '',
          grade: profile.grade || 'N/A',
          class: "N/A", // Need to join with enrollments
          studentNumber: "STU" + profile.id.substring(0, 6).toUpperCase(),
          guardian: {
            name: profile.guardian_name || 'N/A',
            phone: profile.emergency_contact || 'N/A',
            email: 'N/A'
          }
        });
      }

      // 2. Fetch Dashboard Stats
      const statsRes = await fetch('/api/student/dashboard', { headers });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      // 3. Fetch Assignments
      const assignmentsRes = await fetch('/api/student/assignments', { headers });
      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        // Map backend data to frontend interface
        setAssignments(data.map((a: any) => ({
          id: a.id,
          title: a.title,
          subject: a.subject,
          dueDate: a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'No Due Date',
          status: a.status,
          type: a.type,
          grade: a.grade
        })));
      }

      // 4. Fetch Grades
      const gradesRes = await fetch('/api/student/grades', { headers });
      if (gradesRes.ok) {
        const data = await gradesRes.json();
        setGradesData(data);
      }

      // 5. Fetch Attendance
      const attendanceRes = await fetch('/api/student/attendance', { headers });
      if (attendanceRes.ok) {
        const data = await attendanceRes.json();
        setAttendance({
          overall: data.stats.percentage,
          thisMonth: data.stats.thisMonthPercentage ?? data.stats.percentage,
          daysPresent: data.stats.present,
          daysAbsent: data.stats.absent,
          totalDays: data.stats.total,
          records: data.records.map((r: any) => ({
            id: r.id,
            date: r.date ? new Date(r.date).toLocaleDateString() : 'Unknown Date',
            status: r.status,
            remarks: r.remarks
          }))
        });
      }

      // 6. Fetch Subjects
      const subjectsRes = await fetch('/api/student/subjects', { headers });
      if (subjectsRes.ok) {
        const data = await subjectsRes.json();
        setSubjects(data);
      }

    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      navigate('/login');
    }
  };

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "subjects", label: "Subjects", icon: BookOpen },
    { id: "grades", label: "Grades", icon: Award },
    { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    { id: "assignments", label: "Assignments", icon: FileText },
    { id: "profile", label: "Profile", icon: User },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  // Derived state for Grades Tab
  const availableYears = Array.from(new Set((gradesData?.termResults || []).map((r: any) => r.academicYear))).sort().reverse();
  
  // Update available terms when year changes if needed
  const availableTerms = (gradesData?.termResults || [])
    .filter((r: any) => r.academicYear === selectedYear)
    .map((r: any) => r.term);

  const currentResult = (gradesData?.termResults || []).find(
    (r: any) => r.academicYear === selectedYear && r.term === selectedTerm
  );

  // Calculate summary stats for the current result
  const currentGrades = currentResult?.grades || [];
  const currentAverage = currentGrades.length > 0 
    ? (currentGrades.reduce((acc: number, g: any) => acc + (g.percentage || 0), 0) / currentGrades.length).toFixed(1) 
    : 0;
  
  const bestSubject = currentGrades.length > 0 
    ? [...currentGrades].sort((a: any, b: any) => (b.percentage || 0) - (a.percentage || 0))[0] 
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and School Name */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <div className="flex items-center gap-3">
                <GraduationCap className="h-8 w-8 text-blue-600" />
                <div className="hidden md:block">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                    MUCHI Student Portal
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Chongwe Secondary School</p>
                </div>
              </div>
              
              {/* Breadcrumb */}
               <div className="hidden md:flex items-center text-sm text-slate-500 ml-4 border-l pl-4 border-slate-200 dark:border-slate-700">
                  <span className="font-medium text-slate-900 dark:text-white capitalize">{activeTab}</span>
               </div>
            </div>

            {/* Search Bar (Center) */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
               <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input 
                    type="search" 
                    placeholder="Search courses, assignments..." 
                    className="w-full pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500"
                  />
               </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {/* Mock Notifications */}
                   <div className="max-h-64 overflow-y-auto">
                      <DropdownMenuItem className="cursor-pointer">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-medium">New Assignment</p>
                          <p className="text-xs text-slate-500">Physics Homework due tomorrow</p>
                          <p className="text-xs text-slate-400 mt-1">2 hours ago</p>
                        </div>
                      </DropdownMenuItem>
                   </div>
                   <DropdownMenuSeparator />
                   <DropdownMenuItem className="justify-center text-blue-600 cursor-pointer">
                      View all notifications
                   </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <ThemeToggle />
              
              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={student?.profileImage} />
                        <AvatarFallback>{student?.firstName?.[0]}{student?.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left">
                        <p className="text-sm font-medium text-slate-900 dark:text-white leading-none">
                          {student?.firstName} {student?.lastName}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {student?.grade} - {student?.class}
                        </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-500 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveTab('profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab('settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-transform duration-300 ease-in-out`}>
          <div className="flex flex-col h-full pt-16 lg:pt-0">
            <nav className="flex-1 px-4 py-6 space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={activeTab === item.id ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsSidebarOpen(false);
                    }}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Welcome back, {student?.firstName}!
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Here's your academic overview for today
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {student?.studentNumber}
                </Badge>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Attendance</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.attendance?.overall || 0}%</p>
                      </div>
                      <ClipboardCheck className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Pending Tasks</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {stats?.pendingTasks || 0}
                        </p>
                      </div>
                      <FileText className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Performance Status</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.performance || 'N/A'}</p>
                        {stats?.average > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Current Average: {stats.average}%
                          </p>
                        )}
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity and Upcoming Events */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Upcoming Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {upcomingEvents.map((event, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{event.title}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{event.date}</p>
                        </div>
                        <Badge variant={event.type === 'exam' ? 'destructive' : 'secondary'}>
                          {event.type}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Recent Assignments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {assignments.length > 0 ? (
                      assignments.slice(0, 4).map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{assignment.title}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{assignment.subject}</p>
                          </div>
                          <Badge variant={
                            assignment.status === 'completed' ? 'default' :
                            assignment.status === 'submitted' ? 'secondary' : 'destructive'
                          }>
                            {assignment.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-500 py-4">No recent assignments</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Subjects Tab */}
            <TabsContent value="subjects" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">My Subjects</h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Subjects you are currently enrolled in
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.length > 0 ? (
                  subjects.map((subject) => (
                    <Card key={subject.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          {subject.code}
                        </CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-1">{subject.name}</div>
                        <p className="text-xs text-muted-foreground">
                          {subject.department} Department
                        </p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                    <BookOpen className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">No Subjects Found</h3>
                    <p className="text-slate-500 dark:text-slate-400">You are not enrolled in any subjects yet.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Grades Tab */}
            <TabsContent value="grades" className="space-y-6">
              {/* Header & Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Academic Performance</h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Track your grades and progress over time
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  {/* Year Select */}
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((year: any) => (
                         <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Term Select */}
                  <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Term" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTerms.map((term: any) => (
                         <SelectItem key={term} value={term}>{term}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Print Button */}
                  <Button 
                    variant="outline" 
                    onClick={() => currentResult && handlePrint(currentResult)}
                    disabled={!currentResult}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Report
                  </Button>
                </div>
              </div>

              {currentResult ? (
                <>
                  {/* Summary Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                       <CardHeader className="pb-2">
                         <CardTitle className="text-sm font-medium text-muted-foreground">Term Average</CardTitle>
                       </CardHeader>
                       <CardContent>
                         <div className="text-2xl font-bold">{currentAverage}%</div>
                         <p className="text-xs text-muted-foreground mt-1">
                           Across {currentGrades.length} subjects
                         </p>
                       </CardContent>
                    </Card>
                    
                    <Card>
                       <CardHeader className="pb-2">
                         <CardTitle className="text-sm font-medium text-muted-foreground">Best Subject</CardTitle>
                       </CardHeader>
                       <CardContent>
                         <div className="text-2xl font-bold truncate" title={bestSubject?.subjects?.name || 'N/A'}>
                           {bestSubject?.subjects?.name || 'N/A'}
                         </div>
                         <p className="text-xs text-muted-foreground mt-1">
                           Score: {bestSubject?.percentage || 0}%
                         </p>
                       </CardContent>
                    </Card>

                    <Card>
                       <CardHeader className="pb-2">
                         <CardTitle className="text-sm font-medium text-muted-foreground">Subjects Passed</CardTitle>
                       </CardHeader>
                       <CardContent>
                         <div className="text-2xl font-bold">
                           {currentGrades.filter((g: any) => (g.percentage || 0) >= 50).length} / {currentGrades.length}
                         </div>
                         <Progress 
                           value={currentGrades.length > 0 ? (currentGrades.filter((g: any) => (g.percentage || 0) >= 50).length / currentGrades.length) * 100 : 0} 
                           className="h-2 mt-2" 
                         />
                       </CardContent>
                    </Card>
                  </div>

                  {/* Grades Table */}
                  <div className="rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-800">
                        <TableRow>
                          <TableHead className="font-semibold">Subject</TableHead>
                          <TableHead className="font-semibold text-center w-[100px] hidden md:table-cell">Code</TableHead>
                          <TableHead className="font-semibold text-center w-[100px]">Score</TableHead>
                          <TableHead className="font-semibold text-center w-[80px]">Grade</TableHead>
                          <TableHead className="font-semibold hidden lg:table-cell">Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentGrades.map((grade: any) => (
                          <TableRow key={grade.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <TableCell className="font-medium text-slate-900 dark:text-white">
                              {grade.subjects?.name}
                              <div className="lg:hidden text-xs text-muted-foreground italic mt-1 line-clamp-1">
                                {grade.comments || "-"}
                              </div>
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
                            <TableCell className="text-muted-foreground text-sm italic max-w-[250px] truncate hidden lg:table-cell">
                              {grade.comments || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Head Teacher's Remark */}
                  <Card className="mt-6 border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        Head Teacher's Remark
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic">
                        {(() => {
                          if (!currentGrades || currentGrades.length === 0) return "No grades available for analysis.";

                          const avg = parseFloat(currentAverage as string);
                          const firstName = gradesData?.student?.firstName || "Student";
                          
                          // Overall Performance
                          let overallRemark = "";
                          if (avg >= 75) overallRemark = "an outstanding";
                          else if (avg >= 65) overallRemark = "a very good";
                          else if (avg >= 55) overallRemark = "a good";
                          else if (avg >= 45) overallRemark = "a satisfactory";
                          else overallRemark = "a below average";

                          // Best and Weakest Subjects
                          const sortedGrades = [...currentGrades].sort((a: any, b: any) => (b.percentage || 0) - (a.percentage || 0));
                          const bestSubject = sortedGrades[0];
                          const weakestSubject = sortedGrades[sortedGrades.length - 1];
                          
                          let subjectRemark = "";
                          if (bestSubject && (bestSubject.percentage || 0) >= 70) {
                            subjectRemark += `${firstName} has shown particular strength in ${bestSubject.subjects?.name || 'their best subject'}, achieving a score of ${bestSubject.percentage}%. `;
                          }
                          
                          if (weakestSubject && (weakestSubject.percentage || 0) < 50) {
                            subjectRemark += `However, more attention is needed in ${weakestSubject.subjects?.name || 'some areas'}, where performance was lower (${weakestSubject.percentage}%). `;
                          } else if (weakestSubject && weakestSubject !== bestSubject) {
                            subjectRemark += `Performance across all subjects was generally consistent. `;
                          }

                          // Closing
                          let closing = "";
                          if (avg >= 60) closing = "Keep up the excellent work!";
                          else if (avg >= 50) closing = "With consistent effort, better results can be achieved next term.";
                          else closing = "We encourage more dedicated study time and seeking help in difficult subjects.";

                          return `${firstName} has achieved ${overallRemark} performance this term with an overall average of ${avg}%. ${subjectRemark}${closing}`;
                        })()}
                      </p>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Award className="h-12 w-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">No Grades Available</h3>
                    <p className="text-slate-500 dark:text-slate-400">
                      {gradesData?.termResults?.length > 0 
                        ? "Please select a different term or year." 
                        : "Grades for your terms have not been published yet."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Attendance Tab */}
            <TabsContent value="attendance" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance Record</h2>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5" />
                      Overall Attendance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-600 mb-2">{attendance?.overall || 0}%</div>
                      <Progress value={attendance?.overall || 0} className="h-3 mb-4" />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600 dark:text-slate-400">Present</p>
                          <p className="font-bold text-green-600">{attendance?.daysPresent || 0} days</p>
                        </div>
                        <div>
                          <p className="text-slate-600 dark:text-slate-400">Absent</p>
                          <p className="font-bold text-red-600">{attendance?.daysAbsent || 0} days</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>This Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">{attendance?.thisMonth || 0}%</div>
                      <Progress value={attendance?.thisMonth || 0} className="h-3 mb-4" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {attendance && attendance.thisMonth > 90 ? "Excellent attendance this month!" : "Keep track of your attendance!"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {attendance && attendance.overall >= 95 && (
                        <Alert className="border-green-200 bg-green-50">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            Excellent attendance record!
                          </AlertDescription>
                        </Alert>
                      )}
                      {attendance && attendance.overall >= 85 && attendance.overall < 95 && (
                        <Alert className="border-yellow-200 bg-yellow-50">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-800">
                            Good attendance, keep it up!
                          </AlertDescription>
                        </Alert>
                      )}
                      {attendance && attendance.overall < 85 && (
                        <Alert className="border-red-200 bg-red-50">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-800">
                            Attendance needs improvement.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Attendance History Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance History</CardTitle>
                  <CardDescription>Detailed record of your daily attendance</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance?.records && attendance.records.length > 0 ? (
                        attendance.records.map((record, index) => (
                          <TableRow key={index}>
                            <TableCell>{record.date}</TableCell>
                            <TableCell>
                              <Badge variant={
                                record.status === 'present' ? 'default' :
                                record.status === 'absent' ? 'destructive' :
                                record.status === 'late' ? 'secondary' : 'outline'
                              } className={
                                record.status === 'present' ? 'bg-green-600 hover:bg-green-700' :
                                record.status === 'late' ? 'bg-orange-500 hover:bg-orange-600' : ''
                              }>
                                {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>{record.remarks || '-'}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-slate-500">
                            No attendance records found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Assignments Tab */}
            <TabsContent value="assignments" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Assignments & Tasks</h2>
                <div className="flex gap-2">
                  <Button variant="outline">Filter</Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assignment</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.length > 0 ? (
                        assignments.map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell className="font-medium">{assignment.title}</TableCell>
                            <TableCell>{assignment.subject}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{assignment.type}</Badge>
                            </TableCell>
                            <TableCell>{assignment.dueDate}</TableCell>
                            <TableCell>{assignment.grade || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={
                                assignment.status === 'completed' ? 'default' :
                                assignment.status === 'submitted' ? 'secondary' : 'destructive'
                              }>
                                {assignment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {assignment.status === 'pending' && (
                                  <Button variant="ghost" size="sm">
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-slate-500">
                            No assignments found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Student Profile</h2>
                <Button variant="outline">Edit Profile</Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6 text-center">
                    <Avatar className="h-24 w-24 mx-auto mb-4">
                      <AvatarImage src={student?.profileImage} />
                      <AvatarFallback className="text-2xl">
                        {student?.firstName?.[0]}{student?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      {student?.firstName} {student?.lastName}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      {student?.grade} - {student?.class}
                    </p>
                    <Badge variant="secondary">{student?.studentNumber}</Badge>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">First Name</label>
                        <p className="text-slate-900 dark:text-white">{student?.firstName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Last Name</label>
                        <p className="text-slate-900 dark:text-white">{student?.lastName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Student Number</label>
                        <p className="text-slate-900 dark:text-white">{student?.studentNumber}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Email</label>
                        <p className="text-slate-900 dark:text-white">{student?.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Grade</label>
                        <p className="text-slate-900 dark:text-white">{student?.grade}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Class</label>
                        <p className="text-slate-900 dark:text-white">{student?.class}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Guardian Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Guardian Name</label>
                      <p className="text-slate-900 dark:text-white">{student?.guardian?.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Phone</label>
                      <p className="text-slate-900 dark:text-white">{student?.guardian?.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Email</label>
                      <p className="text-slate-900 dark:text-white">{student?.guardian?.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h2>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>Customize your portal experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Receive updates via email</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Theme</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Choose your preferred theme</p>
                    </div>
                    <ThemeToggle />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Language</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Select your language</p>
                    </div>
                    <Button variant="outline" size="sm">English</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account</CardTitle>
                  <CardDescription>Manage your account settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Update Profile Picture
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Privacy Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Print Portal */}
      {printingTerm && createPortal(
        <div className="print-portal hidden print:block">
          <ReportCardContent 
            data={{
              student: gradesData.student,
              school: gradesData.school,
              gradingScale: gradesData.gradingScale,
              grades: printingTerm.grades
            }}
            term={printingTerm.term}
            academicYear={printingTerm.academicYear}
            className="border-none shadow-none print:shadow-none print:border-none w-full max-w-none"
          />
        </div>,
        document.body
      )}
    </div>
  );
}
