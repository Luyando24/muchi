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
import { Api, Class, Teacher, ClassFormData } from '../../shared/api';

export default function ClassesManagement() {
  const { session } = useAuth();
  const navigate = useNavigate();
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState<ClassFormData>({
    schoolId: session?.schoolId || '',
    className: '',
    gradeLevel: '',
    section: '',
    subject: '',
    teacherId: '',
    roomNumber: '',
    capacity: 30,
    currentEnrollment: 0,
    academicYear: '2024',
    term: '',
    description: '',
    isActive: true
  });

  // Load data
  useEffect(() => {
    loadData();
  }, [session?.schoolId]);

  const loadData = async () => {
    if (!session?.schoolId) return;
    
    try {
      setLoading(true);
      const [classesData, teachersData] = await Promise.all([
        Api.listClasses({ schoolId: session.schoolId }),
        Api.listTeachers({ schoolId: session.schoolId })
      ]);
      
      setClasses(classesData);
      setTeachers(teachersData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalClasses: classes.length,
    activeClasses: classes.filter(c => c.isActive).length,
    totalCapacity: classes.reduce((sum, c) => sum + c.capacity, 0),
    totalEnrollment: classes.reduce((sum, c) => sum + c.currentEnrollment, 0),
    utilizationRate: classes.length > 0 ? Math.round((classes.reduce((sum, c) => sum + c.currentEnrollment, 0) / classes.reduce((sum, c) => sum + c.capacity, 0)) * 100) : 0
  };

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (cls.teacherName && cls.teacherName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGrade = filterGrade === 'all' || cls.gradeLevel === filterGrade;
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? cls.isActive : !cls.isActive);
    return matchesSearch && matchesGrade && matchesStatus;
  });

  const handleCreateClass = async () => {
    // Ensure a school is selected before attempting creation
    if (!formData.schoolId) {
      alert('Please select a school before creating a class.');
      return;
    }
    try {
      const newClass = await Api.createClass(formData);
      setClasses([...classes, newClass]);
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create class:', error);
      
      // Extract detailed error message if available
      let errorMessage = 'Unknown error';
      const anyErr: any = error;
      if (anyErr?.data) {
        const { error: serverError, details, message } = anyErr.data;
        errorMessage = serverError || message || details || errorMessage;
      } else if (anyErr?.message) {
        errorMessage = anyErr.message;
      }
      
      // Display detailed error message to user
      alert(`Failed to create class: ${errorMessage}`);
    }
  };

  const handleUpdateClass = async () => {
    if (!selectedClass) return;
    
    try {
      const updatedClass = await Api.updateClass(selectedClass.id, formData);
      setClasses(classes.map(c => c.id === selectedClass.id ? updatedClass : c));
      setIsEditDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to update class:', error);
    }
  };

  const handleDeleteClass = async (id: string) => {
    try {
      await Api.deleteClass(id);
      setClasses(classes.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete class:', error);
    }
  };

  const handleViewClass = (cls: Class) => {
    setSelectedClass(cls);
    setIsViewDialogOpen(true);
  };

  const handleEditClass = (cls: Class) => {
    setSelectedClass(cls);
    setFormData({
      schoolId: cls.schoolId,
      className: cls.className,
      gradeLevel: cls.gradeLevel,
      section: cls.section || '',
      subject: cls.subject || '',
      teacherId: cls.teacherId || '',
      roomNumber: cls.roomNumber || '',
      capacity: cls.capacity,
      currentEnrollment: cls.currentEnrollment,
      academicYear: cls.academicYear,
      term: cls.term || '',
      description: cls.description || '',
      isActive: cls.isActive
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      schoolId: session?.schoolId || '',
      className: '',
      gradeLevel: '',
      section: '',
      subject: '',
      teacherId: '',
      roomNumber: '',
      capacity: 30,
      currentEnrollment: 0,
      academicYear: '2024',
      term: '',
      description: '',
      isActive: true
    });
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
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Add New Class</DialogTitle>
                  <DialogDescription>
                    Create a new class with capacity and teacher assignment
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 overflow-y-auto flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="className">Class Name</Label>
                      <Input
                        id="className"
                        value={formData.className}
                        onChange={(e) => setFormData({...formData, className: e.target.value})}
                        placeholder="e.g., Grade 1A, Form 2B"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gradeLevel">Grade Level</Label>
                      <Select value={formData.gradeLevel} onValueChange={(value) => setFormData({...formData, gradeLevel: value})}>
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                        placeholder="e.g., Mathematics, English"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacity</Label>
                      <Input
                        id="capacity"
                        type="number"
                        value={formData.capacity}
                        onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value) || 0})}
                        placeholder="Enter class capacity"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roomNumber">Room Number</Label>
                      <Input
                        id="roomNumber"
                        value={formData.roomNumber}
                        onChange={(e) => setFormData({...formData, roomNumber: e.target.value})}
                        placeholder="Enter room number"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacherId">Class Teacher</Label>
                    <Select value={formData.teacherId} onValueChange={(value) => setFormData({...formData, teacherId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map(teacher => (
                          <SelectItem key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Label htmlFor="term">Term</Label>
                      <Select value={formData.term} onValueChange={(value) => setFormData({...formData, term: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select term" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Term 1">Term 1</SelectItem>
                          <SelectItem value="Term 2">Term 2</SelectItem>
                          <SelectItem value="Term 3">Term 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Optional class description"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="isActive">Status</Label>
                    <Select value={formData.isActive ? 'active' : 'inactive'} onValueChange={(value) => setFormData({...formData, isActive: value === 'active'})}>
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
                <div className="flex justify-end gap-2 pt-4 border-t bg-white sticky bottom-0">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateClass}>
                    Create Class
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Class Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Class</DialogTitle>
                  <DialogDescription>
                    Update class information and settings
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="className">Class Name</Label>
                      <Input
                        id="className"
                        value={formData.className}
                        onChange={(e) => setFormData({...formData, className: e.target.value})}
                        placeholder="e.g., Grade 1A, Form 2B"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gradeLevel">Grade Level</Label>
                      <Select value={formData.gradeLevel} onValueChange={(value) => setFormData({...formData, gradeLevel: value})}>
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                        placeholder="e.g., Mathematics, English"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacity</Label>
                      <Input
                        id="capacity"
                        type="number"
                        value={formData.capacity}
                        onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value) || 0})}
                        placeholder="Enter class capacity"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roomNumber">Room Number</Label>
                      <Input
                        id="roomNumber"
                        value={formData.roomNumber}
                        onChange={(e) => setFormData({...formData, roomNumber: e.target.value})}
                        placeholder="Enter room number"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacherId">Class Teacher</Label>
                    <Select value={formData.teacherId} onValueChange={(value) => setFormData({...formData, teacherId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map(teacher => (
                          <SelectItem key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Label htmlFor="term">Term</Label>
                      <Select value={formData.term} onValueChange={(value) => setFormData({...formData, term: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select term" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Term 1">Term 1</SelectItem>
                          <SelectItem value="Term 2">Term 2</SelectItem>
                          <SelectItem value="Term 3">Term 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Optional class description"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="isActive">Status</Label>
                    <Select value={formData.isActive ? 'active' : 'inactive'} onValueChange={(value) => setFormData({...formData, isActive: value === 'active'})}>
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
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateClass}>
                    Update Class
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
                        <div className="font-medium">{cls.className}</div>
                        <div className="text-sm text-muted-foreground">
                          {cls.subject && `Subject: ${cls.subject}`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{cls.teacherName || 'Not assigned'}</TableCell>
                    <TableCell>{cls.roomNumber || 'Not assigned'}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {cls.currentEnrollment}/{cls.capacity}
                        <div className="text-xs text-muted-foreground">
                          {Math.round((cls.currentEnrollment / cls.capacity) * 100)}% full
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cls.isActive ? 'default' : 'secondary'}>
                        {cls.isActive ? 'Active' : 'Inactive'}
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
                    <p className="text-sm text-muted-foreground">{selectedClass.className}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Grade Level</Label>
                    <p className="text-sm text-muted-foreground">Grade {selectedClass.gradeLevel}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Section</Label>
                    <p className="text-sm text-muted-foreground">{selectedClass.section || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Subject</Label>
                    <p className="text-sm text-muted-foreground">{selectedClass.subject || 'Not specified'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Class Teacher</Label>
                    <p className="text-sm text-muted-foreground">{selectedClass.teacherName || 'Not assigned'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Room</Label>
                    <p className="text-sm text-muted-foreground">{selectedClass.roomNumber || 'Not assigned'}</p>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Academic Year</Label>
                    <p className="text-sm text-muted-foreground">{selectedClass.academicYear}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Term</Label>
                    <p className="text-sm text-muted-foreground">{selectedClass.term || 'Not specified'}</p>
                  </div>
                </div>
                {selectedClass.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground">{selectedClass.description}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    <Badge variant={selectedClass.isActive ? 'default' : 'secondary'}>
                      {selectedClass.isActive ? 'Active' : 'Inactive'}
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