import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  UserCheck,
  UserX,
  Bell,
  Send,
  Download,
  Filter,
  Search,
  Plus,
  Eye,
  Edit,
  BarChart3,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  X,
  Timer,
  AlertCircle,
  Zap,
  Users2
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
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth';
import { Api } from '../../shared/api';
import type { Attendance, Student, Class } from '../../shared/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  timeIn?: string;
  timeOut?: string;
  notes?: string;
  notifiedParent: boolean;
}

interface BulkAttendanceData {
  classId: string;
  date: string;
  records: {
    studentId: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    notes?: string;
  }[];
}

export default function AttendanceTracking() {
  const { session } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isBulkAttendanceOpen, setIsBulkAttendanceOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [bulkAttendanceData, setBulkAttendanceData] = useState<BulkAttendanceData>({
    classId: '',
    date: new Date().toISOString().split('T')[0],
    records: []
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [quickMarkMode, setQuickMarkMode] = useState<'present' | 'absent' | null>(null);

  useEffect(() => {
    loadData();
  }, [session, selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load attendance records
      const attendanceResponse = await Api.listAttendance({
        schoolId: session?.schoolId,
        date: selectedDate,
        limit: 200
      });
      setAttendanceRecords(attendanceResponse.items);
      
      // Load students
      const studentsResponse = await Api.listStudents({
        schoolId: session?.schoolId,
        limit: 200
      });
      setStudents(studentsResponse.items);
      
      // Load classes
      const classesResponse = await Api.listClasses({
        schoolId: session?.schoolId
      });
      setClasses(classesResponse.items);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAttendance = async () => {
    try {
      await Api.recordBulkAttendance(bulkAttendanceData);
      await loadData();
      setIsBulkAttendanceOpen(false);
      resetBulkForm();
    } catch (error) {
      console.error('Failed to record bulk attendance:', error);
    }
  };

  const handleSingleAttendance = async (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    try {
      const existingRecord = (attendanceRecords || []).find(r => r.studentId === studentId && r.date === selectedDate);
      
      if (existingRecord) {
        await Api.updateAttendance(existingRecord.id, { status });
      } else {
        await Api.recordAttendance({
          studentId,
          classId: getStudentClass(studentId),
          date: selectedDate,
          status,
          schoolId: session?.schoolId!,
          timeIn: status === 'present' || status === 'late' ? new Date().toISOString() : undefined,
          notifiedParent: false
        });
      }
      
      await loadData();
    } catch (error) {
      console.error('Failed to record attendance:', error);
    }
  };

  const notifyParent = async (studentId: string, attendanceId: string) => {
    try {
      await Api.notifyParentAttendance({
        studentId,
        attendanceId,
        schoolId: session?.schoolId!
      });
      
      // Update local state
      setAttendanceRecords(records => 
        (records || []).map(r => 
          r.id === attendanceId ? { ...r, notifiedParent: true } : r
        )
      );
    } catch (error) {
      console.error('Failed to notify parent:', error);
    }
  };

  const resetBulkForm = () => {
    setBulkAttendanceData({
      classId: '',
      date: new Date().toISOString().split('T')[0],
      records: []
    });
  };

  const getStudentClass = (studentId: string): string => {
    const student = (students || []).find(s => s.id === studentId);
    return student?.currentClass || '';
  };

  const getStudentName = (studentId: string): string => {
    const student = (students || []).find(s => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : 'Unknown Student';
  };

  const getClassName = (classId: string): string => {
    return (classes || []).find(c => c.id === classId)?.name || 'Unknown Class';
  };

  const getAttendanceStats = () => {
    const todayRecords = (attendanceRecords || []).filter(r => r.date === selectedDate);
    const totalStudents = (students || []).length;
    const present = todayRecords.filter(r => r.status === 'present').length;
    const absent = todayRecords.filter(r => r.status === 'absent').length;
    const late = todayRecords.filter(r => r.status === 'late').length;
    const excused = todayRecords.filter(r => r.status === 'excused').length;
    const notMarked = totalStudents - todayRecords.length;
    
    const attendanceRate = totalStudents > 0 ? ((present + late + excused) / totalStudents) * 100 : 0;
    
    return { totalStudents, present, absent, late, excused, notMarked, attendanceRate };
  };

  const getWeeklyAttendanceRate = () => {
    // Calculate attendance rate for the past 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekRecords = (attendanceRecords || []).filter(r => new Date(r.date) >= weekAgo);
    const totalRecords = weekRecords.length;
    const presentRecords = weekRecords.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'excused').length;
    
    return totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;
  };

  const filteredStudents = (students || []).filter(student => {
    const matchesSearch = 
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = selectedClass === 'all' || student.currentClass === selectedClass;
    
    return matchesSearch && matchesClass;
  });

  const prepareBulkAttendance = (classId: string) => {
    const classStudents = (students || []).filter(s => s.currentClass === getClassName(classId));
    setBulkAttendanceData({
      classId,
      date: selectedDate,
      records: classStudents.map(student => ({
          studentId: student.id,
          status: 'present' as const,
          notes: ''
        }))
    });
    setIsBulkAttendanceOpen(true);
  };

  const handleQuickMarkAll = async (status: 'present' | 'absent') => {
    try {
      const classStudents = selectedClass === 'all' 
        ? filteredStudents 
        : filteredStudents.filter(s => s.currentClass === selectedClass);
      
      const promises = classStudents.map(student => 
        handleSingleAttendance(student.id, status)
      );
      
      await Promise.all(promises);
      setQuickMarkMode(null);
    } catch (error) {
      console.error('Failed to mark all attendance:', error);
    }
  };

  const getTimeBasedStatus = (): 'present' | 'late' => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const lateThreshold = 8 * 60 + 30; // 8:30 AM in minutes
    
    return currentTime > lateThreshold ? 'late' : 'present';
  };

  const handleSmartAttendance = async (studentId: string) => {
    const status = getTimeBasedStatus();
    await handleSingleAttendance(studentId, status);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const stats = getAttendanceStats();
  const weeklyRate = getWeeklyAttendanceRate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Attendance Tracking</h1>
              <p className="text-sm text-muted-foreground">
                Monitor student attendance and notify parents
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
            <Button variant="outline" onClick={() => setIsReportDialogOpen(true)}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Reports
            </Button>
            <Button onClick={() => prepareBulkAttendance(classes[0]?.id || '')}>
              <Plus className="h-4 w-4 mr-2" />
              Bulk Mark Attendance
            </Button>
          </div>
        </div>
            {/* Enhanced Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">Present</CardTitle>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{stats.present}</div>
                  <p className="text-xs text-green-600/70 mt-1">
                    {((stats.present / stats.totalStudents) * 100).toFixed(1)}% of total
                  </p>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-red-700">Absent</CardTitle>
                  <X className="h-5 w-5 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">{stats.absent}</div>
                  <p className="text-xs text-red-600/70 mt-1">
                    {((stats.absent / stats.totalStudents) * 100).toFixed(1)}% of total
                  </p>
                </CardContent>
              </Card>

              <Card className="border-yellow-200 bg-yellow-50/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-700">Late</CardTitle>
                  <Timer className="h-5 w-5 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">{stats.late}</div>
                  <p className="text-xs text-yellow-600/70 mt-1">
                    {((stats.late / stats.totalStudents) * 100).toFixed(1)}% of total
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">Excused</CardTitle>
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{stats.excused}</div>
                  <p className="text-xs text-blue-600/70 mt-1">
                    {((stats.excused / stats.totalStudents) * 100).toFixed(1)}% of total
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 bg-gray-50/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">Not Marked</CardTitle>
                  <AlertTriangle className="h-5 w-5 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-600">{stats.notMarked}</div>
                  <p className="text-xs text-gray-600/70 mt-1">
                    {((stats.notMarked / stats.totalStudents) * 100).toFixed(1)}% remaining
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{stats.attendanceRate.toFixed(1)}%</div>
                  <Progress value={stats.attendanceRate} className="mt-2 h-2" />
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="mark-attendance" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Mark Attendance
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Reports
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Existing overview content */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Today's Attendance Overview
                    </CardTitle>
                    <CardDescription>
                      View and manage student attendance for {new Date(selectedDate).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filter by class" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Classes</SelectItem>
                          {(classes || []).map(cls => (
                            <SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Students Attendance Table */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Time In</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Parent Notified</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(filteredStudents || []).map((student) => {
                          const attendanceRecord = (attendanceRecords || []).find(
                            r => r.studentId === student.id && r.date === selectedDate
                          );
                          
                          return (
                            <TableRow key={student.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                    <Users className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{student.firstName} {student.lastName}</div>
                                    <div className="text-sm text-muted-foreground">{student.studentNumber}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{student.currentClass || 'Not assigned'}</Badge>
                              </TableCell>
                              <TableCell>
                                {attendanceRecord ? (
                                  <Badge 
                                    variant={
                                      attendanceRecord.status === 'present' ? 'default' :
                                      attendanceRecord.status === 'late' ? 'secondary' :
                                      attendanceRecord.status === 'excused' ? 'outline' : 'destructive'
                                    }
                                    className={
                                      attendanceRecord.status === 'present' ? 'bg-green-100 text-green-800 border-green-200' :
                                      attendanceRecord.status === 'late' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                      attendanceRecord.status === 'excused' ? 'bg-blue-100 text-blue-800 border-blue-200' : 
                                      'bg-red-100 text-red-800 border-red-200'
                                    }
                                  >
                                    {attendanceRecord.status}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-gray-100 text-gray-600">Not marked</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {attendanceRecord?.timeIn ? (
                                  <div className="text-sm">
                                    {new Date(attendanceRecord.timeIn).toLocaleTimeString()}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm max-w-32 truncate">
                                  {attendanceRecord?.notes || '-'}
                                </div>
                              </TableCell>
                              <TableCell>
                                {attendanceRecord?.status === 'absent' && (
                                  <div className="flex items-center gap-2">
                                    {attendanceRecord.notifiedParent ? (
                                      <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                        <Bell className="h-3 w-3 mr-1" />
                                        Notified
                                      </Badge>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => notifyParent(student.id, attendanceRecord.id)}
                                        className="text-xs"
                                      >
                                        <Send className="h-3 w-3 mr-1" />
                                        Notify
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant={attendanceRecord?.status === 'present' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleSingleAttendance(student.id, 'present')}
                                    className={attendanceRecord?.status === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
                                  >
                                    <UserCheck className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant={attendanceRecord?.status === 'absent' ? 'destructive' : 'outline'}
                                    size="sm"
                                    onClick={() => handleSingleAttendance(student.id, 'absent')}
                                  >
                                    <UserX className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant={attendanceRecord?.status === 'late' ? 'secondary' : 'outline'}
                                    size="sm"
                                    onClick={() => handleSingleAttendance(student.id, 'late')}
                                    className={attendanceRecord?.status === 'late' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
                                  >
                                    <Clock className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="mark-attendance" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Quick Mark Attendance
                    </CardTitle>
                    <CardDescription>
                      Streamlined interface for marking attendance quickly
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-3">
                      <Button 
                        onClick={() => handleQuickMarkAll('present')}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={filteredStudents.length === 0}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark All Present
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => handleQuickMarkAll('absent')}
                        disabled={filteredStudents.length === 0}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Mark All Absent
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => prepareBulkAttendance(classes[0]?.id || '')}
                      >
                        <Users2 className="h-4 w-4 mr-2" />
                        Bulk Mark by Class
                      </Button>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filter by class" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Classes</SelectItem>
                          {(classes || []).map(cls => (
                            <SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quick Mark Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(filteredStudents || []).map((student) => {
                        const attendanceRecord = (attendanceRecords || []).find(
                          r => r.studentId === student.id && r.date === selectedDate
                        );
                        
                        return (
                          <Card key={student.id} className={`transition-all duration-200 ${
                            attendanceRecord?.status === 'present' ? 'border-green-200 bg-green-50/50' :
                            attendanceRecord?.status === 'absent' ? 'border-red-200 bg-red-50/50' :
                            attendanceRecord?.status === 'late' ? 'border-yellow-200 bg-yellow-50/50' :
                            attendanceRecord?.status === 'excused' ? 'border-blue-200 bg-blue-50/50' :
                            'border-gray-200 hover:border-primary/50'
                          }`}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                  <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium">{student.firstName} {student.lastName}</div>
                                  <div className="text-sm text-muted-foreground">{student.studentNumber}</div>
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {student.currentClass || 'Not assigned'}
                                  </Badge>
                                </div>
                              </div>
                              
                              {attendanceRecord && (
                                <div className="mb-3">
                                  <Badge 
                                    className={`text-xs ${
                                      attendanceRecord.status === 'present' ? 'bg-green-100 text-green-800' :
                                      attendanceRecord.status === 'absent' ? 'bg-red-100 text-red-800' :
                                      attendanceRecord.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {attendanceRecord.status.toUpperCase()}
                                  </Badge>
                                  {attendanceRecord.timeIn && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {new Date(attendanceRecord.timeIn).toLocaleTimeString()}
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  variant={attendanceRecord?.status === 'present' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => handleSmartAttendance(student.id)}
                                  className={`text-xs ${attendanceRecord?.status === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Present
                                </Button>
                                <Button
                                  variant={attendanceRecord?.status === 'absent' ? 'destructive' : 'outline'}
                                  size="sm"
                                  onClick={() => handleSingleAttendance(student.id, 'absent')}
                                  className="text-xs"
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Absent
                                </Button>
                                <Button
                                  variant={attendanceRecord?.status === 'late' ? 'secondary' : 'outline'}
                                  size="sm"
                                  onClick={() => handleSingleAttendance(student.id, 'late')}
                                  className={`text-xs ${attendanceRecord?.status === 'late' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}`}
                                >
                                  <Timer className="h-3 w-3 mr-1" />
                                  Late
                                </Button>
                                <Button
                                  variant={attendanceRecord?.status === 'excused' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => handleSingleAttendance(student.id, 'excused')}
                                  className={`text-xs ${attendanceRecord?.status === 'excused' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                >
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Excused
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reports" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Reports</CardTitle>
                    <CardDescription>
                      Generate and view attendance reports
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      Attendance reports functionality will be implemented here
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

      {/* Enhanced Bulk Attendance Dialog */}
      <Dialog open={isBulkAttendanceOpen} onOpenChange={setIsBulkAttendanceOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users2 className="h-5 w-5" />
              Bulk Attendance Marking
            </DialogTitle>
            <DialogDescription>
              Mark attendance for all students in a class at once. Select a class and date, then mark attendance for each student.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select 
                  value={bulkAttendanceData.classId} 
                  onValueChange={(value) => {
                    setBulkAttendanceData({ ...bulkAttendanceData, classId: value });
                    prepareBulkAttendance(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {(classes || []).map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={bulkAttendanceData.date}
                  onChange={(e) => setBulkAttendanceData({ ...bulkAttendanceData, date: e.target.value })}
                />
              </div>
            </div>
            
            {bulkAttendanceData.classId && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setBulkAttendanceData(prev => ({
                        ...prev,
                        records: prev.records.map(r => ({ ...r, status: 'present' }))
                      }));
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark All Present
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => {
                      setBulkAttendanceData(prev => ({
                        ...prev,
                        records: prev.records.map(r => ({ ...r, status: 'absent' }))
                      }));
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Mark All Absent
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {bulkAttendanceData.records.map((record, index) => {
                    const student = students.find(s => s.id === record.studentId);
                    if (!student) return null;

                    return (
                      <Card key={record.studentId} className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{student.firstName} {student.lastName}</div>
                            <div className="text-xs text-muted-foreground">{student.studentNumber}</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-1">
                          <Button
                            variant={record.status === 'present' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              const newRecords = [...bulkAttendanceData.records];
                              newRecords[index] = { ...record, status: 'present' };
                              setBulkAttendanceData({ ...bulkAttendanceData, records: newRecords });
                            }}
                            className={`text-xs ${record.status === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Present
                          </Button>
                          <Button
                            variant={record.status === 'absent' ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={() => {
                              const newRecords = [...bulkAttendanceData.records];
                              newRecords[index] = { ...record, status: 'absent' };
                              setBulkAttendanceData({ ...bulkAttendanceData, records: newRecords });
                            }}
                            className="text-xs"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Absent
                          </Button>
                          <Button
                            variant={record.status === 'late' ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => {
                              const newRecords = [...bulkAttendanceData.records];
                              newRecords[index] = { ...record, status: 'late' };
                              setBulkAttendanceData({ ...bulkAttendanceData, records: newRecords });
                            }}
                            className={`text-xs ${record.status === 'late' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}`}
                          >
                            <Timer className="h-3 w-3 mr-1" />
                            Late
                          </Button>
                          <Button
                            variant={record.status === 'excused' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              const newRecords = [...bulkAttendanceData.records];
                              newRecords[index] = { ...record, status: 'excused' };
                              setBulkAttendanceData({ ...bulkAttendanceData, records: newRecords });
                            }}
                            className={`text-xs ${record.status === 'excused' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                          >
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Excused
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsBulkAttendanceOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkAttendance}
              disabled={!bulkAttendanceData.classId || bulkAttendanceData.records.length === 0}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Save Attendance ({bulkAttendanceData.records.length} students)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}