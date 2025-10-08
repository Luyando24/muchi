import { useState, useEffect } from 'react';
import { 
  User, 
  Calendar, 
  BookOpen, 
  MessageCircle, 
  Bell, 
  CreditCard,
  Download,
  Eye,
  Phone,
  Mail,
  MapPin,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  Award,
  Users,
  FileText,
  Send
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth';
import { Api } from '../../shared/api';
import type { Student, Attendance, Grade, Assignment } from '../../shared/api';

interface ParentDashboardData {
  student: Student;
  recentAttendance: Attendance[];
  recentGrades: Grade[];
  upcomingAssignments: Assignment[];
  notifications: Notification[];
  feeBalance: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  date: string;
  read: boolean;
}

interface MessageData {
  recipient: 'teacher' | 'admin';
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
}

export default function ParentPortal() {
  const { session } = useAuth();
  const [dashboardData, setDashboardData] = useState<ParentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [children, setChildren] = useState<Student[]>([]);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageData, setMessageData] = useState<MessageData>({
    recipient: 'teacher',
    subject: '',
    message: '',
    priority: 'medium'
  });

  useEffect(() => {
    loadData();
  }, [session, selectedChild]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load parent's children
      const childrenResponse = await Api.getParentChildren({
        parentId: session?.userId!
      });
      setChildren(childrenResponse);
      
      if (childrenResponse.length > 0 && !selectedChild) {
        setSelectedChild(childrenResponse[0].id);
      }
      
      if (selectedChild || childrenResponse.length > 0) {
        const studentId = selectedChild || childrenResponse[0].id;
        
        // Load dashboard data for selected child
        const dashboardResponse = await Api.getParentDashboard({
          parentId: session?.userId!,
          studentId
        });
        setDashboardData(dashboardResponse);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    try {
      await Api.sendParentMessage({
        parentId: session?.userId!,
        studentId: selectedChild,
        ...messageData
      });
      
      setIsMessageDialogOpen(false);
      setMessageData({
        recipient: 'teacher',
        subject: '',
        message: '',
        priority: 'medium'
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await Api.markNotificationAsRead(notificationId);
      
      if (dashboardData) {
        setDashboardData({
          ...dashboardData,
          notifications: dashboardData.notifications.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
          )
        });
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const getAttendanceRate = () => {
    if (!dashboardData?.recentAttendance.length) return 0;
    
    const totalDays = dashboardData.recentAttendance.length;
    const presentDays = dashboardData.recentAttendance.filter(
      a => a.status === 'present' || a.status === 'late' || a.status === 'excused'
    ).length;
    
    return (presentDays / totalDays) * 100;
  };

  const getAverageGrade = () => {
    if (!dashboardData?.recentGrades.length) return 0;
    
    const total = dashboardData.recentGrades.reduce((sum, grade) => sum + grade.percentage, 0);
    return total / dashboardData.recentGrades.length;
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAttendanceStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'excused':
        return <AlertTriangle className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Children Found</h3>
              <p className="text-muted-foreground">
                No student records are associated with your account. Please contact the school administration.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const attendanceRate = getAttendanceRate();
  const averageGrade = getAverageGrade();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={`/api/avatar/${dashboardData.student.id}`} />
              <AvatarFallback>
                {dashboardData.student.firstName[0]}{dashboardData.student.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {dashboardData.student.firstName} {dashboardData.student.lastName}
              </h1>
              <p className="text-muted-foreground">
                Grade {dashboardData.student.currentGrade} • {dashboardData.student.currentClass}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {children.length > 1 && (
              <Select value={selectedChild} onValueChange={setSelectedChild}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map(child => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.firstName} {child.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact School
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Send Message</DialogTitle>
                  <DialogDescription>
                    Send a message to your child's teacher or school administration.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Recipient</Label>
                    <Select 
                      value={messageData.recipient} 
                      onValueChange={(value: 'teacher' | 'admin') => 
                        setMessageData({ ...messageData, recipient: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher">Class Teacher</SelectItem>
                        <SelectItem value="admin">School Administration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      value={messageData.subject}
                      onChange={(e) => setMessageData({ ...messageData, subject: e.target.value })}
                      placeholder="Message subject"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select 
                      value={messageData.priority} 
                      onValueChange={(value: 'low' | 'medium' | 'high') => 
                        setMessageData({ ...messageData, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      value={messageData.message}
                      onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                      placeholder="Type your message here..."
                      rows={4}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendMessage}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
              <Progress value={attendanceRate} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getGradeColor(averageGrade)}`}>
                {averageGrade.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Recent assessments
              </p>
              <Progress value={averageGrade} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fee Balance</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                K{dashboardData.feeBalance.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Outstanding balance
              </p>
              <Button variant="outline" size="sm" className="mt-2 w-full">
                Pay Now
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="grades">Grades</TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications
              {dashboardData.notifications.filter(n => !n.read).length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                  {dashboardData.notifications.filter(n => !n.read).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Attendance</CardTitle>
                  <CardDescription>Last 7 days attendance record</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardData.recentAttendance.slice(0, 7).map((attendance, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getAttendanceStatusIcon(attendance.status)}
                          <div>
                            <div className="font-medium">
                              {new Date(attendance.date).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {attendance.status}
                            </div>
                          </div>
                        </div>
                        {attendance.timeIn && (
                          <div className="text-sm text-muted-foreground">
                            {new Date(attendance.timeIn).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Grades</CardTitle>
                  <CardDescription>Latest assessment results</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardData.recentGrades.slice(0, 5).map((grade, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Assignment {index + 1}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(grade.gradedDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${getGradeColor(grade.percentage)}`}>
                            {grade.percentage.toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {grade.marksObtained}/{grade.totalMarks || 100}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Upcoming Assignments */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Assignments</CardTitle>
                <CardDescription>Assignments and tests due soon</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.upcomingAssignments.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.upcomingAssignments.map((assignment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <div>
                            <div className="font-medium">{assignment.title}</div>
                            <div className="text-sm text-muted-foreground">
                              <Badge variant="outline" className="mr-2">
                                {assignment.category}
                              </Badge>
                              Due: {new Date(assignment.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {assignment.totalMarks} marks
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No upcoming assignments
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance History</CardTitle>
                <CardDescription>Detailed attendance record</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time In</TableHead>
                      <TableHead>Time Out</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.recentAttendance.map((attendance, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {new Date(attendance.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getAttendanceStatusIcon(attendance.status)}
                            <span className="capitalize">{attendance.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {attendance.timeIn ? 
                            new Date(attendance.timeIn).toLocaleTimeString() : 
                            '-'
                          }
                        </TableCell>
                        <TableCell>
                          {attendance.timeOut ? 
                            new Date(attendance.timeOut).toLocaleTimeString() : 
                            '-'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="max-w-32 truncate">
                            {attendance.notes || '-'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="grades" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Grade History</CardTitle>
                <CardDescription>All assessment results and feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Feedback</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.recentGrades.map((grade, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="font-medium">Assignment {index + 1}</div>
                        </TableCell>
                        <TableCell>Subject Name</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {grade.marksObtained}/{grade.totalMarks || 100}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={getGradeColor(grade.percentage)}>
                            {grade.percentage.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(grade.gradedDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-32 truncate">
                            {grade.feedback || 'No feedback'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>School announcements and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        notification.read ? 'bg-background' : 'bg-muted/50'
                      }`}
                      onClick={() => !notification.read && markNotificationAsRead(notification.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Bell className={`h-5 w-5 mt-0.5 ${
                            notification.read ? 'text-muted-foreground' : 'text-primary'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{notification.title}</h4>
                              {!notification.read && (
                                <Badge variant="destructive" className="h-2 w-2 p-0"></Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(notification.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={
                          notification.type === 'error' ? 'destructive' :
                          notification.type === 'warning' ? 'secondary' :
                          notification.type === 'success' ? 'default' : 'outline'
                        }>
                          {notification.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {dashboardData.notifications.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No notifications at this time
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}