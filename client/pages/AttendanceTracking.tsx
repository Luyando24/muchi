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
  TrendingDown
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
import { useAuth } from '@/lib/auth';
import { Api } from '../../shared/api';
import type { Attendance, Student, Class } from '../../shared/api';

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
      const existingRecord = attendanceRecords.find(r => r.studentId === studentId && r.date === selectedDate);
      
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
        records.map(r => 
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
    const student = students.find(s => s.id === studentId);
    return student?.currentClass || '';
  };

  const getStudentName = (studentId: string): string => {
    const student = students.find(s => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : 'Unknown Student';
  };

  const getClassName = (classId: string): string => {
    return classes.find(c => c.id === classId)?.name || 'Unknown Class';
  };

  const getAttendanceStats = () => {
    const todayRecords = attendanceRecords.filter(r => r.date === selectedDate);
    const totalStudents = students.length;
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
    
    const weekRecords = attendanceRecords.filter(r => new Date(r.date) >= weekAgo);
    const totalRecords = weekRecords.length;
    const presentRecords = weekRecords.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'excused').length;
    
    return totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = selectedClass === 'all' || student.currentClass === selectedClass;
    
    return matchesSearch && matchesClass;
  });

  const prepareBulkAttendance = (classId: string) => {
    const classStudents = students.filter(s => s.currentClass === getClassName(classId));
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Attendance Tracking</h1>
              <p className="text-muted-foreground">Monitor student attendance and notify parents</p>
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
              Mark Attendance
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.present}</div>
              <p className="text-xs text-muted-foreground">
                Students present today
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absent</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
              <p className="text-xs text-muted-foreground">
                Students absent today
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Late</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
              <p className="text-xs text-muted-foreground">
                Students late today
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.attendanceRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Today's attendance
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weekly Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weeklyRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Past 7 days average
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Attendance Progress</CardTitle>
            <CardDescription>
              {stats.present + stats.late + stats.excused} of {stats.totalStudents} students marked
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress 
              value={stats.attendanceRate} 
              className="w-full h-2"
            />
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>0%</span>
              <span>{stats.attendanceRate.toFixed(1)}%</span>
              <span>100%</span>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Student Attendance for {new Date(selectedDate).toLocaleDateString()}</CardTitle>
            <CardDescription>Mark attendance and notify parents of absences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                  {classes.map(cls => (
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
                {filteredStudents.map((student) => {
                  const attendanceRecord = attendanceRecords.find(
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
                          >
                            {attendanceRecord.status}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Not marked</Badge>
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
                              <Badge variant="default" className="text-xs">
                                <Bell className="h-3 w-3 mr-1" />
                                Notified
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => notifyParent(student.id, attendanceRecord.id)}
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

        {/* Bulk Attendance Dialog */}
        <Dialog open={isBulkAttendanceOpen} onOpenChange={setIsBulkAttendanceOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bulk Attendance Marking</DialogTitle>
              <DialogDescription>
                Mark attendance for all students in a class at once.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select 
                    value={bulkAttendanceData.classId} 
                    onValueChange={(value) => setBulkAttendanceData({ ...bulkAttendanceData, classId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
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
              
              <div className="text-center py-8 text-muted-foreground">
                Bulk attendance interface will be implemented here
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsBulkAttendanceOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkAttendance}>
                Save Attendance
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}