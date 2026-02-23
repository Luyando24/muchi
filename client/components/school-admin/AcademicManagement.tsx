
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Plus, 
  Trash2, 
  Edit,
  Loader2,
  BookOpen,
  Layers,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';

interface Teacher {
  id: string;
  fullName: string;
  department: string;
}

interface Subject {
  id: string;
  name: string;
  department: string;
  headTeacherId: string | null;
  headTeacherName: string;
  code: string;
}

interface Class {
  id: string;
  name: string;
  level: string;
  room: string;
  capacity: number;
  classTeacherId: string | null;
  classTeacherName: string;
}

interface GradingScale {
  id: string;
  grade: string;
  min_percentage: number;
  max_percentage: number;
  description: string;
}

interface GradingWeight {
  id: string;
  assessment_type: string;
  weight_percentage: number;
}

import TimetableManagement from './TimetableManagement';

export default function AcademicManagement() {
  const [activeTab, setActiveTab] = useState('classes');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);
  const [gradingWeights, setGradingWeights] = useState<GradingWeight[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Dialog States
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isEditSubjectOpen, setIsEditSubjectOpen] = useState(false);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isEditClassOpen, setIsEditClassOpen] = useState(false);
  const [isAddScaleOpen, setIsAddScaleOpen] = useState(false);
  const [isEditScaleOpen, setIsEditScaleOpen] = useState(false);
  const [isAddWeightOpen, setIsAddWeightOpen] = useState(false);
  const [isEditWeightOpen, setIsEditWeightOpen] = useState(false);
  const [isManageSubjectsOpen, setIsManageSubjectsOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedClassSubjects, setSelectedClassSubjects] = useState<string[]>([]);

  // Form Data
  const [subjectForm, setSubjectForm] = useState({ id: '', name: '', department: '', headTeacherId: '', code: '' });
  const [classForm, setClassForm] = useState({ id: '', name: '', level: '', room: '', capacity: 40, classTeacherId: '' });
  const [scaleForm, setScaleForm] = useState({ id: '', grade: '', min_percentage: 0, max_percentage: 100, description: '' });
  const [weightForm, setWeightForm] = useState({ id: '', assessment_type: '', weight_percentage: 0 });
  
  // Grade Calculation State
  const [calcForm, setCalcForm] = useState({ classId: '', subjectId: 'all', term: '', academicYear: '' });
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch Data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { 'Authorization': `Bearer ${session.access_token}` };

      const [subjectsRes, classesRes, teachersRes, scalesRes, weightsRes, settingsRes] = await Promise.all([
        fetch('/api/school/subjects', { headers }),
        fetch('/api/school/classes', { headers }),
        fetch('/api/school/teachers', { headers }),
        fetch('/api/school/grading-scales', { headers }),
        fetch('/api/school/grading-weights', { headers }),
        fetch('/api/school/settings', { headers })
      ]);

      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
      if (classesRes.ok) setClasses(await classesRes.json());
      if (teachersRes.ok) setTeachers(await teachersRes.json());
      if (scalesRes.ok) setGradingScales(await scalesRes.json());
      if (weightsRes.ok) setGradingWeights(await weightsRes.json());
      
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setSchoolSettings(settings);
        setCalcForm(prev => ({ 
          ...prev, 
          term: settings.current_term || 'Term 1', 
          academicYear: settings.academic_year || new Date().getFullYear().toString() 
        }));
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Error", description: "Failed to load academic data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Subject Handlers
  const handleSubjectSubmit = async (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = isEdit ? `/api/school/subjects/${subjectForm.id}` : '/api/school/subjects';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(subjectForm)
      });

      if (!response.ok) throw new Error('Failed to save subject');

      toast({ title: "Success", description: `Subject ${isEdit ? 'updated' : 'created'} successfully` });
      setIsAddSubjectOpen(false);
      setIsEditSubjectOpen(false);
      setSubjectForm({ id: '', name: '', department: '', headTeacherId: '', code: '' });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/subjects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to delete subject');

      toast({ title: "Success", description: "Subject deleted successfully" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Class Handlers
  const handleClassSubmit = async (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = isEdit ? `/api/school/classes/${classForm.id}` : '/api/school/classes';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(classForm)
      });

      if (!response.ok) throw new Error('Failed to save class');

      toast({ title: "Success", description: `Class ${isEdit ? 'updated' : 'created'} successfully` });
      setIsAddClassOpen(false);
      setIsEditClassOpen(false);
      setClassForm({ id: '', name: '', level: '', room: '', capacity: 40, classTeacherId: '' });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/classes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to delete class');

      toast({ title: "Success", description: "Class deleted successfully" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Grading Scale Handlers
  const handleScaleSubmit = async (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = isEdit ? `/api/school/grading-scales/${scaleForm.id}` : '/api/school/grading-scales';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(scaleForm)
      });

      if (!response.ok) throw new Error('Failed to save grading scale');

      toast({ title: "Success", description: `Grading scale ${isEdit ? 'updated' : 'created'} successfully` });
      setIsAddScaleOpen(false);
      setIsEditScaleOpen(false);
      setScaleForm({ id: '', grade: '', min_percentage: 0, max_percentage: 100, description: '' });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteScale = async (id: string) => {
    if (!confirm('Are you sure you want to delete this grading scale?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/grading-scales/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to delete grading scale');

      toast({ title: "Success", description: "Grading scale deleted successfully" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Grading Weight Handlers
  const handleWeightSubmit = async (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = isEdit ? `/api/school/grading-weights/${weightForm.id}` : '/api/school/grading-weights';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(weightForm)
      });

      if (!response.ok) throw new Error('Failed to save grading weight');

      toast({ title: "Success", description: `Grading weight ${isEdit ? 'updated' : 'created'} successfully` });
      setIsAddWeightOpen(false);
      setIsEditWeightOpen(false);
      setWeightForm({ id: '', assessment_type: '', weight_percentage: 0 });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteWeight = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assessment weight?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/grading-weights/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to delete assessment weight');

      toast({ title: "Success", description: "Assessment weight deleted successfully" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Class Subject Management
  const handleManageSubjects = async (cls: Class) => {
    setSelectedClassId(cls.id);
    setSelectedClassSubjects([]); // Clear first
    setIsManageSubjectsOpen(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/school/classes/${cls.id}/subjects`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedClassSubjects(data.map((s: any) => s.id));
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load class subjects", variant: "destructive" });
    }
  };

  const handleSaveClassSubjects = async () => {
    if (!selectedClassId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/school/classes/${selectedClassId}/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ subjectIds: selectedClassSubjects })
      });
      if (!res.ok) throw new Error('Failed to save subjects');
      toast({ title: "Success", description: "Class subjects updated successfully" });
      setIsManageSubjectsOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Grade Calculation Handler
  const handleCalculateGrades = async () => {
    if (!calcForm.classId || !calcForm.term || !calcForm.academicYear) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setIsCalculating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/school/calculate-grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          classId: calcForm.classId,
          subjectId: calcForm.subjectId === 'all' ? null : calcForm.subjectId,
          term: calcForm.term,
          academicYear: calcForm.academicYear
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to calculate grades');

      toast({ 
        title: "Calculation Complete", 
        description: `Successfully calculated grades for ${data.count} students.` 
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsCalculating(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Academic Management</h2>
          <p className="text-slate-600 dark:text-slate-400">Manage classes, subjects, and curriculum.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="classes" className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> Classes
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Subjects
          </TabsTrigger>
          <TabsTrigger value="timetable" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Timetable
          </TabsTrigger>
          <TabsTrigger value="grading-scales" className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> Grading Scales
          </TabsTrigger>
          <TabsTrigger value="grading-weights" className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> Assessment Weights
          </TabsTrigger>
          <TabsTrigger value="grade-calculation" className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> Calculate Grades
          </TabsTrigger>
        </TabsList>

        {/* CLASSES TAB */}
        <TabsContent value="classes" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Classes</CardTitle>
                <CardDescription>Manage class sections and teacher assignments</CardDescription>
              </div>
              <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setClassForm({ id: '', name: '', level: '', room: '', capacity: 40, classTeacherId: '' })}>
                    <Plus className="h-4 w-4 mr-2" /> Add Class
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Class</DialogTitle>
                    <DialogDescription>Create a new class section.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => handleClassSubmit(e, false)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Class Name</Label>
                        <Input required placeholder="e.g. Grade 10A" value={classForm.name} onChange={e => setClassForm({...classForm, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Level</Label>
                        <Input required placeholder="e.g. 10" value={classForm.level} onChange={e => setClassForm({...classForm, level: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Room</Label>
                        <Input placeholder="e.g. 301" value={classForm.room} onChange={e => setClassForm({...classForm, room: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Capacity</Label>
                        <Input type="number" required value={classForm.capacity} onChange={e => setClassForm({...classForm, capacity: parseInt(e.target.value)})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Class Teacher</Label>
                      <Select value={classForm.classTeacherId} onValueChange={v => setClassForm({...classForm, classTeacherId: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select teacher" />
                        </SelectTrigger>
                        <SelectContent>
                          {teachers.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Create Class</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Class Teacher</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.level}</TableCell>
                      <TableCell>{cls.room}</TableCell>
                      <TableCell>{cls.capacity}</TableCell>
                      <TableCell>{cls.classTeacherName}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleManageSubjects(cls)} title="Manage Subjects">
                            <BookOpen className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => {
                            setClassForm({
                              id: cls.id,
                              name: cls.name,
                              level: cls.level,
                              room: cls.room,
                              capacity: cls.capacity,
                              classTeacherId: cls.classTeacherId || ''
                            });
                            setIsEditClassOpen(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteClass(cls.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {classes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        No classes found. Add your first class to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBJECTS TAB */}
        <TabsContent value="subjects" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Subjects Curriculum</CardTitle>
                <CardDescription>Manage subjects and department heads</CardDescription>
              </div>
              <Dialog open={isAddSubjectOpen} onOpenChange={setIsAddSubjectOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setSubjectForm({ id: '', name: '', department: '', headTeacherId: '', code: '' })}>
                    <Plus className="h-4 w-4 mr-2" /> Add Subject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Subject</DialogTitle>
                    <DialogDescription>Add a new subject to the curriculum.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => handleSubjectSubmit(e, false)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Subject Name</Label>
                        <Input required placeholder="e.g. Mathematics" value={subjectForm.name} onChange={e => setSubjectForm({...subjectForm, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Code</Label>
                        <Input placeholder="e.g. MAT101" value={subjectForm.code} onChange={e => setSubjectForm({...subjectForm, code: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Input placeholder="e.g. Science" value={subjectForm.department} onChange={e => setSubjectForm({...subjectForm, department: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Head of Department</Label>
                      <Select value={subjectForm.headTeacherId} onValueChange={v => setSubjectForm({...subjectForm, headTeacherId: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select teacher" />
                        </SelectTrigger>
                        <SelectContent>
                          {teachers.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Create Subject</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Subject Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Head of Dept</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-mono text-xs">{sub.code}</TableCell>
                      <TableCell className="font-medium">{sub.name}</TableCell>
                      <TableCell>{sub.department}</TableCell>
                      <TableCell>{sub.headTeacherName}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setSubjectForm({
                              id: sub.id,
                              name: sub.name,
                              department: sub.department,
                              headTeacherId: sub.headTeacherId || '',
                              code: sub.code
                            });
                            setIsEditSubjectOpen(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteSubject(sub.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {subjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No subjects found. Add your first subject.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TIMETABLE TAB */}
        <TabsContent value="timetable" className="space-y-4 mt-4">
          <TimetableManagement />
        </TabsContent>

        {/* GRADING SCALES TAB */}
        <TabsContent value="grading-scales" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Grading Scales</CardTitle>
                <CardDescription>Define grade ranges.</CardDescription>
              </div>
              <Dialog open={isAddScaleOpen} onOpenChange={setIsAddScaleOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setScaleForm({ id: '', grade: '', min_percentage: 0, max_percentage: 100, description: '' })}>
                    <Plus className="h-4 w-4 mr-2" /> Add Grade Scale
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Grading Scale</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => handleScaleSubmit(e, false)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Grade (e.g., A)</Label>
                        <Input required value={scaleForm.grade} onChange={e => setScaleForm({...scaleForm, grade: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Min %</Label>
                        <Input type="number" required value={scaleForm.min_percentage} onChange={e => setScaleForm({...scaleForm, min_percentage: parseInt(e.target.value)})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Max %</Label>
                        <Input type="number" required value={scaleForm.max_percentage} onChange={e => setScaleForm({...scaleForm, max_percentage: parseInt(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input value={scaleForm.description} onChange={e => setScaleForm({...scaleForm, description: e.target.value})} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Save</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grade</TableHead>
                    <TableHead>Range</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradingScales.map((scale) => (
                    <TableRow key={scale.id}>
                      <TableCell className="font-bold">{scale.grade}</TableCell>
                      <TableCell>{scale.min_percentage}% - {scale.max_percentage}%</TableCell>
                      <TableCell>{scale.description}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setScaleForm(scale);
                            setIsEditScaleOpen(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteScale(scale.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {gradingScales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No grading scales defined.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grading-weights" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Assessment Weights</CardTitle>
                <CardDescription>Define weightage for different assessment types.</CardDescription>
              </div>
              <Dialog open={isAddWeightOpen} onOpenChange={setIsAddWeightOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setWeightForm({ id: '', assessment_type: '', weight_percentage: 0 })}>
                    <Plus className="h-4 w-4 mr-2" /> Add Weight
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Assessment Weight</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => handleWeightSubmit(e, false)} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Assessment Type</Label>
                      <Select value={weightForm.assessment_type} onValueChange={v => setWeightForm({...weightForm, assessment_type: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Exam">Exam</SelectItem>
                          <SelectItem value="Quiz">Quiz</SelectItem>
                          <SelectItem value="Assignment">Assignment</SelectItem>
                          <SelectItem value="Project">Project</SelectItem>
                          <SelectItem value="Participation">Participation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Weight Percentage (%)</Label>
                      <Input type="number" required value={weightForm.weight_percentage} onChange={e => setWeightForm({...weightForm, weight_percentage: parseInt(e.target.value)})} />
                    </div>
                    <DialogFooter>
                      <Button type="submit">Save</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assessment Type</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradingWeights.map((weight) => (
                    <TableRow key={weight.id}>
                      <TableCell className="font-medium">{weight.assessment_type}</TableCell>
                      <TableCell>{weight.weight_percentage}%</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setWeightForm(weight);
                            setIsEditWeightOpen(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteWeight(weight.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {gradingWeights.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                        No weights defined.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grade-calculation" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Calculate Term Grades</CardTitle>
              <CardDescription>
                Automatically calculate student grades based on assessment weights and grading scales.
                This will process all assignments and submissions for the selected class/subject.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={calcForm.classId} onValueChange={v => setCalcForm({...calcForm, classId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Subject (Optional)</Label>
                    <Select value={calcForm.subjectId} onValueChange={v => setCalcForm({...calcForm, subjectId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Subjects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {subjects.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Term</Label>
                      <Input value={calcForm.term} onChange={e => setCalcForm({...calcForm, term: e.target.value})} placeholder="e.g. Term 1" />
                    </div>
                    <div className="space-y-2">
                      <Label>Academic Year</Label>
                      <Input value={calcForm.academicYear} onChange={e => setCalcForm({...calcForm, academicYear: e.target.value})} placeholder="e.g. 2024" />
                    </div>
                  </div>

                  <Button 
                    onClick={handleCalculateGrades} 
                    disabled={isCalculating || !calcForm.classId || !calcForm.term || !calcForm.academicYear}
                    className="w-full"
                  >
                    {isCalculating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      'Calculate & Publish Grades'
                    )}
                  </Button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800">
                  <h3 className="font-semibold mb-4">How Calculation Works</h3>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400 list-disc list-inside">
                    <li>Ensure <strong>Grading Scales</strong> are defined (e.g., A = 90-100%).</li>
                    <li>Ensure <strong>Assessment Weights</strong> are set (e.g., Exam = 40%).</li>
                    <li>The system aggregates all graded submissions for each student.</li>
                    <li>Scores are weighted according to assessment types.</li>
                    <li>Final percentage is matched against grading scales to assign a letter grade.</li>
                    <li>Results are stored in student records and appear on report cards.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialogs */}
      <Dialog open={isEditScaleOpen} onOpenChange={setIsEditScaleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Grading Scale</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => handleScaleSubmit(e, true)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grade</Label>
                <Input required value={scaleForm.grade} onChange={e => setScaleForm({...scaleForm, grade: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Min %</Label>
                <Input type="number" required value={scaleForm.min_percentage} onChange={e => setScaleForm({...scaleForm, min_percentage: parseInt(e.target.value)})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max %</Label>
                <Input type="number" required value={scaleForm.max_percentage} onChange={e => setScaleForm({...scaleForm, max_percentage: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={scaleForm.description} onChange={e => setScaleForm({...scaleForm, description: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditWeightOpen} onOpenChange={setIsEditWeightOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assessment Weight</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => handleWeightSubmit(e, true)} className="space-y-4">
            <div className="space-y-2">
              <Label>Assessment Type</Label>
              <Select value={weightForm.assessment_type} onValueChange={v => setWeightForm({...weightForm, assessment_type: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Exam">Exam</SelectItem>
                  <SelectItem value="Quiz">Quiz</SelectItem>
                  <SelectItem value="Assignment">Assignment</SelectItem>
                  <SelectItem value="Project">Project</SelectItem>
                  <SelectItem value="Participation">Participation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Weight Percentage (%)</Label>
              <Input type="number" required value={weightForm.weight_percentage} onChange={e => setWeightForm({...weightForm, weight_percentage: parseInt(e.target.value)})} />
            </div>
            <DialogFooter>
              <Button type="submit">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditClassOpen} onOpenChange={setIsEditClassOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => handleClassSubmit(e, true)} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class Name</Label>
                <Input required value={classForm.name} onChange={e => setClassForm({...classForm, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Input required value={classForm.level} onChange={e => setClassForm({...classForm, level: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Room</Label>
                <Input value={classForm.room} onChange={e => setClassForm({...classForm, room: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input type="number" required value={classForm.capacity} onChange={e => setClassForm({...classForm, capacity: parseInt(e.target.value)})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Class Teacher</Label>
              <Select value={classForm.classTeacherId} onValueChange={v => setClassForm({...classForm, classTeacherId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit">Update Class</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditSubjectOpen} onOpenChange={setIsEditSubjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => handleSubjectSubmit(e, true)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject Name</Label>
                <Input required value={subjectForm.name} onChange={e => setSubjectForm({...subjectForm, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={subjectForm.code} onChange={e => setSubjectForm({...subjectForm, code: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={subjectForm.department} onChange={e => setSubjectForm({...subjectForm, department: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Head of Department</Label>
              <Select value={subjectForm.headTeacherId} onValueChange={v => setSubjectForm({...subjectForm, headTeacherId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit">Update Subject</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isManageSubjectsOpen} onOpenChange={setIsManageSubjectsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Class Subjects</DialogTitle>
            <DialogDescription>Select subjects for this class.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="select-all" 
                checked={selectedClassSubjects.length === subjects.length && subjects.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedClassSubjects(subjects.map(s => s.id));
                  } else {
                    setSelectedClassSubjects([]);
                  }
                }}
              />
              <label htmlFor="select-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Select All
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto">
              {subjects.map((subject) => (
                <div key={subject.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`subject-${subject.id}`} 
                    checked={selectedClassSubjects.includes(subject.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedClassSubjects([...selectedClassSubjects, subject.id]);
                      } else {
                        setSelectedClassSubjects(selectedClassSubjects.filter(id => id !== subject.id));
                      }
                    }}
                  />
                  <label 
                    htmlFor={`subject-${subject.id}`} 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {subject.name} ({subject.code})
                  </label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageSubjectsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveClassSubjects}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
