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
import { Api, TimeSlot, TimetableEntry, Teacher, Class, Subject } from '../../shared/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';



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

interface Subject {
  id: string;
  name: string;
  code: string;
  color: string;
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

const TimetableManagement = () => {
  // State for data
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  // Mock rooms for now (backend not implemented)
  const rooms: Room[] = [
    { id: '1', name: 'Room 101', capacity: 30, type: 'classroom' },
    { id: '2', name: 'Room 102', capacity: 25, type: 'classroom' },
    { id: '3', name: 'Science Lab', capacity: 20, type: 'lab' },
    { id: '4', name: 'Computer Lab', capacity: 25, type: 'lab' },
    { id: '5', name: 'Main Hall', capacity: 200, type: 'hall' },
    { id: '6', name: 'Library', capacity: 50, type: 'library' }
  ];

  const { session } = useAuth();

  useEffect(() => {
    if (session?.schoolId) {
      loadData();
    }
  }, [session?.schoolId]);

  const loadData = async () => {
    if (!session?.schoolId) return;
    try {
      const [slots, entries, teacherList, subjectList, classList] = await Promise.all([
        Api.listTimeSlots(session.schoolId),
        Api.getTimetable({ schoolId: session.schoolId }),
        Api.listTeachers(session.schoolId),
        Api.listSubjects(session.schoolId),
        Api.listClasses(session.schoolId)
      ]);
      setTimeSlots(slots);
      setTimetableEntries(entries);
      setTeachers(teacherList);
      setSubjects(subjectList);
      setClasses(classList);
    } catch (e) {
      console.error("Failed to load timetable data", e);
    }
  };

  const handleCreateEntry = async () => {
    try {
      if (!session?.schoolId) return;
      await Api.createTimetableEntry({
        ...entryFormData,
        schoolId: session.schoolId
      } as any); // Cast as local IDs might conflict with UUID expectations if not careful
      setIsCreateEntryOpen(false);
      loadData();
    } catch (e) {
      console.error("Failed to create entry", e);
    }
  };

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
                                          <DropdownMenuItem onClick={() => { }}>
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
                  <Select value={entryFormData.classId} onValueChange={(value) => setEntryFormData({ ...entryFormData, classId: value })}>
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
                  <Select value={entryFormData.subjectId} onValueChange={(value) => setEntryFormData({ ...entryFormData, subjectId: value })}>
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
                  <Select value={entryFormData.teacherId} onValueChange={(value) => setEntryFormData({ ...entryFormData, teacherId: value })}>
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
                  <Select value={entryFormData.roomId} onValueChange={(value) => setEntryFormData({ ...entryFormData, roomId: value })}>
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
                <Select value={entryFormData.timeSlotId} onValueChange={(value) => setEntryFormData({ ...entryFormData, timeSlotId: value })}>
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
                  onCheckedChange={(checked) => setEntryFormData({ ...entryFormData, isRecurring: checked as boolean })}
                />
                <Label htmlFor="recurring">Recurring weekly</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateEntryOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateEntry}>
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