import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  GraduationCap,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Api } from '../../../shared/api';
import type { Student, Class } from '../../../shared/api';

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

interface FormErrors {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  nrcNumber?: string;
}

export default function StudentsTab() {
  const { session } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
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
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [session]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (false) {
        // Load students
        const studentsResponse = await Api.listStudents({
          schoolId: session.schoolId,
          limit: 100
        });
        setStudents(studentsResponse);

        // Load classes
        const classesResponse = await Api.listClasses({
          schoolId: session.schoolId
        });
        setClasses(classesResponse);
      } else {
        // Mock data for demo
        setStudents([
          {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '2010-05-15',
            gender: 'male',
            nrcNumber: '123456/78/9',
            guardianName: 'Jane Doe',
            guardianPhone: '+260 977 123 456',
            guardianEmail: 'jane.doe@email.com',
            address: '123 Main Street',
            district: 'Lusaka',
            province: 'Lusaka',
            currentGrade: '7',
            currentClass: '7A',
            emisId: 'EMIS001',
            schoolId: 'demo-school',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: '2',
            firstName: 'Mary',
            lastName: 'Smith',
            dateOfBirth: '2009-08-22',
            gender: 'female',
            nrcNumber: '987654/32/1',
            guardianName: 'Robert Smith',
            guardianPhone: '+260 966 789 012',
            guardianEmail: 'robert.smith@email.com',
            address: '456 Oak Avenue',
            district: 'Ndola',
            province: 'Copperbelt',
            currentGrade: '8',
            currentClass: '8B',
            emisId: 'EMIS002',
            schoolId: 'demo-school',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]);
        
        setClasses([
          { id: '1', name: '7A', grade: 7, schoolId: 'demo-school', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: '2', name: '8B', grade: 8, schoolId: 'demo-school', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        ]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setErrorMessage('Failed to load student data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    // Required fields
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (!formData.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    } else {
      // Check if date is not in the future
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      if (birthDate > today) {
        errors.dateOfBirth = 'Date of birth cannot be in the future';
      }
    }
    
    // Validate phone number format (Zambian format)
    if (formData.guardianPhone && !/^\+260\s?[0-9]{9}$/.test(formData.guardianPhone.replace(/\s/g, ''))) {
      errors.guardianPhone = 'Please enter a valid Zambian phone number (+260 followed by 9 digits)';
    }
    
    // Validate email format
    if (formData.guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guardianEmail)) {
      errors.guardianEmail = 'Please enter a valid email address';
    }
    
    // Validate NRC format (Zambian format: 123456/78/9)
    if (formData.nrcNumber && !/^\d{6}\/\d{2}\/\d{1}$/.test(formData.nrcNumber)) {
      errors.nrcNumber = 'Please enter a valid NRC number (format: 123456/78/9)';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = searchTerm === '' || 
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.emisId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGrade = selectedGrade === 'all' || student.currentGrade === selectedGrade;
    const matchesClass = selectedClass === 'all' || student.currentClass === selectedClass;
    
    return matchesSearch && matchesGrade && matchesClass;
  });

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
    setFormErrors({});
  };

  const handleAddStudent = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      if (false) {
        const newStudent = await Api.createStudent({
          ...formData,
          schoolId: session.schoolId
        });
        setStudents([...students, newStudent]);
        setSuccessMessage('Student added successfully!');
      } else {
        // Mock add for demo
        const newStudent: Student = {
          id: Date.now().toString(),
          ...formData,
          schoolId: 'demo-school',
          studentNumber: `STU${Date.now().toString().slice(-6)}`,
          enrollmentDate: new Date().toISOString(),
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setStudents([...students, newStudent]);
        setSuccessMessage('Student added successfully!');
      }
      
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to add student:', error);
      setErrorMessage('Failed to add student. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStudent = async () => {
    if (!selectedStudent || !validateForm()) return;
    
    try {
      setSubmitting(true);
      if (false) {
        const updatedStudent = await Api.updateStudent(selectedStudent.id, formData);
        setStudents(students.map(s => s.id === selectedStudent.id ? updatedStudent : s));
        setSuccessMessage('Student updated successfully!');
      } else {
        // Mock update for demo
        const updatedStudent = { ...selectedStudent, ...formData, updatedAt: new Date().toISOString() };
        setStudents(students.map(s => s.id === selectedStudent.id ? updatedStudent : s));
        setSuccessMessage('Student updated successfully!');
      }
      
      setIsEditDialogOpen(false);
      setSelectedStudent(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update student:', error);
      setErrorMessage('Failed to update student. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    
    try {
      setSubmitting(true);
      if (false) {
        await Api.deleteStudent(studentToDelete.id);
      }
      setStudents(students.filter(s => s.id !== studentToDelete.id));
      setSuccessMessage('Student deleted successfully!');
      setIsDeleteDialogOpen(false);
      setStudentToDelete(null);
    } catch (error) {
      console.error('Failed to delete student:', error);
      setErrorMessage('Failed to delete student. Please try again.');
    } finally {
      setSubmitting(false);
    }
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

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    
    try {
      setSubmitting(true);
      await handleDeleteStudent(studentToDelete.id);
      setIsDeleteDialogOpen(false);
      setStudentToDelete(null);
    } catch (error) {
      console.error('Error deleting student:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteDialog = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteDialogOpen(true);
  };

  const StudentForm = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Personal Information</h3>
        
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="First name"
            className={formErrors.firstName ? 'border-red-500' : ''}
          />
          {formErrors.firstName && (
            <p className="text-sm text-red-500">{formErrors.firstName}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Last name"
            className={formErrors.lastName ? 'border-red-500' : ''}
          />
          {formErrors.lastName && (
            <p className="text-sm text-red-500">{formErrors.lastName}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth *</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            className={formErrors.dateOfBirth ? 'border-red-500' : ''}
          />
          {formErrors.dateOfBirth && (
            <p className="text-sm text-red-500">{formErrors.dateOfBirth}</p>
          )}
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
        
        <div className="space-y-2">
          <Label htmlFor="nrcNumber">NRC Number</Label>
          <Input
            id="nrcNumber"
            value={formData.nrcNumber}
            onChange={(e) => setFormData({ ...formData, nrcNumber: e.target.value })}
            placeholder="123456/78/9"
            className={formErrors.nrcNumber ? 'border-red-500' : ''}
          />
          {formErrors.nrcNumber && (
            <p className="text-sm text-red-500">{formErrors.nrcNumber}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="emisId">EMIS ID</Label>
          <Input
            id="emisId"
            value={formData.emisId}
            onChange={(e) => setFormData({ ...formData, emisId: e.target.value })}
            placeholder="EMIS student ID"
          />
        </div>
      </div>

      {/* Guardian & Academic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Guardian & Academic Information</h3>
        
        <div className="space-y-2">
          <Label htmlFor="guardianName">Guardian Name</Label>
          <Input
            id="guardianName"
            value={formData.guardianName}
            onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
            placeholder="Guardian full name"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="guardianPhone">Guardian Phone</Label>
          <Input
            id="guardianPhone"
            value={formData.guardianPhone}
            onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
            placeholder="+260 977 123 456"
            className={formErrors.guardianPhone ? 'border-red-500' : ''}
          />
          {formErrors.guardianPhone && (
            <p className="text-sm text-red-500">{formErrors.guardianPhone}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="guardianEmail">Guardian Email</Label>
          <Input
            id="guardianEmail"
            type="email"
            value={formData.guardianEmail}
            onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
            placeholder="guardian@email.com"
            className={formErrors.guardianEmail ? 'border-red-500' : ''}
          />
          {formErrors.guardianEmail && (
            <p className="text-sm text-red-500">{formErrors.guardianEmail}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="currentGrade">Current Grade</Label>
          <Select value={formData.currentGrade} onValueChange={(value) => setFormData({ ...formData, currentGrade: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(grade => (
                <SelectItem key={grade} value={grade.toString()}>Grade {grade}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="currentClass">Current Class</Label>
          <Select value={formData.currentClass} onValueChange={(value) => setFormData({ ...formData, currentClass: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(cls => (
                <SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Full address"
            rows={2}
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
              <SelectItem value="Central">Central</SelectItem>
              <SelectItem value="Copperbelt">Copperbelt</SelectItem>
              <SelectItem value="Eastern">Eastern</SelectItem>
              <SelectItem value="Luapula">Luapula</SelectItem>
              <SelectItem value="Lusaka">Lusaka</SelectItem>
              <SelectItem value="Muchinga">Muchinga</SelectItem>
              <SelectItem value="Northern">Northern</SelectItem>
              <SelectItem value="North-Western">North-Western</SelectItem>
              <SelectItem value="Southern">Southern</SelectItem>
              <SelectItem value="Western">Western</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}
      
      {errorMessage && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Student Management</h2>
            <p className="text-muted-foreground">Manage student records and information</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
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
                  Enter student information for enrollment and record keeping. Fields marked with * are required.
                </DialogDescription>
              </DialogHeader>
              <StudentForm />
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleAddStudent} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Student
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update student information. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <StudentForm />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedStudent(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleEditStudent} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Student
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {studentToDelete?.firstName} {studentToDelete?.lastName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setStudentToDelete(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteStudent} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Student
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
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
                <TableHead>Grade/Class</TableHead>
                <TableHead>Guardian</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{student.firstName} {student.lastName}</div>
                        <div className="text-sm text-muted-foreground">
                          {student.emisId && `EMIS: ${student.emisId}`}
                          {student.nrcNumber && ` • NRC: ${student.nrcNumber}`}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">Grade {student.currentGrade}</div>
                      <div className="text-sm text-muted-foreground">{student.currentClass}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{student.guardianName}</div>
                      <div className="text-sm text-muted-foreground">Guardian</div>
                    </div>
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
                    <div className="text-sm">
                      {student.district && <div>{student.district}</div>}
                      {student.province && <div className="text-muted-foreground">{student.province}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(student)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(student)}>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {studentToDelete?.firstName} {studentToDelete?.lastName}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Student'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}