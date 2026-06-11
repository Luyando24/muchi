import React, { useState, useEffect } from 'react';
import { Layers, BookOpen, GraduationCap, CheckCircle2, Clock, ArrowRight, ArrowLeft, Gift, Trophy, Loader2, Plus, Users, FileSpreadsheet } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import BulkAcademicImport from '../school-admin/BulkAcademicImport';
import BulkTeacherImport from '../school-admin/BulkTeacherImport';
import BulkStudentImport from '../school-admin/BulkStudentImport';

interface SetupReminderProps {
  isOpen: boolean;
  onClose: () => void;
  onSnooze: () => void;
  schoolName: string;
  stats: {
    classes: number;
    subjects: number;
    teachers: number;
    students: number;
    assignments: number;
  };
  onNavigateToSetup: () => void;
  rewardDays: number;
  rewardClaimed: boolean;
  onClaimReward: () => Promise<void>;
  onRefreshStats?: () => void;
  isMandatory?: boolean;
}

export default function SetupReminder({
  isOpen,
  onClose,
  onSnooze,
  schoolName,
  stats,
  onNavigateToSetup,
  rewardDays,
  rewardClaimed,
  onClaimReward,
  onRefreshStats,
  isMandatory = false,
}: SetupReminderProps) {
  const [claiming, setClaiming] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();

  // Wizard Data List states
  const [classesList, setClassesList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [topSchools, setTopSchools] = useState<any[]>([
    { name: 'St. Augustine Academy', location: 'Lusaka', initials: 'SA' },
    { name: "Green Leaf Int'l", location: 'Ndola', initials: 'GL' }
  ]);

  // Class Form states
  const [classNameInput, setClassNameInput] = useState('');
  const [classLevelInput, setClassLevelInput] = useState('');
  const [isSubmittingClass, setIsSubmittingClass] = useState(false);

  // Subject Form states
  const [subjectNameInput, setSubjectNameInput] = useState('');
  const [subjectCodeInput, setSubjectCodeInput] = useState('');
  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);

  // Allocation Form states
  const [allocClassId, setAllocClassId] = useState('');
  const [allocSubjectId, setAllocSubjectId] = useState('');
  const [allocTeacherId, setAllocTeacherId] = useState('');
  const [isSubmittingAlloc, setIsSubmittingAlloc] = useState(false);

  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportTab, setBulkImportTab] = useState<'classes' | 'subjects' | 'teachers' | 'students'>('classes');
  
  const [recommendations, setRecommendations] = useState<{ departments: string[]; subjects: any[] }>({ departments: [], subjects: [] });

  const classesProgress = Math.min((classesList.length / 5) * 100, 100);
  const subjectsProgress = Math.min((subjectsList.length / 5) * 100, 100);
  const teachersProgress = Math.min((teachersList.length / 5) * 100, 100);
  const studentsProgress = Math.min((stats.students / 20) * 100, 100);
  const allocationsProgress = Math.min((stats.assignments / 10) * 100, 100);
  
  const overallProgress = Math.round((classesProgress + subjectsProgress + teachersProgress + studentsProgress + allocationsProgress) / 5);
  
  const classesDone = classesList.length >= 5;
  const subjectsDone = subjectsList.length >= 5;
  const teachersDone = teachersList.length >= 5;
  const studentsDone = stats.students >= 20;
  const assignmentsDone = stats.assignments >= 10;
  const isComplete = classesDone && subjectsDone && teachersDone && studentsDone && assignmentsDone;

  const fetchWizardData = async () => {
    try {
      setLoadingData(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { 'Authorization': `Bearer ${session.access_token}` };
      
      const [classesRes, subjectsRes, teachersRes, recsRes, topSchoolsRes] = await Promise.all([
        fetch('/api/school/classes', { headers }),
        fetch('/api/school/subjects', { headers }),
        fetch('/api/school/teachers', { headers }),
        fetch('/api/school/recommendations/academic', { headers }),
        fetch('/api/schools/top-onboarded', { headers })
      ]);

      if (classesRes.ok) {
        const data = await classesRes.json();
        setClassesList(data.data || data || []);
      }
      if (subjectsRes.ok) {
        const data = await subjectsRes.json();
        setSubjectsList(data.data || data || []);
      }
      if (teachersRes.ok) {
        const res = await teachersRes.json();
        setTeachersList(res.data || res || []);
      }
      if (recsRes.ok) {
        const data = await recsRes.json();
        setRecommendations(data || { departments: [], subjects: [] });
      }
      if (topSchoolsRes.ok) {
        const data = await topSchoolsRes.json();
        setTopSchools(data || []);
      }
    } catch (err) {
      console.error("Error fetching wizard data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWizardData();
      if (onRefreshStats) onRefreshStats();
    }
  }, [isOpen, onRefreshStats]);

  const [selectedPopularSubjects, setSelectedPopularSubjects] = useState<string[]>([]);
  const [customSubjectInput, setCustomSubjectInput] = useState("");

  useEffect(() => {
    if (recommendations.subjects && recommendations.subjects.length > 0) {
      setSelectedPopularSubjects(recommendations.subjects.map((s: any) => s.name));
    } else {
      setSelectedPopularSubjects([
        'Mathematics', 'English Language', 'Biology', 'Chemistry', 
        'Physics', 'Geography', 'History', 'Computer Studies'
      ]);
    }
  }, [recommendations.subjects]);

  const handleAddBulkSuggestions = async () => {
    if (selectedPopularSubjects.length === 0) return;
    setIsSubmittingSubject(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const defaultFallback = [
        { name: 'Mathematics', code: 'MATH' },
        { name: 'English Language', code: 'ENG' },
        { name: 'Biology', code: 'BIO' },
        { name: 'Chemistry', code: 'CHEM' },
        { name: 'Physics', code: 'PHYS' },
        { name: 'Geography', code: 'GEOG' },
        { name: 'History', code: 'HIST' },
        { name: 'Computer Studies', code: 'COMP' }
      ];
      
      const availableSubs = recommendations.subjects && recommendations.subjects.length > 0 
        ? recommendations.subjects 
        : defaultFallback;
        
      const subsToImport = availableSubs.filter((s: any) => selectedPopularSubjects.includes(s.name));
      
      const response = await fetch('/api/school/subjects/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ subjects: subsToImport })
      });

      if (!response.ok) {
        throw new Error('Failed to add selected subjects');
      }

      toast({ title: "Success", description: "Selected subjects added successfully." });
      setSelectedPopularSubjects([]);
      fetchWizardData();
      if (onRefreshStats) onRefreshStats();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add subjects.", variant: "destructive" });
    } finally {
      setIsSubmittingSubject(false);
    }
  };





  const handleAddAllocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocClassId || !allocSubjectId || !allocTeacherId) {
      toast({ title: "Fields missing", description: "Please select a class, subject, and teacher.", variant: "destructive" });
      return;
    }

    setIsSubmittingAlloc(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/classes/${allocClassId}/subjects/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subjectId: allocSubjectId,
          teacherId: allocTeacherId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to allocate teacher');
      }

      setAllocClassId('');
      setAllocSubjectId('');
      setAllocTeacherId('');
      toast({ title: "Allocated Successfully", description: "Assigned subject to teacher successfully." });
      
      fetchWizardData();
      if (onRefreshStats) onRefreshStats();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to assign teacher.", variant: "destructive" });
    } finally {
      setIsSubmittingAlloc(false);
    }
  };

  const handleClaimClick = async () => {
    setClaiming(true);
    try {
      await onClaimReward();
    } finally {
      setClaiming(false);
    }
  };

  const steps = [
    { number: 1, name: "Welcome" },
    { number: 2, name: "Overview" },
    { number: 3, name: "Classes" },
    { number: 4, name: "Subjects" },
    { number: 5, name: "Teachers" },
    { number: 6, name: "Students" },
    { number: 7, name: "Allocations" },
    { number: 8, name: "Claim" }
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isMandatory) onClose(); }}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white border-slate-200 text-slate-900 rounded-2xl shadow-2xl">
        <div className="p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                Setup Wizard
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-950 mt-1">
                Complete Your School Setup
              </h3>
            </div>
            {isComplete && !rewardClaimed && (
              <div className="bg-amber-100 text-amber-600 p-2 rounded-full animate-bounce">
                <Trophy className="h-6 w-6" />
              </div>
            )}
          </div>

          {/* Steps Indicator */}
          <div className="flex items-center justify-between px-2 py-3 bg-slate-50 rounded-xl border border-slate-100">
            {steps.map((s, index) => (
              <React.Fragment key={s.number}>
                <button 
                  onClick={() => setCurrentStep(s.number)}
                  className="flex flex-col items-center gap-1 flex-1 focus:outline-none group"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                    currentStep === s.number
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-110'
                      : ((currentStep > s.number && (s.number === 1 || s.number === 2)) || (s.number === 3 && classesDone) || (s.number === 4 && subjectsDone) || (s.number === 5 && teachersDone) || (s.number === 6 && studentsDone) || (s.number === 7 && assignmentsDone) || isComplete)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-500 group-hover:bg-slate-300'
                  }`}>
                    {((s.number === 3 && classesDone) || (s.number === 4 && subjectsDone) || (s.number === 5 && teachersDone) || (s.number === 6 && studentsDone) || (s.number === 7 && assignmentsDone) || ((s.number === 1 || s.number === 2) && isComplete) || (currentStep > s.number && (s.number === 1 || s.number === 2))) ? '✓' : s.number}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider text-center ${
                    currentStep === s.number ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}>
                    {s.name}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <div className={`h-[2px] flex-1 max-w-[30px] transition-all duration-200 ${
                    ((currentStep > s.number) || (s.number === 3 && classesDone) || (s.number === 4 && subjectsDone) || (s.number === 5 && teachersDone) || (s.number === 6 && studentsDone) || (s.number === 7 && assignmentsDone)) ? 'bg-emerald-500' : 'bg-slate-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step Contents */}
          <div className="space-y-4 min-h-[300px]">
            
            {/* STEP 1: Welcome / Motivation */}
            {currentStep === 1 && (
              <div className="space-y-6 text-center pt-4">
                <div className="flex justify-center">
                  <div className="bg-emerald-100 p-4 rounded-full text-emerald-600 border border-emerald-200">
                    <Trophy className="h-10 w-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900">Join the Top Performers!</h3>
                  <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
                    You're one step away from transforming your school's management. 
                  </p>
                </div>
                
                {(() => {
                  const school1 = topSchools[0]?.name || 'St. Augustine Academy';
                  const school2 = topSchools[1]?.name || "Green Leaf Int'l";
                  return (
                    <p className="text-slate-700 text-sm sm:text-base leading-relaxed max-w-md mx-auto py-4 font-normal">
                      Many schools including <strong className="font-bold text-indigo-600">{school1}</strong> and <strong className="font-bold text-indigo-600">{school2}</strong> have completed their setup. Be next, click NEXT below.
                    </p>
                  );
                })()}
              </div>
            )}

            {/* STEP 2: Overview */}
            {currentStep === 2 && (
              <div className="space-y-5 max-h-[400px] overflow-y-auto pr-2">
                <div className="text-slate-600 text-sm sm:text-base leading-relaxed font-normal space-y-3">

                  
                  {!rewardClaimed && (
                    <div className={`p-4 rounded-xl border font-medium ${
                      isComplete 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                        : 'bg-indigo-50 border-indigo-100 text-indigo-900'
                    }`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Gift className="h-5 w-5 shrink-0 text-indigo-600" />
                        <span className="font-bold">100% Completion Reward:</span>
                      </div>
                      <p className="text-xs leading-normal">
                        Complete all 5 tasks to 100% to earn <strong className="text-sm font-black">{rewardDays} days of free usage</strong> added to your account! 
                        {!isComplete && <span className="block mt-1 text-slate-500 italic font-semibold">⚠️ Note: Less than 100% progress receives no rewards.</span>}
                      </p>
                    </div>
                  )}
                </div>

                {/* Overall Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500 uppercase tracking-wider">Overall Progress</span>
                    <span className={isComplete ? "text-emerald-600" : "text-indigo-600"}>
                      {overallProgress}% Complete
                    </span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Required Configuration Tasks:
                  </span>
                  
                  <div className="space-y-3">
                    {/* Classes Check */}
                    <div className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
                      classesDone ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className={`p-2 rounded-lg shrink-0 ${
                        classesDone ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        <Layers className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-900">Add Classes</p>
                          {classesDone ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                          ) : (
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              {classesList.length} / 5
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Subjects Check */}
                    <div className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
                      subjectsDone ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className={`p-2 rounded-lg shrink-0 ${
                        subjectsDone ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-900">Add Subjects</p>
                          {subjectsDone ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                          ) : (
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              {subjectsList.length} / 5
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Teachers Check */}
                    <div className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
                      teachersDone ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className={`p-2 rounded-lg shrink-0 ${
                        teachersDone ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-900">Add Teachers</p>
                          {teachersDone ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                          ) : (
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              {teachersList.length} / 5
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Students Check */}
                    <div className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
                      studentsDone ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className={`p-2 rounded-lg shrink-0 ${
                        studentsDone ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-900">Add Students</p>
                          {studentsDone ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                          ) : (
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              {stats.students} / 20
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Allocations Check */}
                    <div className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
                      assignmentsDone ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className={`p-2 rounded-lg shrink-0 ${
                        assignmentsDone ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-900">Subject Allocations</p>
                          {assignmentsDone ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                          ) : (
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              {stats.assignments} / 10
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Classes Wizard Form */}
            {currentStep === 3 && (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-base font-bold text-slate-950 flex items-center gap-2">
                      <Layers className="h-5 w-5 text-indigo-600" />
                      Step 2: Configure Classes ({classesList.length} / 5)
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Create at least 5 classes (e.g. Form 1A, Grade 8 Blue) to group and manage your student roster.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBulkImportTab('classes');
                      setShowBulkImport(true);
                    }}
                    className="h-8 text-xs font-bold text-indigo-600 border-indigo-100 hover:bg-indigo-50/50"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                    Import in Bulk
                  </Button>
                </div>

                {classesDone ? (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-emerald-900 text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Classes configuration complete! Feel free to add more below or proceed to subjects.</span>
                  </div>
                ) : null}

                {/* Existing Classes List */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Existing Classes</span>
                  {classesList.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto p-1">
                      {classesList.map((c: any) => (
                        <span key={c.id} className="bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs font-semibold px-2.5 py-1 rounded-lg">
                          {c.name} ({c.level})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No classes created yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: Subjects Wizard Form */}
            {currentStep === 4 && (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-base font-bold text-slate-950 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-indigo-600" />
                      Step 3: Configure Subjects ({subjectsList.length} / 5)
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Add at least 5 subjects to your school curriculum.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBulkImportTab('subjects');
                      setShowBulkImport(true);
                    }}
                    className="h-8 text-xs font-bold text-indigo-600 border-indigo-100 hover:bg-indigo-50/50"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                    Import in Bulk
                  </Button>
                </div>

                {subjectsDone ? (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-emerald-900 text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Subjects configuration complete! Feel free to add more below or proceed.</span>
                  </div>
                ) : null}

                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3">
                  {/* Popular subjects recommendations */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">💡 Popular Subjects:</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-6 px-2 text-indigo-600 hover:bg-indigo-50"
                        onClick={() => {
                          const subs = recommendations.subjects && recommendations.subjects.length > 0
                            ? recommendations.subjects
                            : [{name: 'Mathematics'}, {name: 'English Language'}, {name: 'Biology'}, {name: 'Chemistry'}, {name: 'Physics'}, {name: 'Geography'}, {name: 'History'}, {name: 'Computer Studies'}];
                          setSelectedPopularSubjects(subs.map((s: any) => s.name));
                        }}
                      >
                        Select All
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(recommendations.subjects && recommendations.subjects.length > 0 ? recommendations.subjects : [
                        { name: 'Mathematics', code: 'MATH' },
                        { name: 'English Language', code: 'ENG' },
                        { name: 'Biology', code: 'BIO' },
                        { name: 'Chemistry', code: 'CHEM' },
                        { name: 'Physics', code: 'PHYS' },
                        { name: 'Geography', code: 'GEOG' },
                        { name: 'History', code: 'HIST' },
                        { name: 'Computer Studies', code: 'COMP' }
                      ]).map(sub => {
                        const isSelected = selectedPopularSubjects.includes(sub.name);
                        return (
                          <button
                            key={sub.name}
                            type="button"
                            onClick={() => {
                              setSelectedPopularSubjects(prev =>
                                prev.includes(sub.name)
                                  ? prev.filter(p => p !== sub.name)
                                  : [...prev, sub.name]
                              );
                            }}
                            className={`text-xs font-semibold transition-colors border px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                : 'bg-white hover:bg-indigo-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                            {sub.name}
                          </button>
                        );
                      })}

                      {/* Add Custom Subject Input */}
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2 py-1 shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                        <Input
                          value={customSubjectInput}
                          onChange={(e) => setCustomSubjectInput(e.target.value)}
                          placeholder="Type custom subject..."
                          className="h-7 w-[140px] text-xs border-0 focus-visible:ring-0 px-2 py-0 bg-transparent placeholder:text-slate-400"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const trimmed = customSubjectInput.trim();
                              if (trimmed && !selectedPopularSubjects.includes(trimmed)) {
                                setSelectedPopularSubjects(prev => [...prev, trimmed]);
                                setRecommendations(prev => ({
                                  ...prev,
                                  subjects: [...(prev.subjects || []), { name: trimmed, code: trimmed.substring(0, 4).toUpperCase() }]
                                }));
                                setCustomSubjectInput('');
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = customSubjectInput.trim();
                            if (trimmed && !selectedPopularSubjects.includes(trimmed)) {
                              setSelectedPopularSubjects(prev => [...prev, trimmed]);
                              setRecommendations(prev => ({
                                ...prev,
                                subjects: [...(prev.subjects || []), { name: trimmed, code: trimmed.substring(0, 4).toUpperCase() }]
                              }));
                              setCustomSubjectInput('');
                            }
                          }}
                          className="h-6 w-6 shrink-0 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-100 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {selectedPopularSubjects.length > 0 && (
                      <Button
                        type="button"
                        onClick={handleAddBulkSuggestions}
                        className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold h-10 mt-2 flex items-center justify-center gap-1.5 border border-indigo-200 shadow-sm"
                        disabled={isSubmittingSubject}
                      >
                        {isSubmittingSubject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Add Selected Subjects ({selectedPopularSubjects.length})
                      </Button>
                    )}
                  </div>
                </div>

                {/* Existing Subjects List */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Existing Subjects</span>
                  {subjectsList.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto p-1">
                      {subjectsList.map((s: any) => (
                        <span key={s.id} className="bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs font-semibold px-2.5 py-1 rounded-lg">
                          {s.name} ({s.code})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No subjects created yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: Teachers Wizard Form */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-base font-bold text-slate-950 flex items-center gap-2">
                      <Users className="h-5 w-5 text-indigo-600" />
                      Step 4: Add Teachers ({teachersList.length} / 5)
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Add at least 5 teachers to your school to assign them classes and subjects.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setBulkImportTab('teachers');
                      setShowBulkImport(true);
                    }}
                    className="h-8 text-xs font-bold text-indigo-600 border-indigo-100 hover:bg-indigo-50/50"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                    Import in Bulk
                  </Button>
                </div>

                {teachersDone ? (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-emerald-900 text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Teachers configuration complete! You can add more or proceed to allocations.</span>
                  </div>
                ) : null}

                {/* Existing Teachers List */}
                <div className="space-y-2 mt-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Existing Teachers</span>
                  {teachersList.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto p-1">
                      {teachersList.map((t: any) => (
                        <span key={t.id} className="bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs font-semibold px-2.5 py-1 rounded-lg">
                          {t.fullName || `${t.firstName} ${t.lastName}`}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No teachers added yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 6: Students Wizard Form */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-base font-bold text-slate-950 flex items-center gap-2">
                      <Users className="h-5 w-5 text-indigo-600" />
                      Step 5: Add Students ({stats.students} / 20)
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Add at least 20 students to your school.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setBulkImportTab('students');
                      setShowBulkImport(true);
                    }}
                    className="h-8 text-xs font-bold text-indigo-600 border-indigo-100 hover:bg-indigo-50/50"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                    Import in Bulk
                  </Button>
                </div>

                {studentsDone ? (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-emerald-900 text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Students configuration complete! You can add more or proceed.</span>
                  </div>
                ) : null}

              </div>
            )}

            {/* STEP 7: Allocations Wizard Form */}
            {currentStep === 7 && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-bold text-slate-950 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-indigo-600" />
                    Step 6: Teacher Allocations ({stats.assignments} / 10)
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Assign subjects and classes to teachers. Requires a minimum of 10 allocations.
                  </p>
                </div>

                {assignmentsDone ? (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-emerald-900 text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Allocations complete! You are ready to claim your trial extension reward.</span>
                  </div>
                ) : null}

                <form onSubmit={handleAddAllocationSubmit} className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Assign Subject & Teacher</span>

                  <div className="space-y-2.5">
                    {/* Class Selection */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Select Class
                      </Label>
                      <Select value={allocClassId} onValueChange={setAllocClassId}>
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue placeholder="Select class..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {classesList.map((c: any) => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Subject Selection */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Select Subject
                      </Label>
                      <Select value={allocSubjectId} onValueChange={setAllocSubjectId}>
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue placeholder="Select subject..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {subjectsList.map((s: any) => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.code})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Teacher Selection */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Select Teacher
                      </Label>
                      <Select value={allocTeacherId} onValueChange={setAllocTeacherId}>
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue placeholder="Select teacher..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {teachersList.map((t: any) => (
                            <SelectItem key={t.id} value={t.id.toString()}>
                              {t.fullName || `${t.firstName} ${t.lastName}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold h-9 mt-1 flex items-center justify-center gap-1.5"
                    disabled={isSubmittingAlloc}
                  >
                    {isSubmittingAlloc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Allocate Teacher
                  </Button>
                </form>
              </div>
            )}

            {/* STEP 8: Claim Reward Section */}
            {currentStep === 8 && (
              <div className="space-y-6 flex flex-col items-center justify-center text-center py-6">
                {isComplete ? (
                  <>
                    <div className="h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center mb-2 animate-bounce border border-amber-200">
                      <Trophy className="h-10 w-10 text-amber-600" />
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-xl font-black text-slate-950">
                        🎉 Configuration 100% Completed!
                      </h4>
                      <p className="text-sm text-slate-600 max-w-[400px]">
                        Congratulations! You have configured all classes, subjects, and allocated teacher schedules successfully. You can now claim your trial extension.
                      </p>
                    </div>

                    {!rewardClaimed ? (
                      <Button
                        className="w-full max-w-[320px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all duration-200 py-6 text-base rounded-xl flex items-center justify-center gap-2 group shadow-lg shadow-emerald-600/10 mt-4"
                        onClick={handleClaimClick}
                        disabled={claiming}
                      >
                        {claiming ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Gift className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        )}
                        Claim {rewardDays} Free Days!
                      </Button>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-900 text-sm font-semibold flex items-center gap-2 mt-4 shadow-sm">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <span>Trial successfully extended by {rewardDays} days!</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="h-20 w-20 rounded-full bg-indigo-50 flex items-center justify-center mb-2 border border-indigo-100 text-indigo-500">
                      <Gift className="h-10 w-10" />
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-lg font-black text-slate-950">
                        Configuration Incomplete
                      </h4>
                      <p className="text-sm text-slate-500 max-w-[400px]">
                        Please complete all configuration steps to 100% to unlock your <strong className="text-slate-800">{rewardDays}-day trial extension</strong>.
                      </p>
                    </div>

                    <div className="space-y-2.5 w-full max-w-[320px] mt-4">
                      {/* Classes Indicator */}
                      <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs font-bold">
                        <span className="text-slate-600 uppercase tracking-wider">Classes (min 5)</span>
                        <span className={classesDone ? "text-emerald-600" : "text-amber-600"}>
                          {classesList.length} / 5
                        </span>
                      </div>

                      {/* Subjects Indicator */}
                      <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs font-bold">
                        <span className="text-slate-600 uppercase tracking-wider">Subjects (min 5)</span>
                        <span className={subjectsDone ? "text-emerald-600" : "text-amber-600"}>
                          {subjectsList.length} / 5
                        </span>
                      </div>

                      {/* Teachers Indicator */}
                      <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs font-bold">
                        <span className="text-slate-600 uppercase tracking-wider">Teachers (min 5)</span>
                        <span className={teachersDone ? "text-emerald-600" : "text-amber-600"}>
                          {teachersList.length} / 5
                        </span>
                      </div>

                      {/* Students Indicator */}
                      <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs font-bold">
                        <span className="text-slate-600 uppercase tracking-wider">Students (min 20)</span>
                        <span className={studentsDone ? "text-emerald-600" : "text-amber-600"}>
                          {stats.students} / 20
                        </span>
                      </div>

                      {/* Allocations Indicator */}
                      <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs font-bold">
                        <span className="text-slate-600 uppercase tracking-wider">Teacher Allocations (min 10)</span>
                        <span className={assignmentsDone ? "text-emerald-600" : "text-amber-600"}>
                          {stats.assignments} / 10
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full max-w-[320px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all duration-200 py-6 text-sm rounded-xl flex items-center justify-center gap-2 group shadow-lg shadow-indigo-600/10 mt-6"
                      onClick={() => setCurrentStep(classesDone ? (subjectsDone ? (teachersDone ? (studentsDone ? 7 : 6) : 5) : 4) : 3)}
                    >
                      Continue Setup
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Navigation Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {currentStep > 1 && (
              <Button
                variant="outline"
                className="flex-1 sm:flex-initial h-11 text-xs font-bold uppercase tracking-wider border-slate-300 text-slate-700 hover:bg-slate-100"
                onClick={() => setCurrentStep(prev => prev - 1)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            {currentStep < 8 && (
              <Button
                className="flex-1 sm:flex-initial h-11 text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10"
                onClick={() => setCurrentStep(prev => prev + 1)}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>

          {!isMandatory && (
            <Button
              variant="ghost"
              className="w-full sm:w-auto hover:bg-slate-200 text-slate-600 hover:text-slate-900 font-bold h-11 text-xs uppercase tracking-wider rounded-xl"
              onClick={onSnooze}
            >
              <Clock className="h-4 w-4 mr-2" />
              Remind me in 1 day
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Bulk Import Sub-Dialog */}
    <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
      <DialogContent className="sm:max-w-[700px] bg-white border-slate-200 rounded-2xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
        {bulkImportTab === 'teachers' ? (
          <BulkTeacherImport 
            onImportSuccess={() => {
              setShowBulkImport(false);
              fetchWizardData();
              if (onRefreshStats) onRefreshStats();
            }} 
          />
        ) : bulkImportTab === 'students' ? (
          <BulkStudentImport 
            onImportSuccess={() => {
              setShowBulkImport(false);
              fetchWizardData();
              if (onRefreshStats) onRefreshStats();
            }} 
          />
        ) : (
          <BulkAcademicImport 
            onImportSuccess={() => {
              setShowBulkImport(false);
              fetchWizardData();
              if (onRefreshStats) onRefreshStats();
            }} 
            defaultTab={bulkImportTab === 'classes' ? 'classes' : 'subjects'}
          />
        )}
      </DialogContent>
    </Dialog>
  </>
  );
}
