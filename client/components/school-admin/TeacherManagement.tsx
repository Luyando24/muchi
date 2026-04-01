
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
  FileSpreadsheet,
  ShieldCheck
} from 'lucide-react';
import TeacherDetailsView from './TeacherDetailsView';
import BulkTeacherImport from './BulkTeacherImport';
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
import { MultiSelect, Option } from "@/components/ui/multi-select";
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

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  department: string;
  subjects: string[];
  status: string;
  joinDate: string;
}

export default function TeacherManagement({ initialViewId, onClearViewId }: { initialViewId?: string | null, onClearViewId?: () => void }) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [viewTeacherId, setViewTeacherId] = useState<string | null>(initialViewId || null);
  const [teacherViewMode, setTeacherViewMode] = useState<'view' | 'edit'>('view');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [promoteTargetId, setPromoteTargetId] = useState<string | null>(null);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const [availableSubjects, setAvailableSubjects] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (initialViewId) {
      setViewTeacherId(initialViewId);
    }
  }, [initialViewId]);

  const handleBackFromDetails = () => {
    setViewTeacherId(null);
    if (onClearViewId) onClearViewId();
  };

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    department: '',
    subjects: [] as string[],
    password: '12345678', // Default temporary password
    status: 'Active',
    joinDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const subjectsData = await syncFetch('/api/school/subjects', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          cacheKey: 'school-subjects-list'
        });
        setAvailableSubjects(subjectsData.map((s: any) => ({ label: s.name, value: s.name })));

        const departmentsData = await syncFetch('/api/school/departments', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          cacheKey: 'school-departments'
        });
        setDepartments(departmentsData || []);
      } catch (e: any) {
        console.error('Error fetching subjects:', e);
        if (e.message?.includes('No connection and no cached data available')) {
          setAvailableSubjects([]);
        }
      }
    };
    fetchSubjects();
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(debouncedSearch ? { search: debouncedSearch } : {})
      });

      const data = await syncFetch(`/api/school/teachers?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        cacheKey: `school-teachers-list-${currentPage}-${pageSize}-${debouncedSearch}`
      });

      // Parse PaginatedResponse shape
      const paginatedData = data as PaginatedResponse<Teacher>;
      if (paginatedData && paginatedData.data) {
        setTeachers(paginatedData.data);
        setTotalTeachers(paginatedData.metadata.total);
        setTotalPages(paginatedData.metadata.totalPages);
      } else if (Array.isArray(data)) {
        // Fallback for offline cached arrays
        setTeachers(data);
        setTotalTeachers(data.length);
        setTotalPages(1);
      }

    } catch (error: any) {
      console.error('Error fetching teachers:', error);
      
      const isOfflineError = error.message?.includes('No connection and no cached data available');
      
      if (isOfflineError) {
        toast({
          title: "Offline Mode",
          description: "No cached teacher data available. Please connect to sync.",
          variant: "destructive" as any,
        });
        setTeachers([]);
      } else {
        toast({
          title: "Error",
          description: "Failed to load teachers list",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
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
      username: '',
      department: '',
      subjects: [],
      password: '12345678',
      status: 'Active',
      joinDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const subjectsArray = formData.subjects;

      const result = await syncFetch('/api/school/create-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: `${formData.firstName} ${formData.lastName}`,
          username: formData.username,
          department: formData.department,
          subjects: subjectsArray,
          status: formData.status,
          joinDate: formData.joinDate
        })
      });

      if (result.offline) {
        toast({
          title: "Offline Mode",
          description: "Teacher registration queued and will sync when you are back online.",
        });
      } else {
        toast({
          title: "Success",
          description: "Teacher registered successfully",
        });
      }

      setIsRegisterOpen(false);
      resetForm();
      fetchTeachers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (teacher: Teacher) => {
    setViewTeacherId(teacher.id);
    setTeacherViewMode('edit');
  };

  const handlePromote = async () => {
    if (!promoteTargetId) return;
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/teachers/${promoteTargetId}/promote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to promote teacher');

      toast({
        title: "Success",
        description: "Teacher promoted to School Admin successfully",
      });
      setPromoteTargetId(null);
      fetchTeachers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/teachers/${deleteTargetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete teacher');

      toast({
        title: "Success",
        description: "Teacher deleted successfully",
      });
      setDeleteTargetId(null);
      fetchTeachers();
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

  const handleBulkDeleteTeachers = async () => {
    if (selectedTeachers.length === 0) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const promises = selectedTeachers.map(id => fetch(`/api/school/teachers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      }));

      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.ok);

      if (failed.length > 0) {
        toast({ 
          title: "Partial Success", 
          description: `Deleted ${selectedTeachers.length - failed.length} teachers. ${failed.length} failed.`,
          variant: "destructive" 
        });
      } else {
        toast({ title: "Success", description: `${selectedTeachers.length} teachers deleted successfully` });
      }

      setSelectedTeachers([]);
      setIsBulkDeleteConfirmOpen(false);
      fetchTeachers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtering is now handled entirely server-side via the debouncedSearch query parameter.

  if (viewTeacherId) {
    return (
      <TeacherDetailsView 
        teacherId={viewTeacherId} 
        onBack={handleBackFromDetails} 
        initialMode={teacherViewMode}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Teacher Management</h2>
          <p className="text-slate-600 dark:text-slate-400">Manage teaching staff, assignments, and performance.</p>
        </div>
        <div className="flex gap-2">
          {selectedTeachers.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => setIsBulkDeleteConfirmOpen(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedTeachers.length})
            </Button>
          )}
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export List
          </Button>
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Import Excel
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px]">
              <BulkTeacherImport onImportSuccess={() => {
                setIsImportOpen(false);
                fetchTeachers();
              }} />
            </DialogContent>
          </Dialog>

          <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Teacher
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Register New Teacher</DialogTitle>
                <DialogDescription>
                  Create a new teacher account. They will receive login credentials via email.
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" name="username" type="text" value={formData.username} onChange={handleInputChange} />
                  </div>
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
                    <Label htmlFor="department">Department</Label>
                    <Select onValueChange={(val) => handleSelectChange('department', val)} defaultValue={formData.department}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Dept" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d: any) => (
                          <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select onValueChange={(val) => handleSelectChange('status', val)} defaultValue={formData.status}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="On Leave">On Leave</SelectItem>
                        <SelectItem value="Suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subjects">Subjects</Label>
                  <MultiSelect
                    options={availableSubjects}
                    selected={formData.subjects}
                    onChange={(selected) => setFormData(prev => ({ ...prev, subjects: selected }))}
                    placeholder="Select subjects..."
                  />
                </div>

                <DialogFooter>
                  <Button type="submit">Register Teacher</Button>
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
              <CardTitle>Teaching Staff</CardTitle>
              <CardDescription>Total teachers: {teachers.length}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search teachers..."
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
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={selectedTeachers.length === teachers.length && teachers.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedTeachers(teachers.map(t => t.id));
                        else setSelectedTeachers([]);
                      }}
                    />
                  </TableHead>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No teachers found
                    </TableCell>
                  </TableRow>
                ) : (
                  teachers.map((teacher) => (
                    <TableRow key={teacher.id} className={selectedTeachers.includes(teacher.id) ? "bg-slate-50 dark:bg-slate-800/50" : ""}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedTeachers.includes(teacher.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedTeachers([...selectedTeachers, teacher.id]);
                            else setSelectedTeachers(selectedTeachers.filter(id => id !== teacher.id));
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-xs text-slate-500">
                        {teacher.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                              {teacher.firstName[0]}{teacher.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{teacher.fullName}</div>
                            <div className="text-xs text-slate-500">{teacher.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{teacher.department}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {teacher.subjects && teacher.subjects.length > 0 ? (
                            teacher.subjects.slice(0, 3).map((subject, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {subject}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">None</span>
                          )}
                          {teacher.subjects && teacher.subjects.length > 3 && (
                            <Badge variant="outline" className="text-xs">+{teacher.subjects.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{teacher.joinDate ? new Date(teacher.joinDate).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={teacher.status === 'Active' ? 'default' : 'secondary'}>
                          {teacher.status}
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
                            <DropdownMenuItem onClick={() => {
                              setViewTeacherId(teacher.id);
                              setTeacherViewMode('view');
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditClick(teacher)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPromoteTargetId(teacher.id)}>
                              <ShieldCheck className="h-4 w-4 mr-2 text-blue-600" />
                              Promote to Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTargetId(teacher.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Account
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
                totalItems={totalTeachers}
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

      <ConfirmDialog
        open={!!promoteTargetId}
        onOpenChange={(open) => !open && setPromoteTargetId(null)}
        title="Promote to School Admin?"
        description="This will grant this teacher full administrative privileges. They will be able to manage all aspects of the school portal."
        confirmLabel="Confirm Promotion"
        variant="default"
        loading={isLoading}
        onConfirm={handlePromote}
      />
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete Teacher Account?"
        description="Are you sure you want to delete this teacher? This action cannot be undone and will remove all their associated data."
        confirmLabel="Delete Teacher"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={isBulkDeleteConfirmOpen}
        onOpenChange={(open) => !open && setIsBulkDeleteConfirmOpen(false)}
        title={`Delete ${selectedTeachers.length} Teacher Accounts?`}
        description={`Are you sure you want to delete the selected teachers? This action cannot be undone and will remove all their associated data.`}
        confirmLabel="Delete Teachers"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleBulkDeleteTeachers}
      />
    </div>
  );
}
