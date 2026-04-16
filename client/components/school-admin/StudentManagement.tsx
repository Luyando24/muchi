
import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  MoreVertical,
  Download,
  UserPlus,
  Trash2,
  Edit,
  Loader2,
  Eye,
  EyeOff,
  FileSpreadsheet
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import StudentDetailsView from './StudentDetailsView';
import BulkStudentImport from './BulkStudentImport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { syncFetch } from '@/lib/syncService';
import { PaginationControls } from '@/components/ui/pagination-controls';
import type { PaginatedResponse } from '@shared/api';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  grade: string;
  gender: string;
  status: string;
  fees: string;
  guardian: string;
  studentNumber?: string;
}

interface Class {
  id: string;
  name: string;
}

export default function StudentManagement({ initialViewId, onClearViewId }: { initialViewId?: string | null, onClearViewId?: () => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [viewStudentId, setViewStudentId] = useState<string | null>(initialViewId || null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRematching, setIsRematching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (initialViewId) {
      setViewStudentId(initialViewId);
    }
  }, [initialViewId]);

  const handleBackFromDetails = () => {
    setViewStudentId(null);
    if (onClearViewId) onClearViewId();
  };

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    grade: '',
    gender: '',
    guardian: '',
    password: '12345678', // Default temporary password
    status: 'Active',
    fees: 'Pending'
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(debouncedSearch ? { search: debouncedSearch } : {})
      });

      const [studentsRes, classesData] = await Promise.all([
        syncFetch(`/api/school/students?${queryParams.toString()}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          cacheKey: `school-students-list-${currentPage}-${pageSize}-${debouncedSearch}`
        }),
        syncFetch('/api/school/classes', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          cacheKey: 'school-classes-list'
        })
      ]);

      // Parse PaginatedResponse shape
      const paginatedData = studentsRes as PaginatedResponse<Student>;
      if (paginatedData && paginatedData.data) {
        setStudents(paginatedData.data);
        setTotalStudents(paginatedData.metadata.total);
        setTotalPages(paginatedData.metadata.totalPages);
      } else if (Array.isArray(studentsRes)) {
        // Fallback for offline cached arrays
        setStudents(studentsRes);
        setTotalStudents(studentsRes.length);
        setTotalPages(1);
      }

      setClasses(classesData?.data || classesData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      
      const isOfflineError = error.message?.includes('No connection and no cached data available');
      
      if (isOfflineError) {
        toast({
          title: "Offline Mode",
          description: "No cached student data available. Please connect to sync.",
          variant: "destructive" as any,
        });
        setStudents([]);
      } else {
        toast({
          title: "Error",
          description: "Failed to load students data",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSchoolDetails = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/school/details', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (response.ok) {
        setSchoolInfo(await response.json());
      }
    } catch (error) {
      console.error('Error fetching school details:', error);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchSchoolDetails();
  }, [currentPage, pageSize, debouncedSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      grade: '',
      gender: '',
      guardian: '',
      password: '12345678',
      status: 'Active',
      fees: 'Pending'
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/school/create-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: `${formData.firstName} ${formData.lastName}`,
          grade: formData.grade,
          guardian: formData.guardian,
          gender: formData.gender
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to register student');
      }

      toast({
        title: "Success",
        description: "Student registered successfully",
      });
      setIsRegisterOpen(false);
      resetForm();
      fetchStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (student: Student) => {
    // Try to find the class ID from the class name for the dropdown
    const classObj = classes.find(c => c.name === student.grade);
    
    setCurrentStudent(student);
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      grade: classObj ? classObj.id : student.grade,
      gender: student.gender,
      guardian: student.guardian,
      password: '',
      status: student.status,
      fees: student.fees
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/students/${currentStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          grade: formData.grade,
          gender: formData.gender,
          guardian: formData.guardian,
          status: formData.status,
          fees: formData.fees
        })
      });

      if (!response.ok) throw new Error('Failed to update student');

      toast({
        title: "Success",
        description: "Student updated successfully",
      });
      setIsEditOpen(false);
      fetchStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/students/${deleteTargetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete student');

      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
      setDeleteTargetId(null);
      fetchStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteStudents = async () => {
    if (selectedStudents.length === 0) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const promises = selectedStudents.map(id => fetch(`/api/school/students/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      }));

      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.ok);

      if (failed.length > 0) {
        toast({ 
          title: "Partial Success", 
          description: `Deleted ${selectedStudents.length - failed.length} students. ${failed.length} failed.`,
          variant: "destructive" 
        });
      } else {
        toast({ title: "Success", description: `${selectedStudents.length} students deleted successfully` });
      }

      setSelectedStudents([]);
      setIsBulkDeleteConfirmOpen(false);
      fetchStudents();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRematchClasses = async () => {
    setIsRematching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/school/students/re-match-classes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Re-match Complete",
          description: result.message,
        });
        fetchStudents();
      } else {
        throw new Error(result.message || 'Failed to re-match classes');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRematching(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    const exportToast = toast({
      title: "Generating Export",
      description: "Fetching all student data, please wait...",
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/school/students?all=true', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch full student list');
      
      const result = await response.json();
      const allStudents = result.data || [];

      if (allStudents.length === 0) {
        toast({
          title: "No Data",
          description: "There are no students to export.",
          variant: "destructive"
        });
        return;
      }

      const doc = new jsPDF();
      
      // Define Columns (Removed Guardian, Fees, Status)
      const tableColumn = ["Student Number", "Full Name", "Grade", "Gender"];
      const tableRows = allStudents.map((student: any) => [
        student.studentNumber || 'N/A',
        student.fullName,
        student.grade,
        student.gender
      ]);

      // Header Logic
      const addHeader = (data: any) => {
        // School Info Header
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.text(schoolInfo?.name || "School Enrollment List", 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        if (schoolInfo?.address) {
          doc.text(schoolInfo.address, 14, 28);
        }
        if (schoolInfo?.contact_email || schoolInfo?.phone) {
          const contactStr = [schoolInfo?.contact_email, schoolInfo?.phone].filter(Boolean).join(" | ");
          doc.text(contactStr, 14, 33);
        }

        doc.setFontSize(11);
        doc.text(`Enrollment Report - Generated on ${new Date().toLocaleDateString()}`, 14, 42);
        doc.text(`Total Students: ${allStudents.length}`, 14, 47);
        
        // HR line
        doc.setLineWidth(0.5);
        doc.line(14, 52, 196, 52);
      };

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 57,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229], fontSize: 11, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        didDrawPage: (data) => {
          // Add header manually on each page if needed, but startY handles first page
          if (data.pageNumber === 1) {
            addHeader(data);
          }

          // Footer branding
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          
          doc.setFontSize(10);
          doc.setTextColor(150);
          doc.setLineWidth(0.1);
          doc.line(14, pageHeight - 15, 196, pageHeight - 15);
          
          doc.text("MUCHI LMS - Modern Education Management", 14, pageHeight - 10);
          doc.text(`Page ${data.pageNumber}`, 180, pageHeight - 10);
        },
      });

      const date = new Date().toISOString().split('T')[0];
      doc.save(`${schoolInfo?.name?.replace(/\s+/g, '_') || 'Student'}_List_${date}.pdf`);

      toast({
        title: "Export Successful",
        description: `Exported ${allStudents.length} students to PDF.`,
      });
    } catch (error: any) {
      console.error("Export Error:", error);
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (viewStudentId) {
    return <StudentDetailsView studentId={viewStudentId} onBack={handleBackFromDetails} userRole="school_admin" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Student Management</h2>
          <p className="text-slate-600 dark:text-slate-400">Manage student records, enrollment, and status.</p>
        </div>
        <div className="flex gap-2">
          {selectedStudents.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => setIsBulkDeleteConfirmOpen(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedStudents.length})
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={handleRematchClasses} 
            disabled={isRematching || isLoading}
            title="Intelligently match students to classes based on their records (fixes formatting mismatches)"
          >
            {isRematching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Filter className="h-4 w-4 mr-2" />}
            Fix Assignments
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Export List
          </Button>

          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" id="import-excel-button">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Import Excel
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px]">
              <BulkStudentImport onImportSuccess={() => {
                setIsImportOpen(false);
                fetchStudents();
              }} />
            </DialogContent>
          </Dialog>

          <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <UserPlus className="h-4 w-4 mr-2" />
                Register Student
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Register New Student</DialogTitle>
                <DialogDescription>
                  Create a new student account. They will receive an email to verify their account.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-500" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade/Class</Label>
                    <Select value={formData.grade} onValueChange={(val) => handleSelectChange('grade', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={formData.gender} onValueChange={(val) => handleSelectChange('gender', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian">Guardian Name</Label>
                  <Input id="guardian" name="guardian" value={formData.guardian} onChange={handleInputChange} required />
                </div>
                <DialogFooter>
                  <Button type="submit">Register Student</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>All Students</CardTitle>
              <CardDescription>Total enrolled students: {students.length}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search students..."
                  className="pl-9 w-[200px] md:w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={selectedStudents.length === students.length && students.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedStudents(students.map(s => s.id));
                        else setSelectedStudents([]);
                      }}
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Guardian</TableHead>
                  <TableHead>Fee Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id} className={selectedStudents.includes(student.id) ? "bg-slate-50 dark:bg-slate-800/50" : ""}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedStudents([...selectedStudents, student.id]);
                            else setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{student.firstName[0]}{student.lastName[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{student.fullName}</div>
                            <div className="text-xs text-slate-500">{student.studentNumber}</div>
                            <div className="text-xs text-slate-400">{student.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{student.grade}</TableCell>
                      <TableCell>{student.gender}</TableCell>
                      <TableCell>{student.guardian}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          student.fees === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' :
                            student.fees === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              student.fees === 'Partial' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-red-50 text-red-700 border-red-200'
                        }>
                          {student.fees}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={student.status === 'Active' ? 'default' : 'destructive'}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewStudentId(student.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditClick(student)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTargetId(student.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Student
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="mt-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalStudents}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Student Details</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input id="edit-firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input id="edit-lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-grade">Grade/Class</Label>
                <Select value={formData.grade} onValueChange={(val) => handleSelectChange('grade', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(val) => handleSelectChange('gender', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-guardian">Guardian Name</Label>
              <Input id="edit-guardian" name="guardian" value={formData.guardian} onChange={handleInputChange} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select name="status" value={formData.status} onValueChange={(val) => handleSelectChange('status', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fees">Fees Status</Label>
                <Select name="fees" value={formData.fees} onValueChange={(val) => handleSelectChange('fees', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete Student?"
        description="Are you sure you want to delete this student? This action cannot be undone and will remove all associated records."
        confirmLabel="Delete Student"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={isBulkDeleteConfirmOpen}
        onOpenChange={(open) => !open && setIsBulkDeleteConfirmOpen(false)}
        title={`Delete ${selectedStudents.length} Students?`}
        description={`Are you sure you want to delete the selected students? This action cannot be undone and will remove all their associated data.`}
        confirmLabel="Delete Students"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleBulkDeleteStudents}
      />
    </div>
  );
}
