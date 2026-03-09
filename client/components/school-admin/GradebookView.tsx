
import React, { useState, useEffect } from 'react';
import {
  Save,
  Send,
  Download,
  Loader2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import ReportCardPreview from './ReportCardPreview';

interface Student {
  id: string;
  fullName: string;
  studentNumber: string;
}

interface GradeEntry {
  studentId: string;
  percentage: number | '';
  grade: string;
  comments: string;
  status: 'Draft' | 'Submitted' | 'Published' | 'Absent';
  isDirty?: boolean;
}

interface Class {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface GradingScale {
  grade: string;
  min_percentage: number;
  max_percentage: number;
  description?: string;
}

export default function GradebookView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);

  // Selection State
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Record<string, GradeEntry>>({});
  const [fetchingStudents, setFetchingStudents] = useState(false);

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load initial metadata
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const headers = { 'Authorization': `Bearer ${session.access_token}` };

        // Fetch school settings first for defaults
        const settingsRes = await fetch('/api/school/settings', { headers });
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          setSelectedTerm(settings.current_term || 'Term 1');
          setSelectedYear(settings.academic_year || new Date().getFullYear().toString());
        } else {
          // Fallback
          setSelectedTerm('Term 1');
          setSelectedYear(new Date().getFullYear().toString());
        }

        const [classesRes, subjectsRes, scalesRes] = await Promise.all([
          fetch('/api/school/classes', { headers }),
          fetch('/api/school/subjects', { headers }),
          fetch('/api/school/grading-scales', { headers })
        ]);

        if (classesRes.ok) setClasses(await classesRes.json());
        if (subjectsRes.ok) setSubjects(await subjectsRes.json());
        if (scalesRes.ok) setGradingScales(await scalesRes.json());

      } catch (error) {
        console.error('Error loading metadata:', error);
        toast({ title: "Error", description: "Failed to load classes or subjects", variant: "destructive" });
      }
    };
    loadMetadata();
  }, []);

  // Load students and existing grades when selection changes
  useEffect(() => {
    if (selectedClass && selectedSubject && selectedTerm && selectedYear) {
      loadGradebookData();
    }
  }, [selectedClass, selectedSubject, selectedTerm, selectedYear]);



  const handleSaveAll = async (autoSave = false) => {
    const dirtyGrades = Object.values(grades).filter(g => g.isDirty);
    if (dirtyGrades.length === 0) {
      if (!autoSave) toast({ title: "No changes", description: "No grades have been modified." });
      return;
    }

    if (autoSave) setSaving(true);
    else setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const payload = {
        grades: dirtyGrades.map(g => ({
          studentId: g.studentId,
          subjectId: selectedSubject,
          term: selectedTerm,
          academicYear: selectedYear,
          percentage: g.percentage === '' ? 0 : g.percentage,
          comments: g.comments
        }))
      };

      const response = await fetch('/api/school/grades/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to save grades');

      if (!autoSave) toast({ title: "Success", description: "Grades saved successfully" });
      setLastSaved(new Date());

      // Mark as clean
      setGrades(prev => {
        const next = { ...prev };
        dirtyGrades.forEach(g => {
          if (next[g.studentId]) next[g.studentId].isDirty = false;
        });
        return next;
      });

    } catch (error: any) {
      console.error('Save error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      if (autoSave) setSaving(false);
      else setLoading(false);
    }
  };

  // Auto-save effect
  useEffect(() => {
    const dirtyGrades = Object.values(grades).filter(g => g.isDirty);
    if (dirtyGrades.length === 0) return;

    const timeoutId = setTimeout(() => {
      handleSaveAll(true); // true = autoSave
    }, 1500); // 1.5 second debounce

    return () => clearTimeout(timeoutId);
  }, [grades, handleSaveAll]);

  const loadGradebookData = async () => {
    setFetchingStudents(true);
    setStudents([]);
    setGrades({});

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const headers = { 'Authorization': `Bearer ${session.access_token}` };

      // 1. Fetch Students in Class via API
      const studentsRes = await fetch(`/api/school/classes/${selectedClass}/students?year=${selectedYear}`, { headers });
      if (!studentsRes.ok) {
        const errData = await studentsRes.json();
        throw new Error(errData.message || 'Failed to fetch students');
      }

      const loadedStudents = await studentsRes.json();
      setStudents(loadedStudents);

      // 2. Fetch Existing Grades
      const { data: gradesData, error: gradesError } = await supabase
        .from('student_grades')
        .select('*')
        .eq('subject_id', selectedSubject)
        .eq('term', selectedTerm)
        .eq('academic_year', selectedYear)
        .in('student_id', loadedStudents.map(s => s.id));

      if (gradesError) throw gradesError;

      const gradesMap: Record<string, GradeEntry> = {};
      gradesData.forEach((g: any) => {
        gradesMap[g.student_id] = {
          studentId: g.student_id,
          percentage: g.percentage,
          grade: g.grade,
          comments: g.comments || '',
          status: g.status || 'Draft',
          isDirty: false
        };
      });

      // Initialize missing grades
      loadedStudents.forEach(s => {
        if (!gradesMap[s.id]) {
          gradesMap[s.id] = {
            studentId: s.id,
            percentage: '',
            grade: '-',
            comments: '',
            status: 'Draft',
            isDirty: false // Not dirty until edited
          };
        }
      });

      setGrades(gradesMap);

    } catch (error: any) {
      console.error('Error loading gradebook:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setFetchingStudents(false);
    }
  };

  const getScale = (percentage: number) => {
    return gradingScales.find(s => percentage >= s.min_percentage && percentage <= s.max_percentage);
  };

  const calculateGrade = (percentage: number) => {
    const scale = getScale(percentage);
    return scale ? scale.grade : '-';
  };

  const handleGradeChange = (studentId: string, field: keyof GradeEntry, value: any) => {
    setGrades(prev => {
      const entry = { ...prev[studentId] };

      if (field === 'percentage') {
        if (value === '') {
          entry.percentage = '';
          entry.grade = '-';
          entry.comments = '';
        } else {
          const pct = parseFloat(value) || 0;
          entry.percentage = pct;
          const scale = getScale(pct);
          entry.grade = scale ? scale.grade : '-';
          entry.comments = scale?.description || '';
        }
      } else {
        (entry as any)[field] = value;
      }

      entry.isDirty = true;
      return { ...prev, [studentId]: entry };
    });
  };



  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/school/results/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          classId: selectedClass,
          subjectId: selectedSubject,
          term: selectedTerm,
          academicYear: selectedYear
        })
      });

      if (!response.ok) throw new Error('Failed to submit results');

      const data = await response.json();
      toast({ title: "Success", description: `Submitted ${data.count} grades successfully` });
      setIsSubmitModalOpen(false);
      loadGradebookData(); // Reload to update status

    } catch (error: any) {
      console.error('Submit error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gradebook</h2>
          <p className="text-slate-600 dark:text-slate-400">Enter and manage student grades.</p>
        </div>
        <div className="flex gap-2 items-center">
          {saving && <span className="text-sm text-muted-foreground animate-pulse">Saving...</span>}
          {!saving && lastSaved && <span className="text-xs text-muted-foreground">Saved {lastSaved.toLocaleTimeString()}</span>}
          <Button variant="outline" onClick={() => handleSaveAll(false)} disabled={loading || saving}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Now
          </Button>
          <Button onClick={() => setIsSubmitModalOpen(true)} disabled={loading || !selectedClass || !selectedSubject}>
            <Send className="h-4 w-4 mr-2" />
            Submit Results
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select class and subject to enter grades.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Term 3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
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
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Submitting Results */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="h-6 w-6" />
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Submit Results?</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Are you sure you want to submit these grades? This will send them to the school administration for review and calculation.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsSubmitModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Confirm Submission
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {selectedClass && selectedSubject ? (
        <Card>
          <CardContent className="p-0">
            {fetchingStudents ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : students.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Student Name</TableHead>
                    <TableHead>Percentage (%)</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="w-[300px]">Comments</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(student => {
                    const entry: GradeEntry = grades[student.id] || {
                      studentId: student.id,
                      percentage: '',
                      grade: '-',
                      comments: '',
                      status: 'Draft',
                      isDirty: false
                    };
                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="font-medium">{student.fullName}</div>
                          <div className="text-xs text-muted-foreground">{student.studentNumber}</div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            className="w-24"
                            value={entry.percentage}
                            onChange={(e) => handleGradeChange(student.id, 'percentage', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.grade === 'F' || entry.grade === '9' ? 'destructive' : 'secondary'}>
                            {entry.grade}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Add comments..."
                            value={entry.comments}
                            onChange={(e) => handleGradeChange(student.id, 'comments', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            {(() => {
                              // If it's dirty, or blank but not saved, show Draft.
                              let displayStatus = entry.status;
                              if (entry.isDirty) displayStatus = 'Draft';
                              else if (displayStatus !== 'Published' && displayStatus !== 'Submitted' && entry.percentage === '') displayStatus = 'Absent';

                              switch (displayStatus) {
                                case 'Published':
                                  return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Published</Badge>;
                                case 'Submitted':
                                  return <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">Submitted</Badge>;
                                case 'Absent':
                                  return <Badge variant="destructive">Absent</Badge>;
                                default:
                                  return <Badge variant="outline">Draft</Badge>;
                              }
                            })()}
                            {entry.isDirty && <span className="text-xs text-amber-500 italic">Unsaved edits</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <ReportCardPreview
                                studentId={student.id}
                                term={selectedTerm}
                                academicYear={selectedYear}
                              />
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No students found in this class.
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/50">
          <Filter className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Select Class and Subject</h3>
          <p className="text-muted-foreground">Please select a class and subject to start entering grades.</p>
        </div>
      )}
    </div>
  );
}
