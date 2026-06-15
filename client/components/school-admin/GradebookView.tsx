
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Save,
  Send,
  Download,
  Loader2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  Users,
  ArrowRightLeft,
  Trash2
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from '@/lib/supabase';
import { syncFetch } from '@/lib/syncService';
import { getProfileSchoolId, schoolCacheKey, filterBySchoolId } from '@/lib/schoolScope';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import ReportCardPreview from './ReportCardPreview';
import {
  resolveGradingScale,
  rawMarkToStoredPercentage,
  storedPercentageToRawMark,
  type GradingScaleEntry,
} from '@shared/gradingScale';

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

type GradingScale = GradingScaleEntry;

// ─── Class-Level Detection Utility ────────────────────────────────────────────
// Returns 'lower_primary' (Grades 1-4), 'upper_primary' (Grades 5-7), or
// 'secondary' (Form / Grades 8-12) from any class name a school may use.
// Handles: "Form 1", "FORM ONE", "form one", "Grade 9", "grade9", "G9",
//          "Std 5", "Standard 4", "Class 3", "Year 2", etc.
function detectClassSection(className: string): 'lower_primary' | 'upper_primary' | 'secondary' {
  const raw = className.toLowerCase().trim();

  // Word-number map for written-out ordinals/cardinals
  const wordToNum: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12,
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
    sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  };

  // ----- Step 1: detect explicit "form" keyword → always secondary -----
  if (raw.includes('form')) return 'secondary';

  // ----- Step 2: extract numeric level -----
  let level: number | null = null;

  // Try digit first (e.g. "Grade 9", "grade9", "G9", "Std 5", "Class 12", "5A")
  const digitMatch = raw.match(/(\d{1,2})/);
  if (digitMatch) {
    level = parseInt(digitMatch[1], 10);
  } else {
    // If no digit found, try written-out number
    for (const [word, num] of Object.entries(wordToNum)) {
      if (new RegExp(`\\b${word}\\b`).test(raw)) {
        level = num;
        break;
      }
    }
  }

  // ----- Step 3: map level to section -----
  if (level !== null) {
    if (level >= 8) return 'secondary';        // Grades 8-12
    if (level >= 5) return 'upper_primary';    // Grades 5-7
    if (level >= 1) return 'lower_primary';    // Grades 1-4
  }

  // Default: treat as secondary if we can't determine
  return 'secondary';
}

/** Radix Select forbids SelectItem values of "" — filter bad options at the source. */
function sanitizeSelectStrings(items: string[]): string[] {
  return items.filter((item) => typeof item === 'string' && item.trim() !== '');
}

