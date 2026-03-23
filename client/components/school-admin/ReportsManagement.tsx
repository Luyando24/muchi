import React, { useState, useEffect } from 'react';
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
  BookOpen
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#71717a'];

export default function ReportsManagement() {
  const [liveStats, setLiveStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [activeScreen, setActiveScreen] = useState("overview");
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedTerm || selectedYear) {
      fetchLiveStats();
    }
  }, [selectedTerm, selectedYear]);

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
        .from('school_settings')
        .select('*')
        .eq('school_id', profile.school_id)
        .maybeSingle();

      if (settings) {
        setSchoolSettings(settings);
        setSelectedTerm(settings.current_term || "Term 1");
        setSelectedYear(settings.academic_year || new Date().getFullYear().toString());
      } else {
        setSelectedTerm("Term 1");
        setSelectedYear(new Date().getFullYear().toString());
      }
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
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Insights Center</h2>
          <p className="text-slate-600 dark:text-slate-400">Real-time analytical overview of school performance.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger className="w-[130px] h-9 border-none focus:ring-0 shadow-none">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Term 1">Term 1</SelectItem>
                <SelectItem value="Term 2">Term 2</SelectItem>
                <SelectItem value="Term 3">Term 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700" />

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[110px] h-9 border-none focus:ring-0 shadow-none">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={fetchLiveStats}
            disabled={isRefreshing}
          >
            <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Tabs value={activeScreen} onValueChange={setActiveScreen} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 lg:w-[1000px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="teachers">Teacher Performance</TabsTrigger>
          <TabsTrigger value="top-students">Top Students</TabsTrigger>
          <TabsTrigger value="support">Support Needed</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="demographics">Students & Staff</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 shadow-none">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Students</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{liveStats?.summary?.totalStudents || 0}</h3>
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
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Staff</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{liveStats?.summary?.totalStaff || 0}</h3>
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

            <Card className="lg:col-span-2">
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
          </div>

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
          </div>
        </TabsContent>

        {/* Teacher Performance Tab */}
        <TabsContent value="teachers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Teacher Performance Analysis</CardTitle>
                    <CardDescription>Average performance and student grade distribution by teacher</CardDescription>
                  </div>
                  {selectedTeacher && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTeacher(null)} className="h-8 gap-1.5 font-bold">
                      <RefreshCcw className="h-3.5 w-3.5" />
                      View All
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {!selectedTeacher ? (
                      liveStats?.performance?.teacherPerformance?.map((teacher: any, idx: number) => (
                        <div
                          key={teacher.id}
                          onClick={() => setSelectedTeacher(teacher)}
                          className="p-4 rounded-xl border bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-extrabold text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                {idx + 1}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">{teacher.name}</h4>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-bold text-slate-500 uppercase">
                                    {teacher.workload?.classesCount || 0} Classes
                                  </span>
                                  <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-bold text-slate-500 uppercase">
                                    {teacher.workload?.subjectsCount || 0} Subjects
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {teacher.count} Grades
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-4">
                              <div>
                                <div className="text-2xl font-black text-blue-600">{teacher.average}%</div>
                                <span className="text-[10px] uppercase text-slate-400 font-bold">Average</span>
                              </div>
                              <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                              {Object.entries(teacher.grades).map(([label, count]: any, itIdx) => {
                                const totalCount: number = Object.values(teacher.grades).reduce((a: any, b: any) => a + b, 0) as number;
                                const width = (count / totalCount) * 100;
                                return (
                                  <div
                                    key={label}
                                    title={`${label}: ${count}`}
                                    className="h-full"
                                    style={{ width: `${width}%`, backgroundColor: COLORS[itIdx % COLORS.length] }}
                                  />
                                );
                              })}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                              {Object.entries(teacher.grades).map(([label, count]: any, itIdx) => (
                                <div key={label} className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[itIdx % COLORS.length] }} />
                                  <span className="text-[10px] text-slate-500 font-medium">{label}: {count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="space-y-6">
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xl">
                              {selectedTeacher.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="text-xl font-black">{selectedTeacher.name}</h3>
                              <p className="text-sm text-slate-500 font-medium">Performance Breakdown for current session</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-black text-blue-600">{selectedTeacher.average}%</div>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Section Average</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Subjects Taught</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedTeacher.workload?.subjects?.map((s: string) => (
                                <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Classes Managed</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedTeacher.workload?.classes?.map((c: string) => (
                                <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Breakdown by Class & Subject</h4>
                          {selectedTeacher.breakdown?.map((item: any) => (
                            <div key={item.name} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border rounded-lg hover:border-blue-200 transition-colors">
                              <span className="font-bold text-sm">{item.name}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-[11px] text-slate-500 font-bold">{item.count} students</span>
                                <Badge className={item.average >= 70 ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}>
                                  {item.average}%
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(!liveStats?.performance?.teacherPerformance || liveStats.performance.teacherPerformance.length === 0) && (
                      <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed">
                        <Users2 className="h-10 w-10 text-slate-400 mx-auto mb-4" />
                        <h4 className="text-lg font-bold">No Teacher Data</h4>
                        <p className="text-slate-500">Assign teachers to class subjects to see performance analytics.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-blue-600 text-white border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Top Performing Teacher
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {liveStats?.performance?.teacherPerformance?.[0] ? (
                    <>
                      <div className="text-center py-4">
                        <div className="text-4xl font-black mb-1">{liveStats.performance.teacherPerformance[0].average}%</div>
                        <p className="text-blue-100 text-sm font-medium">{liveStats.performance.teacherPerformance[0].name}</p>
                      </div>
                      <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                        <p className="text-xs uppercase text-blue-100 font-bold mb-3">Strongest Grades</p>
                        <div className="space-y-2">
                          {Object.entries(liveStats.performance.teacherPerformance[0].grades)
                            .sort((a: any, b: any) => b[1] - a[1])
                            .slice(0, 3)
                            .map(([label, count]: any) => (
                              <div key={label} className="flex justify-between items-center text-sm">
                                <span>{label}</span>
                                <span className="font-bold">{count} students</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-white/60 text-center py-10">Waiting for data...</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
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
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md ${index === 0 ? 'bg-yellow-50/50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900/20' :
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
                          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{student.average}%</div>
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Average Score</Badge>
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
                        <h3 className="text-2xl font-bold text-center">{liveStats.performance.topStudents[0].name}</h3>
                        <p className="text-blue-100">{liveStats.performance.topStudents[0].class}</p>
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
                          <div className="text-2xl font-black text-red-600 dark:text-red-400">{student.average}%</div>
                          <Badge variant="destructive" className="text-[10px] uppercase tracking-wider">Critical</Badge>
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
                      <h3 className="text-4xl font-bold text-red-600">
                        {liveStats?.performance?.lowStudents?.filter((s: any) => s.average < 50).length || 0}
                      </h3>
                      <p className="text-slate-500 mb-1 font-medium">Total requiring help</p>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Average Performance by Gender</CardTitle>
                <CardDescription>Comparison of average scores across the school</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={liveStats?.performance?.genderPerformance}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="average" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      {liveStats?.performance?.genderPerformance?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'Male' ? '#3b82f6' : entry.name === 'Female' ? '#ec4899' : '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
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
                            <div className="text-sm font-bold text-slate-900 dark:text-white">{gender.average}% Average</div>
                            <div className="text-[10px] text-slate-500 font-medium">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
