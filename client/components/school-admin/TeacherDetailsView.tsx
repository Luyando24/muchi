import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  User, 
  BookOpen, 
  GraduationCap, 
  Edit,
  Download,
  MoreHorizontal,
  Briefcase,
  Plus,
  Trash2,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect, Option } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface TeacherDetailsViewProps {
  teacherId: string;
  onBack: () => void;
  initialMode?: 'view' | 'edit';
}

interface WorkHistoryEntry {
  id: string;
  position: string;
  employer: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface TeacherDetails {
  profile: {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    address: string;
    date_of_birth: string;
    gender: string;
    department: string;
    subjects: string[];
    qualifications: string[];
    work_history: WorkHistoryEntry[];
    joinDate: string;
    status: string;
    avatar_url: string;
    totalClassesCount?: number;
  };
  classes: Array<{
    id: string;
    name: string;
    capacity: number;
  }>;
  headOfSubjects: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  teachingAssignments: Array<{
    id: string;
    class_id: string;
    subject_id: string;
    classes: { name: string };
    subjects: { name: string, code: string, department: string };
  }>;
}

export default function TeacherDetailsView({ teacherId, onBack, initialMode }: TeacherDetailsViewProps) {
  const [teacher, setTeacher] = useState<TeacherDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  // Mode State
  const [viewMode, setViewMode] = useState<'view' | 'edit'>(initialMode || 'view');
  
  // Dialog States - Removed Edit Profile Dialog in favor of full screen
  
  // Form States
  const [profileForm, setProfileForm] = useState<any>({});
  const [availableSubjects, setAvailableSubjects] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch('/api/school/class-subjects/allocation-options', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAvailableSubjects(data);
        }

        const deptRes = await fetch('/api/school/departments', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (deptRes.ok) {
          const data = await deptRes.json();
          setDepartments(data);
        }
      } catch (e) {
        console.error('Error fetching subjects:', e);
      }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    const fetchTeacherDetails = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const headers = { 'Authorization': `Bearer ${session.access_token}` };

        const res = await fetch(`/api/school/teachers/${teacherId}`, { headers });

        if (!res.ok) throw new Error('Failed to fetch teacher details');

        const data = await res.json();
        setTeacher(data);
        
        // Initialize profile form
        setProfileForm({
          firstName: data.profile.full_name.split(' ')[0],
          lastName: data.profile.full_name.split(' ').slice(1).join(' '),
          email: data.profile.email,
          username: data.profile.username || '',
          phone_number: data.profile.phone_number || '',
          address: data.profile.address || '',
          date_of_birth: data.profile.date_of_birth || '',
          department: data.profile.department || '',
          subjects: data.teachingAssignments ? data.teachingAssignments.map((ta: any) => ta.id) : [],
          qualifications: (data.profile.qualifications || []).join(', '),
          work_history: data.profile.work_history || [],
          status: data.profile.status
        });

      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load teacher data.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (teacherId) {
      fetchTeacherDetails();
    }
  }, [teacherId, toast]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const subjectsArray = profileForm.subjects;
        
      const qualificationsArray = typeof profileForm.qualifications === 'string'
        ? profileForm.qualifications.split(',').map((s: string) => s.trim()).filter((s: string) => s)
        : profileForm.qualifications;

