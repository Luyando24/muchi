
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
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Printer,
  FileSpreadsheet,
  Building
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
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
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { syncFetch } from '@/lib/syncService';
import BulkAcademicImport from './BulkAcademicImport';
import { Combobox } from "@/components/ui/combobox";

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
  enrolledCount?: number;
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

interface Department {
  id: string;
  name: string;
  head_of_department_id?: string | null;
  head_of_department?: {
    id: string;
    full_name: string;
  } | null;
}

import TimetableManagement from './TimetableManagement';
import ResultPrinter from './ResultPrinter';

// Helper function to auto-generate subject codes
const generateSubjectCode = (name: string) => {
  if (!name) return '';
  const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = cleanName.split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return words.map(w => w[0]).join('').substring(0, 3).toUpperCase();
};

export default function AcademicManagement() {
  const [activeTab, setActiveTab] = useState('classes');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);
  const [gradingWeights, setGradingWeights] = useState<GradingWeight[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState<string | null>(null); // null | 'classes' | 'subjects' | 'departments'
  const { toast } = useToast();

  // Dialog States
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isEditSubjectOpen, setIsEditSubjectOpen] = useState(false);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isEditClassOpen, setIsEditClassOpen] = useState(false);
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [isEditDeptOpen, setIsEditDeptOpen] = useState(false);
  const [isAddScaleOpen, setIsAddScaleOpen] = useState(false);
  const [isEditScaleOpen, setIsEditScaleOpen] = useState(false);
  const [isAddWeightOpen, setIsAddWeightOpen] = useState(false);
  const [isEditWeightOpen, setIsEditWeightOpen] = useState(false);
  const [isManageSubjectsOpen, setIsManageSubjectsOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedClassSubjects, setSelectedClassSubjects] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);

  // Form Data
  const [subjectForm, setSubjectForm] = useState({ id: '', name: '', department: '', headTeacherId: '', code: '' });
  const [classForm, setClassForm] = useState({ id: '', name: '', level: '', room: '', capacity: 40, classTeacherId: '' });
  const [deptForm, setDeptForm] = useState({ id: '', name: '', head_of_department_id: '' });
  const [scaleForm, setScaleForm] = useState({ id: '', grade: '', min_percentage: 0, max_percentage: 100, description: '' });
  const [weightForm, setWeightForm] = useState({ id: '', assessment_type: '', weight_percentage: 0 });

  // Grade Calculation State
  const [calcForm, setCalcForm] = useState({ classId: 'all', subjectId: 'all', term: '', examType: 'End of Term', academicYear: new Date().getFullYear().toString(), skipCalculation: true });
  const [isCalculating, setIsCalculating] = useState(false);
  const [availableExamTypes, setAvailableExamTypes] = useState<string[]>(['Mid Term', 'End of Term']);
  const [gradeStatus, setGradeStatus] = useState<{ id: string, name: string, status: string, teacher: string }[]>([]);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // Unpublished Grades / Readiness Report State
  const [unpublishedGrades, setUnpublishedGrades] = useState<any[]>([]);
  const [isReadinessReportOpen, setIsReadinessReportOpen] = useState(false);
  const [isLoadingReadiness, setIsLoadingReadiness] = useState(false);

  // Allocation State
  const [allocationClassId, setAllocationClassId] = useState<string>('');
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [isLoadingAllocations, setIsLoadingAllocations] = useState(false);
  const [isAddAllocationOpen, setIsAddAllocationOpen] = useState(false);
  const [allocationForm, setAllocationForm] = useState({ subjectId: '', teacherId: '' });

  // Confirmation State
  const [confirmState, setConfirmState] = useState<{
    type: 'subject' | 'class' | 'scale' | 'weight' | 'publish' | 'department' | 'bulk-class' | 'bulk-subject' | 'bulk-department' | null;
    id?: string;
    message?: string;
    title?: string;
  }>({ type: null });
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Fetch Data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { 'Authorization': `Bearer ${session.access_token}` };

      const [subjectsData, classesData, teachersData, scalesData, weightsData, settingsData, departmentsData] = await Promise.all([
        syncFetch('/api/school/subjects', { headers, cacheKey: 'school-subjects-list' }),
        syncFetch('/api/school/classes?limit=500', { headers, cacheKey: 'school-classes-list-max' }),
        syncFetch('/api/school/teachers?limit=500', { headers, cacheKey: 'school-teachers-list-max' }),
        syncFetch('/api/school/grading-scales', { headers, cacheKey: 'school-grading-scales' }),
        syncFetch('/api/school/grading-weights', { headers, cacheKey: 'school-grading-weights' }),
        syncFetch('/api/school/settings', { headers, cacheKey: 'school-settings' }),
        syncFetch('/api/school/departments', { headers, cacheKey: 'school-departments' })
      ]);

      setSubjects(subjectsData);
      // Handle the PaginatedResponse shape for endpoints that were updated
      setClasses(classesData?.data || classesData);
      setTeachers(teachersData?.data || teachersData);
      setGradingScales(scalesData);
      setGradingWeights(weightsData);
      setDepartments(departmentsData || []);

      if (settingsData) {
        setSchoolSettings(settingsData);
        let examTypes = ['Mid Term', 'End of Term'];
        if (settingsData.exam_types && settingsData.exam_types.length > 0) {
          examTypes = settingsData.exam_types;
        }
        setAvailableExamTypes(examTypes);

        setCalcForm(prev => ({
          ...prev,
          term: settingsData.current_term || 'Term 1',
          examType: examTypes[0],
          academicYear: settingsData.academic_year || new Date().getFullYear().toString()
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

  const fetchAllocations = async (classId: string) => {
    if (!classId) return;
    setIsLoadingAllocations(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const data = await syncFetch(`/api/school/classes/${classId}/subjects`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cacheKey: `class-subjects-${classId}`
      });
      
      setClassSubjects(data);
    } catch (error) {
      console.error('Error fetching allocations:', error);
      toast({ title: "Error", description: "Failed to load class subjects", variant: "destructive" });
    } finally {
      setIsLoadingAllocations(false);
    }
  };

  useEffect(() => {
    if (allocationClassId) {
      fetchAllocations(allocationClassId);
    }
  }, [allocationClassId]);

  const handleAllocationSubmit = async () => {
    if (!allocationClassId || !allocationForm.subjectId) return;
    
    setIsActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/classes/${allocationClassId}/subjects/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subjectId: allocationForm.subjectId,
          teacherId: allocationForm.teacherId || null
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to assign subject');
      }

      toast({ title: "Success", description: "Subject assigned successfully" });
      setIsAddAllocationOpen(false);
      setAllocationForm({ subjectId: '', teacherId: '' });
      fetchAllocations(allocationClassId);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRemoveAllocation = async (subjectId: string) => {
    if (!allocationClassId) return;
    
    if (!confirm('Are you sure you want to remove this subject from the class?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/classes/${allocationClassId}/subjects/${subjectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to remove subject');

      toast({ title: "Success", description: "Subject removed successfully" });
      fetchAllocations(allocationClassId);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Subject Handlers
  const handleSubjectSubmit = async (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = isEdit ? `/api/school/subjects/${subjectForm.id}` : '/api/school/subjects';
      const method = isEdit ? 'PUT' : 'POST';

      const result = await syncFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(subjectForm)
      });

      if (result.offline) {
        toast({ title: "Offline Mode", description: "Subject changes queued for sync." });
      } else {
        toast({ title: "Success", description: `Subject ${isEdit ? 'updated' : 'created'} successfully` });
      }

      setIsAddSubjectOpen(false);
      setIsEditSubjectOpen(false);
      setSubjectForm({ id: '', name: '', department: '', headTeacherId: '', code: '' });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteSubject = async () => {
    if (!confirmState.id) return;
    setIsActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/subjects/${confirmState.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to delete subject');

      toast({ title: "Success", description: "Subject deleted successfully" });
      setConfirmState({ type: null });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsActionLoading(false);
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

      const result = await syncFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(classForm)
      });

      if (result.offline) {
        toast({ title: "Offline Mode", description: "Class changes queued for sync." });
      } else {
        toast({ title: "Success", description: `Class ${isEdit ? 'updated' : 'created'} successfully` });
      }

      setIsAddClassOpen(false);
      setIsEditClassOpen(false);
      setClassForm({ id: '', name: '', level: '', room: '', capacity: 40, classTeacherId: '' });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteClass = async () => {
    if (!confirmState.id) return;
    setIsActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/classes/${confirmState.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to delete class');

      toast({ title: "Success", description: "Class deleted successfully" });
      setConfirmState({ type: null });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Department Handlers
  const handleDeptSubmit = async (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = isEdit ? `/api/school/departments/${deptForm.id}` : '/api/school/departments';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(deptForm)
      });

      if (!response.ok) throw new Error('Failed to save department');

      toast({ title: "Success", description: `Department ${isEdit ? 'updated' : 'created'} successfully` });
      setIsAddDeptOpen(false);
      setIsEditDeptOpen(false);
      setDeptForm({ id: '', name: '', head_of_department_id: '' });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteDept = async () => {
    if (!confirmState.id) return;
    setIsActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/departments/${confirmState.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to delete department');

      toast({ title: "Success", description: "Department deleted successfully" });
      setConfirmState({ type: null });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBulkDelete = async (type: 'class' | 'subject' | 'department') => {
    let ids: string[] = [];
    if (type === 'class') ids = selectedClasses;
    else if (type === 'subject') ids = selectedSubjects;
    else if (type === 'department') ids = selectedDepartments;

    if (ids.length === 0) return;

    setIsActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const path = type === 'subject' ? 'subjects' : (type === 'class' ? 'classes' : type + 's');
      const promises = ids.map(id => fetch(`/api/school/${path}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      }));

      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.ok);

      if (failed.length > 0) {
        toast({ 
          title: "Partial Success", 
          description: `Successfully deleted ${ids.length - failed.length} items. ${failed.length} failed.`,
          variant: "destructive" 
        });
      } else {
        toast({ title: "Success", description: `${ids.length} items deleted successfully` });
      }

      if (type === 'class') setSelectedClasses([]);
      else if (type === 'subject') setSelectedSubjects([]);
      else if (type === 'department') setSelectedDepartments([]);
      
      setConfirmState({ type: null });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsActionLoading(false);
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

  const handleDeleteScale = async () => {
    if (!confirmState.id) return;
    setIsActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/grading-scales/${confirmState.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to delete grading scale');

      toast({ title: "Success", description: "Grading scale deleted successfully" });
      setConfirmState({ type: null });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsActionLoading(false);
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

  const handleDeleteWeight = async () => {
    if (!confirmState.id) return;
    setIsActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/grading-weights/${confirmState.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to delete assessment weight');

      toast({ title: "Success", description: "Assessment weight deleted successfully" });
      setConfirmState({ type: null });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsActionLoading(false);
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
  const handleCalculateGrades = async (force: boolean = false) => {
    if (!calcForm.classId || !calcForm.term || !calcForm.academicYear || !calcForm.examType) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setIsCalculating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/school/grades/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          classId: calcForm.classId === 'all' ? null : calcForm.classId,
          subjectId: calcForm.subjectId === 'all' ? null : calcForm.subjectId,
          term: calcForm.term,
          examType: calcForm.examType,
          academicYear: calcForm.academicYear,
          skipCalculation: calcForm.skipCalculation,
          force
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // If blocked by unpublished grades, show the readiness report instead of just a toast
        if (response.status === 400 && data.unpublished && data.unpublished.length > 0) {
          setUnpublishedGrades(data.unpublished);
          setIsReadinessReportOpen(true);
          toast({ title: "Calculation Blocked", description: data.message, variant: "destructive" });
        } else {
          throw new Error(data.message || 'Failed to calculate grades');
        }
        return;
      }

      toast({
        title: data.count > 0 ? "Calculation Complete" : "Nothing to Calculate",
        description: data.count > 0
          ? `Successfully calculated grades for ${data.count} students.`
          : `No grade changes were necessary for the selected criteria.`
      });

      // Auto-check status after calculation
      handleCheckStatus();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsCalculating(false);
    }
  };

  // Readiness Report Handler — loads unpublished grades for admin visibility
  const handleReadinessReport = async () => {
    if (!calcForm.term || !calcForm.academicYear || !calcForm.examType) {
      toast({ title: "Error", description: "Please select Term, Exam Type and Year first", variant: "destructive" });
      return;
    }

    setIsLoadingReadiness(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({
        classId: calcForm.classId,
        subjectId: calcForm.subjectId,
        term: calcForm.term,
        examType: calcForm.examType,
        academicYear: calcForm.academicYear
      });

      const response = await fetch(`/api/school/grades/readiness?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setUnpublishedGrades(data);
      setIsReadinessReportOpen(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingReadiness(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!calcForm.classId || !calcForm.term || !calcForm.academicYear || !calcForm.examType) {
      toast({ title: "Error", description: "Please select Class, Term, Exam Type and Year first", variant: "destructive" });
      return;
    }

    setIsCheckingStatus(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/grades/status?classId=${calcForm.classId === 'all' ? '' : calcForm.classId}&term=${encodeURIComponent(calcForm.term)}&examType=${encodeURIComponent(calcForm.examType)}&academicYear=${encodeURIComponent(calcForm.academicYear)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch status');

      setGradeStatus(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handlePublishResults = async () => {
    if (!calcForm.classId || !calcForm.term || !calcForm.academicYear || !calcForm.examType) return;

    setIsActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/school/results/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          classId: calcForm.classId === 'all' ? null : calcForm.classId,
          subjectId: calcForm.subjectId === 'all' ? null : calcForm.subjectId,
          term: calcForm.term,
          examType: calcForm.examType,
          academicYear: calcForm.academicYear
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to publish results');

      toast({ title: "Success", description: data.message });
      setConfirmState({ type: null });
      handleCheckStatus();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirm = () => {
    switch (confirmState.type) {
      case 'subject': handleDeleteSubject(); break;
      case 'class': handleDeleteClass(); break;
      case 'department': handleDeleteDept(); break;
      case 'scale': handleDeleteScale(); break;
      case 'weight': handleDeleteWeight(); break;
      case 'publish': handlePublishResults(); break;
      case 'bulk-class': handleBulkDelete('class'); break;
      case 'bulk-subject': handleBulkDelete('subject'); break;
      case 'bulk-department': handleBulkDelete('department'); break;
      default: setConfirmState({ type: null });
    }
  };
  const initiatePublish = () => {
    if (!calcForm.classId || !calcForm.term || !calcForm.academicYear) return;

    const unready = gradeStatus.filter(s => s.status === 'Draft');
    if (unready.length > 0) {
      setConfirmState({
        type: 'publish',
        title: 'Draft Results Warning',
        message: `Warning: ${unready.length} subjects are still in Draft. They will NOT be visible to students. Continue anyway?`
      });
    } else {
      setConfirmState({
        type: 'publish',
        title: 'Publish Results',
        message: 'Are you sure you want to publish ALL results to the Student Dashboard?'
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Academics & Results</h2>
          <p className="text-slate-600 dark:text-slate-400">Manage classes, subjects, and curriculum.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-slate-100/50 dark:bg-slate-800/50">
          <TabsTrigger value="classes" className="flex items-center gap-2 px-4 py-2">
            <Layers className="h-4 w-4" /> Classes
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-2 px-4 py-2">
            <Building className="h-4 w-4" /> Departments
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2 px-4 py-2">
            <BookOpen className="h-4 w-4" /> Subjects
          </TabsTrigger>
          <TabsTrigger value="allocations" className="flex items-center gap-2 px-4 py-2">
            <Layers className="h-4 w-4" /> Subject Allocation
          </TabsTrigger>
          <TabsTrigger value="timetable" className="flex items-center gap-2 px-4 py-2">
            <Calendar className="h-4 w-4" /> Timetable
          </TabsTrigger>
          <TabsTrigger value="grading-scales" className="flex items-center gap-2 px-4 py-2">
            <Layers className="h-4 w-4" /> Grading Scales
          </TabsTrigger>
          <TabsTrigger value="grading-weights" className="flex items-center gap-2 px-4 py-2">
            <Layers className="h-4 w-4" /> Assessment Weights
          </TabsTrigger>

          <div className="ml-auto flex items-center gap-2 px-1 border-l border-slate-200 dark:border-slate-700 ml-4">
            <TabsTrigger
              value="grade-calculation"
              className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-200"
            >
              <Layers className="h-4 w-4" /> Publish Results
            </TabsTrigger>
            <TabsTrigger
              value="printer"
              className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all duration-200"
            >
              <Printer className="h-4 w-4" /> Print Results
            </TabsTrigger>
          </div>
        </TabsList>

        {/* CLASSES TAB */}
        <TabsContent value="classes" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Classes</CardTitle>
                <CardDescription>Manage class sections and teacher assignments</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {selectedClasses.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    disabled={isActionLoading}
                    onClick={() => setConfirmState({ 
                      type: 'bulk-class', 
                      title: 'Bulk Delete Classes', 
                      message: `Are you sure you want to delete ${selectedClasses.length} selected classes? This will remove all their associations.` 
                    })}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete ({selectedClasses.length})
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setIsImportOpen('classes')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Import Classes
                </Button>
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
                        <Input required placeholder="e.g. Grade 10A" value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Level</Label>
                        <Input required placeholder="e.g. 10" value={classForm.level} onChange={e => setClassForm({ ...classForm, level: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Room</Label>
                        <Input placeholder="e.g. 301" value={classForm.room} onChange={e => setClassForm({ ...classForm, room: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Capacity</Label>
                        <Input type="number" required value={classForm.capacity} onChange={e => setClassForm({ ...classForm, capacity: parseInt(e.target.value) })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Class Teacher</Label>
                      <Combobox
                        options={teachers.map(t => ({ label: t.fullName, value: t.id }))}
                        value={classForm.classTeacherId}
                        onValueChange={v => setClassForm({ ...classForm, classTeacherId: v })}
                        placeholder="Select teacher"
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit">Create Class</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={selectedClasses.length === classes.length && classes.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedClasses(classes.map(c => c.id));
                          else setSelectedClasses([]);
                        }}
                      />
                    </TableHead>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Students / Capacity</TableHead>
                    <TableHead>Class Teacher</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls) => (
                    <TableRow key={cls.id} className={selectedClasses.includes(cls.id) ? "bg-slate-50 dark:bg-slate-800/50" : ""}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedClasses.includes(cls.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedClasses([...selectedClasses, cls.id]);
                            else setSelectedClasses(selectedClasses.filter(id => id !== cls.id));
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.level}</TableCell>
                      <TableCell>{cls.room}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${cls.enrolledCount && cls.enrolledCount > cls.capacity ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'}`}>
                            {cls.enrolledCount || 0}
                          </span>
                          <span className="text-slate-400">/ {cls.capacity}</span>
                        </div>
                      </TableCell>
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
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setConfirmState({ type: 'class', id: cls.id })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {classes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No classes found. Add your first class to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* DEPARTMENTS TAB */}
        <TabsContent value="departments" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>School Departments</CardTitle>
                <CardDescription>Organize subjects and staff into academic departments</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {selectedDepartments.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    disabled={isActionLoading}
                    onClick={() => setConfirmState({ 
                      type: 'bulk-department', 
                      title: 'Bulk Delete Departments', 
                      message: `Are you sure you want to delete ${selectedDepartments.length} selected departments?` 
                    })}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete ({selectedDepartments.length})
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setIsImportOpen('departments')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Import Departments
                </Button>
                <Dialog open={isAddDeptOpen} onOpenChange={setIsAddDeptOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setDeptForm({ id: '', name: '', head_of_department_id: '' })}>
                      <Plus className="h-4 w-4 mr-2" /> Add Department
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Department</DialogTitle>
                      <DialogDescription>Create a new academic department.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => handleDeptSubmit(e, false)} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Department Name</Label>
                        <Input required placeholder="e.g. Science" value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Head of Department (Optional)</Label>
                        <Combobox
                          options={teachers.map(t => ({ label: t.fullName, value: t.id }))}
                          value={deptForm.head_of_department_id}
                          onValueChange={v => setDeptForm({ ...deptForm, head_of_department_id: v })}
                          placeholder="Select Head of Department"
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit">Create Department</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={selectedDepartments.length === departments.length && departments.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedDepartments(departments.map(d => d.id));
                          else setSelectedDepartments([]);
                        }}
                      />
                    </TableHead>
                    <TableHead>Department Name</TableHead>
                    <TableHead>Head of Department</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept.id} className={selectedDepartments.includes(dept.id) ? "bg-slate-50 dark:bg-slate-800/50" : ""}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedDepartments.includes(dept.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedDepartments([...selectedDepartments, dept.id]);
                            else setSelectedDepartments(selectedDepartments.filter(id => id !== dept.id));
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>
                        {dept.head_of_department?.full_name || <span className="text-muted-foreground italic">Unassigned</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setDeptForm({ id: dept.id, name: dept.name, head_of_department_id: dept.head_of_department_id || '' });
                            setIsEditDeptOpen(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setConfirmState({ type: 'department', id: dept.id })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {departments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                        No departments found. Add your first department to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={isEditDeptOpen} onOpenChange={setIsEditDeptOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Department</DialogTitle>
                <DialogDescription>Update department details.</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => handleDeptSubmit(e, true)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Department Name</Label>
                  <Input required placeholder="e.g. Science" value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Head of Department (Optional)</Label>
                  <Combobox
                    options={teachers.map(t => ({ label: t.fullName, value: t.id }))}
                    value={deptForm.head_of_department_id}
                    onValueChange={v => setDeptForm({ ...deptForm, head_of_department_id: v })}
                    placeholder="Select Head of Department"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">Update Department</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* SUBJECTS TAB */}
        <TabsContent value="subjects" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Subjects Curriculum</CardTitle>
                <CardDescription>Manage subjects and department heads</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {selectedSubjects.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    disabled={isActionLoading}
                    onClick={() => setConfirmState({ 
                      type: 'bulk-subject', 
                      title: 'Bulk Delete Subjects', 
                      message: `Are you sure you want to delete ${selectedSubjects.length} selected subjects? This will remove all their associations.` 
                    })}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete ({selectedSubjects.length})
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setIsImportOpen('subjects')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Import Subjects
                </Button>
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
                        <Input 
                          required 
                          placeholder="e.g. Mathematics" 
                          value={subjectForm.name} 
                          onChange={e => {
                            const newName = e.target.value;
                            const oldAutoCode = generateSubjectCode(subjectForm.name);
                            const newAutoCode = generateSubjectCode(newName);
                            
                            setSubjectForm({ 
                              ...subjectForm, 
                              name: newName,
                              code: (!subjectForm.code || subjectForm.code === oldAutoCode) ? newAutoCode : subjectForm.code
                            });
                          }} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Code</Label>
                        <Input placeholder="e.g. MAT101" value={subjectForm.code} onChange={e => setSubjectForm({ ...subjectForm, code: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <div className="flex gap-2">
                        <Select 
                          value={subjectForm.department} 
                          onValueChange={v => {
                            const dept = departments.find(d => d.name === v);
                            setSubjectForm({ 
                              ...subjectForm, 
                              department: v,
                              headTeacherId: dept?.head_of_department_id || ''
                            });
                          }}
                        >
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
                                  setSubjectForm({ ...subjectForm, department: newDept.name });
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
                      <Label>Head of Department</Label>
                      <Combobox
                        options={teachers.map(t => ({ label: t.fullName, value: t.id }))}
                        value={subjectForm.headTeacherId}
                        onValueChange={v => setSubjectForm({ ...subjectForm, headTeacherId: v })}
                        placeholder="Select teacher"
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit">Create Subject</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={selectedSubjects.length === subjects.length && subjects.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedSubjects(subjects.map(s => s.id));
                          else setSelectedSubjects([]);
                        }}
                      />
                    </TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Subject Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Head of Dept</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((sub) => (
                    <TableRow key={sub.id} className={selectedSubjects.includes(sub.id) ? "bg-slate-50 dark:bg-slate-800/50" : ""}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedSubjects.includes(sub.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedSubjects([...selectedSubjects, sub.id]);
                            else setSelectedSubjects(selectedSubjects.filter(id => id !== sub.id));
                          }}
                        />
                      </TableCell>
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
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setConfirmState({ type: 'subject', id: sub.id })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {subjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
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
        {/* ALLOCATIONS TAB */}
        <TabsContent value="allocations" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Subject Allocation</CardTitle>
                <CardDescription>Assign teachers to subjects for each class.</CardDescription>
              </div>
              <div className="flex gap-4 items-center">
                <Select value={allocationClassId} onValueChange={setAllocationClassId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Dialog open={isAddAllocationOpen} onOpenChange={setIsAddAllocationOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!allocationClassId}>
                      <Plus className="h-4 w-4 mr-2" /> Assign Subject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Subject to Class</DialogTitle>
                      <DialogDescription>Select a subject and a teacher.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Select 
                          value={allocationForm.subjectId} 
                          onValueChange={v => setAllocationForm({...allocationForm, subjectId: v})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects
                              .filter(s => !classSubjects.some(cs => cs.id === s.id))
                              .map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Teacher</Label>
                        <Combobox
                          options={teachers.map(t => ({ label: t.fullName, value: t.id }))}
                          value={allocationForm.teacherId}
                          onValueChange={v => setAllocationForm({...allocationForm, teacherId: v})}
                          placeholder="Select Teacher"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAllocationSubmit} disabled={!allocationForm.subjectId}>Assign</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {!allocationClassId ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  Please select a class to view allocations.
                </div>
              ) : isLoadingAllocations ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : classSubjects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No subjects assigned to this class yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject Code</TableHead>
                      <TableHead>Subject Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Assigned Teacher</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classSubjects.map((cs) => (
                      <TableRow key={cs.classSubjectId}>
                        <TableCell>{cs.code}</TableCell>
                        <TableCell className="font-medium">{cs.name}</TableCell>
                        <TableCell>{cs.department}</TableCell>
                        <TableCell>
                           <Combobox
                             className="w-[200px] h-8"
                             options={[
                               { label: "Unassigned", value: "unassigned" },
                               ...teachers.map(t => ({ label: t.fullName, value: t.id }))
                             ]}
                             value={cs.teacherId || "unassigned"}
                             onValueChange={async (newTeacherId) => {
                               try {
                                 const { data: { session } } = await supabase.auth.getSession();
                                 if (!session) return;
                                 
                                 const response = await fetch(`/api/school/classes/${allocationClassId}/subjects/assign`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${session.access_token}`
                                    },
                                    body: JSON.stringify({
                                      subjectId: cs.id,
                                      teacherId: newTeacherId === "unassigned" ? null : newTeacherId
                                    })
                                 });
                                 
                                 if (!response.ok) throw new Error("Failed");
                                 toast({ title: "Success", description: "Teacher updated" });
                                 fetchAllocations(allocationClassId);
                               } catch (e) {
                                 toast({ title: "Error", description: "Failed to update teacher", variant: "destructive" });
                                }
                             }}
                           />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleRemoveAllocation(cs.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
                        <Input required value={scaleForm.grade} onChange={e => setScaleForm({ ...scaleForm, grade: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Min %</Label>
                        <Input type="number" required value={scaleForm.min_percentage} onChange={e => setScaleForm({ ...scaleForm, min_percentage: parseInt(e.target.value) })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Max %</Label>
                        <Input type="number" required value={scaleForm.max_percentage} onChange={e => setScaleForm({ ...scaleForm, max_percentage: parseInt(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input value={scaleForm.description} onChange={e => setScaleForm({ ...scaleForm, description: e.target.value })} />
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
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setConfirmState({ type: 'scale', id: scale.id })}>
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
                      <Select value={weightForm.assessment_type} onValueChange={v => setWeightForm({ ...weightForm, assessment_type: v })}>
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
                      <Input type="number" required value={weightForm.weight_percentage} onChange={e => setWeightForm({ ...weightForm, weight_percentage: parseInt(e.target.value) })} />
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
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setConfirmState({ type: 'weight', id: weight.id })}>
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
                    <Select value={calcForm.classId} onValueChange={v => setCalcForm({ ...calcForm, classId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2">
                          <SelectItem value="all" className="w-full justify-center">All Classes</SelectItem>
                          {classes.map(c => (
                            <SelectItem key={c.id} value={c.id} className="w-full justify-center">{c.name}</SelectItem>
                          ))}
                        </div>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Subject (Optional)</Label>
                    <Select value={calcForm.subjectId} onValueChange={v => setCalcForm({ ...calcForm, subjectId: v })}>
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Term</Label>
                      <Input value={calcForm.term} onChange={e => setCalcForm({ ...calcForm, term: e.target.value })} placeholder="e.g. Term 1" />
                    </div>
                    <div className="space-y-2">
                      <Label>Assessment Type</Label>
                      <Select value={calcForm.examType} onValueChange={v => setCalcForm({ ...calcForm, examType: v })}>
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
                      <Label>Academic Year</Label>
                      <Input value={calcForm.academicYear} onChange={e => setCalcForm({ ...calcForm, academicYear: e.target.value })} placeholder="e.g. 2024" />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-800">
                    <Checkbox 
                      id="skip-calc" 
                      checked={calcForm.skipCalculation} 
                      onCheckedChange={(checked) => setCalcForm({ ...calcForm, skipCalculation: !!checked })} 
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="skip-calc"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Use Direct Mark Entry (from Gradebook)
                      </label>
                      <p className="text-[10px] text-muted-foreground">
                        Tick this to skip calculating from assignments and use the final percentages entered by teachers.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleCalculateGrades()}
                    disabled={isCalculating || !calcForm.term || !calcForm.academicYear}
                    className="w-full"
                  >
                    {isCalculating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      'Calculate Grades'
                    )}
                  </Button>

                  {/* Readiness Report Button */}
                  <Button
                    variant="outline"
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
                    onClick={handleReadinessReport}
                    disabled={isLoadingReadiness || !calcForm.term || !calcForm.academicYear}
                  >
                    {isLoadingReadiness ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ClipboardList className="mr-2 h-4 w-4" />
                    )}
                    Check Readiness Report
                  </Button>

                  {/* Readiness Report Dialog */}
                  <Dialog open={isReadinessReportOpen} onOpenChange={setIsReadinessReportOpen}>
                    <DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className={cn("flex items-center gap-2", unpublishedGrades.length === 0 ? "text-green-600" : "text-amber-600")}>
                          {unpublishedGrades.length === 0 ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <AlertTriangle className="h-5 w-5" />
                          )}
                          Readiness Report — {unpublishedGrades.length === 0 ? "Ready for Calculation" : "Records Need Attention"}
                        </DialogTitle>
                        <DialogDescription>
                          {unpublishedGrades.length === 0 ? (
                            "All required grade entries have been submitted or published. You are ready to proceed with calculations."
                          ) : (
                            <div className="space-y-4 text-left">
                              <p>
                                The following student grades are <strong>Draft</strong> or <strong>Not Entered</strong>.
                                Grades can only be calculated once all entries are either <strong>Submitted</strong> (by teachers) or <strong>Published</strong>.
                              </p>
                              <div className="flex justify-end gap-2 pt-2">
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => {
                                    if (confirm("Forcing calculation with missing grades may result in incomplete percentages for those students. Continue?")) {
                                      handleCalculateGrades(true);
                                      setIsReadinessReportOpen(false);
                                    }
                                  }}
                                  disabled={isCalculating}
                                >
                                  {isCalculating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                  Force Calculate Anyway
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="py-4">
                        {unpublishedGrades.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-8 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-3">
                              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <p className="font-semibold text-green-700 dark:text-green-400">All Grades Ready!</p>
                            <p className="text-sm text-green-600 dark:text-green-500 mt-1">All required grades have been submitted or published. You can proceed to calculate.</p>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-3 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
                              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                              <span><strong>{unpublishedGrades.length}</strong> record(s) need attention. Teachers must <strong>Submit</strong> these grades before calculation can proceed.</span>
                            </div>
                            <div className="border rounded-md overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-slate-50 dark:bg-slate-800">
                                    <TableHead>Student</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Teacher</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {unpublishedGrades.map((g: any, i: number) => (
                                    <TableRow key={i}>
                                      <TableCell className="font-medium">{g.studentName}</TableCell>
                                      <TableCell className="text-muted-foreground text-sm">{g.className}</TableCell>
                                      <TableCell>{g.subjectName}</TableCell>
                                      <TableCell className="text-muted-foreground text-sm">{g.subjectCode}</TableCell>
                                      <TableCell className="text-muted-foreground text-sm">{g.teacherName || '—'}</TableCell>
                                      <TableCell>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${g.status === 'Not Entered' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                          g.status === 'Draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                          }`}>
                                          {g.status || 'Not Entered'}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="font-semibold mb-2">Publish Results</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Review subject status and publish final grades to the student dashboard.
                    </p>
                    <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled={!calcForm.term || !calcForm.academicYear}
                        >
                          Review & Publish Results
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Publish Results</DialogTitle>
                          <DialogDescription>
                            Check if all subjects are submitted before publishing to students.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="py-4 space-y-4">
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={handleCheckStatus} disabled={isCheckingStatus}>
                              {isCheckingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                              Check Status
                            </Button>
                            <Button
                              onClick={initiatePublish}
                              disabled={isActionLoading || gradeStatus.length === 0}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {isPublishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                              Publish Results
                            </Button>
                          </div>

                          {gradeStatus.length > 0 && (
                            <div className="border rounded-md">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Teacher</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {gradeStatus.filter(s => s.status === 'Submitted').map(s => (
                                    <TableRow key={s.id}>
                                      <TableCell>{s.name}</TableCell>
                                      <TableCell className="text-muted-foreground">{s.teacher}</TableCell>
                                      <TableCell>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${s.status === 'Published' ? 'bg-green-100 text-green-800' :
                                          s.status === 'Submitted' ? 'bg-blue-100 text-blue-800' :
                                            'bg-yellow-100 text-yellow-800'
                                          }`}>
                                          {s.status}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  {gradeStatus.filter(s => s.status === 'Submitted').length === 0 && (
                                    <TableRow>
                                      <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                        No submitted subjects found.
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
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

        <TabsContent value="printer" className="space-y-4 mt-4">
          <ResultPrinter />
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
                <Input required value={scaleForm.grade} onChange={e => setScaleForm({ ...scaleForm, grade: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Min %</Label>
                <Input type="number" required value={scaleForm.min_percentage} onChange={e => setScaleForm({ ...scaleForm, min_percentage: parseInt(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max %</Label>
                <Input type="number" required value={scaleForm.max_percentage} onChange={e => setScaleForm({ ...scaleForm, max_percentage: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={scaleForm.description} onChange={e => setScaleForm({ ...scaleForm, description: e.target.value })} />
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
              <Select value={weightForm.assessment_type} onValueChange={v => setWeightForm({ ...weightForm, assessment_type: v })}>
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
              <Input type="number" required value={weightForm.weight_percentage} onChange={e => setWeightForm({ ...weightForm, weight_percentage: parseInt(e.target.value) })} />
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
                <Input required value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Input required value={classForm.level} onChange={e => setClassForm({ ...classForm, level: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Room</Label>
                <Input value={classForm.room} onChange={e => setClassForm({ ...classForm, room: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input type="number" required value={classForm.capacity} onChange={e => setClassForm({ ...classForm, capacity: parseInt(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Class Teacher</Label>
              <Combobox
                options={teachers.map(t => ({ label: t.fullName, value: t.id }))}
                value={classForm.classTeacherId}
                onValueChange={v => setClassForm({ ...classForm, classTeacherId: v })}
                placeholder="Select teacher"
              />
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
                <Input 
                  required 
                  value={subjectForm.name} 
                  onChange={e => {
                    const newName = e.target.value;
                    const oldAutoCode = generateSubjectCode(subjectForm.name);
                    const newAutoCode = generateSubjectCode(newName);
                    
                    setSubjectForm({ 
                      ...subjectForm, 
                      name: newName,
                      code: (!subjectForm.code || subjectForm.code === oldAutoCode) ? newAutoCode : subjectForm.code
                    });
                  }} 
                />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={subjectForm.code} onChange={e => setSubjectForm({ ...subjectForm, code: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <div className="flex gap-2">
                <Select 
                  value={subjectForm.department} 
                  onValueChange={v => {
                    const dept = departments.find(d => d.name === v);
                    setSubjectForm({ 
                      ...subjectForm, 
                      department: v,
                      headTeacherId: dept?.head_of_department_id || ''
                    });
                  }}
                >
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
                          setSubjectForm({ ...subjectForm, department: newDept.name });
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
              <Label>Head of Department</Label>
              <Combobox
                options={teachers.map(t => ({ label: t.fullName, value: t.id }))}
                value={subjectForm.headTeacherId}
                onValueChange={v => setSubjectForm({ ...subjectForm, headTeacherId: v })}
                placeholder="Select teacher"
              />
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
      <Dialog open={!!isImportOpen} onOpenChange={(open) => !open && setIsImportOpen(null)}>
        <DialogContent className="sm:max-w-[750px]">
          <BulkAcademicImport 
            defaultTab={isImportOpen === 'classes' ? 'classes' : isImportOpen === 'subjects' ? 'subjects' : 'departments'}
            onImportSuccess={() => {
              setIsImportOpen(null);
              fetchData();
            }} 
          />
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!confirmState.type}
        onOpenChange={(open) => !open && setConfirmState({ type: null })}
        title={confirmState.title || `Delete ${confirmState.type}?`}
        description={confirmState.message || `Are you sure you want to delete this ${confirmState.type}? This action cannot be undone.`}
        confirmLabel={confirmState.type === 'publish' ? 'Publish Results' : `Delete ${confirmState.type}`}
        variant={confirmState.type === 'publish' ? 'warning' : 'danger'}
        loading={isActionLoading}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
