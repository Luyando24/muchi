
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
  Clock,
  MoreHorizontal,
  Download,
  Edit,
  Plus
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import ReportCardPreview from './ReportCardPreview';

interface StudentDetailsViewProps {
  studentId: string;
  onBack: () => void;
}

interface StudentDetails {
  profile: {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    address: string;
    date_of_birth: string;
    gender: string;
    student_number: string;
    guardian_name: string;
    guardian_contact: string;
    avatar_url: string;
    className: string;
    academicYear: string;
    enrollment_status: string;
    fees_status: string;
  };
  academics: {
    enrollment: any;
    grades: Array<{
      id: string;
      subject_id: string;
      term: string;
      academic_year: string;
      grade: string;
      percentage: number;
      comments: string;
      subjects: {
        name: string;
        code: string;
        department: string;
      };
    }>;
    subjects: string[];
  };
  attendance: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
    rate: number;
  };
}

export default function StudentDetailsView({ studentId, onBack }: StudentDetailsViewProps) {
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const { toast } = useToast();

  // Dialog States
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [isGradeOpen, setIsGradeOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isReportCardOpen, setIsReportCardOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState("Term 1");
  const [currentAcademicYear, setCurrentAcademicYear] = useState(new Date().getFullYear().toString());

  // Form States
  const [profileForm, setProfileForm] = useState<any>({});
  const [enrollForm, setEnrollForm] = useState({ classId: '', academicYear: '' });
  const [gradeForm, setGradeForm] = useState({ subjectId: '', term: '', academicYear: '', grade: '', percentage: '', comments: '' });
  const [attendanceForm, setAttendanceForm] = useState({ date: new Date().toISOString().split('T')[0], status: 'present', remarks: '', term: '', academicYear: '' });
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);
  const [financeForm, setFinanceForm] = useState({ status: 'Pending' });

  useEffect(() => {
    const fetchStudentDetails = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const headers = { 'Authorization': `Bearer ${session.access_token}` };

        // Fetch settings first
        const settingsRes = await fetch('/api/school/settings', { headers });
        let settings = { academic_year: new Date().getFullYear().toString(), current_term: 'Term 1' };
        
        if (settingsRes.ok) {
            const data = await settingsRes.json();
            settings = { 
                academic_year: data.academic_year || settings.academic_year, 
                current_term: data.current_term || settings.current_term 
            };
        }
        
        setSelectedTerm(settings.current_term);
        setCurrentAcademicYear(settings.academic_year);
        setEnrollForm(prev => ({ ...prev, academicYear: settings.academic_year }));
        setGradeForm(prev => ({ ...prev, term: settings.current_term, academicYear: settings.academic_year }));
        setAttendanceForm(prev => ({ ...prev, term: settings.current_term, academicYear: settings.academic_year }));

        const [studentRes, classesRes, subjectsRes] = await Promise.all([
          fetch(`/api/school/students/${studentId}/details`, { headers }),
          fetch('/api/school/classes', { headers }),
          fetch('/api/school/subjects', { headers })
        ]);

        if (!studentRes.ok) throw new Error('Failed to fetch student details');

        const data = await studentRes.json();
        setStudent(data);
        
        // Initialize profile form
        setProfileForm({
          firstName: data.profile.full_name.split(' ')[0],
          lastName: data.profile.full_name.split(' ').slice(1).join(' '),
          email: data.profile.email,
          phone_number: data.profile.phone_number,
          address: data.profile.address,
          date_of_birth: data.profile.date_of_birth,
          gender: data.profile.gender,
          guardian: data.profile.guardian_name,
          guardian_contact: data.profile.guardian_contact,
          status: data.profile.enrollment_status,
          fees: data.profile.fees_status
        });

        if (classesRes.ok) setClasses(await classesRes.json());
        if (subjectsRes.ok) setSubjects(await subjectsRes.json());

      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load student data.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (studentId) {
      fetchStudentDetails();
    }
  }, [studentId, toast]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/school/students/${student.profile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(profileForm)
      });

      if (!res.ok) throw new Error('Failed to update profile');

      toast({ title: "Success", description: "Profile updated successfully" });
      setIsEditProfileOpen(false);
      // Refresh data
      window.location.reload(); // Simplest way to refresh for now, or re-fetch
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/school/students/${studentId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(enrollForm)
      });

      if (!res.ok) throw new Error('Failed to enroll student');

      toast({ title: "Success", description: "Enrollment updated successfully" });
      setIsEnrollOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/school/students/${studentId}/grades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ ...gradeForm, percentage: gradeForm.percentage ? parseInt(gradeForm.percentage) : 0 })
      });

      if (!res.ok) throw new Error('Failed to add grade');

      toast({ title: "Success", description: "Grade added successfully" });
      setIsGradeOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/school/students/${studentId}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(attendanceForm)
      });

      if (!res.ok) throw new Error('Failed to record attendance');

      toast({ title: "Success", description: "Attendance recorded successfully" });
      setIsAttendanceOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleFinanceUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/school/students/${studentId}/finance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(financeForm)
      });

      if (!res.ok) throw new Error('Failed to update finance status');

      toast({ title: "Success", description: "Finance status updated successfully" });
      setIsFinanceOpen(false);
      window.location.reload();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <h3 className="text-xl font-semibold">Student not found</h3>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  const { profile, academics, attendance } = student;

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
              <Badge variant="outline">{profile.student_number || 'No ID'}</Badge>
              <span>•</span>
              <span>{profile.className}</span>
              <span>•</span>
              <Badge className={
                profile.enrollment_status === 'Active' ? 'bg-green-500' : 
                profile.enrollment_status === 'Graduated' ? 'bg-blue-500' : 'bg-gray-500'
              }>
                {profile.enrollment_status || 'Unknown'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setIsEditProfileOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
          <Button variant="outline" onClick={() => setIsReportCardOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            View Report Card
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
                <div className="flex items-center space-x-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Gender: {profile.gender || 'Not specified'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Guardian Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p>{profile.guardian_name || 'Not listed'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contact</p>
                <p>{profile.guardian_contact || 'Not listed'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tabs */}
        <div className="md:col-span-2">
          <Tabs defaultValue="academics" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="academics">Academics</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="finance">Finance</TabsTrigger>
            </TabsList>

            {/* Academics Tab */}
            <TabsContent value="academics" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Current Class</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setIsEnrollOpen(true)}><Edit className="h-3 w-3" /></Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{profile.className}</div>
                    <p className="text-xs text-muted-foreground">Academic Year {profile.academicYear}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Subjects Taken</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{academics.subjects.length}</div>
                    <p className="text-xs text-muted-foreground">Active subjects</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Subjects & Performance</CardTitle>
                    <Button size="sm" onClick={() => setIsGradeOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Grade</Button>
                  </div>
                  <CardDescription>Recent grades and subjects</CardDescription>
                </CardHeader>
                <CardContent>
                  {academics.subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {academics.subjects.map((subject, i) => (
                        <Badge key={i} variant="secondary">{subject}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-6">No subjects assigned yet.</p>
                  )}

                  <h4 className="font-semibold mb-4">Recent Grades</h4>
                  {academics.grades.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Term</TableHead>
                          <TableHead>Year</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {academics.grades.map((grade) => (
                          <TableRow key={grade.id}>
                            <TableCell className="font-medium">{grade.subjects?.name || 'Unknown'}</TableCell>
                            <TableCell>
                              <Badge variant={
                                ['A', 'A+', 'D1', 'D2'].includes(grade.grade) ? 'default' : 
                                ['F', '9'].includes(grade.grade) ? 'destructive' : 'secondary'
                              }>
                                {grade.grade}
                              </Badge>
                            </TableCell>
                            <TableCell>{grade.percentage}%</TableCell>
                            <TableCell>{grade.term}</TableCell>
                            <TableCell>{grade.academic_year}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No grades recorded yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Attendance Tab */}
            <TabsContent value="attendance" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{attendance.rate}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{attendance.present}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{attendance.absent}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Late</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{attendance.late}</div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Attendance History</CardTitle>
                    <Button size="sm" onClick={() => setIsAttendanceOpen(true)}><Plus className="mr-2 h-4 w-4" /> Mark Attendance</Button>
                  </div>
                  <CardDescription>Recent attendance records would appear here.</CardDescription>
                </CardHeader>
                <CardContent className="h-40 flex items-center justify-center text-muted-foreground">
                  <p>Detailed attendance history chart coming soon.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Finance Tab */}
            <TabsContent value="finance" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Financial Status</CardTitle>
                    <Button size="sm" onClick={() => setIsFinanceOpen(true)}><Edit className="mr-2 h-4 w-4" /> Update Status</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                        <span className="font-medium">Current Status</span>
                        <Badge variant="outline" className={
                          profile.fees_status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200 text-lg py-1 px-3' : 
                          profile.fees_status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 text-lg py-1 px-3' : 
                          profile.fees_status === 'Partial' ? 'bg-blue-50 text-blue-700 border-blue-200 text-lg py-1 px-3' :
                          'bg-red-50 text-red-700 border-red-200 text-lg py-1 px-3'
                        }>
                          {profile.fees_status || 'Pending'}
                        </Badge>
                     </div>
                     <p className="text-muted-foreground text-center py-8">
                       Detailed transaction history is not yet available.
                     </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student Profile</DialogTitle>
            <DialogDescription>Update student personal and guardian information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={profileForm.firstName || ''} onChange={e => setProfileForm({...profileForm, firstName: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={profileForm.lastName || ''} onChange={e => setProfileForm({...profileForm, lastName: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profileForm.email || ''} onChange={e => setProfileForm({...profileForm, email: e.target.value})} type="email" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={profileForm.phone_number || ''} onChange={e => setProfileForm({...profileForm, phone_number: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input value={profileForm.date_of_birth || ''} onChange={e => setProfileForm({...profileForm, date_of_birth: e.target.value})} type="date" />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={profileForm.gender} onValueChange={v => setProfileForm({...profileForm, gender: v})}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Address</Label>
                <Textarea value={profileForm.address || ''} onChange={e => setProfileForm({...profileForm, address: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Guardian Name</Label>
                <Input value={profileForm.guardian || ''} onChange={e => setProfileForm({...profileForm, guardian: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Guardian Contact</Label>
                <Input value={profileForm.guardian_contact || ''} onChange={e => setProfileForm({...profileForm, guardian_contact: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Enroll Dialog */}
      <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Enrollment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEnroll} className="space-y-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={enrollForm.classId} onValueChange={v => setEnrollForm({...enrollForm, classId: v})}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((cls: any) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Input value={enrollForm.academicYear} onChange={e => setEnrollForm({...enrollForm, academicYear: e.target.value})} />
            </div>
            <DialogFooter>
              <Button type="submit">Update Enrollment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Grade Dialog */}
      <Dialog open={isGradeOpen} onOpenChange={setIsGradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Grade</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddGrade} className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={gradeForm.subjectId} onValueChange={v => setGradeForm({...gradeForm, subjectId: v})}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((sub: any) => (
                    <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grade (e.g. A, B)</Label>
                <Input value={gradeForm.grade} onChange={e => setGradeForm({...gradeForm, grade: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Percentage</Label>
                <Input type="number" value={gradeForm.percentage} onChange={e => setGradeForm({...gradeForm, percentage: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Term</Label>
                <Select value={gradeForm.term} onValueChange={v => setGradeForm({...gradeForm, term: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Term 1">Term 1</SelectItem>
                    <SelectItem value="Term 2">Term 2</SelectItem>
                    <SelectItem value="Term 3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input value={gradeForm.academicYear} onChange={e => setGradeForm({...gradeForm, academicYear: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea value={gradeForm.comments} onChange={e => setGradeForm({...gradeForm, comments: e.target.value})} />
            </div>
            <DialogFooter>
              <Button type="submit">Save Grade</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={isAttendanceOpen} onOpenChange={setIsAttendanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAttendance} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Term (Auto-set)</Label>
                <Input value={attendanceForm.term} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Year (Auto-set)</Label>
                <Input value={attendanceForm.academicYear} readOnly className="bg-muted" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={attendanceForm.date} onChange={e => setAttendanceForm({...attendanceForm, date: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={attendanceForm.status} onValueChange={v => setAttendanceForm({...attendanceForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="excused">Excused</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea value={attendanceForm.remarks} onChange={e => setAttendanceForm({...attendanceForm, remarks: e.target.value})} />
            </div>
            <DialogFooter>
              <Button type="submit">Record Attendance</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Finance Dialog */}
      <Dialog open={isFinanceOpen} onOpenChange={setIsFinanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Finance Status</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFinanceUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={financeForm.status} onValueChange={v => setFinanceForm({...financeForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit">Update Status</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Report Card Dialog */}
      <Dialog open={isReportCardOpen} onOpenChange={setIsReportCardOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4 gap-4">
            <h3 className="text-lg font-semibold">Report Card Preview</h3>
            <div className="flex gap-2">
              <Select value={currentAcademicYear} onValueChange={setCurrentAcademicYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Term 3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <ReportCardPreview 
            studentId={studentId}
            term={selectedTerm}
            academicYear={currentAcademicYear}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