      const res = await fetch(`/api/school/teachers/${teacher.profile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...profileForm,
          subjects: subjectsArray,
          qualifications: qualificationsArray
        })
      });

      if (!res.ok) throw new Error('Failed to update profile');

      toast({ title: "Success", description: "Profile updated successfully" });
      setViewMode('view');
      
      // Refresh data
      const updatedRes = await fetch(`/api/school/teachers/${teacherId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (updatedRes.ok) {
        const data = await updatedRes.json();
        setTeacher(data);
      }
      
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setProfileForm((prev: any) => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <h3 className="text-xl font-semibold">Teacher not found</h3>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  const { profile, classes, headOfSubjects, teachingAssignments } = teacher;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{profile.full_name}</h2>
            <div className="flex items-center space-x-2 text-muted-foreground text-sm">
              <Badge variant="outline">{profile.department || 'No Department'}</Badge>
              <span>•</span>
              <span>Joined {new Date(profile.joinDate).toLocaleDateString()}</span>
              <span>•</span>
              <Badge className={
                profile.status === 'Active' ? 'bg-green-500' : 'bg-gray-500'
              }>
                {profile.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {viewMode === 'view' ? (
            <>
              <Button variant="outline" onClick={() => setViewMode('edit')}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setViewMode('view')}>
              Cancel Editing
            </Button>
          )}
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-4xl">{profile.full_name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{profile.email || 'No email provided'}</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.phone_number || 'No phone number'}</span>
                </div>
                <div className="flex items-start space-x-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{profile.address || 'No address provided'}</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>DOB: {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not set'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Qualifications</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.qualifications && profile.qualifications.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.qualifications.map((qual, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      {qual}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No qualifications listed.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tabs */}
        <div className="md:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview & Classes</TabsTrigger>
              <TabsTrigger value="subjects">Subjects & Responsibilities</TabsTrigger>
              <TabsTrigger value="professional">Professional History</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Involved Classes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{profile.totalClassesCount ?? classes.length}</div>
                    <p className="text-xs text-muted-foreground">All assigned classes</p>
                  </CardContent>

                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Subjects Taught</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{teachingAssignments?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">Active teaching roles</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Class Teacher Responsibilities</CardTitle>
                  <CardDescription>Classes where this teacher is the assigned class teacher</CardDescription>
                </CardHeader>
                <CardContent>
                  {classes.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class Name</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classes.map((cls) => (
                          <TableRow key={cls.id}>
                            <TableCell className="font-medium">{cls.name}</TableCell>
                            <TableCell>{cls.capacity}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">View Class</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No classes assigned as class teacher.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subjects Tab */}
            <TabsContent value="subjects" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Subject Specializations</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.subjects && profile.subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {profile.subjects.map((subject, i) => (
                        <Badge key={i} variant="outline" className="text-base py-1 px-3">
                          <BookOpen className="h-3 w-3 mr-2" />
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-6">No subjects listed.</p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Teaching Assignments</CardTitle>
                  <CardDescription>Specific classes and subjects this teacher is assigned to</CardDescription>
                </CardHeader>
                <CardContent>
                  {teachingAssignments && teachingAssignments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Department</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teachingAssignments.map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell className="font-medium">{assignment.classes?.name}</TableCell>
                            <TableCell>{assignment.subjects?.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{assignment.subjects?.code}</Badge>
                            </TableCell>
                            <TableCell>{assignment.subjects?.department}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No specific class teaching assignments found.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Head of Department / Subject Head</CardTitle>
                  <CardDescription>Subjects where this teacher is the designated head</CardDescription>
                </CardHeader>
                <CardContent>
                  {headOfSubjects.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject Name</TableHead>
                          <TableHead>Code</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {headOfSubjects.map((subject) => (
                          <TableRow key={subject.id}>
                            <TableCell className="font-medium">{subject.name}</TableCell>
                            <TableCell>{subject.code}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No subject leadership roles assigned.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Professional Tab */}
            <TabsContent value="professional" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-blue-500" />
                    Qualifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.qualifications && profile.qualifications.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.qualifications.map((qual, i) => (
                        <div key={i} className="flex items-center p-3 border rounded-lg bg-slate-50">
                          <GraduationCap className="h-4 w-4 mr-3 text-blue-600" />
                          <span className="font-medium">{qual}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No qualifications listed.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-indigo-500" />
                    Work History
                  </CardTitle>
                  <CardDescription>Previous professional experience and roles</CardDescription>
                </CardHeader>
                <CardContent>
                  {profile.work_history && profile.work_history.length > 0 ? (
                    <div className="space-y-6">
                      {profile.work_history.map((work, i) => (
                        <div key={i} className="relative pl-8 border-l-2 border-slate-200 pb-6 last:pb-0">
                          <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-white border-2 border-indigo-500" />
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-1">
                            <div>
                              <h4 className="font-bold text-slate-900">{work.position}</h4>
                              <p className="text-indigo-600 font-medium">{work.employer}</p>
                            </div>
                            <div className="flex items-center text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-full w-fit">
                              <Clock className="h-3 w-3 mr-1" />
                              {work.startDate} — {work.endDate || 'Present'}
                            </div>
                          </div>
                          {work.description && (
                            <p className="mt-2 text-sm text-slate-600 leading-relaxed italic">
                              "{work.description}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50">
                      <Briefcase className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">No work history entries found.</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="text-indigo-600"
                        onClick={() => setViewMode('edit')}
                      >
                        Add your first experience
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Full Screen Edit View */}
      {viewMode === 'edit' && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Edit Teacher Profile</CardTitle>
            <CardDescription>Update the professional and personal details of this teacher.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" value={profileForm.firstName} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" value={profileForm.lastName} onChange={handleInputChange} required />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" value={profileForm.email} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" name="username" type="text" value={profileForm.username} onChange={handleInputChange} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input id="phone_number" name="phone_number" value={profileForm.phone_number} onChange={handleInputChange} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" name="address" value={profileForm.address} onChange={handleInputChange} className="min-h-[100px]" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <div className="flex gap-2">
                    <Select name="department" value={profileForm.department} onValueChange={(val) => handleSelectChange('department', val)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d: any) => (
                          <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      variant="outline"
                      title="Create New Department"
                      onClick={async () => {
                        const name = window.prompt("Enter new department name:");
                        if (name && name.trim()) {
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            const res = await fetch('/api/school/departments', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}`},
                              body: JSON.stringify({ name: name.trim() })
                            });
                            if (res.ok) {
                              const newDept = await res.json();
                              setDepartments(prev => [...prev, newDept].sort((a,b) => a.name.localeCompare(b.name)));
                              setProfileForm((prev: any) => ({ ...prev, department: newDept.name }));
                              toast({ title: "Success", description: "Department created" });
                            } else {
                              const err = await res.json();
                              toast({ title: "Error", description: err.message, variant: "destructive" });
                            }
                          } catch(e: any) {
                            toast({ title: "Error", description: "Failed to create department", variant: "destructive" });
                          }
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" value={profileForm.status} onValueChange={(val) => handleSelectChange('status', val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                      <SelectItem value="Terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subjects">Subjects</Label>
                {availableSubjects.length > 0 ? (
                  <MultiSelect
                    options={availableSubjects}
                    selected={profileForm.subjects || []}
                    onChange={(selected) => setProfileForm((prev: any) => ({ ...prev, subjects: selected }))}
                    placeholder="Select subjects..."
                  />
                ) : (
                  <div className="h-10 w-full border rounded-md bg-slate-50 flex items-center px-3 text-sm text-muted-foreground animate-pulse">
                    Loading allocation options...
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualifications">Qualifications (comma separated)</Label>
                <Textarea 
                  id="qualifications" 
                  name="qualifications" 
                  value={profileForm.qualifications} 
                  onChange={handleInputChange} 
                  className="min-h-[100px]"
                  placeholder="e.g. B.Ed in Mathematics, M.A in Education"
                />
              </div>

              <div className="space-y-6 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Work History</h3>
                    <p className="text-sm text-muted-foreground">Manage previous professional experience</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setProfileForm((prev: any) => ({
                      ...prev,
                      work_history: [
                        ...(prev.work_history || []),
                        { id: crypto.randomUUID(), position: '', employer: '', startDate: '', endDate: '', description: '' }
                      ]
                    }))}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Experience
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {(profileForm.work_history || []).map((work: any, index: number) => (
                    <div key={work.id} className="p-6 border rounded-xl space-y-4 bg-slate-50/50">
                      <div className="flex justify-between items-center">
                        <Badge variant="outline" className="bg-white">Experience Entry #{index + 1}</Badge>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          onClick={() => setProfileForm((prev: any) => ({
                            ...prev,
                            work_history: prev.work_history.filter((w: any) => w.id !== work.id)
                          }))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Position</Label>
                          <Input 
                            placeholder="e.g. Senior Teacher" 
                            value={work.position}
                            onChange={(e) => {
                              const newHistory = [...profileForm.work_history];
                              newHistory[index].position = e.target.value;
                              setProfileForm((prev: any) => ({ ...prev, work_history: newHistory }));
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Employer</Label>
                          <Input 
                            placeholder="e.g. Hillcrest School" 
                            value={work.employer}
                            onChange={(e) => {
                              const newHistory = [...profileForm.work_history];
                              newHistory[index].employer = e.target.value;
                              setProfileForm((prev: any) => ({ ...prev, work_history: newHistory }));
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Start Date</Label>
                          <Input 
                            placeholder="e.g. Jan 2020" 
                            value={work.startDate}
                            onChange={(e) => {
                              const newHistory = [...profileForm.work_history];
                              newHistory[index].startDate = e.target.value;
                              setProfileForm((prev: any) => ({ ...prev, work_history: newHistory }));
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">End Date</Label>
                          <Input 
                            placeholder="e.g. Present or Dec 2023" 
                            value={work.endDate}
                            onChange={(e) => {
                              const newHistory = [...profileForm.work_history];
                              newHistory[index].endDate = e.target.value;
                              setProfileForm((prev: any) => ({ ...prev, work_history: newHistory }));
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Description / Key Responsibilities</Label>
                        <Textarea 
                          placeholder="Briefly describe your role and achievements..." 
                          className="min-h-[100px]"
                          value={work.description}
                          onChange={(e) => {
                            const newHistory = [...profileForm.work_history];
                            newHistory[index].description = e.target.value;
                            setProfileForm((prev: any) => ({ ...prev, work_history: newHistory }));
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {(!profileForm.work_history || profileForm.work_history.length === 0) && (
                    <div className="text-center py-10 border-2 border-dashed rounded-xl bg-slate-50">
                      <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No work history entries added yet.</p>
                      <Button 
                        type="button" 
                        variant="link" 
                        className="text-primary mt-2"
                        onClick={() => setProfileForm((prev: any) => ({
                          ...prev,
                          work_history: [
                            { id: crypto.randomUUID(), position: '', employer: '', startDate: '', endDate: '', description: '' }
                          ]
                        }))}
                      >
                        Click to add your first experience
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => setViewMode('view')}>Cancel</Button>
                <Button type="submit" size="lg" className="px-8">Save Changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
