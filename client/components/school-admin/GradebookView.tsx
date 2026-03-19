
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
import { syncFetch } from '@/lib/syncService';
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
  const [selectedExamType, setSelectedExamType] = useState<string>('End of Term');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [availableExamTypes, setAvailableExamTypes] = useState<string[]>(['Mid Term', 'End of Term']);

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
        const settings = await syncFetch('/api/school/settings', { 
          headers,
          cacheKey: 'school-settings'
        });
        
        if (settings) {
          setSelectedTerm(settings.current_term || 'Term 1');
          setSelectedYear(settings.academic_year || new Date().getFullYear().toString());
          if (settings.exam_types && settings.exam_types.length > 0) {
            setAvailableExamTypes(settings.exam_types);
            setSelectedExamType(settings.exam_types[0]);
          }
        } else {
          // Fallback
          setSelectedTerm('Term 1');
          setSelectedYear(new Date().getFullYear().toString());
        }

        const [classesData, subjectsData, scalesData] = await Promise.all([
          syncFetch('/api/school/classes', { headers, cacheKey: 'school-classes-list' }),
          syncFetch('/api/school/subjects', { headers, cacheKey: 'school-subjects-list' }),
          syncFetch('/api/school/grading-scales', { headers, cacheKey: 'school-grading-scales' })
        ]);

        if (classesData) setClasses(classesData?.data || classesData);
        if (subjectsData) setSubjects(subjectsData);
        if (scalesData) setGradingScales(scalesData);

      } catch (error) {
        console.error('Error loading metadata:', error);
        toast({ title: "Error", description: "Failed to load metadata", variant: "destructive" });
      }
    };
    loadMetadata();
  }, []);

  // Load students and existing grades when selection changes
  useEffect(() => {
    if (selectedClass && selectedSubject && selectedTerm && selectedExamType && selectedYear) {
      loadGradebookData();
    }
  }, [selectedClass, selectedSubject, selectedTerm, selectedExamType, selectedYear]);



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
          examType: selectedExamType,
          academicYear: selectedYear,
          percentage: g.percentage === '' ? 0 : g.percentage,
          comments: g.comments
        }))
      };

      const result = await syncFetch('/api/school/grades/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (result.offline) {
        if (!autoSave) {
          toast({ 
            title: "Offline Mode", 
            description: "Changes queued and will sync when online." 
          });
        }
      } else if (!autoSave) {
        toast({ title: "Success", description: "Grades saved successfully" });
      }

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
      const loadedStudents = await syncFetch(`/api/school/classes/${selectedClass}/students?year=${selectedYear}`, { 
        headers,
        cacheKey: `school-class-students-${selectedClass}-${selectedYear}`
      });

      if (!loadedStudents) throw new Error('Failed to fetch students');
      setStudents(loadedStudents);

      // 2. Fetch Existing Grades via new API endpoint for better offline support
      const studentIdsStr = loadedStudents.map((s: any) => s.id).join(',');
      const gradesData = await syncFetch(`/api/school/grades/batch?subjectId=${selectedSubject}&term=${encodeURIComponent(selectedTerm)}&examType=${encodeURIComponent(selectedExamType)}&academicYear=${selectedYear}&studentIds=${studentIdsStr}`, {
        headers,
        cacheKey: `school-gradebook-${selectedClass}-${selectedSubject}-${selectedTerm}-${selectedExamType}-${selectedYear}`
      });

      const gradesMap: Record<string, GradeEntry> = {};
      
      // Initialize with empty entries for all students
      loadedStudents.forEach((s: any) => {
        gradesMap[s.id] = {
          studentId: s.id,
          percentage: '',
          grade: '-',
          comments: '',
          status: 'Draft',
          isDirty: false
        };
      });

      // Fill in actual grades if they exist
      if (gradesData && Array.isArray(gradesData)) {
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
      }
      
      setGrades(gradesMap);

    } catch (error: any) {
      console.error('Error loading gradebook data:', error);
      
      if (error.message?.includes('No connection and no cached data available')) {
        toast({ 
          title: "Offline Mode", 
          description: "No cached data for this selection. Please connect to load.",
          variant: "destructive" 
        });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
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

      const result = await syncFetch('/api/school/results/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          classId: selectedClass,
          subjectId: selectedSubject,
          term: selectedTerm,
          examType: selectedExamType,
          academicYear: selectedYear
        })
      });

      if (result.offline) {
        toast({ 
          title: "Offline Mode", 
          description: "Submission queued and will sync when online." 
        });
      } else {
        toast({ title: "Success", description: `Submitted ${result.count} grades successfully` });
      }

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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Gradebook</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Enter and manage student grades.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex items-center justify-between sm:justify-end gap-2 px-1">
            {saving && <span className="text-[10px] sm:text-sm text-muted-foreground animate-pulse">Saving...</span>}
            {!saving && lastSaved && <span className="text-[10px] sm:text-xs text-muted-foreground">Saved {lastSaved.toLocaleTimeString()}</span>}
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleSaveAll(false)} disabled={loading || saving} className="w-full sm:w-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Now
            </Button>
            <Button size="sm" onClick={() => setIsSubmitModalOpen(true)} disabled={loading || !selectedClass || !selectedSubject} className="w-full sm:w-auto">
              <Send className="h-4 w-4 mr-2" />
              Submit Results
            </Button>
          </div>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Select class and subject to enter grades.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
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
              <Label>Assessment Type</Label>
              <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {availableExamTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
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
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {fetchingStudents ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : students.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px] sm:w-[200px] text-xs font-bold uppercase tracking-wider">Student Name</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Percentage (%)</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Grade</TableHead>
                      <TableHead className="min-w-[200px] sm:w-[300px] text-xs font-bold uppercase tracking-wider">Comments</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
                      <TableHead className="w-[80px] sm:w-[100px] text-right text-xs font-bold uppercase tracking-wider">View</TableHead>
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
                        <TableRow key={student.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                          <TableCell className="py-3 sm:py-4">
                            <div className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{student.fullName}</div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground font-mono uppercase tracking-tight">{student.studentNumber}</div>
                          </TableCell>
                          <TableCell className="py-3 sm:py-4">
                            <div className="relative max-w-[80px] sm:max-w-[100px]">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                className="h-9 text-center font-bold focus:ring-2 focus:ring-blue-500/20"
                                value={entry.percentage}
                                onChange={(e) => handleGradeChange(student.id, 'percentage', e.target.value)}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="py-3 sm:py-4">
                            <Badge 
                              variant={entry.grade === 'F' || entry.grade === '9' ? 'destructive' : 'secondary'}
                              className="font-bold min-w-[30px] justify-center"
                            >
                              {entry.grade}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 sm:py-4">
                            <Input
                              placeholder="Add comments..."
                              className="h-9 text-xs sm:text-sm bg-slate-50/50 focus:bg-white"
                              value={entry.comments}
                              onChange={(e) => handleGradeChange(student.id, 'comments', e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="py-3 sm:py-4">
                            <div className="flex flex-col gap-1 items-start">
                              {(() => {
                                // If it's dirty, or blank but not saved, show Draft.
                                let displayStatus = entry.status;
                                if (entry.isDirty) displayStatus = 'Draft';
                                else if (displayStatus !== 'Published' && displayStatus !== 'Submitted' && entry.percentage === '') displayStatus = 'Absent';

                                switch (displayStatus) {
                                  case 'Published':
                                    return <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-[10px] h-5">Published</Badge>;
                                  case 'Submitted':
                                    return <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-[10px] h-5">Submitted</Badge>;
                                  case 'Absent':
                                    return <Badge variant="destructive" className="text-[10px] h-5">Absent</Badge>;
                                  default:
                                    return <Badge variant="outline" className="text-[10px] h-5">Draft</Badge>;
                                }
                              })()}
                              {entry.isDirty && <span className="text-[10px] text-amber-500 font-medium italic animate-pulse">Unsaved</span>}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 sm:py-4 text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                  <Eye className="h-4 w-4 text-blue-600" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 sm:p-6">
                                <ReportCardPreview
                                  studentId={student.id}
                                  term={selectedTerm}
                                  examType={selectedExamType}
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
              </div>
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
