import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  BookOpen, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Grid3X3,
  List,
  RefreshCw,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
}

interface TimetableEntry {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  roomId: string;
  dayOfWeek: number;
  timeSlotId: string;
  isRecurring: boolean;
  startDate: string;
  endDate?: string;
}

const ScheduleTab = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock data
  const timeSlots: TimeSlot[] = [
    { id: '1', startTime: '08:00', endTime: '08:45', duration: 45 },
    { id: '2', startTime: '08:45', endTime: '09:30', duration: 45 },
    { id: '3', startTime: '09:45', endTime: '10:30', duration: 45 },
    { id: '4', startTime: '10:30', endTime: '11:15', duration: 45 },
    { id: '5', startTime: '11:30', endTime: '12:15', duration: 45 },
    { id: '6', startTime: '12:15', endTime: '13:00', duration: 45 },
  ];

  const subjects = [
    { id: '1', name: 'Mathematics', code: 'MATH', color: '#4CAF50', department: 'Science' },
    { id: '2', name: 'English Literature', code: 'ENG', color: '#2196F3', department: 'Humanities' },
    { id: '3', name: 'Physics', code: 'PHY', color: '#FF9800', department: 'Science' },
    { id: '4', name: 'History', code: 'HIS', color: '#9C27B0', department: 'Humanities' },
    { id: '5', name: 'Computer Science', code: 'CS', color: '#F44336', department: 'Technology' }
  ];

  const teachers = [
    { id: '1', name: 'John Smith', subjects: ['1', '3'], email: 'john.smith@school.edu' },
    { id: '2', name: 'Sarah Johnson', subjects: ['2', '4'], email: 'sarah.johnson@school.edu' },
    { id: '3', name: 'Michael Brown', subjects: ['5'], email: 'michael.brown@school.edu' },
    { id: '4', name: 'Emily Davis', subjects: ['1', '2'], email: 'emily.davis@school.edu' },
    { id: '5', name: 'Robert Wilson', subjects: ['3', '4'], email: 'robert.wilson@school.edu' }
  ];

  const rooms = [
    { id: '1', name: 'Room 101', capacity: 30, building: 'Main Building', floor: 1 },
    { id: '2', name: 'Room 102', capacity: 25, building: 'Main Building', floor: 1 },
    { id: '3', name: 'Science Lab', capacity: 20, building: 'Science Block', floor: 2 },
    { id: '4', name: 'Computer Lab', capacity: 30, building: 'Technology Block', floor: 1 },
    { id: '5', name: 'Library', capacity: 40, building: 'Main Building', floor: 2 }
  ];

  const classes = [
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline">
          Import
        </Button>
        <Button variant="outline">
          Export
        </Button>
        <Button>
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
                placeholder="Search timetable..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
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
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
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
                <p className="text-xs text-muted-foreground">Across all grades</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{subjects.length}</div>
                <p className="text-xs text-muted-foreground">Across all departments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Weekly Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">35</div>
                <p className="text-xs text-muted-foreground">Average per class</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Room Utilization</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">78%</div>
                <p className="text-xs text-muted-foreground">Average across all rooms</p>
              </CardContent>
            </Card>
          </div>
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
              {/* Timetable Grid */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-gray-200 p-3 bg-gray-50 text-gray-700">Time</th>
                      <th className="border border-gray-200 p-3 bg-gray-50 text-gray-700">Monday</th>
                      <th className="border border-gray-200 p-3 bg-gray-50 text-gray-700">Tuesday</th>
                      <th className="border border-gray-200 p-3 bg-gray-50 text-gray-700">Wednesday</th>
                      <th className="border border-gray-200 p-3 bg-gray-50 text-gray-700">Thursday</th>
                      <th className="border border-gray-200 p-3 bg-gray-50 text-gray-700">Friday</th>
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
                                </div>
                              ) : (
                                <div className="h-full rounded-md border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors">
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
                    <span className="text-sm">{subject.name}</span>
                  </div>
                ))}
              </div>
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
    </div>
  );
};

export default ScheduleTab;