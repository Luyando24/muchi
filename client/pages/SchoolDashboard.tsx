import { useState, useEffect } from 'react';
import { GraduationCap, Users, FileText, AlertTriangle, BarChart3, Clock, MapPin, Search, Camera, Building, Briefcase, UserCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Api } from '../../shared/api';
import type { Assignment, Student, Class } from '../../shared/api';
import SchoolSidebar from '@/components/dashboard/SchoolSidebar';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { RecentTasks } from '@/components/dashboard/RecentTasks';
import { TaskPriorityDistribution } from '@/components/dashboard/TaskPriorityDistribution';
import { TaskCompletionRate } from '@/components/dashboard/TaskCompletionRate';
import { PerformanceMetrics } from '@/components/dashboard/PerformanceMetrics';
import { SchoolOverview } from '@/components/dashboard/SchoolOverview';

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAssignments, setRecentAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [session]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load assignment statistics
      const statsResponse = await Api.getAssignmentStats({
        schoolId: session?.schoolId,
        teacherId: session?.userId
      });
      setStats(statsResponse);
      
      // Load recent assignments
      const assignmentsResponse = await Api.listAssignments({
        schoolId: session?.schoolId,
        limit: 10
      });
      setRecentAssignments(assignmentsResponse.items);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">School Management Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {session?.role === 'teacher' ? 'Teacher' : session?.role === 'headteacher' ? 'Head Teacher' : 'Administrator'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{session?.role}</Badge>
            <Badge variant="secondary">{session?.userId?.slice(0, 8) || 'SCH-001'}</Badge>
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex h-[calc(100vh-73px)]">
        <SchoolSidebar />

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Quick Stats */}
            <QuickStats stats={stats} />

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SchoolOverview />
              </div>
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
          </div>
        </div>
      </Tabs>
    </div>
  );
}