export default function GradebookView() {
  const { toast } = useToast();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);
  const [schoolType, setSchoolType] = useState<string>('');
  const [errorStudentId, setErrorStudentId] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const lastRoundingToastTime = useRef<number>(0);

  const defaultState = location.state as {
    defaultClassId?: string;
    defaultSubjectId?: string;
    defaultExamType?: string;
    defaultTerm?: string;
    defaultYear?: string;
  } || {};

  // Selection State
  const [selectedClass, setSelectedClass] = useState<string>(defaultState.defaultClassId || '');
  const [selectedSubject, setSelectedSubject] = useState<string>(defaultState.defaultSubjectId || '');
  const [selectedTerm, setSelectedTerm] = useState<string>(defaultState.defaultTerm || '');
  const [selectedExamType, setSelectedExamType] = useState<string>(defaultState.defaultExamType || 'End of Term');
  const [selectedTestType, setSelectedTestType] = useState<string>(() => {
    const month = new Date().getMonth(); // 0 = Jan, 11 = Dec
    if (month >= 0 && month <= 4) return 'Test 1';
    if (month >= 5 && month <= 7) return 'Test 2';
    return 'Test 3';
  });
  const [selectedYear, setSelectedYear] = useState<string>(defaultState.defaultYear || '');
  const [availableExamTypes, setAvailableExamTypes] = useState<string[]>(['Mid Term', 'End of Term']);
  const [schoolTestTypes, setSchoolTestTypes] = useState<string[]>([]);
  const [testTypesEnabled, setTestTypesEnabled] = useState<boolean>(false);
  const [simplifiedAssessmentMode, setSimplifiedAssessmentMode] = useState<boolean>(false);

  const validExamTypes = useMemo(
    () => sanitizeSelectStrings(availableExamTypes),
    [availableExamTypes],
  );
  const validTestTypes = useMemo(
    () => sanitizeSelectStrings(schoolTestTypes),
    [schoolTestTypes],
  );
  const validClasses = useMemo(
    () => classes.filter((c) => c.id?.trim()),
    [classes],
  );
  const validSubjects = useMemo(
    () => subjects.filter((s) => s.id?.trim()),
    [subjects],
  );

  // Determine class section using intelligent detection based on school settings + class name
  const currentClassObj = classes.find(c => c.id === selectedClass);
  const type = (schoolType || "").toLowerCase();

  // School-type overrides: if explicitly set to a single-level type, trust it
  const isExplicitlyLowerPrimary = type === "lower primary";
  const isExplicitlyUpperPrimary = type === "upper primary";
  const isExplicitlySecondary    = type === "secondary school" || type === "secondary";

  // Detect section from class name (handles any naming convention)
  const detectedSection = currentClassObj ? detectClassSection(currentClassObj.name) : 'secondary';

  // Final section resolution:
  // 1. Explicit school-type overrides win outright (single-section schools)
  // 2. For multi-section schools (combined/basic), use per-class detection
  // 3. Default: class-name detection
  const classSection: 'lower_primary' | 'upper_primary' | 'secondary' =
    isExplicitlyLowerPrimary ? 'lower_primary' :
    isExplicitlyUpperPrimary ? 'upper_primary' :
    isExplicitlySecondary    ? 'secondary' :
    detectedSection;  // covers combined, basic, and unknown types

  // Max marks: upper_primary G5-7 = 150, everything else = 100
  const maxAllowed = classSection === 'upper_primary' ? 150 : 100;

  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Record<string, GradeEntry>>({});
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load initial metadata
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const headers = { 'Authorization': `Bearer ${session.access_token}` };
        const schoolId = await getProfileSchoolId();

        // Fetch school settings first for defaults
        const settings = await syncFetch('/api/school/settings', { 
          headers,
          cacheKey: schoolCacheKey('school-settings', schoolId)
        });
        
        if (settings) {
          setSchoolType(settings.school_type || '');
          const testTypes = sanitizeSelectStrings(settings.test_types || []);
          setSchoolTestTypes(testTypes);
          setTestTypesEnabled(!!settings.test_types_enabled);
          const isSimplified = !!settings.simplified_assessment_mode;
          setSimplifiedAssessmentMode(isSimplified);

          if (testTypes.length > 0) {
            const month = new Date().getMonth();
            let initialTest = testTypes[0];
            if (month >= 0 && month <= 4) {
              initialTest = testTypes[0];
            } else if (month >= 5 && month <= 7) {
              initialTest = testTypes[1] || testTypes[0];
            } else {
              initialTest = testTypes[2] || testTypes[1] || testTypes[0];
            }
            setSelectedTestType(initialTest);
          }

          if (!defaultState.defaultTerm) setSelectedTerm(settings.current_term || 'Term 1');
          if (!defaultState.defaultYear) setSelectedYear(settings.academic_year || new Date().getFullYear().toString());
          
          if (isSimplified) {
            setSelectedExamType('Term');
          } else {
            const examTypes = sanitizeSelectStrings(settings.exam_types || []);
            if (examTypes.length > 0) {
              setAvailableExamTypes(examTypes);
              if (!defaultState.defaultExamType) {
                setSelectedExamType(
                  examTypes.includes('End of Term') ? 'End of Term' : examTypes[0],
                );
              }
            }
          }
        } else {
          // Fallback
          setSchoolType('');
          setSchoolTestTypes([]);
          setTestTypesEnabled(false);
          if (!defaultState.defaultTerm) setSelectedTerm('Term 1');
          if (!defaultState.defaultYear) setSelectedYear(new Date().getFullYear().toString());
        }

        const [classesData, subjectsData, scalesData] = await Promise.all([
          syncFetch('/api/school/classes', { headers, cacheKey: schoolCacheKey('school-classes-list', schoolId) }),
          syncFetch('/api/school/subjects', { headers, cacheKey: schoolCacheKey('school-subjects-list', schoolId) }),
          syncFetch('/api/school/grading-scales', { headers, cacheKey: schoolCacheKey('school-grading-scales', schoolId) })
        ]);

        if (classesData) setClasses(classesData?.data || classesData);
        if (subjectsData) setSubjects(subjectsData);
        if (scalesData) setGradingScales(filterBySchoolId(scalesData, schoolId ?? settings?.id));

      } catch (error) {
        console.error('Error loading metadata:', error);
        toast({ title: "Error", description: "Failed to load metadata", variant: "destructive" });
      }
    };
    loadMetadata();
  }, []);

  // Intelligent month-based auto-selection of test type
  useEffect(() => {
    if (!simplifiedAssessmentMode && !testTypesEnabled) return;
    
    const testTypesList = schoolTestTypes.length > 0 ? schoolTestTypes : ['Test 1', 'Test 2', 'Test 3'];
    const month = new Date().getMonth(); // 0 = Jan, 11 = Dec
    let targetTest = testTypesList[0];
    if (month >= 0 && month <= 4) { // Jan to May
      targetTest = testTypesList[0];
    } else if (month >= 5 && month <= 7) { // Jun to Aug
      targetTest = testTypesList[1] || testTypesList[0];
    } else { // Sep to Dec
      targetTest = testTypesList[2] || testTypesList[1] || testTypesList[0];
    }
    
    if (targetTest && selectedTestType !== targetTest) {
      setSelectedTestType(targetTest);
    }
  }, [selectedClass, selectedSubject, selectedTerm, selectedYear, simplifiedAssessmentMode, testTypesEnabled, schoolTestTypes]);

  // Load students and existing grades when selection changes
  useEffect(() => {
    if (selectedClass && selectedSubject && selectedTerm && selectedExamType && selectedYear) {
      loadGradebookData();
    }
  }, [selectedClass, selectedSubject, selectedTerm, selectedExamType, selectedTestType, selectedYear]);



  const handleSaveAll = async (autoSave = false) => {
    const dirtyGrades = Object.values(grades).filter(g => g.isDirty);
    if (dirtyGrades.length === 0) {
      if (!autoSave) toast({ title: "No changes", description: "No grades have been modified." });
      return;
    }

    // Block saving if any grade is invalid (> maxAllowed)
    const hasInvalidGrades = Object.values(grades).some(g => g.percentage !== '' && Number(g.percentage) > maxAllowed);
    if (hasInvalidGrades) {
      if (!autoSave) {
        toast({
          title: "Cannot Save Grades",
          description: `Please correct the marks. For this class, marks cannot exceed ${maxAllowed}.`,
          variant: "destructive"
        });
      }
      return;
    }

    if (autoSave) setSaving(true);
    else setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const payload = {
        className: currentClassObj?.name || '',
        schoolType: schoolType || '',
        grades: dirtyGrades.map(g => {
          const rawVal = g.percentage === '' ? null : Number(g.percentage);
          const pctVal = rawVal !== null
            ? rawMarkToStoredPercentage(rawVal, classSection)
            : null;
          return {
            studentId: g.studentId,
            subjectId: selectedSubject,
            term: selectedTerm,
            examType: selectedExamType,
            testType: selectedTestType === 'none' ? '' : selectedTestType,
            academicYear: selectedYear,
            percentage: pctVal,
            comments: g.comments || (g.percentage === '' ? 'Absent' : ''),
          };
        }),
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
          if (next[g.studentId]) {
            next[g.studentId].isDirty = false;
            // Ensure status isn't reverted to Draft immediately if they were just saving existing records
          }
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

  const handleClearGrades = async () => {
    if (!selectedClass || !selectedSubject || !selectedTerm || !selectedExamType || !selectedYear) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const result = await syncFetch('/api/school/grades/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          term: selectedTerm,
          examType: selectedExamType,
          academicYear: selectedYear,
          classId: selectedClass,
          subjectId: selectedSubject
        })
      });

      if (result.offline) {
        toast({ title: "Offline Mode", description: "Grade clearing queued for sync." });
      } else {
        toast({ title: "Success", description: result.message || "Grades cleared successfully" });
      }
      setIsClearModalOpen(false);
      // Reload gradebook
      loadGradebookData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
      const finalTestType = selectedTestType === 'none' ? '' : selectedTestType;
      const gradesData = await syncFetch(`/api/school/grades/batch?subjectId=${selectedSubject}&term=${encodeURIComponent(selectedTerm)}&examType=${encodeURIComponent(selectedExamType)}&testType=${encodeURIComponent(finalTestType)}&academicYear=${selectedYear}&studentIds=${studentIdsStr}`, {
        headers,
        cacheKey: `school-gradebook-${selectedClass}-${selectedSubject}-${selectedTerm}-${selectedExamType}-${finalTestType}-${selectedYear}`
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
          let displayPercentage: number | '' = '';
          if (g.grade !== 'ABSENT' && g.percentage !== null && g.percentage !== undefined && g.percentage !== '') {
            const pctVal = Number(g.percentage);
            displayPercentage = storedPercentageToRawMark(pctVal, classSection);
          }
          gradesMap[g.student_id] = {
            studentId: g.student_id,
            percentage: displayPercentage,
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

  const getScale = (rawMark: number) =>
    resolveGradingScale(gradingScales, classSection, { rawMark });

  const calculateGrade = (rawMark: number) => {
    const scale = getScale(rawMark);
    return scale ? scale.grade : '-';
  };

  const handleGradeChange = (studentId: string, field: keyof GradeEntry, value: any) => {
    if (field === 'percentage' && value !== '') {
      const floatVal = parseFloat(value);
      if (!isNaN(floatVal) && floatVal % 1 !== 0) {
        const now = Date.now();
        if (now - lastRoundingToastTime.current > 4000) {
          toast({
            title: "Mark Rounded",
            description: "Decimal scores are automatically rounded to the nearest integer.",
          });
          lastRoundingToastTime.current = now;
        }
      }
    }

    setGrades(prev => {
      const entry = { ...prev[studentId] };

      if (field === 'percentage') {
        if (value === '') {
          entry.percentage = '';
          entry.grade = '-';
          entry.comments = '';
        } else {
          // Dynamic validation based on grade group (maxAllowed defined in scope)
          let pct = Math.round(parseFloat(value));
          
          if (isNaN(pct)) pct = 0;
          if (pct < 0) pct = 0;

          if (pct > maxAllowed) {
            setErrorStudentId(studentId);
            toast({ 
              title: "Double Check Mark", 
              description: `Marks above ${maxAllowed} are not accepted. Please verify the input.`, 
              variant: "destructive" 
            });
            // Focus back immediately
            setTimeout(() => {
              inputRefs.current[studentId]?.focus();
              inputRefs.current[studentId]?.select();
            }, 0);
          } else if (studentId === errorStudentId) {
            setErrorStudentId(null);
          }
          
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
  const [isMigrateModalOpen, setIsMigrateModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [targetExamType, setTargetExamType] = useState<string>('');

  const handleSubmit = async () => {
    // Block submission if any grade is invalid (> maxAllowed)
    const hasInvalidGrades = Object.values(grades).some(g => g.percentage !== '' && Number(g.percentage) > maxAllowed);
    if (hasInvalidGrades) {
      toast({
        title: "Cannot Submit Grades",
        description: `Please correct the marks. For this class, marks cannot exceed ${maxAllowed}.`,
        variant: "destructive"
      });
      setIsSubmitModalOpen(false);
      return;
    }

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

  const handleMigrate = async () => {
    if (!selectedClass || !selectedSubject || !selectedTerm || !selectedExamType || !selectedYear || !targetExamType) return;
    if (selectedExamType === targetExamType) {
      toast({ title: "Error", description: "Source and destination assessment types must be different", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await syncFetch('/api/school/grades/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          term: selectedTerm,
          fromExamType: selectedExamType,
          toExamType: targetExamType,
          academicYear: selectedYear,
          classId: selectedClass,
          subjectId: selectedSubject
        })
      });

      toast({ title: "Success", description: `Grades moved to ${targetExamType} successfully` });
      setIsMigrateModalOpen(false);
      setTargetExamType('');
      // Switch the view to the new target assessment to show them
      setSelectedExamType(targetExamType);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-0">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-4 px-4 sm:mx-0 sm:px-0 py-3 sm:py-4 border-b mb-2 sm:mb-4 transition-all duration-200">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="hidden sm:block">
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">Gradebook</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Enter and manage student grades.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto">
              <div className="flex items-center justify-between sm:hidden w-full mb-1">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Session</span>
                </div>
                <div className="flex items-center gap-2">
                  {saving && <span className="text-[10px] text-muted-foreground animate-pulse">Saving...</span>}
                  {!saving && lastSaved && <span className="text-[10px] text-muted-foreground">{lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                </div>
              </div>
              <div className="hidden sm:flex items-center justify-end gap-2 px-1">
                {saving && <span className="text-sm text-muted-foreground animate-pulse">Saving...</span>}
                {!saving && lastSaved && <span className="text-xs text-muted-foreground">Saved {lastSaved.toLocaleTimeString()}</span>}
              </div>
              <div className="flex flex-row flex-wrap sm:flex-nowrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsMigrateModalOpen(true)}
                  disabled={!selectedClass || !selectedSubject || !selectedTerm || students.length === 0}
                  className="flex-1 sm:flex-none h-11 sm:h-9 font-bold text-xs sm:text-xs px-2"
                >
                  <ArrowRightLeft className="h-4 w-4 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Move
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsClearModalOpen(true)}
                  disabled={!selectedClass || !selectedSubject || !selectedTerm || students.length === 0}
                  className="flex-1 sm:flex-none h-11 sm:h-9 font-bold text-xs sm:text-xs px-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 border-red-200"
                >
                  <Trash2 className="h-4 w-4 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Clear
                </Button>
                <div className="flex flex-1 sm:flex-none gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleSaveAll(false)} 
                    disabled={loading || saving} 
                    className="flex-1 sm:flex-none h-11 sm:h-9 font-bold text-xs sm:text-xs px-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" /> : <Save className="h-4 w-4 sm:h-4 sm:w-4 mr-1 sm:mr-2" />}
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setIsSubmitModalOpen(true)} 
                    disabled={loading || !selectedClass || !selectedSubject} 
                    className="flex-1 sm:flex-none h-11 sm:h-9 font-bold text-xs sm:text-xs px-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Submit
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Tabs and Search */}
          {selectedClass && selectedSubject && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] h-11 sm:h-9">
                  <TabsTrigger value="all" className="text-sm sm:text-sm font-bold">
                    All ({students.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="text-sm sm:text-sm font-bold">
                    Pending ({students.filter(s => !grades[s.id] || grades[s.id].percentage === '').length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search student..."
                  className="pl-10 h-11 sm:h-9 text-sm sm:text-sm bg-white dark:bg-slate-900 border-slate-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold">Filters</CardTitle>
              <CardDescription className="text-[10px] sm:text-sm">Select class and subject to enter grades.</CardDescription>
            </div>
            <Badge variant="outline" className="sm:hidden bg-slate-50 text-[10px]">
              {selectedYear} {selectedTerm}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className={cn("grid grid-cols-2 gap-2 sm:gap-4", validTestTypes.length > 0 && testTypesEnabled && (selectedExamType === 'Mid Term' || selectedExamType === 'End of Term') ? "md:grid-cols-3 lg:grid-cols-6" : "md:grid-cols-5")}>
            <div className="space-y-1">
              <Label className="hidden sm:block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-11 sm:h-9 text-sm sm:text-sm">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="hidden sm:block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="h-11 sm:h-9 text-sm sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Term 3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!simplifiedAssessmentMode && (
              <div className="space-y-1">
                <Label className="hidden sm:block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Assessment</Label>
                <Select value={selectedExamType} onValueChange={(val) => {
                  setSelectedExamType(val);
                  const month = new Date().getMonth();
                  const list = schoolTestTypes.length > 0 ? schoolTestTypes : ['Test 1', 'Test 2', 'Test 3'];
                  let targetTest = list[0];
                  if (month >= 0 && month <= 4) targetTest = list[0];
                  else if (month >= 5 && month <= 7) targetTest = list[1] || list[0];
                  else targetTest = list[2] || list[1] || list[0];
                  setSelectedTestType(targetTest);
                }}>
                  <SelectTrigger className="h-11 sm:h-9 text-sm sm:text-sm">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {validExamTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {validTestTypes.length > 0 && (testTypesEnabled || simplifiedAssessmentMode) && (selectedExamType === 'Mid Term' || selectedExamType === 'End of Term' || selectedExamType === 'Term') && (
              <div className="space-y-1">
                <Label className="hidden sm:block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Test Type</Label>
                <Select value={selectedTestType} onValueChange={setSelectedTestType}>
                  <SelectTrigger className="h-11 sm:h-9 text-sm sm:text-sm">
                    <SelectValue placeholder="Select test type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {validTestTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label className="hidden sm:block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="h-11 sm:h-9 text-sm sm:text-sm">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  {validClasses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2 md:col-span-1">
              <Label className="hidden sm:block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-11 sm:h-9 text-sm sm:text-sm">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  {validSubjects.map(s => (
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
        <DialogContent className="sm:max-w-[425px]">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Submit Results?</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to submit these grades? This will send them to the school administration for review and calculation.
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsSubmitModalOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Confirm Submission
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Migration Dialog */}
      <Dialog open={isMigrateModalOpen} onOpenChange={setIsMigrateModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                <ArrowRightLeft className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Move Grades?</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Move all grades currently visible under <strong>{selectedExamType}</strong> to a different assessment type.
            </p>
            <div className="space-y-2 pt-2">
              <Label>Destination Assessment Type</Label>
              <Select value={targetExamType} onValueChange={setTargetExamType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination..." />
                </SelectTrigger>
                <SelectContent>
                  {validExamTypes.filter(t => t !== selectedExamType).map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsMigrateModalOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={handleMigrate} disabled={loading || !targetExamType} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}
                Confirm Move
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Grades Dialog */}
      <Dialog open={isClearModalOpen} onOpenChange={setIsClearModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Clear Grades?</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to permanently delete all grades for <strong>{selectedExamType}</strong> in this subject? 
              This action cannot be undone, and it will also reverse any "Submitted" or "Published" statuses.
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsClearModalOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={handleClearGrades} disabled={loading} className="w-full sm:w-auto bg-red-600 hover:bg-red-700">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Confirm Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedClass && selectedSubject ? (
        <Card className="shadow-sm overflow-hidden border-slate-200 dark:border-slate-800">
          <CardContent className="p-0">
            {fetchingStudents ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-slate-500 animate-pulse font-medium">Loading roster...</p>
              </div>
            ) : students.length > 0 ? (
              <>
                {/* Desktop View Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                      <TableRow>
                        <TableHead className="w-[200px] text-[10px] font-bold uppercase tracking-wider text-slate-500">Student Name</TableHead>
                        <TableHead className="w-[120px] text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Percentage (%)</TableHead>
                        <TableHead className="w-[80px] text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Grade</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Grade Description</TableHead>
                        <TableHead className="w-[120px] text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                        <TableHead className="w-[60px] text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students
                        .filter(student => {
                          const matchesSearch = student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                              student.studentNumber.toLowerCase().includes(searchQuery.toLowerCase());
                          
                          if (!matchesSearch) return false;

                          if (activeTab === 'pending') {
                            const entry = grades[student.id];
                            return !entry || entry.percentage === '';
                          }
                          return true;
                        })
                        .map(student => {
                          const entry: GradeEntry = grades[student.id] || {
                            studentId: student.id,
                            percentage: '',
                            grade: '-',
                            comments: '',
                            status: 'Draft',
                            isDirty: false
                          };
                          const isBlocked = errorStudentId !== null && errorStudentId !== student.id;
                          return (
                            <TableRow key={student.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                              <TableCell className="py-4">
                                <div className="font-bold text-slate-900 dark:text-white text-sm">{student.fullName}</div>
                                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-tight">{student.studentNumber}</div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex flex-col items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={maxAllowed}
                                    disabled={isBlocked}
                                    ref={el => { inputRefs.current[student.id] = el; }}
                                    onBlur={(e) => {
                                      if (errorStudentId === student.id) {
                                        e.preventDefault();
                                        setTimeout(() => {
                                          inputRefs.current[student.id]?.focus();
                                          inputRefs.current[student.id]?.select();
                                        }, 0);
                                      }
                                    }}
                                    className={cn(
                                      "h-9 w-20 text-center font-bold focus:ring-2 border-slate-200 dark:border-slate-700 transition-all duration-200",
                                      entry.percentage !== '' && Number(entry.percentage) > maxAllowed 
                                        ? "border-red-500 focus:ring-red-500/20 text-red-600 bg-red-50 dark:bg-red-950/20 shadow-[0_0_0_2px_rgba(239,68,68,0.2)] font-black animate-pulse"
                                        : "focus:ring-blue-500/20"
                                    )}
                                    value={entry.percentage}
                                    onChange={(e) => handleGradeChange(student.id, 'percentage', e.target.value)}
                                  />
                                  {entry.percentage !== '' && Number(entry.percentage) > maxAllowed && (
                                    <span className="text-[9px] font-bold text-red-600">Max {maxAllowed}%</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-4 text-center">
                                <Badge 
                                  variant={entry.grade === 'F' || entry.grade === '9' ? 'destructive' : 'secondary'}
                                  className="font-bold min-w-[30px] justify-center h-7"
                                >
                                  {entry.grade}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4 font-semibold text-slate-700 dark:text-slate-300 text-sm">
                                {entry.comments ? (
                                  <span className={cn(
                                    "transition-colors duration-200",
                                    entry.grade === 'F' || entry.grade === '9' ? "text-red-500 font-bold" : "text-slate-700 dark:text-slate-300"
                                  )}>
                                    {entry.comments}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-600 font-normal italic">
                                    Grade description...
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex flex-col gap-1 items-start">
                                  {(() => {
                                    let displayStatus = entry.status;
                                    if (entry.isDirty) displayStatus = 'Draft';
                                    else if (displayStatus !== 'Published' && displayStatus !== 'Submitted' && entry.percentage === '') displayStatus = 'Absent';

                                    switch (displayStatus) {
                                      case 'Published':
                                        return <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-[10px] h-5 px-1.5 font-bold">Published</Badge>;
                                      case 'Submitted':
                                        return <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-[10px] h-5 px-1.5 font-bold">Submitted</Badge>;
                                      case 'Absent':
                                        return <Badge variant="destructive" className="text-[10px] h-5 px-1.5 font-bold">Absent</Badge>;
                                      default:
                                        return <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-bold border-slate-300">Draft</Badge>;
                                    }
                                  })()}
                                  {entry.isDirty && <span className="text-[10px] text-amber-500 font-bold italic animate-pulse">Unsaved Changes</span>}
                                </div>
                              </TableCell>
                              <TableCell className="py-4 text-right">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={isBlocked} className="h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-900/20">
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

                {/* Mobile View Cards */}
                <div className="sm:hidden space-y-4 p-4 bg-slate-50 dark:bg-slate-900/50">
                  {students
                    .filter(student => {
                      const matchesSearch = student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                          student.studentNumber.toLowerCase().includes(searchQuery.toLowerCase());
                      
                      if (!matchesSearch) return false;

                      if (activeTab === 'pending') {
                        const entry = grades[student.id];
                        return !entry || entry.percentage === '';
                      }
                      return true;
                    })
                    .map(student => {
                      const entry: GradeEntry = grades[student.id] || {
                        studentId: student.id,
                        percentage: '',
                        grade: '-',
                        comments: '',
                        status: 'Draft',
                        isDirty: false
                      };
                      const isBlocked = errorStudentId !== null && errorStudentId !== student.id;
                      return (
                        <div key={student.id} className="p-5 space-y-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-black text-slate-900 dark:text-white text-lg leading-tight">{student.fullName}</div>
                              <div className="text-xs text-slate-500 font-mono uppercase mt-1 font-bold">{student.studentNumber}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={entry.grade === 'F' || entry.grade === '9' ? 'destructive' : 'secondary'}
                                className="font-black h-9 min-w-[40px] justify-center text-base"
                              >
                                {entry.grade}
                              </Badge>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" disabled={isBlocked} className="h-8 w-8 text-blue-600">
                                    <Eye className="h-5 w-5" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="p-0 max-h-[90vh] overflow-y-auto">
                                  <ReportCardPreview
                                    studentId={student.id}
                                    term={selectedTerm}
                                    examType={selectedExamType}
                                    academicYear={selectedYear}
                                  />
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>

                          <div className="grid grid-cols-12 gap-3 items-center">
                            <div className="col-span-5 space-y-1.5">
                              <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">Score (%)</Label>
                              <Input
                                type="number"
                                min="0"
                                max={maxAllowed}
                                disabled={isBlocked}
                                ref={el => { inputRefs.current[student.id] = el; }}
                                onBlur={(e) => {
                                  if (errorStudentId === student.id) {
                                    e.preventDefault();
                                    setTimeout(() => {
                                      inputRefs.current[student.id]?.focus();
                                      inputRefs.current[student.id]?.select();
                                    }, 0);
                                  }
                                }}
                                className={cn(
                                  "h-14 text-center font-black text-2xl border-slate-300 focus:ring-4 transition-all duration-200",
                                  entry.percentage !== '' && Number(entry.percentage) > maxAllowed 
                                    ? "border-red-500 focus:ring-red-500/20 text-red-600 bg-red-50 dark:bg-red-950/20 shadow-[0_0_0_2px_rgba(239,68,68,0.2)] animate-pulse"
                                    : "focus:ring-blue-500/20"
                                )}
                                value={entry.percentage}
                                onChange={(e) => handleGradeChange(student.id, 'percentage', e.target.value)}
                                onFocus={() => setIsInputFocused(true)}
                              />
                            </div>
                            <div className="col-span-7 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">Status</Label>
                                {entry.isDirty && <span className="text-[10px] text-amber-600 font-black uppercase animate-pulse">Unsaved</span>}
                              </div>
                              <div className="h-14 flex items-center bg-slate-50 dark:bg-slate-800/50 rounded-md px-4 border border-slate-300 dark:border-slate-800">
                                {(() => {
                                  let displayStatus = entry.status;
                                  if (entry.isDirty) displayStatus = 'Draft';
                                  else if (displayStatus !== 'Published' && displayStatus !== 'Submitted' && entry.percentage === '') displayStatus = 'Absent';

                                  switch (displayStatus) {
                                    case 'Published':
                                      return <div className="flex items-center gap-2 text-green-600 font-black text-sm uppercase"><CheckCircle2 className="h-4 w-4" /> Published</div>;
                                    case 'Submitted':
                                      return <div className="flex items-center gap-2 text-blue-600 font-black text-sm uppercase"><Send className="h-4 w-4" /> Submitted</div>;
                                    case 'Absent':
                                      return <div className="flex items-center gap-2 text-rose-600 font-black text-sm uppercase"><AlertCircle className="h-4 w-4" /> Absent</div>;
                                    default:
                                      return <div className="flex items-center gap-2 text-slate-500 font-black text-sm uppercase"><Filter className="h-4 w-4" /> Draft</div>;
                                  }
                                })()}
                              </div>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                </div>
              </>
            ) : (
              <div className="p-12 text-center flex flex-col items-center gap-4">
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full">
                  <Users className="h-10 w-10 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Empty Roster</h3>
                  <p className="text-sm text-slate-500">No students are currently enrolled in this class for the selected year.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 sm:p-20 border-2 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm mb-6">
            <Filter className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Select Class and Subject</h3>
          <p className="text-slate-500 text-center max-w-[280px] text-sm font-medium">Please select a class and subject from the filters above to start entering grades.</p>
        </div>
      )}
    </div>
  );
}
