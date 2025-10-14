import { useState, useEffect } from 'react';
import { 
  School, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Eye, 
  Edit, 
  Trash2,
  Users,
  BookOpen,
  Calendar,
  GraduationCap
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
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface Class {
  id: string;
  name: string;
  grade: string;
  section: string;
  capacity: number;
  currentEnrollment: number;
  classTeacher: string;
  room: string;
  subjects: string[];
  schedule: string;
  academicYear: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  specialization: string[];
}

export default function ClassesManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    section: '',
    capacity: '',
    classTeacher: '',
    room: '',
    subjects: [] as string[],
    schedule: '',
    academicYear: '2024',
    status: 'active' as 'active' | 'inactive'
  });

  // Mock data
  useEffect(() => {
    const mockClasses: Class[] = [
      {
        id: '1',
        name: 'Grade 1A',
        grade: '1',
        section: 'A',
        capacity: 30,
        currentEnrollment: 28,
        classTeacher: 'Mrs. Johnson',
        room: 'Room 101',
        subjects: ['Mathematics', 'English', 'Science'],
        schedule: 'Monday-Friday 8:00-14:00',
        academicYear: '2024',
        status: 'active',
        createdAt: '2024-01-15'
      },
      {
        id: '2',
        name: 'Grade 2B',
        grade: '2',
        section: 'B',
        capacity: 25,
        currentEnrollment: 23,
        classTeacher: 'Mr. Smith',
        room: 'Room 202',
        subjects: ['Mathematics', 'English', 'Science', 'Social Studies'],
        schedule: 'Monday-Friday 8:00-14:30',
        academicYear: '2024',
        status: 'active',
        createdAt: '2024-01-16'
      }
    ];

    const mockTeachers: Teacher[] = [
      { id: '1', name: 'Mrs. Johnson', email: 'johnson@school.com', specialization: ['Elementary Education'] },
      { id: '2', name: 'Mr. Smith', email: 'smith@school.com', specialization: ['Mathematics', 'Science'] }
    ];

    setClasses(mockClasses);
    setTeachers(mockTeachers);
  }, []);

  const stats = {
    totalClasses: classes.length,
    activeClasses: classes.filter(c => c.status === 'active').length,
    totalCapacity: classes.reduce((sum, c) => sum + c.capacity, 0),
    totalEnrollment: classes.reduce((sum, c) => sum + c.currentEnrollment, 0),
    utilizationRate: classes.length > 0 ? Math.round((classes.reduce((sum, c) => sum + c.currentEnrollment, 0) / classes.reduce((sum, c) => sum + c.capacity, 0)) * 100) : 0
  };

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.classTeacher.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = filterGrade === 'all' || cls.grade === filterGrade;
    const matchesStatus = filterStatus === 'all' || cls.status === filterStatus;
    return matchesSearch && matchesGrade && matchesStatus;
  });

  const handleCreateClass = () => {
    const newClass: Class = {
      id: Date.now().toString(),
      name: `Grade ${formData.grade}${formData.section}`,
      grade: formData.grade,
      section: formData.section,
      capacity: parseInt(formData.capacity),
      currentEnrollment: 0,
      classTeacher: formData.classTeacher,
      room: formData.room,
      subjects: formData.subjects,
      schedule: formData.schedule,
      academicYear: formData.academicYear,
      status: formData.status,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setClasses([...classes, newClass]);
    setIsAddDialogOpen(false);
    setFormData({
      name: '',
      grade: '',
      section: '',
      capacity: '',
      classTeacher: '',
      room: '',
      subjects: [],
      schedule: '',
      academicYear: '2024',
      status: 'active'
    });
  };

  const handleViewClass = (cls: Class) => {
    setSelectedClass(cls);
    setIsViewDialogOpen(true);
  };

  const handleEditClass = (cls: Class) => {
    setSelectedClass(cls);
    setFormData({
      name: cls.name,
      grade: cls.grade,
      section: cls.section,
      capacity: cls.capacity.toString(),
      classTeacher: cls.classTeacher,
      room: cls.room,
      subjects: cls.subjects,
      schedule: cls.schedule,
      academicYear: cls.academicYear,
      status: cls.status
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClass = (id: string) => {
    setClasses(classes.filter(c => c.id !== id));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <School className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Classes Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage school classes, capacity, and assignments
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Classes
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Class
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Class</DialogTitle>
                  <DialogDescription>
                    Create a new class with capacity and teacher assignment
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="grade">Grade</Label>
                      <Select value={formData.grade} onValueChange={(value) => setFormData({...formData, grade: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1,2,3,4,5,6,7,8,9,10,11,12].map(grade => (
                            <SelectItem key={grade} value={grade.toString()}>{grade}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="section">Section</Label>
                      <Select value={formData.section} onValueChange={(value) => setFormData({...formData, section: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                          {['A','B','C','D','E'].map(section => (
                            <SelectItem key={section} value={section}>{section}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacity</Label>
                      <Input
                        id="capacity"
                        type="number"
                        value={formData.capacity}
                        onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                        placeholder="Enter class capacity"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="room">Room</Label>
                      <Input
                        id="room"
                        value={formData.room}
                        onChange={(e) => setFormData({...formData, room: e.target.value})}
                        placeholder="Enter room number"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="classTeacher">Class Teacher</Label>
                    <Select value={formData.classTeacher} onValueChange={(value) => setFormData({...formData, classTeacher: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map(teacher => (
                          <SelectItem key={teacher.id} value={teacher.name}>{teacher.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schedule">Schedule</Label>
                    <Input
                      id="schedule"
                      value={formData.schedule}
                      onChange={(e) => setFormData({...formData, schedule: e.target.value})}
                      placeholder="e.g., Monday-Friday 8:00-14:00"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="academicYear">Academic Year</Label>
                      <Select value={formData.academicYear} onValueChange={(value) => setFormData({...formData, academicYear: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(value: 'active' | 'inactive') => setFormData({...formData, status: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateClass}>
                    Create Class
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
              <School className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClasses}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeClasses} active
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCapacity}</div>
              <p className="text-xs text-muted-foreground">
                Maximum students
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Enrollment</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEnrollment}</div>
              <p className="text-xs text-muted-foreground">
                Students enrolled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.utilizationRate}%</div>
              <p className="text-xs text-muted-foreground">
                Capacity used
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Spots</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCapacity - stats.totalEnrollment}</div>
              <p className="text-xs text-muted-foreground">
                Open positions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search classes or teachers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(grade => (
                <SelectItem key={grade} value={grade.toString()}>Grade {grade}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Classes Table */}
        <Card>
          <CardHeader>
            <CardTitle>Classes</CardTitle>
            <CardDescription>
              Manage all classes in your school
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Enrollment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{cls.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {cls.subjects.join(', ')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{cls.classTeacher}</TableCell>
                    <TableCell>{cls.room}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {cls.currentEnrollment}/{cls.capacity}
                        <div className="text-xs text-muted-foreground">
                          {Math.round((cls.currentEnrollment / cls.capacity) * 100)}% full
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cls.status === 'active' ? 'default' : 'secondary'}>
                        {cls.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewClass(cls)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClass(cls)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClass(cls.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* View Class Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Class Details</DialogTitle>
              <DialogDescription>
                View complete information about this class
              </DialogDescription>
            </DialogHeader>
            {selectedClass && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Class Name</Label>
                    <p className="text-sm text-muted-foreground">{selectedClass.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Grade & Section</Label>
                    <p className="text-sm text-muted-foreground">Grade {selectedClass.grade}, Section {selectedClass.section}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Class Teacher</Label>
                    <p className="text-sm text-muted-foreground">{selectedClass.classTeacher}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Room</Label>
                    <p className="text-sm text-muted-foreground">{selectedClass.room}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Capacity</Label>
                    <p className="text-sm text-muted-foreground">{selectedClass.capacity} students</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Current Enrollment</Label>
                    <p className="text-sm text-muted-foreground">{selectedClass.currentEnrollment} students</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Subjects</Label>
                  <p className="text-sm text-muted-foreground">{selectedClass.subjects.join(', ')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Schedule</Label>
                  <p className="text-sm text-muted-foreground">{selectedClass.schedule}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Academic Year</Label>
                    <p className="text-sm text-muted-foreground">{selectedClass.academicYear}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={selectedClass.status === 'active' ? 'default' : 'secondary'}>
                      {selectedClass.status}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}