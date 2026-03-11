
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
  Eye
} from 'lucide-react';
import TeacherDetailsView from './TeacherDetailsView';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [viewTeacherId, setViewTeacherId] = useState<string | null>(initialViewId || null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const [availableSubjects, setAvailableSubjects] = useState<Option[]>([]);

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
    department: '',
    subjects: [] as string[],
    password: '', // Only for registration
    status: 'Active',
    joinDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const data = await syncFetch('/api/school/subjects', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          cacheKey: 'school-subjects-list'
        });
        setAvailableSubjects(data.map((s: any) => ({ label: s.name, value: s.name })));
      } catch (e: any) {
        console.error('Error fetching subjects:', e);
        if (e.message?.includes('No connection and no cached data available')) {
          setAvailableSubjects([]);
        }
      }
    };
    fetchSubjects();
  }, []);

  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const data = await syncFetch('/api/school/teachers', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        cacheKey: 'school-teachers-list'
      });

      setTeachers(data);
    } catch (error: any) {
      console.error('Error fetching teachers:', error);
      
      const isOfflineError = error.message?.includes('No connection and no cached data available');
      
      if (isOfflineError) {
        toast({
          title: "Offline Mode",
          description: "No cached teacher data available. Please connect to sync.",
          variant: "warning",
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
  }, []);

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
      department: '',
      subjects: [],
      password: '',
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
    setCurrentTeacher(teacher);
    setFormData({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      department: teacher.department,
      subjects: teacher.subjects,
      password: '',
      status: teacher.status,
      joinDate: teacher.joinDate ? new Date(teacher.joinDate).toISOString().split('T')[0] : ''
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeacher) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const subjectsArray = formData.subjects;

      const response = await fetch(`/api/school/teachers/${currentTeacher.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          department: formData.department,
          subjects: subjectsArray,
          status: formData.status,
          // joinDate is usually immutable or rarely changed, but we could add it if needed
        })
      });

      if (!response.ok) throw new Error('Failed to update teacher');

      toast({
        title: "Success",
        description: "Teacher updated successfully",
      });
      setIsEditOpen(false);
      fetchTeachers();
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

  const filteredTeachers = teachers.filter(teacher =>
    teacher.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (viewTeacherId) {
    return <TeacherDetailsView teacherId={viewTeacherId} onBack={handleBackFromDetails} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Teacher Management</h2>
          <p className="text-slate-600 dark:text-slate-400">Manage teaching staff, assignments, and performance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export List
          </Button>
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

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select onValueChange={(val) => handleSelectChange('department', val)} defaultValue={formData.department}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Dept" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Science">Science</SelectItem>
                        <SelectItem value="Mathematics">Mathematics</SelectItem>
                        <SelectItem value="Languages">Languages</SelectItem>
                        <SelectItem value="Humanities">Humanities</SelectItem>
                        <SelectItem value="Arts">Arts</SelectItem>
                        <SelectItem value="Sports">Sports</SelectItem>
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
            <Table>
              <TableHeader>
                <TableRow>
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
                {filteredTeachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No teachers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id}>
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
                            <DropdownMenuItem onClick={() => setViewTeacherId(teacher.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditClick(teacher)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Details
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
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Teacher Details</DialogTitle>
            <DialogDescription>
              Update information for {currentTeacher?.fullName}
            </DialogDescription>
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

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input id="edit-email" name="email" type="email" value={formData.email} disabled className="bg-slate-100" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <Select onValueChange={(val) => handleSelectChange('department', val)} defaultValue={formData.department}>
                  <SelectTrigger>
                    <SelectValue placeholder={formData.department || "Select Dept"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Science">Science</SelectItem>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Languages">Languages</SelectItem>
                    <SelectItem value="Humanities">Humanities</SelectItem>
                    <SelectItem value="Arts">Arts</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select onValueChange={(val) => handleSelectChange('status', val)} defaultValue={formData.status}>
                  <SelectTrigger>
                    <SelectValue placeholder={formData.status} />
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
              <Label htmlFor="edit-subjects">Subjects</Label>
              <MultiSelect
                options={availableSubjects}
                selected={formData.subjects}
                onChange={(selected) => setFormData(prev => ({ ...prev, subjects: selected }))}
                placeholder="Select subjects..."
              />
            </div>

            <DialogFooter>
              <Button type="submit">Update Details</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
    </div>
  );
}
