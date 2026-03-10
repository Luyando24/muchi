import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import StudentDetailsView from '@/components/school-admin/StudentDetailsView';
import {
  BookOpen,
  Calendar,
  ClipboardCheck,
  User,
  Bell,
  TrendingUp,
  Clock,
  FileText,
  Download,
  CheckCircle,
  GraduationCap,
  Users,
  Home,
  Settings,
  LogOut,
  Menu,
  X,
  PenTool,
  Search,
  Filter,
  Plus,
  Lock,
  Moon,
  HelpCircle,
  Loader2,
  Trash2,
  Save,
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import ThemeToggle from '@/components/navigation/ThemeToggle';
import { useToast } from "@/components/ui/use-toast";
import GradebookView from '@/components/school-admin/GradebookView';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { OfflineIndicator } from '@/components/navigation/OfflineIndicator';
import { syncFetch, offlineQuery } from '@/lib/syncService';

// Interfaces
interface Stats {
  totalStudents: number;
  classesToday: number;
  pendingGrading: number;
  averageAttendance: number;
}

interface ClassData {
  id: string;
  name: string;
  grade_level: string;
  class_teacher_id?: string;
  student_count?: number;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  class_id: string;
  subject_id: string;
  due_date: string;
  type: string;
  category: string;
  assignment_number: number;
  classes?: { name: string };
  subjects?: { name: string };
}

interface Student {
  id: string;
  name: string;
  studentId: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface SchoolSettings {
  academic_year: string;
  current_term: string;
}

interface Submission {
  id: string;
  student_id: string;
  assignment_id: string;
  submitted_at: string;
  status: string;
  file_url?: string;
  grade?: number;
  feedback?: string;
  students?: { first_name: string; last_name: string };
  assignments?: { title: string };
}

interface TimetableEntry {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  classes?: { name: string };
  subjects?: { name: string; code: string };
}

// Helper to format time slots
const formatTime = (time: string) => {
  return time.substring(0, 5);
};

export default function TeacherPortal() {
  const navigate = useNavigate();

  // UI State
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Data State
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [stats, setStats] = useState<Stats>({ totalStudents: 0, classesToday: 0, pendingGrading: 0, averageAttendance: 0 });
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);

  // Attendance & Students State
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [attendanceState, setAttendanceState] = useState<{ [key: string]: { status: string, remarks: string } }>({});
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState("");
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // New Assignment Form State
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    class_id: '',
    subject_id: '',
    due_date: '',
    type: 'homework',
    category: 'Homework',
    assignment_number: 1
  });

  // Grading State
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [gradingSubmissions, setGradingSubmissions] = useState<any[]>([]); // Using any for joined structure

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchStudentsAndAttendance();
    }
  }, [selectedClassId, selectedDate]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);

      // Fetch Profile
      const { data: profile } = await offlineQuery(
        supabase
          .from('profiles')
          .select('*, schools(*)')
          .eq('id', user.id)
          .single(),
        `profile:${user.id}`
      );

      setProfile(profile);

      if (profile) {
        await fetchDashboardData();
      }
      // 6. Timetable
      const timetableData = await fetchWithAuth('/api/teacher/timetable');
      setTimetable(timetableData);

    } catch (error) {
      console.error('Error checking user:', error);
      navigate('/login');
    }
  };

  const fetchWithAuth = async (url: string, options: any = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session');

    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const result = await syncFetch(url, { ...options, headers });
    
    if (result.offline) {
      toast({
        title: "Offline Mode",
        description: "Your changes have been saved locally and will sync when you are back online.",
      });
    }
    
    return result;
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 0. School Settings
      try {
        const settings = await fetchWithAuth('/api/school/settings');
        setSchoolSettings(settings);
      } catch (e) {
        console.error('Failed to fetch school settings', e);
      }

      // 1. Stats
      const statsData = await fetchWithAuth('/api/teacher/dashboard-stats');
      setStats(statsData);

      // 2. Classes
      const classesData = await fetchWithAuth('/api/teacher/classes');
      setClasses(classesData);
      if (classesData.length > 0 && !selectedClassId) {
        setSelectedClassId(classesData[0].id);
      }

      // 3. Assignments
      const assignmentsData = await fetchWithAuth('/api/teacher/assignments');
      setAssignments(assignmentsData);

      // 4. Subjects
      const subjectsData = await fetchWithAuth('/api/teacher/subjects');
      setSubjects(subjectsData);

      // PRE-FETCH: Students and current attendance for all classes to ensure offline attendance works
      if (classesData && classesData.length > 0) {
        console.log(`[Offline] Pre-fetching roster & attendance for ${classesData.length} classes...`);
        const today = new Date().toISOString().split('T')[0];
        for (const cls of classesData) {
          fetchWithAuth(`/api/teacher/classes/${cls.id}/students`).catch(() => {});
          fetchWithAuth(`/api/teacher/attendance/${cls.id}/${today}`).catch(() => {});
        }
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsAndAttendance = async () => {
    if (!selectedClassId) return;
    if (!selectedDate) return;

    try {
      // Fetch students
      const studentsData = await fetchWithAuth(`/api/teacher/classes/${selectedClassId}/students`);
      setStudents(studentsData);

      // Fetch existing attendance
      const attendanceData = await fetchWithAuth(`/api/teacher/attendance/${selectedClassId}/${selectedDate}`);

      // Initialize attendance state
      const newAttendanceState: any = {};

      // Check if selected date is a weekend
      const [year, month, day] = selectedDate.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const defaultStatus = isWeekend ? 'excused' : 'present';

      // Default to present (or excused on weekends) for all students if no record exists
      studentsData.forEach((student: any) => {
        newAttendanceState[student.id] = { status: defaultStatus, remarks: '' };
      });

      // Override with existing records
      if (attendanceData && attendanceData.length > 0) {
        attendanceData.forEach((record: any) => {
          newAttendanceState[record.student_id] = {
            status: record.status,
            remarks: record.remarks || ''
          };
        });
      }

      setAttendanceState(newAttendanceState);
    } catch (error) {
      console.error("Error fetching students/attendance:", error);
    }
  };

  const handleCreateAssignment = async () => {
    // Validate inputs
    if (!newAssignment.title || !newAssignment.class_id || !newAssignment.subject_id || !newAssignment.due_date) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields (Title, Class, Subject, Due Date).",
        variant: "destructive"
      });
      return;
    }

    try {
      const url = editingAssignmentId
        ? `/api/teacher/assignments/${editingAssignmentId}`
        : '/api/teacher/assignments';
      const method = editingAssignmentId ? 'PUT' : 'POST';

      await fetchWithAuth(url, {
        method,
        body: JSON.stringify(newAssignment)
      });

      setIsCreateAssignmentOpen(false);
      setEditingAssignmentId(null);

      // Refresh assignments
      const assignmentsData = await fetchWithAuth('/api/teacher/assignments');
      setAssignments(assignmentsData);

      toast({
        title: editingAssignmentId ? "Assignment Updated" : "Assignment Created",
        description: `Successfully ${editingAssignmentId ? 'updated' : 'created'} assignment.`
      });

      // Reset form
      setNewAssignment({
        title: '',
        description: '',
        class_id: '',
        subject_id: '',
        due_date: '',
        type: 'homework',
        category: 'Homework',
        assignment_number: 1
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to save assignment.",
        variant: "destructive"
      });
    }
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setNewAssignment({
      title: assignment.title,
      description: assignment.description,
      class_id: assignment.class_id,
      subject_id: assignment.subject_id,
      due_date: assignment.due_date.split('T')[0],
      type: assignment.type,
      category: assignment.category,
      assignment_number: assignment.assignment_number
    });
    setEditingAssignmentId(assignment.id);
    setIsCreateAssignmentOpen(true);
  };

  const handleDeleteAssignment = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await fetchWithAuth(`/api/teacher/assignments/${deleteTargetId}`, { method: 'DELETE' });
      setAssignments(prev => prev.filter(a => a.id !== deleteTargetId));
      setDeleteTargetId(null);
      toast({ title: "Assignment Deleted" });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to delete assignment", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewSubmissions = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setIsGradingOpen(true);
    try {
      const data = await fetchWithAuth(`/api/teacher/assignments/${assignment.id}/submissions`);
      setGradingSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({ title: "Error", description: "Failed to load submissions", variant: "destructive" });
    }
  };

  const handleSaveGrade = async (studentId: string, score: number, feedback: string) => {
    if (!selectedAssignment) return;
    try {
      const response = await fetchWithAuth('/api/teacher/grades', {
        method: 'POST',
        body: JSON.stringify({
          assignment_id: selectedAssignment.id,
          student_id: studentId,
          score,
          max_score: 100, // Default max score
          feedback,
          status: 'graded'
        })
      });

      const updatedSubmission = response; // The API returns the upserted submission object

      // Update local state
      setGradingSubmissions(prev => prev.map(item => {
        if (item.student_id === studentId) {
          return {
            ...item,
            submission: updatedSubmission
          };
        }
        return item;
      }));

      toast({ title: "Grade Saved", description: "Student grade has been updated." });
    } catch (error) {
      console.error('Error saving grade:', error);
      toast({ title: "Error", description: "Failed to save grade.", variant: "destructive" });
    }
  };

  const handleAttendanceChange = (studentId: string, field: 'status' | 'remarks', value: string) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const saveAttendance = async () => {
    if (!selectedClassId) {
      toast({ title: "Error", description: "Please select a class", variant: "destructive" });
      return;
    }
    if (!selectedDate) {
      toast({ title: "Error", description: "Please select a date", variant: "destructive" });
      return;
    }

    setSavingAttendance(true);
    try {
      const records = Object.entries(attendanceState).map(([studentId, data]) => ({
        student_id: studentId,
        status: data.status,
        remarks: data.remarks
      }));

      const result = await fetchWithAuth('/api/teacher/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          classId: selectedClassId,
          date: selectedDate,
          records
        })
      });

      if (!result.offline) {
        toast({ title: "Success", description: "Attendance saved successfully!" });
      }
    } catch (error: any) {
      console.error("Error saving attendance:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save attendance.",
        variant: "destructive"
      });
    } finally {
      setSavingAttendance(false);
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
    { id: "classes", label: "My Classes", icon: BookOpen },
    { id: "students", label: "Students", icon: Users },
    { id: "grading", label: "Assignments", icon: PenTool },
    { id: "gradebook", label: "Gradebook", icon: BookOpen },
    { id: "timetable", label: "Timetable", icon: Calendar },
    { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    { id: "profile", label: "Profile", icon: User },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg">Loading Teacher Portal...</span>
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
                    MUCHI Teacher Portal
                  </h1>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-600 dark:text-slate-400">{profile?.schools?.name || 'School Name'}</p>
                    {schoolSettings && (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                        {schoolSettings.academic_year} | {schoolSettings.current_term}
                      </Badge>
                    )}
                  </div>
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
                  placeholder="Search students, classes, assignments..."
                  className="w-full pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500"
                />
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-2 sm:gap-4">
              <OfflineIndicator />
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
                        <p className="text-sm font-medium">New Assignment Submission</p>
                        <p className="text-xs text-slate-500">John Doe submitted "Physics Homework"</p>
                        <p className="text-xs text-slate-400 mt-1">2 mins ago</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">Staff Meeting Reminder</p>
                        <p className="text-xs text-slate-500">Meeting starts in 1 hour in Room 101</p>
                        <p className="text-xs text-slate-400 mt-1">1 hour ago</p>
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
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback>{profile?.first_name?.[0]}{profile?.last_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium text-slate-900 dark:text-white leading-none">
                        {(profile?.first_name || profile?.last_name)
                          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                          : (profile?.full_name || user?.email || 'Teacher')}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {profile?.department || 'Teacher'}
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
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Need Help?</p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mb-3">Contact IT Support for system issues.</p>
                <Button size="sm" variant="outline" className="w-full text-xs">Contact Support</Button>
              </div>
            </div>
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
        <main className="flex-1 p-6 overflow-y-auto h-[calc(100vh-64px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Good Morning, {(profile?.first_name || profile?.last_name) ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : (profile?.full_name || user?.email || 'Teacher')}!
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Here's what's happening in your classes today.
                  </p>
                </div>
                <Button onClick={() => {
                  setActiveTab("grading");
                  setIsCreateAssignmentOpen(true);
                  setEditingAssignmentId(null);
                  setNewAssignment({
                    title: '',
                    description: '',
                    class_id: '',
                    subject_id: '',
                    due_date: '',
                    type: 'homework',
                    category: 'Homework',
                    assignment_number: 1
                  });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Assignment
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Total Students</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalStudents}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Classes Today</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.classesToday}</p>
                      </div>
                      <BookOpen className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Pending Grading</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pendingGrading}</p>
                      </div>
                      <PenTool className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Avg. Attendance</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.averageAttendance}%</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* My Classes Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      My Classes
                    </CardTitle>
                    <CardDescription>You have {classes.length} classes assigned</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {classes.map((cls, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border-l-4 border-blue-500">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-slate-900 dark:text-white">{cls.name}</h3>
                            <Badge variant="outline" className="bg-white dark:bg-slate-800">{cls.grade_level}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button variant="ghost" className="w-full text-blue-600" onClick={() => setActiveTab('classes')}>View All Classes</Button>
                  </CardContent>
                </Card>

                {/* Recent Submissions Placeholder */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>Latest updates from your classes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-500 text-center py-4">No recent activity to show.</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Students Tab */}
            <TabsContent value="students" className="space-y-6">
              {selectedStudentId ? (
                <StudentDetailsView 
                  studentId={selectedStudentId} 
                  onBack={() => setSelectedStudentId(null)} 
                  userRole="teacher"
                />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Students Directory</h2>
                    <div className="flex gap-2 items-center">
                      <Label>Class:</Label>
                      <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Class List: {classes.find(c => c.id === selectedClassId)?.name || 'Select a Class'}</CardTitle>
                      <CardDescription>{students.length} Students Enrolled</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Student ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {students.length > 0 ? (
                            students.map((student) => (
                              <TableRow key={student.id}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback>{student.name?.[0] || 'S'}</AvatarFallback>
                                    </Avatar>
                                    {student.name}
                                  </div>
                                </TableCell>
                                <TableCell>{student.studentId}</TableCell>
                                <TableCell>
                                  <Badge className="bg-green-500">Active</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setSelectedStudentId(student.id)}
                                  >
                                    View Profile
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-4 text-slate-500">
                                {selectedClassId ? 'No students found in this class' : 'Please select a class to view students'}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Timetable Tab */}
            <TabsContent value="timetable" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Weekly Timetable</h2>
                  <p className="text-slate-600 dark:text-slate-400">View your class schedule for the week.</p>
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Class Schedule</CardTitle>
                  <CardDescription>
                    {schoolSettings ? `${schoolSettings.academic_year} - ${schoolSettings.current_term}` : 'Loading...'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Time</TableHead>
                        <TableHead>Monday</TableHead>
                        <TableHead>Tuesday</TableHead>
                        <TableHead>Wednesday</TableHead>
                        <TableHead>Thursday</TableHead>
                        <TableHead>Friday</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'].map((time) => {
                        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                        return (
                          <TableRow key={time}>
                            <TableCell className="font-medium text-slate-900 dark:text-slate-200">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-500" />
                                {time}
                              </div>
                            </TableCell>
                            {days.map(day => {
                              const slot = timetable.find(t =>
                                t.day_of_week === day &&
                                formatTime(t.start_time) === time
                              );

                              return (
                                <TableCell key={day} className={!slot ? "text-slate-400 italic" : "font-medium text-blue-600 dark:text-blue-400"}>
                                  {slot ? (
                                    <div>
                                      <div className="font-bold">{slot.subjects?.name || 'Subject'}</div>
                                      <div className="text-xs text-slate-500">{slot.classes?.name || 'Class'}</div>
                                    </div>
                                  ) : 'Free'}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Classes Tab */}
            <TabsContent value="classes" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">My Classes</h2>
                  <p className="text-slate-600 dark:text-slate-400">Manage your courses, students, and curriculum.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((cls, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow border-t-4 border-t-blue-500">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{cls.name}</CardTitle>
                          <CardDescription className="font-medium text-slate-900 dark:text-slate-200 mt-1">{cls.grade_level}</CardDescription>
                        </div>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                          Active
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                          <Users className="h-4 w-4 mr-3 text-slate-400" />
                          {cls.student_count || 0} Students
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button className="flex-1" size="sm" onClick={() => {
                            setSelectedClassId(cls.id);
                            setActiveTab('students');
                          }}>
                            View Students
                          </Button>
                          <Button variant="outline" size="sm" title="Attendance" onClick={() => {
                            setSelectedClassId(cls.id);
                            setActiveTab('attendance');
                          }}>
                            <ClipboardCheck className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Grading / Assignments Tab */}
            <TabsContent value="grading" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Assignments</h2>
                  <p className="text-slate-600 dark:text-slate-400">Manage assignments and grading.</p>
                </div>
                <div className="flex gap-2">
                  <Dialog open={isCreateAssignmentOpen} onOpenChange={setIsCreateAssignmentOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingAssignmentId(null);
                        setNewAssignment({
                          title: '',
                          description: '',
                          class_id: '',
                          subject_id: '',
                          due_date: '',
                          type: 'homework',
                          category: 'Homework',
                          assignment_number: 1
                        });
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Assignment
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>{editingAssignmentId ? "Edit Assignment" : "Create New Assignment"}</DialogTitle>
                        <DialogDescription>
                          {editingAssignmentId ? "Update assignment details." : "Add a new assignment for your students."}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="title" className="text-right">Title</Label>
                          <Input id="title" value={newAssignment.title} onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="class" className="text-right">Class</Label>
                          <Select
                            value={newAssignment.class_id}
                            onValueChange={(val) => setNewAssignment({ ...newAssignment, class_id: val })}
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Select Class" />
                            </SelectTrigger>
                            <SelectContent>
                              {classes.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="subject" className="text-right">Subject</Label>
                          <Select
                            value={newAssignment.subject_id}
                            onValueChange={(val) => setNewAssignment({ ...newAssignment, subject_id: val })}
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Select Subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {subjects.map((sub) => (
                                <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="dueDate" className="text-right">Due Date</Label>
                          <Input id="dueDate" type="date" value={newAssignment.due_date} onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="desc" className="text-right">Description</Label>
                          <Textarea id="desc" value={newAssignment.description} onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })} className="col-span-3" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" onClick={handleCreateAssignment}>
                          {editingAssignmentId ? "Update Assignment" : "Create Assignment"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Assignments Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Assignments Overview</CardTitle>
                  <CardDescription>View and manage all your active and past assessments</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                <FileText className="h-4 w-4" />
                              </div>
                              {item.title}
                            </div>
                          </TableCell>
                          <TableCell>{item.classes?.name}</TableCell>
                          <TableCell>{item.subjects?.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm text-slate-500">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(item.due_date).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleViewSubmissions(item)}>
                                <ClipboardCheck className="h-4 w-4 mr-2" />
                                Grade
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleEditAssignment(item)}>
                                <PenTool className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteTargetId(item.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Grading Dialog */}
              <Dialog open={isGradingOpen} onOpenChange={setIsGradingOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Grading: {selectedAssignment?.title}</DialogTitle>
                    <DialogDescription>
                      {selectedAssignment?.classes?.name} - {selectedAssignment?.subjects?.name}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="py-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted File</TableHead>
                          <TableHead>Score (Max 100)</TableHead>
                          <TableHead>Feedback</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gradingSubmissions.map((item) => (
                          <TableRow key={item.student_id}>
                            <TableCell className="font-medium">{item.student_name}</TableCell>
                            <TableCell>
                              <Badge variant={item.submission ? (item.submission.status === 'graded' ? 'default' : 'secondary') : 'outline'}>
                                {item.submission ? item.submission.status : 'Pending'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {item.submission?.file_url ? (
                                <a href={item.submission.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center">
                                  <Download className="h-4 w-4 mr-1" /> View File
                                </a>
                              ) : (
                                <span className="text-slate-400">No file</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="w-20"
                                defaultValue={item.submission?.score || ''}
                                onChange={(e) => {
                                  // Update local state temporarily or handle on save
                                  item.tempScore = e.target.value;
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Feedback..."
                                defaultValue={item.submission?.feedback || ''}
                                onChange={(e) => {
                                  item.tempFeedback = e.target.value;
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => {
                                  const score = parseFloat(item.tempScore !== undefined ? item.tempScore : (item.submission?.score || 0));
                                  const feedback = item.tempFeedback !== undefined ? item.tempFeedback : (item.submission?.feedback || '');
                                  handleSaveGrade(item.student_id, score, feedback);
                                }}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Gradebook Tab */}
            <TabsContent value="gradebook" className="space-y-6">
              <GradebookView />
            </TabsContent>

            {/* Attendance Tab */}
            <TabsContent value="attendance" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Daily Attendance</h2>
                  <p className="text-slate-600 dark:text-slate-400">Mark and view student attendance.</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveAttendance} disabled={savingAttendance}>
                    {savingAttendance ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Save Attendance
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 items-end">
                <div className="w-full sm:w-[200px]">
                  <Label className="text-sm font-medium mb-1.5 block">Select Class</Label>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-[200px]">
                  <Label className="text-sm font-medium mb-1.5 block">Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      type="date"
                      className="pl-9"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1 w-full">
                  <Label className="text-sm font-medium mb-1.5 block">Search Student</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      type="text"
                      placeholder="Search by name or number..."
                      className="pl-9"
                      value={attendanceSearchQuery}
                      onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {students.length > 0 ? (
                  students
                    .filter(s =>
                      s.name.toLowerCase().includes(attendanceSearchQuery.toLowerCase()) ||
                      s.studentId.toLowerCase().includes(attendanceSearchQuery.toLowerCase())
                    )
                    .map((student) => {
                      const state = attendanceState[student.id] || { status: 'present', remarks: '' };
                      return (
                        <Card key={student.id} className={`${state.status === 'absent' ? 'border-red-500 bg-red-50 dark:bg-red-900/10' :
                          state.status === 'late' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' :
                            state.status === 'excused' ? 'border-slate-400 bg-slate-100 dark:bg-slate-800/50' :
                              state.status === 'present' ? 'border-green-500 bg-green-50 dark:bg-green-900/10' :
                                'border-slate-200 dark:border-slate-700'
                          }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback>{student.name?.[0] || 'S'}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-white line-clamp-1">{student.name}</p>
                                  <p className="text-xs text-slate-500 font-mono">{student.studentId}</p>
                                </div>
                              </div>
                              <Badge variant={state.status === 'present' ? 'default' : state.status === 'absent' ? 'destructive' : 'secondary'}>
                                {state.status.charAt(0).toUpperCase() + state.status.slice(1)}
                              </Badge>
                            </div>

                            <div className="space-y-3">
                              <div className="grid grid-cols-4 gap-2">
                                <Button
                                  variant={state.status === 'present' ? 'default' : 'outline'}
                                  size="sm"
                                  className={`w-full ${state.status === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                  onClick={() => handleAttendanceChange(student.id, 'status', 'present')}
                                  title="Present"
                                >
                                  P
                                </Button>
                                <Button
                                  variant={state.status === 'absent' ? 'destructive' : 'outline'}
                                  size="sm"
                                  className="w-full"
                                  onClick={() => handleAttendanceChange(student.id, 'status', 'absent')}
                                  title="Absent"
                                >
                                  A
                                </Button>
                                <Button
                                  variant={state.status === 'late' ? 'secondary' : 'outline'}
                                  size="sm"
                                  className={`w-full ${state.status === 'late' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : ''}`}
                                  onClick={() => handleAttendanceChange(student.id, 'status', 'late')}
                                  title="Late"
                                >
                                  L
                                </Button>
                                <Button
                                  variant={state.status === 'excused' ? 'secondary' : 'outline'}
                                  size="sm"
                                  className={`w-full ${state.status === 'excused' ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200' : ''}`}
                                  onClick={() => handleAttendanceChange(student.id, 'status', 'excused')}
                                  title="Excused"
                                >
                                  E
                                </Button>
                              </div>

                              {state.status !== 'present' && (
                                <div className="flex gap-2">
                                  <div className="flex-1">
                                    <Input
                                      placeholder="Remarks (optional)"
                                      className="h-8 text-xs"
                                      value={state.remarks}
                                      onChange={(e) => handleAttendanceChange(student.id, 'remarks', e.target.value)}
                                    />
                                  </div>
                                  <Select
                                    onValueChange={(value) => handleAttendanceChange(student.id, 'remarks', value)}
                                  >
                                    <SelectTrigger className="h-8 w-[110px] text-xs">
                                      <SelectValue placeholder="Reasons" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="The student was sick" className="text-xs">Sick</SelectItem>
                                      <SelectItem value="Family emergency" className="text-xs">Emergency</SelectItem>
                                      <SelectItem value="Travel / Out of town" className="text-xs">Travel</SelectItem>
                                      <SelectItem value="Hospital appointment" className="text-xs">Medical</SelectItem>
                                      <SelectItem value="Sports / Competition" className="text-xs">Sports</SelectItem>
                                      <SelectItem value="Bereavement" className="text-xs">Bereavement</SelectItem>
                                      <SelectItem value="School event" className="text-xs">Event</SelectItem>
                                      <SelectItem value="Traffic / Transportation" className="text-xs">Traffic</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })) : (
                  <div className="col-span-full text-center py-10 text-slate-500">
                    {selectedClassId ? 'No students found in this class' : 'Please select a class to view students'}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">My Profile</h2>
                  <p className="text-slate-600 dark:text-slate-400">Manage your personal information.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <Card>
                    <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
                      <Avatar className="h-32 w-32 border-4 border-white dark:border-slate-800 shadow-lg">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="text-4xl">{profile?.first_name?.[0]}{profile?.last_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{profile?.first_name} {profile?.last_name}</h3>
                        <p className="text-slate-500 dark:text-slate-400">{profile?.department || 'Teacher'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="md:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>First Name</Label>
                            <Input value={profile?.first_name || ''} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label>Last Name</Label>
                            <Input value={profile?.last_name || ''} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input value={user?.email || ''} disabled />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input
                              placeholder="+1 (555) 000-0000"
                              value={profile?.phone_number || ''}
                              onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Address</Label>
                            <Input
                              placeholder="123 Main St"
                              value={profile?.address || ''}
                              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-4">
                          <Button onClick={async () => {
                            try {
                              setLoading(true);
                              await fetchWithAuth('/api/teacher/profile', {
                                method: 'PUT',
                                body: JSON.stringify({
                                  phone_number: profile.phone_number,
                                  address: profile.address
                                })
                              });
                              toast({
                                title: "Profile Updated",
                                description: "Your profile information has been saved successfully."
                              });
                            } catch (error) {
                              console.error('Error updating profile:', error);
                              toast({
                                title: "Update Failed",
                                description: "Failed to update profile information.",
                                variant: "destructive"
                              });
                            } finally {
                              setLoading(false);
                            }
                          }} disabled={loading}>
                            {loading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Account Settings</h2>
                </div>
              </div>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Moon className="h-5 w-5 text-blue-600" />
                    <CardTitle>Appearance</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Dark Mode</Label>
                      <p className="text-sm text-slate-500">Toggle between light and dark themes.</p>
                    </div>
                    <ThemeToggle />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </main>
      </div>
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete Assignment"
        description="Are you sure you want to delete this assignment? This action cannot be undone."
        confirmLabel="Delete Assignment"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleDeleteAssignment}
      />
    </div>
  );
}
