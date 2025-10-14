import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  UserCheck, 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  GraduationCap,
  School,
  UserPlus,
  FileText,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface OverviewStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  attendanceRate: number;
  pendingAssignments: number;
  upcomingEvents: number;
  recentEnrollments: number;
  activeSubjects: number;
}

export function SchoolOverview() {
  const { session } = useAuth();
  const [stats, setStats] = useState<OverviewStats>({
    totalStudents: 1247,
    totalTeachers: 45,
    totalClasses: 32,
    attendanceRate: 94.5,
    pendingAssignments: 23,
    upcomingEvents: 5,
    recentEnrollments: 12,
    activeSubjects: 18
  });

  const quickActions = [
    {
      title: 'Add New Student',
      description: 'Register a new student',
      icon: UserPlus,
      color: 'bg-blue-500',
      action: () => console.log('Add student')
    },
    {
      title: 'Mark Attendance',
      description: 'Record daily attendance',
      icon: CheckCircle,
      color: 'bg-green-500',
      action: () => console.log('Mark attendance')
    },
    {
      title: 'Create Assignment',
      description: 'Add new assignment',
      icon: FileText,
      color: 'bg-purple-500',
      action: () => console.log('Create assignment')
    },
    {
      title: 'View Reports',
      description: 'Generate school reports',
      icon: BarChart3,
      color: 'bg-orange-500',
      action: () => console.log('View reports')
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'enrollment',
      message: '12 new students enrolled this week',
      time: '2 hours ago',
      icon: Users,
      color: 'text-blue-500'
    },
    {
      id: 2,
      type: 'assignment',
      message: 'Mathematics assignment due tomorrow',
      time: '4 hours ago',
      icon: FileText,
      color: 'text-purple-500'
    },
    {
      id: 3,
      type: 'attendance',
      message: 'Attendance rate improved to 94.5%',
      time: '1 day ago',
      icon: TrendingUp,
      color: 'text-green-500'
    },
    {
      id: 4,
      type: 'event',
      message: 'Parent-teacher meeting scheduled',
      time: '2 days ago',
      icon: Calendar,
      color: 'text-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <School className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Welcome to Your School Dashboard</CardTitle>
              <CardDescription>
                {session?.role === 'headteacher' ? 'Head Teacher' : 
                 session?.role === 'teacher' ? 'Teacher' : 'Administrator'} Dashboard - 
                Get a quick overview of your school's performance and activities
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{stats.totalStudents.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +{stats.recentEnrollments} this month
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Teachers</p>
                <p className="text-2xl font-bold">{stats.totalTeachers}</p>
                <p className="text-xs text-muted-foreground mt-1">Active staff members</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Classes</p>
                <p className="text-2xl font-bold">{stats.totalClasses}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.activeSubjects} subjects</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold">{stats.attendanceRate}%</p>
                <Progress value={stats.attendanceRate} className="mt-2 h-2" />
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
                  onClick={action.action}
                >
                  <div className={`p-2 rounded-lg ${action.color} text-white`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activities
            </CardTitle>
            <CardDescription>Latest updates and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-full bg-muted ${activity.color}`}>
                    <activity.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Activities
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Important Notices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800">Pending Assignments</p>
                <p className="text-sm text-amber-700">{stats.pendingAssignments} assignments need grading</p>
              </div>
              <Button size="sm" variant="outline" className="ml-auto">
                Review
              </Button>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-800">Upcoming Events</p>
                <p className="text-sm text-blue-700">{stats.upcomingEvents} events scheduled this week</p>
              </div>
              <Button size="sm" variant="outline" className="ml-auto">
                View Calendar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}