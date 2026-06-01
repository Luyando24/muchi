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
  Clock,
  Heart,
  Home,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
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
import { Switch } from "@/components/ui/switch";

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
    marital_status?: string;
    housing_status?: string;
    living_with_spouse?: boolean;
    disability_status?: string;
    accommodation_provided?: string;
    highest_qualification?: string;
    institution_name?: string;
    completion_year?: number;
    field_of_study?: string;
    current_role?: string;
    location_type?: string;
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
  const [isFormSaving, setIsFormSaving] = useState(false);
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
          status: data.profile.status,
          marital_status: data.profile.marital_status || '',
          housing_status: data.profile.housing_status || '',
          living_with_spouse: data.profile.living_with_spouse || false,
          disability_status: data.profile.disability_status || '',
          accommodation_provided: data.profile.accommodation_provided || '',
          highest_qualification: data.profile.highest_qualification || '',
          institution_name: data.profile.institution_name || '',
          completion_year: data.profile.completion_year || '',
          field_of_study: data.profile.field_of_study || '',
          current_role: data.profile.current_role || '',
          location_type: data.profile.location_type || '',
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

    setIsFormSaving(true);
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
    } finally {
      setIsFormSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setProfileForm((prev: any) => {
      const updated = { ...prev, [name]: value };
      if (name === 'marital_status' && value !== 'Married') {
        updated.living_with_spouse = false;
      }
      return updated;
    });
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

              <div className="border-t pt-4 space-y-4 animate-in fade-in duration-300">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Demographics & Housing</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-sm">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span>Marital Status: <strong className="font-semibold text-slate-800">{profile.marital_status || 'Not set'}</strong></span>
                  </div>
                  {profile.marital_status === 'Married' && (
                    <div className="flex items-center space-x-3 text-sm pl-7">
                      <span className="text-muted-foreground">•</span>
                      <span>Living with Spouse: <strong className="font-semibold text-slate-800">{profile.living_with_spouse ? 'Yes' : 'No'}</strong></span>
                    </div>
                  )}
                  <div className="flex items-center space-x-3 text-sm">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span>Disability: <strong className="font-semibold text-slate-800">{profile.disability_status || 'None'}</strong></span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span>Housing: <strong className="font-semibold text-slate-800">{profile.housing_status || 'Not set'}</strong></span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span>School Accomm.: <strong className="font-semibold text-slate-800">{profile.accommodation_provided || 'Not set'}</strong></span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>Location Type: <strong className="font-semibold text-slate-800">{profile.location_type || 'Not set'}</strong></span>
                  </div>
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
                    <GraduationCap className="h-5 w-5 text-indigo-500" />
                    Academic & Government Analytics Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg bg-slate-50">
                      <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Highest Qualification</div>
                      <div className="font-medium mt-1 text-slate-800">{profile.highest_qualification || 'Not set'}</div>
                    </div>
                    <div className="p-3 border rounded-lg bg-slate-50">
                      <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Field of Study</div>
                      <div className="font-medium mt-1 text-slate-800">{profile.field_of_study || 'Not set'}</div>
                    </div>
                    <div className="p-3 border rounded-lg bg-slate-50">
                      <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Institution</div>
                      <div className="font-medium mt-1 text-slate-800">{profile.institution_name || 'Not set'}</div>
                    </div>
                    <div className="p-3 border rounded-lg bg-slate-50">
                      <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Completion Year</div>
                      <div className="font-medium mt-1 text-slate-800">{profile.completion_year || 'Not set'}</div>
                    </div>
                    <div className="p-3 border rounded-lg bg-slate-50 md:col-span-2">
                      <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Current Role</div>
                      <div className="font-medium mt-1 text-slate-800">{profile.current_role || 'Not set'}</div>
                    </div>
                  </div>
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

              <div className="border-t border-slate-200 my-6 pt-6">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Demographics & Disability</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="marital_status">Marital Status</Label>
                    <Select 
                      name="marital_status" 
                      value={profileForm.marital_status || ''} 
                      onValueChange={(val) => handleSelectChange('marital_status', val)}
                    >
                      <SelectTrigger id="marital_status">
                        <SelectValue placeholder="Select marital status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Divorced">Divorced</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {profileForm.marital_status === 'Married' && (
                    <div className="flex items-center justify-between border border-slate-200 rounded-lg p-3 h-10 mt-8">
                      <Label htmlFor="living_with_spouse" className="cursor-pointer">Living with Spouse</Label>
                      <Switch 
                        id="living_with_spouse"
                        checked={profileForm.living_with_spouse || false}
                        onCheckedChange={(checked) => setProfileForm((prev: any) => ({ ...prev, living_with_spouse: checked }))}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="disability_status">Disability Status</Label>
                    <Select 
                      name="disability_status" 
                      value={profileForm.disability_status || ''} 
                      onValueChange={(val) => handleSelectChange('disability_status', val)}
                    >
                      <SelectTrigger id="disability_status">
                        <SelectValue placeholder="Select disability status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Visual">Visual</SelectItem>
                        <SelectItem value="Hearing">Hearing</SelectItem>
                        <SelectItem value="Physical">Physical</SelectItem>
                        <SelectItem value="Cognitive">Cognitive</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location_type">Location Type</Label>
                    <Select 
                      name="location_type" 
                      value={profileForm.location_type || ''} 
                      onValueChange={(val) => handleSelectChange('location_type', val)}
                    >
                      <SelectTrigger id="location_type">
                        <SelectValue placeholder="Select location type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Rural">Rural</SelectItem>
                        <SelectItem value="Urban">Urban</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 my-6 pt-6">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Housing & Accommodation</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="housing_status">Housing Status</Label>
                    <Select 
                      name="housing_status" 
                      value={profileForm.housing_status || ''} 
                      onValueChange={(val) => handleSelectChange('housing_status', val)}
                    >
                      <SelectTrigger id="housing_status">
                        <SelectValue placeholder="Select housing status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Government House">Government House</SelectItem>
                        <SelectItem value="Private Rental">Private Rental</SelectItem>
                        <SelectItem value="Own Home">Own Home</SelectItem>
                        <SelectItem value="Unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accommodation_provided">Accommodation Provided by School</Label>
                    <Select 
                      name="accommodation_provided" 
                      value={profileForm.accommodation_provided || ''} 
                      onValueChange={(val) => handleSelectChange('accommodation_provided', val)}
                    >
                      <SelectTrigger id="accommodation_provided">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="Partially">Partially</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 my-6 pt-6">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Government Analytics & Education</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="highest_qualification">Highest Qualification</Label>
                    <Select 
                      name="highest_qualification" 
                      value={profileForm.highest_qualification || ''} 
                      onValueChange={(val) => handleSelectChange('highest_qualification', val)}
                    >
                      <SelectTrigger id="highest_qualification">
                        <SelectValue placeholder="Select qualification" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Certificate">Certificate</SelectItem>
                        <SelectItem value="Diploma">Diploma</SelectItem>
                        <SelectItem value="Bachelor's Degree">Bachelor's Degree</SelectItem>
                        <SelectItem value="Master's Degree">Master's Degree</SelectItem>
                        <SelectItem value="PhD">PhD</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="field_of_study">Field of Study</Label>
                    <Input 
                      id="field_of_study"
                      name="field_of_study" 
                      placeholder="e.g. Mathematics, Education"
                      value={profileForm.field_of_study || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="institution_name">Institution Name</Label>
                    <Input 
                      id="institution_name"
                      name="institution_name" 
                      placeholder="e.g. University of Zambia"
                      value={profileForm.institution_name || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="completion_year">Completion Year</Label>
                    <Input 
                      id="completion_year"
                      name="completion_year" 
                      type="number"
                      placeholder="e.g. 2018"
                      value={profileForm.completion_year || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="current_role">Current Role</Label>
                    <Input 
                      id="current_role"
                      name="current_role" 
                      placeholder="e.g. Senior Teacher, Head of Science Department"
                      value={profileForm.current_role || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
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
                <SubmitButton loading={isFormSaving} loadingText="Saving..." size="lg" className="px-8">
                  Save Changes
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
