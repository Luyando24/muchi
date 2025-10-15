import { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Eye, 
  Edit, 
  Trash2,
  FileText,
  Phone,
  Mail,
  MapPin,
  Calendar,
  GraduationCap,
  User,
  BookOpen,
  Award,
  Clock,
  AlertCircle
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
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Api } from '@shared/api';
import type { Teacher, TeacherFormData } from '@shared/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export default function TeacherManagement() {
  const { session } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState<TeacherFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    qualification: '',
    subject: '',
    specialization: '',
    department: '',
    experienceYears: 0,
    hireDate: '',
    salary: 0,
    isHeadTeacher: false,
    bio: '',
    certifications: [],
    languagesSpoken: [],
    password: ''
  });

  // Mock data for demonstration
  const mockTeachers: Teacher[] = [
    {
      id: '1',
      employeeId: 'TCH-001',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@school.edu',
      phone: '+260 97 123 4567',
      subject: 'Mathematics',
      qualification: 'Master of Education',
      experienceYears: 8,
      specialization: 'Advanced Mathematics',
      department: 'Science',
      dateOfBirth: '1985-03-15',
      hireDate: '2020-01-15',
      salary: 15000,
      isActive: true,
      isHeadTeacher: false,
      bio: 'Experienced mathematics teacher with a passion for helping students excel.',
      certifications: ['Teaching License', 'Mathematics Certification'],
      languagesSpoken: ['English', 'Bemba'],
      createdAt: '2020-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z'
    },
    {
      id: '2',
      employeeId: 'TCH-002',
      firstName: 'Mary',
      lastName: 'Johnson',
      email: 'mary.johnson@school.edu',
      phone: '+260 97 987 6543',
      subject: 'English',
      qualification: 'Bachelor of Arts in English',
      experienceYears: 5,
      specialization: 'English Literature',
      department: 'Languages',
      dateOfBirth: '1990-07-22',
      hireDate: '2021-08-01',
      salary: 12000,
      isActive: true,
      isHeadTeacher: false,
      bio: 'Dedicated English teacher focused on developing students\' communication skills.',
      certifications: ['Teaching License', 'TESOL Certification'],
      languagesSpoken: ['English', 'Nyanja'],
      createdAt: '2021-08-01T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z'
    },
    {
      id: '3',
      employeeId: 'TCH-003',
      firstName: 'David',
      lastName: 'Wilson',
      email: 'david.wilson@school.edu',
      phone: '+260 97 555 1234',
      subject: 'Chemistry',
      qualification: 'Master of Science in Chemistry',
      experienceYears: 6,
      specialization: 'Organic Chemistry',
      department: 'Science',
      dateOfBirth: '1988-11-10',
      hireDate: '2019-09-15',
      salary: 14000,
      isActive: true,
      isHeadTeacher: true,
      bio: 'Head of Science Department with expertise in chemistry education.',
      certifications: ['Teaching License', 'Chemistry Lab Safety'],
      languagesSpoken: ['English', 'Tonga'],
      createdAt: '2019-09-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z'
    }
  ];

  useEffect(() => {
    loadData();
  }, [session]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await Api.listTeachers();
      setTeachers(response || []);
    } catch (error) {
      console.error('Failed to load teachers:', error);
      setError('Failed to load teachers from server. Using sample data.');
      // Fallback to mock data when API fails
      setTeachers(mockTeachers);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async () => {
    try {
      setError(null);
      const teacherData = {
        ...formData,
        schoolId: session?.schoolId // Include schoolId from session
      };
      const response = await Api.createTeacher(teacherData);
      setTeachers([...teachers, response]);
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('Teacher added successfully');
    } catch (error) {
      console.error('Failed to add teacher:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add teacher. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleEditTeacher = async () => {
    if (!selectedTeacher) return;
    
    try {
      setError(null);
      const response = await Api.updateTeacher(selectedTeacher.id, formData);
      setTeachers(teachers.map(t => t.id === selectedTeacher.id ? response : t));
      setIsEditDialogOpen(false);
      setSelectedTeacher(null);
      resetForm();
      toast.success('Teacher updated successfully');
    } catch (error) {
      console.error('Failed to update teacher:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update teacher. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    try {
      setError(null);
      await Api.deleteTeacher(teacherId);
      setTeachers(teachers.filter(t => t.id !== teacherId));
    } catch (error) {
      console.error('Failed to delete teacher:', error);
      setError('Failed to delete teacher. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      qualification: '',
      subject: '',
      specialization: '',
      department: '',
      experienceYears: 0,
      hireDate: '',
      salary: 0,
      isHeadTeacher: false,
      bio: '',
      certifications: [],
      languagesSpoken: [],
      password: ''
    });
  };

  const openEditDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setFormData({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone || '',
      dateOfBirth: teacher.dateOfBirth || '',
      qualification: teacher.qualification || '',
      subject: teacher.subject || '',
      specialization: teacher.specialization || '',
      department: teacher.department || '',
      experienceYears: teacher.experienceYears || 0,
      hireDate: teacher.hireDate || '',
      salary: teacher.salary || 0,
      isHeadTeacher: teacher.isHeadTeacher || false,
      bio: teacher.bio || '',
      certifications: teacher.certifications || [],
      languagesSpoken: teacher.languagesSpoken || [],
      password: '' // Don't pre-fill password for security
    });
    setIsEditDialogOpen(true);
  };

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = 
      teacher.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || 
      teacher.specialization?.toLowerCase().includes(selectedDepartment.toLowerCase()) ||
      teacher.department?.toLowerCase().includes(selectedDepartment.toLowerCase());
    
    const matchesEmploymentType = selectedEmploymentType === 'all' || 
      selectedEmploymentType === 'full-time'; // Simplified since we don't have employment type in new schema
    
    return matchesSearch && matchesDepartment && matchesEmploymentType;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-background p-6">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout onAddStudent={() => setIsAddDialogOpen(true)}>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Teacher Management</h1>
              <p className="text-muted-foreground">
                Manage your school's teaching staff and their information
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Teacher
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Teacher</DialogTitle>
                    <DialogDescription>
                      Enter the teacher's information to add them to your school.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          placeholder="Enter first name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          placeholder="Enter last name"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="Enter email address"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="Enter password for teacher login"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          placeholder="e.g., Mathematics"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="specialization">Specialization</Label>
                        <Input
                          id="specialization"
                          value={formData.specialization}
                          onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                          placeholder="e.g., Algebra"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          placeholder="e.g., Science Department"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="experienceYears">Years of Experience</Label>
                        <Input
                          id="experienceYears"
                          type="number"
                          value={formData.experienceYears}
                          onChange={(e) => setFormData({ ...formData, experienceYears: parseInt(e.target.value) || 0 })}
                          placeholder="Enter years of experience"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hireDate">Hire Date</Label>
                        <Input
                          id="hireDate"
                          type="date"
                          value={formData.hireDate}
                          onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="salary">Monthly Salary (MMK)</Label>
                        <Input
                          id="salary"
                          type="number"
                          value={formData.salary}
                          onChange={(e) => setFormData({ ...formData, salary: parseInt(e.target.value) || 0 })}
                          placeholder="Enter monthly salary"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="isHeadTeacher">Head Teacher</Label>
                      <Select value={formData.isHeadTeacher ? 'yes' : 'no'} onValueChange={(value) => setFormData({ ...formData, isHeadTeacher: value === 'yes' })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Brief biography"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddTeacher}>Add Teacher</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teachers.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active teaching staff
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {teachers.filter(t => t.isActive).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active teachers
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Departments</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(teachers.map(t => t.department).filter(Boolean)).size}
                </div>
                <p className="text-xs text-muted-foreground">
                  Unique departments
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Experience</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(teachers.reduce((acc, t) => acc + (t.experienceYears || 0), 0) / teachers.length || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Years of experience</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle>Teachers</CardTitle>
              <CardDescription>
                Manage and view all teaching staff information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search teachers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="mathematics">Mathematics</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="science">Science</SelectItem>
                    <SelectItem value="history">History</SelectItem>
                    <SelectItem value="arts">Arts</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedEmploymentType} onValueChange={setSelectedEmploymentType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Teachers Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Employment</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium">{teacher.firstName} {teacher.lastName}</div>
                            <div className="text-sm text-muted-foreground">{teacher.employeeId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3" />
                            {teacher.email}
                          </div>
                          {teacher.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {teacher.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{teacher.subject}</div>
                          <div className="text-sm text-muted-foreground">{teacher.department}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge variant={teacher.isHeadTeacher ? 'default' : 'secondary'}>
                            {teacher.isHeadTeacher ? 'Head Teacher' : 'Teacher'}
                          </Badge>
                          <div className="text-sm text-muted-foreground mt-1">
                            Since {new Date(teacher.hireDate).toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-medium">{teacher.experienceYears}</div>
                          <div className="text-sm text-muted-foreground">years</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={teacher.isActive ? 'default' : 'secondary'}>
                          {teacher.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(teacher)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteTeacher(teacher.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredTeachers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No teachers found matching your criteria.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Teacher</DialogTitle>
                <DialogDescription>
                  Update the teacher's information.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-firstName">First Name</Label>
                    <Input
                      id="edit-firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-lastName">Last Name</Label>
                    <Input
                      id="edit-lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-subject">Subject</Label>
                    <Input
                      id="edit-subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g., Mathematics"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-department">Department</Label>
                    <Input
                      id="edit-department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="e.g., Science Department"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-experienceYears">Years of Experience</Label>
                    <Input
                      id="edit-experienceYears"
                      type="number"
                      value={formData.experienceYears}
                      onChange={(e) => setFormData({ ...formData, experienceYears: parseInt(e.target.value) || 0 })}
                      placeholder="Enter years of experience"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-hireDate">Hire Date</Label>
                    <Input
                      id="edit-hireDate"
                      type="date"
                      value={formData.hireDate}
                      onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-bio">Bio</Label>
                  <Textarea
                    id="edit-bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Enter teacher's bio"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditTeacher}>Update Teacher</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DashboardLayout>
  );
}