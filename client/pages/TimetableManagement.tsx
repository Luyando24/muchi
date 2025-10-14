import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  BookOpen, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  Filter, 
  Search, 
  Eye, 
  Copy, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Settings,
  Grid3X3,
  List,
  Bell
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
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

// Mock data interfaces
interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
}

interface Subject {
  id: string;
  name: string;
  code: string;
  color: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  subjects: string[];
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  type: 'classroom' | 'lab' | 'hall' | 'library';
}

interface Class {
  id: string;
  name: string;
  grade: string;
  section: string;
  studentCount: number;
}

interface TimetableEntry {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  roomId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  timeSlotId: string;
  isRecurring: boolean;
  startDate: string;
  endDate?: string;
}

interface TimetableConflict {
  id: string;
  type: 'teacher_conflict' | 'room_conflict' | 'class_conflict';
  message: string;
  entries: string[];
}

const TimetableManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [isCreateEntryOpen, setIsCreateEntryOpen] = useState(false);
  const [isEditEntryOpen, setIsEditEntryOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isConflictResolverOpen, setIsConflictResolverOpen] = useState(false);
  
  // Form data
  const [entryFormData, setEntryFormData] = useState({
    classId: '',
    subjectId: '',
    teacherId: '',
    roomId: '',
    dayOfWeek: 1,
    timeSlotId: '',
    isRecurring: true,
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  // Mock data
  const timeSlots: TimeSlot[] = [
    { id: '1', startTime: '08:00', endTime: '08:45', duration: 45 },
    { id: '2', startTime: '08:45', endTime: '09:30', duration: 45 },
    { id: '3', startTime: '09:45', endTime: '10:30', duration: 45 },
    { id: '4', startTime: '10:30', endTime: '11:15', duration: 45 },
    { id: '5', startTime: '11:30', endTime: '12:15', duration: 45 },
    { id: '6', startTime: '12:15', endTime: '13:00', duration: 45 },
    { id: '7', startTime: '14:00', endTime: '14:45', duration: 45 },
    { id: '8', startTime: '14:45', endTime: '15:30', duration: 45 }
  ];

  const subjects: Subject[] = [
    { id: '1', name: 'Mathematics', code: 'MATH', color: '#3B82F6' },
    { id: '2', name: 'English', code: 'ENG', color: '#10B981' },
    { id: '3', name: 'Science', code: 'SCI', color: '#F59E0B' },
    { id: '4', name: 'History', code: 'HIST', color: '#8B5CF6' },
    { id: '5', name: 'Physical Education', code: 'PE', color: '#EF4444' },
    { id: '6', name: 'Art', code: 'ART', color: '#EC4899' }
  ];

  const teachers: Teacher[] = [
    { id: '1', name: 'John Smith', email: 'john.smith@school.edu', subjects: ['1', '3'] },
    { id: '2', name: 'Sarah Johnson', email: 'sarah.johnson@school.edu', subjects: ['2'] },
    { id: '3', name: 'Michael Brown', email: 'michael.brown@school.edu', subjects: ['4'] },
    { id: '4', name: 'Emily Davis', email: 'emily.davis@school.edu', subjects: ['5'] },
    { id: '5', name: 'David Wilson', email: 'david.wilson@school.edu', subjects: ['6'] }
  ];

  const rooms: Room[] = [
    { id: '1', name: 'Room 101', capacity: 30, type: 'classroom' },
    { id: '2', name: 'Room 102', capacity: 25, type: 'classroom' },
    { id: '3', name: 'Science Lab', capacity: 20, type: 'lab' },
    { id: '4', name: 'Computer Lab', capacity: 25, type: 'lab' },
    { id: '5', name: 'Main Hall', capacity: 200, type: 'hall' },
    { id: '6', name: 'Library', capacity: 50, type: 'library' }
  ];

  const classes: Class[] = [
    { id: '1', name: 'Grade 9A', grade: '9', section: 'A', studentCount: 28 },
    { id: '2', name: 'Grade 9B', grade: '9', section: 'B', studentCount: 30 },
    { id: '3', name: 'Grade 10A', grade: '10', section: 'A', studentCount: 25 },
    { id: '4', name: 'Grade 10B', grade: '10', section: 'B', studentCount: 27 },
    { id: '5', name: 'Grade 11A', grade: '11', section: 'A', studentCount: 22 },
    { id: '6', name: 'Grade 12A', grade: '12', section: 'A', studentCount: 20 }
  ];

  const timetableEntries: TimetableEntry[] = [
    {
      id: '1',
      classId: '1',
      subjectId: '1',
      teacherId: '1',
      roomId: '1',
      dayOfWeek: 1,
      timeSlotId: '1',
      isRecurring: true,
      startDate: '2024-01-15'
    },
    {
      id: '2',
      classId: '1',
      subjectId: '2',
      teacherId: '2',
      roomId: '1',
      dayOfWeek: 1,
      timeSlotId: '2',
      isRecurring: true,
      startDate: '2024-01-15'
    }
  ];

  const conflicts: TimetableConflict[] = [
    {
      id: '1',
      type: 'teacher_conflict',
      message: 'John Smith is scheduled for two classes at the same time',
      entries: ['1', '3']
    }
  ];

  return (
    <DashboardLayout 
      title="Timetable Management"
      subtitle="Manage class schedules and timetables"
      icon={<Calendar className="h-8 w-8 text-primary" />}
      isAdmin={false}
      activeTab="timetable"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsCreateEntryOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>

        {/* Filters and Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Timetable Overview</CardTitle>
            <CardDescription>View and manage class schedules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search classes, subjects, or teachers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timetable">Timetable</TabsTrigger>
            <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{classes.length}</div>
                  <p className="text-xs text-muted-foreground">Active classes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{subjects.length}</div>
                  <p className="text-xs text-muted-foreground">Available subjects</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teachers.length}</div>
                  <p className="text-xs text-muted-foreground">Active teachers</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conflicts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{conflicts.length}</div>
                  <p className="text-xs text-muted-foreground">Scheduling conflicts</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Timetable Changes</CardTitle>
                <CardDescription>Latest updates to the timetable</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Mathematics class added for Grade 9A</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Room conflict resolved for Science Lab</p>
                      <p className="text-xs text-muted-foreground">4 hours ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timetable" className="space-y-6">
            {/* Week Navigation */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Weekly Timetable</CardTitle>
                    <CardDescription>
                      Week of {selectedWeek.toLocaleDateString()} - {new Date(selectedWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Enhanced Timetable Grid */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200 rounded-lg">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700 min-w-[100px]">
                          Time Slot
                        </th>
                        <th className="border border-gray-200 p-3 text-center font-semibold text-gray-700 min-w-[150px]">
                          Monday
                        </th>
                        <th className="border border-gray-200 p-3 text-center font-semibold text-gray-700 min-w-[150px]">
                          Tuesday
                        </th>
                        <th className="border border-gray-200 p-3 text-center font-semibold text-gray-700 min-w-[150px]">
                          Wednesday
                        </th>
                        <th className="border border-gray-200 p-3 text-center font-semibold text-gray-700 min-w-[150px]">
                          Thursday
                        </th>
                        <th className="border border-gray-200 p-3 text-center font-semibold text-gray-700 min-w-[150px]">
                          Friday
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((slot, index) => (
                        <tr key={slot.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="border border-gray-200 p-3 font-medium text-gray-900 bg-gray-50">
                            <div className="text-sm">
                              <div className="font-semibold">{slot.startTime} - {slot.endTime}</div>
                              <div className="text-xs text-gray-500">{slot.duration} min</div>
                            </div>
                          </td>
                          {[1, 2, 3, 4, 5].map(day => {
                            const entry = timetableEntries.find(
                              e => e.timeSlotId === slot.id && e.dayOfWeek === day
                            );
                            const subject = entry ? subjects.find(s => s.id === entry.subjectId) : null;
                            const teacher = entry ? teachers.find(t => t.id === entry.teacherId) : null;
                            const room = entry ? rooms.find(r => r.id === entry.roomId) : null;
                            const classInfo = entry ? classes.find(c => c.id === entry.classId) : null;

                            return (
                              <td key={day} className="border border-gray-200 p-2 h-20 relative group">
                                {entry && subject && teacher && room && classInfo ? (
                                  <div 
                                    className="h-full rounded-md p-2 text-xs cursor-pointer transition-all hover:shadow-md"
                                    style={{ backgroundColor: subject.color + '20', borderLeft: `4px solid ${subject.color}` }}
                                    onClick={() => {
                                      setEntryFormData({
                                        classId: entry.classId,
                                        subjectId: entry.subjectId,
                                        teacherId: entry.teacherId,
                                        roomId: entry.roomId,
                                        dayOfWeek: entry.dayOfWeek,
                                        timeSlotId: entry.timeSlotId,
                                        isRecurring: entry.isRecurring,
                                        startDate: entry.startDate,
                                        endDate: entry.endDate || ''
                                      });
                                      setIsEditEntryOpen(true);
                                    }}
                                  >
                                    <div className="font-semibold text-gray-900 truncate" title={subject.name}>
                                      {subject.code}
                                    </div>
                                    <div className="text-gray-600 truncate" title={classInfo.name}>
                                      {classInfo.name}
                                    </div>
                                    <div className="text-gray-500 truncate" title={teacher.name}>
                                      {teacher.name.split(' ')[0]}
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                      <MapPin className="h-3 w-3 text-gray-400" />
                                      <span className="text-gray-500 text-xs truncate" title={room.name}>
                                        {room.name}
                                      </span>
                                    </div>
                                    {/* Hover Actions */}
                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => setIsEditEntryOpen(true)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => {}}>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Duplicate
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem className="text-red-600">
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                ) : (
                                  <div 
                                    className="h-full rounded-md border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors"
                                    onClick={() => {
                                      setEntryFormData({
                                        ...entryFormData,
                                        dayOfWeek: day,
                                        timeSlotId: slot.id
                                      });
                                      setIsCreateEntryOpen(true);
                                    }}
                                  >
                                    <Plus className="h-4 w-4 text-gray-400" />
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-4">
                  <div className="text-sm text-gray-600">
                    <strong>Legend:</strong>
                  </div>
                  {subjects.map(subject => (
                    <div key={subject.id} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: subject.color }}
                      ></div>
                      <span className="text-sm text-gray-600">{subject.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conflicts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scheduling Conflicts</CardTitle>
                <CardDescription>Resolve timetable conflicts</CardDescription>
              </CardHeader>
              <CardContent>
                {conflicts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium">No conflicts found</p>
                    <p className="text-muted-foreground">Your timetable is conflict-free</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conflicts.map(conflict => (
                      <div key={conflict.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                              <Badge variant="destructive">{conflict.type.replace('_', ' ')}</Badge>
                            </div>
                            <p className="mt-2">{conflict.message}</p>
                          </div>
                          <Button size="sm" onClick={() => setIsConflictResolverOpen(true)}>
                            Resolve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Timetable Settings</CardTitle>
                <CardDescription>Configure timetable preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Academic Year</Label>
                  <Select defaultValue="2024-2025">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024-2025">2024-2025</SelectItem>
                      <SelectItem value="2023-2024">2023-2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Default Class Duration (minutes)</Label>
                  <Input type="number" defaultValue="45" />
                </div>
                <div>
                  <Label>Break Duration (minutes)</Label>
                  <Input type="number" defaultValue="15" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Entry Dialog */}
        <Dialog open={isCreateEntryOpen} onOpenChange={setIsCreateEntryOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Timetable Entry</DialogTitle>
              <DialogDescription>
                Create a new timetable entry for a class
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={entryFormData.classId} onValueChange={(value) => setEntryFormData({...entryFormData, classId: value})}>
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
                  <Label>Subject</Label>
                  <Select value={entryFormData.subjectId} onValueChange={(value) => setEntryFormData({...entryFormData, subjectId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teacher</Label>
                  <Select value={entryFormData.teacherId} onValueChange={(value) => setEntryFormData({...entryFormData, teacherId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(teacher => (
                        <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Room</Label>
                  <Select value={entryFormData.roomId} onValueChange={(value) => setEntryFormData({...entryFormData, roomId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map(room => (
                        <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Time Slot</Label>
                <Select value={entryFormData.timeSlotId} onValueChange={(value) => setEntryFormData({...entryFormData, timeSlotId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(slot => (
                      <SelectItem key={slot.id} value={slot.id}>
                        {slot.startTime} - {slot.endTime}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="recurring" 
                  checked={entryFormData.isRecurring}
                  onCheckedChange={(checked) => setEntryFormData({...entryFormData, isRecurring: checked as boolean})}
                />
                <Label htmlFor="recurring">Recurring weekly</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateEntryOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsCreateEntryOpen(false)}>
                  Create Entry
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default TimetableManagement;