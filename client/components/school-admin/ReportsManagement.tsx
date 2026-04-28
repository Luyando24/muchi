import React, { useState, useEffect } from 'react';
import ExportMasterSheetModal from './ExportMasterSheetModal';
import ExportResultsAnalysisModal from './ExportResultsAnalysisModal';
import {
  FileText,
  Download,
  Plus,
  Trash2,
  Loader2,
  GraduationCap,
  DollarSign,
  Users,
  Building2,
  Filter,
  BarChart3,
  ClipboardCheck,
  PieChart as PieChartIcon,
  TrendingUp,
  RefreshCcw,
  ChevronRight,
  UserCheck,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Users2,
  Trophy,
  Medal,
  Star,
  AlertCircle,
  TrendingDown,
  BookOpen,
  ShieldAlert
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { syncFetch } from '@/lib/syncService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

import { cn } from "@/lib/utils";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#71717a'];

export default function ReportsManagement({ isTeacherPortal = false, defaultTab = "overview" }: { isTeacherPortal?: boolean, defaultTab?: string }) {
  const [liveStats, setLiveStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [activeScreen, setActiveScreen] = useState(defaultTab);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [masterSheetData, setMasterSheetData] = useState<{ subjects: any[], students: any[] } | null>(null);
  const [selectedExamType, setSelectedExamType] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [masterSheetLoading, setMasterSheetLoading] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [resultsAnalysis, setResultsAnalysis] = useState<any>(null);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>("all");
  const [selectedAnalysisClassId, setSelectedAnalysisClassId] = useState<string>("all");
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [selectedMasterGradeLevel, setSelectedMasterGradeLevel] = useState<string>("all");
  const [selectedMasterSubjectId, setSelectedMasterSubjectId] = useState<string>("all");
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  
  const { toast } = useToast();
  
  const getGradeInfo = (pct: number) => {
    if (pct >= 75) return { label: 'Distinction', color: 'bg-emerald-500 hover:bg-emerald-600', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' };
    if (pct >= 60) return { label: 'Merit', color: 'bg-blue-500 hover:bg-blue-600', text: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' };
    if (pct >= 50) return { label: 'Credit', color: 'bg-indigo-500 hover:bg-indigo-600', text: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30' };
    if (pct >= 40) return { label: 'Pass', color: 'bg-orange-500 hover:bg-orange-600', text: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30' };
    return { label: 'Fail', color: 'bg-red-500 hover:bg-red-600', text: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30' };
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Auto-select first class when available
  useEffect(() => {
    if (availableClasses.length > 0) {
      if (selectedClassId === 'all') setSelectedClassId(availableClasses[0].id);
      if (selectedAnalysisClassId === 'all') setSelectedAnalysisClassId(availableClasses[0].id);
    }
  }, [availableClasses]);

  // Auto-select first subject when available
  useEffect(() => {
    if (availableSubjects.length > 0) {
      if (selectedSubjectId === 'all') setSelectedSubjectId(availableSubjects[0].id);
      if (selectedMasterSubjectId === 'all') setSelectedMasterSubjectId(availableSubjects[0].id);
    }
  }, [availableSubjects]);

  useEffect(() => {
    if (selectedTerm || selectedYear || selectedExamType) {
      fetchLiveStats();
    }
  }, [selectedTerm, selectedYear, selectedExamType]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', session.user.id)
        .single();

      if (!profile) return;

      const { data: settings } = await supabase
        .from('schools')
        .select('*')
        .eq('id', profile.school_id)
        .maybeSingle();

      if (settings) {
        setSchoolSettings(settings);
        setSelectedTerm(settings.current_term || "Term 1");
        setSelectedYear(settings.academic_year || new Date().getFullYear().toString());
        
        // Dynamically set default exam type from school settings
        if (settings.exam_types && settings.exam_types.length > 0) {
          // If 'End of Term' is available, prefer it as default, otherwise pick the first one
          const preferredDefault = "End of Term";
          const hasPreferred = settings.exam_types.some((t: string) => t === preferredDefault);
          setSelectedExamType(hasPreferred ? preferredDefault : settings.exam_types[0]);
        } else {
          setSelectedExamType("End of Term");
        }
      } else {
        setSelectedTerm("Term 1");
        setSelectedYear(new Date().getFullYear().toString());
        setSelectedExamType("End of Term");
      }
      
      // Fetch classes and subjects to populate filters in multiple tabs
      fetchClasses();
      fetchSubjects();
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchLiveStats = async () => {
    try {
      setIsRefreshing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const queryParams = new URLSearchParams();
      if (selectedTerm) queryParams.append('term', selectedTerm);
      if (selectedYear) queryParams.append('academic_year', selectedYear);
      if (selectedExamType) queryParams.append('examType', selectedExamType);

      const data = await syncFetch(`/api/school/reports/live-stats?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        cacheKey: `reports-live-stats-${selectedTerm}-${selectedYear}`
      });

      setLiveStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch live statistics",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  const fetchMasterSheet = async () => {
    if (!selectedTerm || !selectedYear || !selectedExamType) return;
    try {
      setMasterSheetLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const queryParams = new URLSearchParams({
        term: selectedTerm,
        academic_year: selectedYear,
        examType: selectedExamType,
        classId: selectedClassId,
        gradeLevel: selectedMasterGradeLevel,
        subjectId: selectedMasterSubjectId,
        page: currentPage.toString(),
        limit: pageSize.toString()
      });

      const res = await syncFetch(`/api/school/reports/master-scoresheet?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cacheKey: `master-scoresheet-${selectedTerm}-${selectedYear}-${selectedExamType}-${selectedClassId}-${currentPage}-${pageSize}`
      });

      setMasterSheetData({ subjects: res.subjects, students: res.students });
      setTotalRecords(res.metadata.total);
      setTotalPages(res.metadata.totalPages);
    } catch (error: any) {
      console.error('Error fetching master sheet:', error);
      toast({
        title: "Error",
        description: "Failed to fetch master score sheet",
        variant: "destructive",
      });
    } finally {
      setMasterSheetLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const endpoint = isTeacherPortal ? '/api/teacher/classes' : '/api/school/classes?limit=500';
      const cacheKey = isTeacherPortal ? 'teacher-classes' : 'school-classes';

      const data = await syncFetch(endpoint, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cacheKey: cacheKey
      });
      const classes = data?.data || data || [];
      setAvailableClasses(classes);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const endpoint = isTeacherPortal ? '/api/teacher/subjects' : '/api/school/subjects?limit=500';
      const cacheKey = isTeacherPortal ? 'teacher-subjects-brief' : 'school-subjects-brief';

      const data = await syncFetch(endpoint, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cacheKey: cacheKey
      });
      const subjects = data || [];
      setAvailableSubjects(subjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  useEffect(() => {
    if (activeScreen === 'master-sheet') {
      fetchMasterSheet();
      if (availableClasses.length === 0) fetchClasses();
      if (availableSubjects.length === 0) fetchSubjects();
    }
    if (activeScreen === 'results-analysis') {
      if (availableClasses.length === 0) fetchClasses();
      if (availableSubjects.length === 0) fetchSubjects();
    }
  }, [activeScreen, selectedExamType, selectedClassId, selectedTerm, selectedYear, currentPage, pageSize, selectedMasterGradeLevel, selectedMasterSubjectId]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedExamType, selectedClassId, selectedTerm, selectedYear, selectedMasterGradeLevel, selectedMasterSubjectId]);

  const fetchResultsAnalysis = async () => {
    if (!selectedTerm || !selectedYear) return;
    try {
      setIsAnalysisLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const queryParams = new URLSearchParams({
        term: selectedTerm,
        academic_year: selectedYear,
        examType: selectedExamType,
        gradeLevel: selectedGradeLevel,
        classId: selectedAnalysisClassId,
        subjectId: selectedSubjectId
      });

      const res = await syncFetch(`/api/school/reports/results-analysis?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cacheKey: `results-analysis-${selectedTerm}-${selectedYear}-${selectedExamType}-${selectedGradeLevel}-${selectedAnalysisClassId}-${selectedSubjectId}`
      });

      setResultsAnalysis(res);
    } catch (error: any) {
      console.error('Error fetching results analysis:', error);
      toast({
        title: "Error",
        description: "Failed to fetch results analysis",
        variant: "destructive",
      });
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  useEffect(() => {
    if (activeScreen === 'results-analysis') {
      fetchResultsAnalysis();
    }
  }, [activeScreen, selectedExamType, selectedGradeLevel, selectedAnalysisClassId, selectedSubjectId, selectedTerm, selectedYear]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-slate-500 animate-pulse">Gathering real-time school data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Insights Center</h2>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium">Real-time analytical overview of school performance.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border shadow-sm">
          <div className="flex items-center gap-1.5 px-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger className="w-[100px] md:w-[130px] h-8 border-none focus:ring-0 shadow-none text-xs">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Terms</SelectItem>
                <SelectItem value="Term 1">Term 1</SelectItem>
                <SelectItem value="Term 2">Term 2</SelectItem>
                <SelectItem value="Term 3">Term 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block" />

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[80px] md:w-[110px] h-8 border-none focus:ring-0 shadow-none text-xs">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Years</SelectItem>
              {[2024, 2025, 2026, 2027].map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={fetchLiveStats}
            disabled={isRefreshing}
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Tabs value={activeScreen} onValueChange={setActiveScreen} className="space-y-6">
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <TabsList className="inline-flex w-full md:grid md:grid-cols-7 min-w-max md:min-w-0 bg-slate-100/50 dark:bg-slate-900/50 p-1 rounded-xl">
            <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            {!isTeacherPortal && <TabsTrigger value="academic" className="flex-1">Academic</TabsTrigger>}
            <TabsTrigger value="master-sheet" className="flex-1">Master Sheet</TabsTrigger>
            <TabsTrigger value="results-analysis" className="flex-1">Results Analysis</TabsTrigger>
            {!isTeacherPortal && (
              <>
                <TabsTrigger value="top-students" className="flex-1">Top Students</TabsTrigger>
                <TabsTrigger value="support" className="flex-1">Support Needed</TabsTrigger>
                <TabsTrigger value="finance" className="flex-1">Finance</TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 shadow-none">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Classes</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{liveStats?.performance?.byClass?.length || 0}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 shadow-none">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
                  <ClipboardCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Attendance Rate</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{liveStats?.summary?.attendanceRate || 0}%</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20 shadow-none">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg. Performance</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{liveStats?.summary?.averageGrade || 0}%</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/20 shadow-none">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                  {isTeacherPortal ? <Users className="h-6 w-6" /> : <UserCheck className="h-6 w-6" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{isTeacherPortal ? 'Assigned Students' : 'Total Staff'}</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {isTeacherPortal ? (liveStats?.summary?.totalStudents || 0) : (liveStats?.summary?.totalStaff || 0)}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance by Class</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={liveStats?.performance?.byClass}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="average" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Attendance Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={liveStats?.attendance} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5}>
                      {liveStats?.attendance?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Academic Tab */}
        <TabsContent value="academic" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top 10 Subjects</CardTitle>
                <CardDescription>Average scores for the best performing subjects this term</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={liveStats?.performance?.bySubject} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="average" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="h-[400px] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-lg">Grade Distribution by Gender</CardTitle>
                <CardDescription>Academic outcomes compared with population context</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {liveStats?.performance?.genderPerformance?.filter((g: any) => g.count > 0).map((gender: any) => {
                    const totalInGender = liveStats?.demographics?.find((d: any) => d.name === gender.name)?.value || 0;
                    const participationRate = totalInGender > 0 ? Math.round((gender.count / totalInGender) * 100) : 0;

                    return (
                      <div key={gender.name} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${gender.name === 'Male' ? 'bg-blue-500' : gender.name === 'Female' ? 'bg-pink-500' : 'bg-slate-400'}`} />
                            {gender.name} Students
                          </h4>
                          <div className="text-right">
                            <div className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">{gender.average}% Average</div>
                            <div className="text-[9px] md:text-[10px] text-slate-500 font-medium">
                              {gender.count} of {totalInGender} Students ({participationRate}% Participation)
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                          {Object.entries(gender.grades).map(([label, count]: any, idx) => {
                            const width = (count / gender.count) * 100;
                            return (
                              <div
                                key={label}
                                title={`${label}: ${count}`}
                                className="h-full"
                                style={{ width: `${width}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                              />
                            );
                          })}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          {Object.entries(gender.grades).map(([label, count]: any, idx) => (
                            <div key={label} className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">{label}: {count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {(!liveStats?.performance?.genderPerformance || liveStats.performance.genderPerformance.filter((g: any) => g.count > 0).length === 0) && (
                    <div className="text-center py-10 opacity-50">No gendered performance data available.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">School-wide Grade Distribution</CardTitle>
              <CardDescription>Number of students per grade category (Distinction, Merit, etc.)</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(liveStats?.performance?.gradeDistribution?.school || {}).map(([name, value]) => ({ name, value }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {Object.entries(liveStats?.performance?.gradeDistribution?.school || {}).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Subject Performance Ranking</CardTitle>
                <CardDescription>Sorted by average score across all years</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {liveStats?.performance?.bySubject?.map((subj: any, idx: number) => (
                    <div key={subj.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                        <span className="font-medium">{subj.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-24 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 hidden md:block">
                          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${subj.average}%` }} />
                        </div>
                        <span className="font-bold text-blue-600">{subj.average}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Class Performance Ranking</CardTitle>
                <CardDescription>Overall performance of classes for selected term</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {liveStats?.performance?.byClass?.sort((a: any, b: any) => b.average - a.average).map((cls: any, idx: number) => (
                    <div key={cls.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                        <span className="font-medium">{cls.name}</span>
                      </div>
                      <Badge className={idx === 0 ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-blue-100 text-blue-700 hover:bg-blue-100"}>
                        {cls.average}% Average
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-slate-50 dark:bg-slate-900 border-none shadow-none">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-500">Highest Class Average</p>
                <div className="flex justify-between items-end mt-2">
                  <h4 className="text-xl font-bold">{liveStats?.performance?.byClass?.[0]?.name || 'N/A'}</h4>
                  <span className="text-emerald-600 font-bold text-lg">{liveStats?.performance?.byClass?.[0]?.average || 0}%</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-50 dark:bg-slate-900 border-none shadow-none">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-500">Top Subject</p>
                <div className="flex justify-between items-end mt-2">
                  <h4 className="text-xl font-bold">{liveStats?.performance?.bySubject?.[0]?.name || 'N/A'}</h4>
                  <span className="text-emerald-600 font-bold text-lg">{liveStats?.performance?.bySubject?.[0]?.average || 0}%</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-900/10 border-none shadow-none cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors" onClick={() => { window.location.hash = '#data-audit'; }}>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Data Integrity</p>
                <div className="flex justify-between items-end mt-2">
                  <h4 className="text-xl font-bold">Grade Anomalies</h4>
                  <ShieldAlert className="h-6 w-6 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Master Score Sheet Tab */}
        <TabsContent value="master-sheet" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div>
                <CardTitle className="text-xl">Master Score Sheet</CardTitle>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-3 w-full">
                <div className="flex flex-nowrap items-center gap-2 w-full md:w-auto">
                  <div className="flex-1 min-w-0 md:w-[150px] md:flex-none">
                    <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                      <SelectTrigger className="h-9 text-[10px] md:text-sm px-2">
                        <SelectValue placeholder="Assessment" />
                      </SelectTrigger>
                      <SelectContent>
                        {(schoolSettings?.exam_types && schoolSettings.exam_types.length > 0) ? (
                          schoolSettings.exam_types.map((type: string) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="Mid Term">Mid Term</SelectItem>
                            <SelectItem value="End of Term">End of Term</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {!isTeacherPortal && (
                    <div className="flex-1 min-w-0 md:w-[150px] md:flex-none">
                      <Select value={selectedMasterGradeLevel} onValueChange={(v) => {
                        setSelectedMasterGradeLevel(v);
                        setSelectedClassId('all');
                      }}>
                        <SelectTrigger className="h-9 text-[10px] md:text-sm px-2">
                          <SelectValue placeholder="Grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Grades</SelectItem>
                          {Array.from(new Set(
                            availableClasses
                              .map((c: any) => c.level || (c.name.includes('Grade') ? c.name.split(' ').slice(0, 2).join(' ') : c.name))
                              .filter(Boolean)
                          ))
                          .sort((a: any, b: any) => String(a).localeCompare(String(b), undefined, { numeric: true }))
                          .map(g => (
                            <SelectItem key={g as string} value={g as string}>{g as string}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex-1 min-w-0 md:w-[150px] md:flex-none">
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                      <SelectTrigger className="h-9 text-[10px] md:text-sm px-2">
                        <SelectValue placeholder="Class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Entire School</SelectItem>
                        {availableClasses
                          .filter(c => selectedMasterGradeLevel === 'all' || c.level === selectedMasterGradeLevel || c.name.startsWith(`Grade ${selectedMasterGradeLevel}`))
                          .map((cls: any) => (
                            <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 min-w-0 md:w-[150px] md:flex-none">
                    <Select value={selectedMasterSubjectId} onValueChange={setSelectedMasterSubjectId}>
                      <SelectTrigger className="h-9 text-[10px] md:text-sm px-2">
                        <SelectValue placeholder="Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {availableSubjects.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="w-full md:w-auto">
                  <ExportMasterSheetModal 
                    term={selectedTerm}
                    year={selectedYear}
                    examType={selectedExamType}
                    classId={selectedClassId}
                    className={selectedClassId === 'all' ? 'Entire School' : availableClasses.find((c: any) => c.id === selectedClassId)?.name || 'Selected Class'}
                    gradeLevel={selectedMasterGradeLevel}
                    gradeName={selectedMasterGradeLevel === 'all' ? 'All Grades' : selectedMasterGradeLevel}
                    subjectId={selectedMasterSubjectId}
                    subjectName={availableSubjects.find(s => s.id === selectedMasterSubjectId)?.name}
                    schoolName={schoolSettings?.school_name}
                    disabled={!masterSheetData?.students.length}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {masterSheetLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                  <p className="text-slate-500 font-medium">Preparing master score sheet data...</p>
                </div>
              ) : masterSheetData?.students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                  <ClipboardCheck className="h-12 w-12 opacity-20" />
                  <p>No results found for the selected criteria.</p>
                </div>
              ) : (
                <>
                  {/* Desktop View Table */}
                  <div className="hidden md:block overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                  <Table className="border-separate border-spacing-0">
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                      <TableRow>
                        <TableHead className="w-12 md:w-16 font-bold text-slate-900 dark:text-white border-r border-b border-dotted border-slate-300 dark:border-slate-700 text-[10px] md:text-sm">Rank</TableHead>
                        <TableHead className="min-w-[150px] md:min-w-[200px] font-bold text-slate-900 dark:text-white sticky left-0 bg-slate-50 dark:bg-slate-900/50 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r border-b border-dotted border-slate-300 dark:border-slate-700 text-[10px] md:text-sm">Student Name</TableHead>
                        <TableHead className="min-w-[80px] md:min-w-[100px] font-bold text-slate-900 dark:text-white border-r border-b border-dotted border-slate-300 dark:border-slate-700 text-[10px] md:text-sm">Class</TableHead>
                        {masterSheetData?.subjects.map(subject => (
                          <TableHead key={subject.id} className="text-center font-bold text-slate-900 dark:text-white min-w-[70px] md:min-w-[100px] border-r border-b border-dotted border-slate-300 dark:border-slate-700 text-[10px] md:text-sm px-1">
                            {subject.name}
                          </TableHead>
                        ))}
                        <TableHead className="text-center font-bold text-slate-900 dark:text-white border-r border-b border-dotted border-slate-300 dark:border-slate-700 text-[10px] md:text-sm">Total</TableHead>
                        <TableHead className="text-center font-bold text-blue-600 min-w-[70px] md:min-w-[100px] border-b border-dotted border-slate-300 dark:border-slate-700 text-[10px] md:text-sm">Avg %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {masterSheetData?.students.map((student) => (
                        <TableRow key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <TableCell className="font-bold text-slate-500 border-r border-b border-dotted border-slate-200 dark:border-slate-800/80">#{student.rank}</TableCell>
                          <TableCell className="font-medium sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r border-b border-dotted border-slate-200 dark:border-slate-800/80">
                            <div>
                              <div className="text-slate-900 dark:text-white">{student.name}</div>
                              <div className="text-[10px] text-slate-500">{student.studentNumber}</div>
                            </div>
                          </TableCell>
                          <TableCell className="border-r border-b border-dotted border-slate-200 dark:border-slate-800/80">
                            <Badge variant="outline" className="font-normal text-xs">{student.className}</Badge>
                          </TableCell>
                          {masterSheetData?.subjects.map(subject => {
                            const score = student.grades[subject.id];
                            const gradeInfo = score !== undefined ? getGradeInfo(score) : null;
                            return (
                              <TableCell key={subject.id} className="text-center border-r border-b border-dotted border-slate-200 dark:border-slate-800/80 p-2">
                                {score !== undefined ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className={cn("font-bold text-sm", gradeInfo?.text)}>
                                      {score}%
                                    </span>
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "text-[8px] px-1 py-0 h-3 leading-none uppercase tracking-tighter border-none font-black",
                                        gradeInfo?.bg,
                                        gradeInfo?.text
                                      )}
                                    >
                                      {gradeInfo?.label}
                                    </Badge>
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center font-bold text-slate-700 dark:text-slate-300 border-r border-b border-dotted border-slate-200 dark:border-slate-800/80">
                            {student.total}
                          </TableCell>
                          <TableCell className="text-center border-b border-dotted border-slate-200 dark:border-slate-800/80">
                            <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-14 justify-center">
                              {student.average}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card Layout */}
                <div className="md:hidden space-y-4 px-4 py-6">
                  {masterSheetData?.students.map(student => (
                    <div key={student.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] font-black border-blue-200 text-blue-600 bg-blue-50">#{student.rank}</Badge>
                            <span className="text-xs font-bold text-slate-500">{student.className}</span>
                          </div>
                          <h4 className="font-black text-slate-900 dark:text-white text-lg tracking-tight leading-tight">{student.name}</h4>
                          <p className="text-[10px] text-slate-500 font-medium">{student.studentNumber}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Average</p>
                          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 leading-tight">{student.average}%</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {masterSheetData.subjects.map(subject => {
                          const score = student.grades[subject.id];
                          const gradeInfo = score !== undefined ? getGradeInfo(score) : null;
                          return (
                            <div key={subject.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-[60px]">
                              <p className="text-[9px] font-bold text-slate-500 uppercase truncate leading-none">{subject.name}</p>
                              <div className="flex items-center justify-between mt-auto">
                                <span className={cn("text-sm font-black", gradeInfo?.text || "text-slate-300")}>
                                  {score !== undefined ? `${score}%` : '-'}
                                </span>
                                {gradeInfo && (
                                  <Badge className={cn("h-4 text-[9px] px-1 font-black leading-none border-none", gradeInfo.bg, gradeInfo.text)}>
                                    {gradeInfo.label[0]}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Score</span>
                        <span className="text-lg font-black text-slate-900 dark:text-white">{student.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            </CardContent>
            {masterSheetData?.students.length > 0 && !masterSheetLoading && (
              <div className="border-t border-slate-100 dark:border-slate-800 px-6">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={totalRecords}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Results Analysis Tab */}
        <TabsContent value="results-analysis" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div>
                <CardTitle className="text-xl">Results Analysis Report</CardTitle>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-3 w-full">
                <div className="flex flex-nowrap items-center gap-2 w-full md:w-auto">
                  <div className="flex-1 min-w-0 md:w-[150px] md:flex-none">
                    <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                      <SelectTrigger className="h-9 text-[10px] md:text-sm px-2">
                        <SelectValue placeholder="Assessment" />
                      </SelectTrigger>
                      <SelectContent>
                        {(schoolSettings?.exam_types && schoolSettings.exam_types.length > 0) ? (
                          schoolSettings.exam_types.map((type: string) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="Mid Term">Mid Term</SelectItem>
                            <SelectItem value="End of Term">End of Term</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {!isTeacherPortal && (
                    <div className="flex-1 min-w-0 md:w-[150px] md:flex-none">
                      <Select value={selectedGradeLevel} onValueChange={(v) => {
                        setSelectedGradeLevel(v);
                        setSelectedAnalysisClassId('all');
                      }}>
                        <SelectTrigger className="h-9 text-[10px] md:text-sm px-2">
                          <SelectValue placeholder="Grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Grades</SelectItem>
                          {Array.from(new Set(
                            availableClasses
                              .map((c: any) => c.level || (c.name.includes('Grade') ? c.name.split(' ').slice(0, 2).join(' ') : c.name))
                              .filter(Boolean)
                          ))
                          .sort((a: any, b: any) => String(a).localeCompare(String(b), undefined, { numeric: true }))
                          .map(g => (
                            <SelectItem key={g as string} value={g as string}>{g as string}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex-1 min-w-0 md:w-[150px] md:flex-none">
                    <Select value={selectedAnalysisClassId} onValueChange={setSelectedAnalysisClassId}>
                      <SelectTrigger className="h-9 text-[10px] md:text-sm px-2">
                        <SelectValue placeholder="Class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {availableClasses
                          .filter(c => selectedGradeLevel === 'all' || c.level === selectedGradeLevel || c.name.startsWith(`Grade ${selectedGradeLevel}`))
                          .map((cls: any) => (
                            <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 min-w-0 md:w-[150px] md:flex-none">
                    <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                      <SelectTrigger className="h-9 text-[10px] md:text-sm px-2">
                        <SelectValue placeholder="Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {availableSubjects.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="w-full md:w-auto">
                  <ExportResultsAnalysisModal 
                    term={selectedTerm}
                    year={selectedYear}
                    examType={selectedExamType}
                    gradeLevel={selectedGradeLevel}
                    classId={selectedAnalysisClassId}
                    className={availableClasses.find(c => c.id === selectedAnalysisClassId)?.name}
                    subjectId={selectedSubjectId}
                    subjectName={availableSubjects.find(s => s.id === selectedSubjectId)?.name}
                    schoolName={schoolSettings?.school_name}
                    disabled={!selectedTerm || !selectedYear || !selectedExamType}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isAnalysisLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                  <p className="text-slate-500 font-medium">Computing results analysis...</p>
                </div>
              ) : !resultsAnalysis?.analysis || resultsAnalysis.analysis.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                  <BarChart3 className="h-12 w-12 opacity-20" />
                  <p>No analysis data available for the selected criteria.</p>
                </div>
              ) : (
                <>
                  {/* Desktop View Table */}
                  <div className="hidden md:block overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                   <Table className="border-separate border-spacing-0">
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                      <TableRow>
                        <TableHead rowSpan={2} className="min-w-[120px] md:min-w-[200px] font-black text-slate-900 dark:text-white border-r border-b border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 sticky left-0 z-20 text-[10px] md:text-sm">SUBJECTS</TableHead>
                        <TableHead colSpan={3} className="text-center font-black text-slate-900 dark:text-white border-r border-b border-slate-300 dark:border-slate-700 bg-blue-50/50 text-[10px] md:text-sm">REG</TableHead>
                        <TableHead colSpan={3} className="text-center font-black text-slate-900 dark:text-white border-r border-b border-slate-300 dark:border-slate-700 bg-emerald-50/50 text-[10px] md:text-sm">WROTE</TableHead>
                        <TableHead colSpan={3} className="text-center font-black text-slate-900 dark:text-white border-r border-b border-slate-300 dark:border-slate-700 bg-orange-50/50 text-[10px] md:text-sm">ABS</TableHead>
                        {resultsAnalysis.scales.map((s: any) => (
                           <TableHead key={s.id} colSpan={3} className="text-center font-black text-slate-900 dark:text-white border-r border-b border-slate-300 dark:border-slate-700 text-[10px] md:text-sm">
                             {s.grade}
                           </TableHead>
                        ))}
                        <TableHead colSpan={3} className="text-center font-black text-slate-900 dark:text-white border-r border-b border-slate-300 dark:border-slate-700 bg-indigo-50/50 text-[10px] md:text-sm">TOTAL PASSES</TableHead>
                        <TableHead colSpan={3} className="text-center font-black text-blue-600 border-r border-b border-slate-300 dark:border-slate-700 bg-blue-50/30 text-[10px] md:text-sm">% PASS</TableHead>
                        <TableHead colSpan={3} className="text-center font-black text-red-600 border-r border-b border-slate-300 dark:border-slate-700 bg-red-50/50 text-[10px] md:text-sm">TOTAL FAILS</TableHead>
                        <TableHead colSpan={3} className="text-center font-black text-red-800 border-b border-slate-300 dark:border-slate-700 bg-red-100/30 text-[10px] md:text-sm">% FAIL</TableHead>
                      </TableRow>
                      <TableRow>
                        {/* Subheaders for REG to % FAIL */}
                        {[...Array(7 + resultsAnalysis.scales.length)].map((_, i) => (
                          <React.Fragment key={i}>
                            <TableHead className="text-center text-[10px] font-bold border-r border-b border-slate-200 dark:border-slate-800">F</TableHead>
                            <TableHead className="text-center text-[10px] font-bold border-r border-b border-slate-200 dark:border-slate-800">M</TableHead>
                            <TableHead className="text-center text-[10px] font-bold border-r border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/50">TOT</TableHead>
                          </React.Fragment>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultsAnalysis.analysis.map((row: any) => (
                        <TableRow key={row.subjectName} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <TableCell className="font-bold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-b border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                            {row.subjectName}
                            <div className="text-[10px] text-slate-500 font-normal uppercase">{row.subjectCode}</div>
                          </TableCell>
                          
                          {/* REG */}
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800">{row.reg.f}</TableCell>
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800">{row.reg.m}</TableCell>
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800 font-bold bg-slate-50/30">{row.reg.tot}</TableCell>
                          
                          {/* WROTE */}
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800">{row.wrote.f}</TableCell>
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800">{row.wrote.m}</TableCell>
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800 font-bold bg-slate-50/30">{row.wrote.tot}</TableCell>
                          
                          {/* ABS */}
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800">{row.abs.f}</TableCell>
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800">{row.abs.m}</TableCell>
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800 font-bold bg-slate-50/30">{row.abs.tot}</TableCell>
                          
                          {/* Grade Columns */}
                          {resultsAnalysis.scales.map((s: any) => (
                            <React.Fragment key={s.id}>
                              <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800">{row.grades[s.grade]?.f || 0}</TableCell>
                              <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800">{row.grades[s.grade]?.m || 0}</TableCell>
                              <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800 font-bold bg-slate-50/30">{row.grades[s.grade]?.tot || 0}</TableCell>
                            </React.Fragment>
                          ))}
                          
                          {/* TOTAL PASSES */}
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800 text-emerald-600">{row.totalPasses.f}</TableCell>
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800 text-emerald-600">{row.totalPasses.m}</TableCell>
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800 font-bold bg-emerald-50/30 text-emerald-700">{row.totalPasses.tot}</TableCell>
                          
                          {/* % PASS */}
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800 font-medium">{row.percentagePass.f}%</TableCell>
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800 font-medium">{row.percentagePass.m}%</TableCell>
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800 font-black text-blue-600 bg-blue-50/30">{row.percentagePass.tot}%</TableCell>
                          
                          {/* TOTAL FAILS */}
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800 text-red-600">{row.totalFails?.f || 0}</TableCell>
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800 text-red-600">{row.totalFails?.m || 0}</TableCell>
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800 font-bold bg-red-50/30 text-red-700">{row.totalFails?.tot || 0}</TableCell>
                          
                          {/* % FAIL */}
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800 font-medium">{row.percentageFail?.f || 0}%</TableCell>
                          <TableCell className="text-center border-r border-b border-slate-100 dark:border-slate-800 font-medium">{row.percentageFail?.m || 0}%</TableCell>
                          <TableCell className="text-center border-b border-slate-100 dark:border-slate-800 font-black text-red-600 bg-red-100/10">{row.percentageFail?.tot || 0}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card Layout */}
                <div className="md:hidden space-y-4 px-4 py-6">
                  {resultsAnalysis.analysis.map((row: any) => (
                    <div key={row.subjectName} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-black text-slate-900 dark:text-white text-lg tracking-tight uppercase leading-tight">{row.subjectName}</h4>
                          <p className="text-[10px] text-slate-500 font-medium">{row.subjectCode}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pass Rate</p>
                          <p className="text-2xl font-black text-emerald-600 leading-tight">{row.percentagePass.tot}%</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-2 rounded-xl text-center border border-blue-100 dark:border-blue-900/30">
                          <p className="text-[9px] font-bold text-blue-600 uppercase">Reg</p>
                          <p className="text-lg font-black text-blue-700">{row.reg.tot}</p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded-xl text-center border border-emerald-100 dark:border-emerald-900/30">
                          <p className="text-[9px] font-bold text-emerald-600 uppercase">Wrote</p>
                          <p className="text-lg font-black text-emerald-700">{row.wrote.tot}</p>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/10 p-2 rounded-xl text-center border border-orange-100 dark:border-orange-900/30">
                          <p className="text-[9px] font-bold text-orange-600 uppercase">Abs</p>
                          <p className="text-lg font-black text-orange-700">{row.abs.tot}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center text-[10px] mb-1">
                            <span className="font-bold text-slate-500 uppercase tracking-wider">Gender Distribution</span>
                            <div className="flex gap-2">
                              <span className="text-blue-600 font-bold">M: {row.wrote.m}</span>
                              <span className="text-pink-600 font-bold">F: {row.wrote.f}</span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                            <div 
                              className="bg-blue-500 h-full transition-all" 
                              style={{ width: `${(row.wrote.m / (row.wrote.tot || 1)) * 100}%` }} 
                            />
                            <div 
                              className="bg-pink-500 h-full transition-all" 
                              style={{ width: `${(row.wrote.f / (row.wrote.tot || 1)) * 100}%` }} 
                            />
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Grade Breakdown</p>
                          <div className="flex flex-wrap gap-2">
                            {resultsAnalysis.scales.map((s: any) => (
                              <div key={s.id} className="px-2 py-1 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center gap-1.5 border border-slate-100 dark:border-slate-800">
                                <span className="text-[9px] font-black text-slate-500">{s.grade}:</span>
                                <span className="text-xs font-black text-blue-600">{row.grades[s.grade]?.tot || 0}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                           <div className="flex flex-col">
                             <span className="text-[9px] font-bold text-slate-400 uppercase">Passes</span>
                             <span className="text-sm font-black text-emerald-600">{row.totalPasses.tot}</span>
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[9px] font-bold text-slate-400 uppercase">Fails</span>
                             <span className="text-sm font-black text-red-600">{row.totalFails?.tot || 0}</span>
                           </div>
                        </div>
                        <Badge variant="outline" className="text-[9px] font-black border-slate-200 text-slate-500">
                          {row.percentageFail?.tot || 0}% FAIL
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Students Tab */}
        <TabsContent value="top-students" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Honor Roll (70%+)</CardTitle>
                    <CardDescription>Top performing students with a minimum average of 70%</CardDescription>
                  </div>
                  <Trophy className="h-6 w-6 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {liveStats?.performance?.topStudents?.map((student: any, index: number) => (
                      <div
                        key={student.id}
                        className={`flex items-center justify-between p-3 md:p-4 rounded-xl border transition-all hover:shadow-md ${index === 0 ? 'bg-yellow-50/50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900/20' :
                          index === 1 ? 'bg-slate-50/50 border-slate-100 dark:bg-slate-900/10 dark:border-slate-800' :
                            index === 2 ? 'bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-900/20' :
                              'bg-white dark:bg-slate-800'
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-slate-200 text-slate-700' :
                              index === 2 ? 'bg-orange-100 text-orange-700' :
                                'bg-slate-100 text-slate-500'
                            }`}>
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white">{student.name}</h4>
                            <p className="text-sm text-slate-500">{student.class}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400">{student.average}%</div>
                          <Badge variant="outline" className="text-[9px] uppercase tracking-wider h-4">Average</Badge>
                        </div>
                      </div>
                    ))}
                    {(!liveStats?.performance?.topStudents || liveStats.performance.topStudents.length === 0) && (
                      <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed">
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full inline-block mb-4">
                          <Trophy className="h-10 w-10 text-slate-400" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">No Top Performers Yet</h4>
                        <p className="text-slate-500 max-w-xs mx-auto mt-1">Currently, no students have reached the 70% average threshold for this term.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Star className="h-24 w-24" />
                </div>
                <CardHeader>
                  <CardTitle className="text-xl">Top Performer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 relative z-10">
                  {liveStats?.performance?.topStudents?.[0] ? (
                    <>
                      <div className="flex flex-col items-center py-6">
                        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30 mb-4">
                          <Medal className="h-12 w-12 text-yellow-300" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-center">{liveStats.performance.topStudents[0].name}</h3>
                        <p className="text-sm text-blue-100">{liveStats.performance.topStudents[0].class}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm text-center">
                          <p className="text-xs text-blue-100 uppercase">Average</p>
                          <p className="text-2xl font-bold">{liveStats.performance.topStudents[0].average}%</p>
                        </div>
                        <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm text-center">
                          <p className="text-xs text-blue-100 uppercase">Rank</p>
                          <p className="text-2xl font-bold">#1</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-center py-10 opacity-70">No data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Class Performance Leader</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {liveStats?.performance?.byClass?.slice(0, 3).map((cls: any, idx: number) => (
                    <div key={cls.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-xs font-bold text-slate-400">0{idx + 1}</div>
                        <span className="font-medium">{cls.name}</span>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">
                        {cls.average}% Avg
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Support Needed Tab */}
        <TabsContent value="support" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-red-100 dark:border-red-900/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Academic Support List</CardTitle>
                    <CardDescription>Students performing below 50% who may require intervention</CardDescription>
                  </div>
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {liveStats?.performance?.lowStudents?.filter((s: any) => s.average < 50).map((student: any, index: number) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-red-50 bg-red-50/30 dark:bg-red-900/5 dark:border-red-900/10 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-700 font-bold">
                            !
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white">{student.name}</h4>
                            <p className="text-sm text-slate-500">{student.class}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl md:text-2xl font-black text-red-600 dark:text-red-400">{student.average}%</div>
                          <Badge variant="destructive" className="text-[9px] uppercase tracking-wider h-4">Critical</Badge>
                        </div>
                      </div>
                    ))}
                    {(!liveStats?.performance?.lowStudents || liveStats.performance.lowStudents.filter((s: any) => s.average < 50).length === 0) && (
                      <div className="text-center py-10">
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 p-4 rounded-xl inline-block mb-4">
                          <TrendingUp className="h-8 w-8" />
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white">All Students are On Track!</h4>
                        <p className="text-slate-500 max-w-xs mx-auto mt-1">No students are currently recorded as performing below the 50% threshold for this term.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Intervention Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-500">Students at Risk</p>
                    <div className="flex items-end gap-2">
                      <h3 className="text-3xl md:text-4xl font-bold text-red-600">
                        {liveStats?.performance?.lowStudents?.filter((s: any) => s.average < 50).length || 0}
                      </h3>
                      <p className="text-xs md:text-sm text-slate-500 mb-1 font-medium">Total requiring help</p>
                    </div>
                  </div>

                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-900/30">
                    <div className="flex items-center gap-3 mb-2 text-orange-700 dark:text-orange-400">
                      <TrendingDown className="h-5 w-5" />
                      <span className="font-bold">Recommendation</span>
                    </div>
                    <p className="text-sm text-orange-800 dark:text-orange-300 leading-relaxed">
                      Schedule parent-teacher conferences for students below 40% and assign mandatory after-school tutoring sessions.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm font-medium text-slate-500">Subject Weakness Areas</p>
                    <div className="space-y-3">
                      {liveStats?.performance?.bySubject?.slice(-3).reverse().map((subj: any) => (
                        <div key={subj.name} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">{subj.name}</span>
                            <span className="text-red-600 font-bold">{subj.average}% Avg</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                            <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${subj.average}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-emerald-100 dark:border-emerald-900/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                    <ArrowUpCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Income</p>
                    <h3 className="text-2xl font-bold">K{liveStats?.finance?.overview?.[0]?.amount?.toLocaleString() || 0}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-100 dark:border-red-900/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 text-red-600 rounded-full">
                    <ArrowDownCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Expenses</p>
                    <h3 className="text-2xl font-bold">K{liveStats?.finance?.overview?.[1]?.amount?.toLocaleString() || 0}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-100 dark:border-blue-900/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Net Balance</p>
                    <h3 className="text-2xl font-bold">K{liveStats?.summary?.netBalance?.toLocaleString() || 0}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Income by Category</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={liveStats?.finance?.incomeBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                    >
                      {liveStats?.finance?.incomeBreakdown?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => `K${val.toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Expense by Category</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={liveStats?.finance?.expenseBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                    >
                      {liveStats?.finance?.expenseBreakdown?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => `K${val.toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Demographics Tab */}
        <TabsContent value="demographics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Student Gender Balance</CardTitle>
                <CardDescription>Breakdown of students by gender across the school</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={liveStats?.demographics}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={5}
                    >
                      {liveStats?.demographics?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : index === 1 ? '#ec4899' : '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Staff Composition</CardTitle>
                <CardDescription>Distribution of staff by role and department</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border text-center">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Staff</p>
                    <h4 className="text-3xl font-bold mt-1">{liveStats?.summary?.totalStaff || 0}</h4>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30 text-center">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Ratio</p>
                    <h4 className="text-3xl font-bold mt-1 text-blue-700 dark:text-blue-300">
                      {liveStats?.summary?.totalTeachers > 0
                        ? (liveStats?.summary?.totalStudents / liveStats?.summary?.totalTeachers).toFixed(1)
                        : liveStats?.summary?.totalStudents}:1
                    </h4>
                  </div>
                </div>

                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={liveStats?.staff?.departments} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-500">Staff Breakdown</p>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      Teaching Staff
                    </span>
                    <span className="font-bold">{liveStats?.staff?.distribution?.[0]?.value || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                      Non-Teaching Staff
                    </span>
                    <span className="font-bold">{liveStats?.staff?.distribution?.[1]?.value || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
