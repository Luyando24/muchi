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
  Clock
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

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  nrcNumber?: string;
  address?: string;
  district?: string;
  province?: string;
  qualification?: string;
  specialization?: string;
  experience?: number;
  employmentDate: string;
  employmentType: 'full-time' | 'part-time' | 'contract';
  salary?: number;
  isActive: boolean;
  subjects?: string[];
  classes?: string[];
  teacherNumber: string;
}

interface TeacherFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  nrcNumber?: string;
  address?: string;
  district?: string;
  province?: string;
  qualification?: string;
  specialization?: string;
  experience?: number;
  employmentDate: string;
  employmentType: 'full-time' | 'part-time' | 'contract';
  salary?: number;
  subjects?: string[];
  classes?: string[];
}

export default function TeacherManagement() {
  const { session } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
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
    gender: 'male',
    nrcNumber: '',
    address: '',
    district: '',
    province: '',
    qualification: '',
    specialization: '',
    experience: 0,
    employmentDate: '',
    employmentType: 'full-time',
    salary: 0,
    subjects: [],
    classes: []
  });

  // Mock data for demonstration
  const mockTeachers: Teacher[] = [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@school.edu',
      phone: '+95 9 123 456 789',
      dateOfBirth: '1985-03-15',
      gender: 'male',
      nrcNumber: '12/ABCD(N)123456',
      address: '123 Main Street',
      district: 'Yangon',
      province: 'Yangon Region',
      qualification: 'Master of Education',
      specialization: 'Mathematics',
      experience: 8,
      employmentDate: '2020-01-15',
      employmentType: 'full-time',
      salary: 800000,
      isActive: true,
      subjects: ['Mathematics', 'Physics'],
      classes: ['Grade 10A', 'Grade 11B'],
      teacherNumber: 'TCH-001'
    },
    {
      id: '2',
      firstName: 'Mary',
      lastName: 'Johnson',
      email: 'mary.johnson@school.edu',
      phone: '+95 9 987 654 321',
      dateOfBirth: '1990-07-22',
      gender: 'female',
      nrcNumber: '12/EFGH(N)789012',
      address: '456 Oak Avenue',
      district: 'Mandalay',
      province: 'Mandalay Region',
      qualification: 'Bachelor of Arts',
      specialization: 'English Literature',
      experience: 5,
      employmentDate: '2021-08-01',
      employmentType: 'full-time',
      salary: 700000,
      isActive: true,
      subjects: ['English', 'Literature'],
      classes: ['Grade 9A', 'Grade 10B'],
      teacherNumber: 'TCH-002'
    },
    {
      id: '3',
      firstName: 'David',
      lastName: 'Wilson',
      email: 'david.wilson@school.edu',
      phone: '+95 9 555 123 456',
      dateOfBirth: '1988-11-10',
      gender: 'male',
      nrcNumber: '14/IJKL(N)345678',
      address: '789 Pine Street',
      district: 'Naypyidaw',
      province: 'Naypyidaw Union Territory',
      qualification: 'Master of Science',
      specialization: 'Chemistry',
      experience: 6,
      employmentDate: '2019-09-15',
      employmentType: 'full-time',
      salary: 750000,
      isActive: true,
      subjects: ['Chemistry', 'Biology'],
      classes: ['Grade 11A', 'Grade 12A'],
      teacherNumber: 'TCH-003'
    }
  ];

  useEffect(() => {
    loadData();
  }, [session]);

  const loadData = async () => {
    try {
      setLoading(true);
      // For now, use mock data. In a real app, this would be an API call
      setTeachers(mockTeachers);
    } catch (error) {
      console.error('Failed to load teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async () => {
    try {
      const newTeacher: Teacher = {
        ...formData,
        id: Date.now().toString(),
        teacherNumber: `TCH-${String(teachers.length + 1).padStart(3, '0')}`,
        isActive: true
      };
      
      setTeachers([...teachers, newTeacher]);
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to add teacher:', error);
    }
  };

  const handleEditTeacher = async () => {
    if (!selectedTeacher) return;
    
    try {
      const updatedTeacher = { ...selectedTeacher, ...formData };
      setTeachers(teachers.map(t => t.id === selectedTeacher.id ? updatedTeacher : t));
      setIsEditDialogOpen(false);
      setSelectedTeacher(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update teacher:', error);
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    try {
      setTeachers(teachers.filter(t => t.id !== teacherId));
    } catch (error) {
      console.error('Failed to delete teacher:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: 'male',
      nrcNumber: '',
      address: '',
      district: '',
      province: '',
      qualification: '',
      specialization: '',
      experience: 0,
      employmentDate: '',
      employmentType: 'full-time',
      salary: 0,
      subjects: [],
      classes: []
    });
  };

  const openEditDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setFormData({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone || '',
      dateOfBirth: teacher.dateOfBirth,
      gender: teacher.gender,
      nrcNumber: teacher.nrcNumber || '',
      address: teacher.address || '',
      district: teacher.district || '',
      province: teacher.province || '',
      qualification: teacher.qualification || '',
      specialization: teacher.specialization || '',
      experience: teacher.experience || 0,
      employmentDate: teacher.employmentDate,
      employmentType: teacher.employmentType,
      salary: teacher.salary || 0,
      subjects: teacher.subjects || [],
      classes: teacher.classes || []
    });
    setIsEditDialogOpen(true);
  };

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = 
      teacher.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.teacherNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || 
      teacher.specialization?.toLowerCase().includes(selectedDepartment.toLowerCase());
    
    const matchesEmploymentType = selectedEmploymentType === 'all' || 
      teacher.employmentType === selectedEmploymentType;
    
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
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <Select value={formData.gender} onValueChange={(value: 'male' | 'female') => setFormData({ ...formData, gender: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="qualification">Qualification</Label>
                        <Input
                          id="qualification"
                          value={formData.qualification}
                          onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                          placeholder="e.g., Master of Education"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="specialization">Specialization</Label>
                        <Input
                          id="specialization"
                          value={formData.specialization}
                          onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                          placeholder="e.g., Mathematics"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="experience">Years of Experience</Label>
                        <Input
                          id="experience"
                          type="number"
                          value={formData.experience}
                          onChange={(e) => setFormData({ ...formData, experience: parseInt(e.target.value) || 0 })}
                          placeholder="Enter years of experience"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="employmentType">Employment Type</Label>
                        <Select value={formData.employmentType} onValueChange={(value: 'full-time' | 'part-time' | 'contract') => setFormData({ ...formData, employmentType: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full-time">Full-time</SelectItem>
                            <SelectItem value="part-time">Part-time</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="employmentDate">Employment Date</Label>
                        <Input
                          id="employmentDate"
                          type="date"
                          value={formData.employmentDate}
                          onChange={(e) => setFormData({ ...formData, employmentDate: e.target.value })}
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
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Enter full address"
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
                <CardTitle className="text-sm font-medium">Full-time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {teachers.filter(t => t.employmentType === 'full-time').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Full-time employees
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
                  {new Set(teachers.map(t => t.specialization).filter(Boolean)).size}
                </div>
                <p className="text-xs text-muted-foreground">
                  Subject specializations
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
                  {Math.round(teachers.reduce((acc, t) => acc + (t.experience || 0), 0) / teachers.length || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Years of experience
                </p>
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
                            <div className="text-sm text-muted-foreground">{teacher.teacherNumber}</div>
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
                          <div className="font-medium">{teacher.specialization}</div>
                          <div className="text-sm text-muted-foreground">{teacher.qualification}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge variant={teacher.employmentType === 'full-time' ? 'default' : 'secondary'}>
                            {teacher.employmentType}
                          </Badge>
                          <div className="text-sm text-muted-foreground mt-1">
                            Since {new Date(teacher.employmentDate).toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-medium">{teacher.experience}</div>
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
                    <Label htmlFor="edit-qualification">Qualification</Label>
                    <Input
                      id="edit-qualification"
                      value={formData.qualification}
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                      placeholder="e.g., Master of Education"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-specialization">Specialization</Label>
                    <Input
                      id="edit-specialization"
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      placeholder="e.g., Mathematics"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-experience">Years of Experience</Label>
                    <Input
                      id="edit-experience"
                      type="number"
                      value={formData.experience}
                      onChange={(e) => setFormData({ ...formData, experience: parseInt(e.target.value) || 0 })}
                      placeholder="Enter years of experience"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-employmentType">Employment Type</Label>
                    <Select value={formData.employmentType} onValueChange={(value: 'full-time' | 'part-time' | 'contract') => setFormData({ ...formData, employmentType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Textarea
                    id="edit-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter full address"
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