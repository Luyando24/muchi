import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ThemeToggle from '@/components/navigation/ThemeToggle';

// Mock data - in a real app, this would come from API
const studentData = {
  id: "STU001",
  firstName: "John",
  lastName: "Mwanza",
  email: "john.mwanza@student.chongwe.edu.zm",
  grade: "Grade 11",
  class: "11A",
  studentNumber: "CHS2024001",
  profileImage: "/images/student-avatar.jpg",
  guardian: {
    name: "Mary Mwanza",
    phone: "+260 97 123 4567",
    email: "mary.mwanza@gmail.com"
  }
};

const gradesData = [
  { subject: "Mathematics", currentGrade: "A", percentage: 85, trend: "up" },
  { subject: "English", currentGrade: "B+", percentage: 78, trend: "stable" },
  { subject: "Physics", currentGrade: "A-", percentage: 82, trend: "up" },
  { subject: "Chemistry", currentGrade: "B", percentage: 75, trend: "down" },
  { subject: "Biology", currentGrade: "A", percentage: 88, trend: "up" },
  { subject: "History", currentGrade: "B+", percentage: 79, trend: "stable" }
];

const attendanceData = {
  overall: 92,
  thisMonth: 95,
  daysPresent: 165,
  daysAbsent: 15,
  totalDays: 180
};

const assignmentsData = [
  { 
    id: 1, 
    title: "Mathematics Assignment 3", 
    subject: "Mathematics", 
    dueDate: "2024-01-25", 
    status: "pending", 
    type: "homework" 
  },
  { 
    id: 2, 
    title: "Physics Lab Report", 
    subject: "Physics", 
    dueDate: "2024-01-28", 
    status: "submitted", 
    type: "lab" 
  },
  { 
    id: 3, 
    title: "English Essay", 
    subject: "English", 
    dueDate: "2024-01-30", 
    status: "pending", 
    type: "essay" 
  },
  { 
    id: 4, 
    title: "Chemistry Quiz", 
    subject: "Chemistry", 
    dueDate: "2024-01-22", 
    status: "completed", 
    type: "quiz" 
  }
];

const upcomingEvents = [
  { date: "2024-01-25", title: "Mathematics Test", type: "exam" },
  { date: "2024-01-28", title: "Science Fair", type: "event" },
  { date: "2024-02-01", title: "Parent-Teacher Conference", type: "meeting" },
  { date: "2024-02-05", title: "Sports Day", type: "event" }
];

export default function StudentPortal() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    // For UI development - just log to console
    console.log("Logout clicked - auth disabled for UI development");
  };

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "grades", label: "Grades", icon: Award },
    { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    { id: "assignments", label: "Assignments", icon: FileText },
    { id: "profile", label: "Profile", icon: User },
    { id: "settings", label: "Settings", icon: Settings }
  ];



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
                <div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                    Chongwe Secondary School
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Student Portal</p>
                </div>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>
              <ThemeToggle />
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={studentData.profileImage} />
                  <AvatarFallback>{studentData.firstName[0]}{studentData.lastName[0]}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {studentData.firstName} {studentData.lastName}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {studentData.grade} - {studentData.class}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
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
                    Welcome back, {studentData.firstName}!
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Here's your academic overview for today
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {studentData.studentNumber}
                </Badge>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Overall GPA</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">3.7</p>
                      </div>
                      <Award className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Attendance</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{attendanceData.overall}%</p>
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
                          {assignmentsData.filter(a => a.status === 'pending').length}
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
                        <p className="text-sm text-slate-600 dark:text-slate-400">Current Rank</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">5th</p>
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
                    {assignmentsData.slice(0, 4).map((assignment) => (
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
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Grades Tab */}
            <TabsContent value="grades" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Academic Performance</h2>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Subject Grades</CardTitle>
                    <CardDescription>Current term performance overview</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {gradesData.map((grade, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-medium text-slate-900 dark:text-white">{grade.subject}</h3>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{grade.currentGrade}</Badge>
                                {grade.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
                                {grade.trend === 'down' && <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />}
                                {grade.trend === 'stable' && <div className="h-4 w-4 bg-slate-400 rounded-full" />}
                              </div>
                            </div>
                            <Progress value={grade.percentage} className="h-2" />
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{grade.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Grade Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600 mb-2">3.7</div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Overall GPA</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Class Rank</span>
                        <span className="font-medium">5th of 45</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Grade Level</span>
                        <span className="font-medium">{studentData.grade}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Term</span>
                        <span className="font-medium">Term 1, 2024</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
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
                      <div className="text-4xl font-bold text-green-600 mb-2">{attendanceData.overall}%</div>
                      <Progress value={attendanceData.overall} className="h-3 mb-4" />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600 dark:text-slate-400">Present</p>
                          <p className="font-bold text-green-600">{attendanceData.daysPresent} days</p>
                        </div>
                        <div>
                          <p className="text-slate-600 dark:text-slate-400">Absent</p>
                          <p className="font-bold text-red-600">{attendanceData.daysAbsent} days</p>
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
                      <div className="text-3xl font-bold text-blue-600 mb-2">{attendanceData.thisMonth}%</div>
                      <Progress value={attendanceData.thisMonth} className="h-3 mb-4" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Excellent attendance this month!
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
                      {attendanceData.overall >= 95 && (
                        <Alert className="border-green-200 bg-green-50">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            Excellent attendance record!
                          </AlertDescription>
                        </Alert>
                      )}
                      {attendanceData.overall >= 85 && attendanceData.overall < 95 && (
                        <Alert className="border-yellow-200 bg-yellow-50">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-800">
                            Good attendance, keep it up!
                          </AlertDescription>
                        </Alert>
                      )}
                      {attendanceData.overall < 85 && (
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
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignmentsData.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">{assignment.title}</TableCell>
                          <TableCell>{assignment.subject}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{assignment.type}</Badge>
                          </TableCell>
                          <TableCell>{assignment.dueDate}</TableCell>
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
                      ))}
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
                      <AvatarImage src={studentData.profileImage} />
                      <AvatarFallback className="text-2xl">
                        {studentData.firstName[0]}{studentData.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      {studentData.firstName} {studentData.lastName}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      {studentData.grade} - {studentData.class}
                    </p>
                    <Badge variant="secondary">{studentData.studentNumber}</Badge>
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
                        <p className="text-slate-900 dark:text-white">{studentData.firstName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Last Name</label>
                        <p className="text-slate-900 dark:text-white">{studentData.lastName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Student Number</label>
                        <p className="text-slate-900 dark:text-white">{studentData.studentNumber}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Email</label>
                        <p className="text-slate-900 dark:text-white">{studentData.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Grade</label>
                        <p className="text-slate-900 dark:text-white">{studentData.grade}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Class</label>
                        <p className="text-slate-900 dark:text-white">{studentData.class}</p>
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
                      <p className="text-slate-900 dark:text-white">{studentData.guardian.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Phone</label>
                      <p className="text-slate-900 dark:text-white">{studentData.guardian.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Email</label>
                      <p className="text-slate-900 dark:text-white">{studentData.guardian.email}</p>
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
    </div>
  );
}