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
  Camera,
  Phone,
  Mail,
  MapPin,
  Calendar,
  GraduationCap,
  User
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
import { Api } from '../../shared/api';
import type { Student, Class, Enrollment } from '../../shared/api';

interface StudentFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  nrcNumber?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  address?: string;
  district?: string;
  province?: string;
  currentGrade?: string;
  currentClass?: string;
  emisId?: string;
}

export default function StudentInformationSystem() {
  const { session } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<StudentFormData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    nrcNumber: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    address: '',
    district: '',
    province: '',
    currentGrade: '',
    currentClass: '',
    emisId: ''
  });

  useEffect(() => {
    loadData();
  }, [session]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load students
      const studentsResponse = await Api.listStudents({
        schoolId: session?.schoolId,
        limit: 100
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

  const handleAddStudent = async () => {
    try {
      const newStudent = await Api.createStudent({
        ...formData,
        schoolId: session?.schoolId!,
        studentNumber: `STU-${Date.now()}`, // Generate unique student number
        enrollmentDate: new Date().toISOString(),
        isActive: true
      });
      
      setStudents([...students, newStudent]);
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to add student:', error);
    }
  };

  const handleEditStudent = async () => {
    if (!selectedStudent) return;
    
    try {
      const updatedStudent = await Api.updateStudent(selectedStudent.id, formData);
      setStudents(students.map(s => s.id === selectedStudent.id ? updatedStudent : s));
      setIsEditDialogOpen(false);
      setSelectedStudent(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update student:', error);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await Api.deleteStudent(studentId);
      setStudents(students.filter(s => s.id !== studentId));
    } catch (error) {
      console.error('Failed to delete student:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'male',
      nrcNumber: '',
      guardianName: '',
      guardianPhone: '',
      guardianEmail: '',
      address: '',
      district: '',
      province: '',
      currentGrade: '',
      currentClass: '',
      emisId: ''
    });
  };

  const openEditDialog = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      nrcNumber: student.nrcNumber || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      guardianEmail: student.guardianEmail || '',
      address: student.address || '',
      district: student.district || '',
      province: student.province || '',
      currentGrade: student.currentGrade || '',
      currentClass: student.currentClass || '',
      emisId: student.emisId || ''
    });
    setIsEditDialogOpen(true);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGrade = selectedGrade === 'all' || student.currentGrade === selectedGrade;
    const matchesClass = selectedClass === 'all' || student.currentClass === selectedClass;
    
    return matchesSearch && matchesGrade && matchesClass;
  });

  const exportToEMIS = async () => {
    try {
      const emisData = await Api.exportStudentsToEMIS({
        schoolId: session?.schoolId!
      });
      
      // Create and download CSV file
      const blob = new Blob([emisData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EMIS_Students_Export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export to EMIS:', error);
    }
  };

  const StudentForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="firstName">First Name *</Label>
        <Input
          id="firstName"
          value={formData.firstName}
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          placeholder="Enter first name"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="lastName">Last Name *</Label>
        <Input
          id="lastName"
          value={formData.lastName}
          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          placeholder="Enter last name"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="dateOfBirth">Date of Birth *</Label>
        <Input
          id="dateOfBirth"
          type="date"
          value={formData.dateOfBirth}
          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="gender">Gender *</Label>
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
      
      <div className="space-y-2">
        <Label htmlFor="nrcNumber">NRC Number</Label>
        <Input
          id="nrcNumber"
          value={formData.nrcNumber}
          onChange={(e) => setFormData({ ...formData, nrcNumber: e.target.value })}
          placeholder="e.g., 123456/78/9"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="emisId">EMIS ID</Label>
        <Input
          id="emisId"
          value={formData.emisId}
          onChange={(e) => setFormData({ ...formData, emisId: e.target.value })}
          placeholder="Ministry of Education ID"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="guardianName">Guardian Name</Label>
        <Input
          id="guardianName"
          value={formData.guardianName}
          onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
          placeholder="Parent/Guardian name"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="guardianPhone">Guardian Phone</Label>
        <Input
          id="guardianPhone"
          value={formData.guardianPhone}
          onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
          placeholder="+260 XXX XXX XXX"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="guardianEmail">Guardian Email</Label>
        <Input
          id="guardianEmail"
          type="email"
          value={formData.guardianEmail}
          onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
          placeholder="guardian@example.com"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="currentGrade">Current Grade</Label>
        <Select value={formData.currentGrade} onValueChange={(value) => setFormData({ ...formData, currentGrade: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Grade 1</SelectItem>
            <SelectItem value="2">Grade 2</SelectItem>
            <SelectItem value="3">Grade 3</SelectItem>
            <SelectItem value="4">Grade 4</SelectItem>
            <SelectItem value="5">Grade 5</SelectItem>
            <SelectItem value="6">Grade 6</SelectItem>
            <SelectItem value="7">Grade 7</SelectItem>
            <SelectItem value="8">Grade 8</SelectItem>
            <SelectItem value="9">Grade 9</SelectItem>
            <SelectItem value="10">Grade 10</SelectItem>
            <SelectItem value="11">Grade 11</SelectItem>
            <SelectItem value="12">Grade 12</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Full address"
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="district">District</Label>
        <Input
          id="district"
          value={formData.district}
          onChange={(e) => setFormData({ ...formData, district: e.target.value })}
          placeholder="District"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="province">Province</Label>
        <Select value={formData.province} onValueChange={(value) => setFormData({ ...formData, province: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select province" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="central">Central</SelectItem>
            <SelectItem value="copperbelt">Copperbelt</SelectItem>
            <SelectItem value="eastern">Eastern</SelectItem>
            <SelectItem value="luapula">Luapula</SelectItem>
            <SelectItem value="lusaka">Lusaka</SelectItem>
            <SelectItem value="muchinga">Muchinga</SelectItem>
            <SelectItem value="northern">Northern</SelectItem>
            <SelectItem value="north-western">North-Western</SelectItem>
            <SelectItem value="southern">Southern</SelectItem>
            <SelectItem value="western">Western</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Student Information System</h1>
              <p className="text-muted-foreground">Manage student records, admissions, and EMIS compliance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportToEMIS}>
              <Download className="h-4 w-4 mr-2" />
              Export to EMIS
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                  <DialogDescription>
                    Enter student information for enrollment and EMIS compliance.
                  </DialogDescription>
                </DialogHeader>
                <StudentForm />
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddStudent}>
                    Add Student
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Student Directory</CardTitle>
            <CardDescription>Search and filter students by various criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or student number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(grade => (
                    <SelectItem key={grade} value={grade.toString()}>Grade {grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Students ({filteredStudents.length})</CardTitle>
                <CardDescription>Manage student records and information</CardDescription>
              </div>
              <Badge variant="secondary">
                Total: {students.length} students
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Student Number</TableHead>
                  <TableHead>Grade/Class</TableHead>
                  <TableHead>Guardian</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>EMIS ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{student.firstName} {student.lastName}</div>
                          <div className="text-sm text-muted-foreground">
                            {student.gender} • Born {new Date(student.dateOfBirth).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{student.studentNumber}</Badge>
                    </TableCell>
                    <TableCell>
                      {student.currentGrade && student.currentClass ? (
                        <div>
                          <div className="font-medium">Grade {student.currentGrade}</div>
                          <div className="text-sm text-muted-foreground">{student.currentClass}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {student.guardianName ? (
                        <div>
                          <div className="font-medium">{student.guardianName}</div>
                          <div className="text-sm text-muted-foreground">{student.guardianPhone}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No guardian info</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {student.guardianPhone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {student.guardianPhone}
                          </div>
                        )}
                        {student.guardianEmail && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {student.guardianEmail}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {student.emisId ? (
                        <Badge variant="secondary">{student.emisId}</Badge>
                      ) : (
                        <Badge variant="destructive">Missing</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.isActive ? "default" : "secondary"}>
                        {student.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(student)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteStudent(student.id)}
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
          </CardContent>
        </Card>

        {/* Edit Student Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Student Information</DialogTitle>
              <DialogDescription>
                Update student information and maintain EMIS compliance.
              </DialogDescription>
            </DialogHeader>
            <StudentForm isEdit={true} />
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditStudent}>
                Update Student
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}