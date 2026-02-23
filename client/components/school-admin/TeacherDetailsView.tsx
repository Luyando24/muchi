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
  MoreHorizontal
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
    joinDate: string;
    status: string;
    avatar_url: string;
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
}

export default function TeacherDetailsView({ teacherId, onBack }: TeacherDetailsViewProps) {
  const [teacher, setTeacher] = useState<TeacherDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  // Dialog States
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  
  // Form States
  const [profileForm, setProfileForm] = useState<any>({});
  const [availableSubjects, setAvailableSubjects] = useState<Option[]>([]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch('/api/school/subjects', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAvailableSubjects(data.map((s: any) => ({ label: s.name, value: s.name })));
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
          phone_number: data.profile.phone_number || '',
          address: data.profile.address || '',
          date_of_birth: data.profile.date_of_birth || '',
          department: data.profile.department || '',
          subjects: data.profile.subjects || [],
          qualifications: (data.profile.qualifications || []).join(', '),
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
      setIsEditProfileOpen(false);
      
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

  const { profile, classes, headOfSubjects } = teacher;

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
          <Button variant="outline" onClick={() => setIsEditProfileOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview & Classes</TabsTrigger>
              <TabsTrigger value="subjects">Subjects & Responsibilities</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Assigned Classes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{classes.length}</div>
                    <p className="text-xs text-muted-foreground">Class Teacher</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Subjects Taught</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{profile.subjects?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">Active subjects</p>
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
          </Tabs>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Teacher Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" name="firstName" value={profileForm.firstName} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" name="lastName" value={profileForm.lastName} onChange={handleInputChange} required />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={profileForm.email} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input id="phone_number" name="phone_number" value={profileForm.phone_number} onChange={handleInputChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" name="address" value={profileForm.address} onChange={handleInputChange} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" name="department" value={profileForm.department} onChange={handleInputChange} />
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
              <MultiSelect
                options={availableSubjects}
                selected={profileForm.subjects || []}
                onChange={(selected) => setProfileForm((prev: any) => ({ ...prev, subjects: selected }))}
                placeholder="Select subjects..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualifications">Qualifications (comma separated)</Label>
              <Textarea id="qualifications" name="qualifications" value={profileForm.qualifications} onChange={handleInputChange} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditProfileOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
