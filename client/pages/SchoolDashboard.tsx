import { useState, useEffect } from 'react';
import { GraduationCap, Search, Building, UserCheck, User, LogOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, clearSession } from '@/lib/auth';
import { Api } from '../../shared/api';
import type { Assignment } from '../../shared/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

import { RecentTasks } from '@/components/dashboard/RecentTasks';
import { TaskPriorityDistribution } from '@/components/dashboard/TaskPriorityDistribution';
import { TaskCompletionRate } from '@/components/dashboard/TaskCompletionRate';
import { PerformanceMetrics } from '@/components/dashboard/PerformanceMetrics';
import { SchoolOverview } from '@/components/dashboard/SchoolOverview';
import SupportTab from '@/components/dashboard/SupportTab';
import StudentsTab from '@/components/dashboard/StudentsTab';

interface DashboardStats {
  totalAssignments: number;
  openAssignments: number;
  inProgressAssignments: number;
  completedAssignments: number;
  highPriorityAssignments: number;
  mediumPriorityAssignments: number;
  lowPriorityAssignments: number;
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  attendanceRate: number;
}

export default function SchoolDashboard() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAssignments, setRecentAssignments] = useState<Assignment[]>([]);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [teacherCount, setTeacherCount] = useState<number>(0);
  const [classCount, setClassCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  useEffect(() => {
    loadDashboardData();
  }, [session]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Only attempt to load data if schoolId is available
      if (session?.schoolId) {
        try {
          // Load assignment statistics
          const statsResponse = await Api.getAssignmentStats({
            schoolId: session.schoolId,
            teacherId: session?.userId
          });
          setStats(statsResponse);
          
          // Load recent assignments
          const assignmentsResponse = await Api.listAssignments({
            schoolId: session.schoolId,
            limit: 10
          });
          setRecentAssignments(assignmentsResponse.items);

          // Load student statistics
          const studentStats = await Api.getStudentStats();
          setStudentCount(studentStats.total);

          // Load teacher statistics
          const teacherStats = await Api.getTeacherStats();
          setTeacherCount(teacherStats.total);

          // Load class statistics
          const classStats = await Api.getClassStats();
          setClassCount(classStats.total);
        } catch (error) {
          console.error('Failed to load school data:', error);
        }
      } else {
        // Set default empty stats for users without a schoolId
        setStats({
          totalAssignments: 0,
          openAssignments: 0,
          inProgressAssignments: 0,
          completedAssignments: 0,
          highPriorityAssignments: 0,
          mediumPriorityAssignments: 0,
          lowPriorityAssignments: 0,
          totalStudents: 0,
          totalTeachers: 0,
          totalClasses: 0,
          attendanceRate: 0
        });
        setRecentAssignments([]);
        setStudentCount(0);
        setTeacherCount(0);
        setClassCount(0);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'destructive';
      case 'in_progress': return 'default';
      case 'submitted': return 'secondary';
      case 'graded': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show welcome screen for users without a school ID
  if (!session?.schoolId) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <GraduationCap className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-semibold">MUCHI Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome, {session?.userId}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session?.userId}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session?.role}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Welcome Content */}
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Welcome to MUCHI</h2>
                <p className="text-lg text-muted-foreground">
                  You're successfully logged in! To access school-specific features, you'll need to be associated with a school.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Register New School
                    </CardTitle>
                    <CardDescription>
                      Set up a new school in the MUCHI system
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" asChild>
                      <Link to="/register">Register School</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5" />
                      Contact Administrator
                    </CardTitle>
                    <CardDescription>
                      Get help from your system administrator
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      Contact Support
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-8 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Demo User:</strong> You're currently logged in as a demo user. 
                  In a production environment, users would be associated with specific schools 
                  to access the full dashboard functionality.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      icon={<GraduationCap className="h-6 w-6" />}
      title="School Management Dashboard"
      description={`Welcome back, ${session?.role === 'teacher' ? 'Teacher' : session?.role === 'headteacher' ? 'Head Teacher' : 'Administrator'}`}
      isAdmin={false}
      activeTab="dashboard"
      onAddStudent={() => navigate('/students/add')}
      studentCount={studentCount}
    >
      <div className="p-6 space-y-6">
        <Tabs defaultValue="overview" className="space-y-6" id="dashboard-tabs" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <SchoolOverview />
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <StudentsTab />
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            <RecentTasks assignments={recentAssignments} getPriorityColor={getPriorityColor} getStatusColor={getStatusColor} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TaskCompletionRate stats={stats} />
              <PerformanceMetrics stats={stats} />
            </div>
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            <SupportTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}