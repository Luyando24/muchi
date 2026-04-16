import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  LayoutDashboard, 
  TrendingUp, 
  Package, 
  Settings, 
  LogOut,
  Users,
  Map,
  AlertTriangle,
  School,
  ArrowUpRight,
  Filter,
  Search,
  Download,
  Menu,
  X,
  ChevronRight,
  GraduationCap,
  ShieldAlert,
  ChevronDown,
  Loader2,
  PieChart as PieChartIcon,
  ClipboardList,
  Target,
  BarChart3,
  CheckCircle2,
  ArrowDownRight,
  RefreshCcw,
  Users2,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/components/ui/use-toast";
import ThemeToggle from '@/components/navigation/ThemeToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


import GovernmentNavbar from '@/components/government/GovernmentNavbar';
import { cn } from '@/lib/utils';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#71717a'];

// --- SUB-COMPONENTS --- //

function OverviewDashboard() {
  const [stats, setStats] = useState({ 
    totalSchools: 0, 
    totalStudents: 0, 
    totalTeachers: 0, 
    avgAttendance: 0, 
    nationalPassRate: 0,
    studentTeacherRatio: 0,
    schoolTypeBreakdown: {} as Record<string, number>,
    schoolCategoryBreakdown: {} as Record<string, number>,
    genderBreakdown: { Male: 0, Female: 0, Other: 0 } as Record<string, number>,
    schoolPerformanceMetrics: [] as any[]
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ province: 'All', district: 'All' });
  const [searchQuery, setSearchQuery] = useState('');
  const [regions, setRegions] = useState<{ province: string, districts: string[] }[]>([]);

  useEffect(() => {
    async function fetchRegions() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/government/regions', {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (res.ok) setRegions(await res.json());
      } catch (err) {
        console.error("Failed to fetch regions", err);
      }
    }
    fetchRegions();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        let url = '/api/government/overview?';
        if (filters.province !== 'All') url += `province=${encodeURIComponent(filters.province)}&`;
        if (filters.district !== 'All') url += `district=${encodeURIComponent(filters.district)}`;

        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (res.ok) setStats(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filters]);

  const selectedProvinceData = regions.find(r => r.province === filters.province);

  if (loading && stats.totalSchools === 0) return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 opacity-20" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Insights Style Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">National Overview</h2>
          <p className="text-slate-600 dark:text-slate-400">Key indicators across the educational ecosystem.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <Select value={filters.province} onValueChange={(val) => setFilters({ ...filters, province: val, district: 'All' })}>
              <SelectTrigger className="w-[140px] h-9 border-none focus:ring-0 shadow-none">
                <SelectValue placeholder="Province" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Provinces</SelectItem>
                {regions.map(r => (
                  <SelectItem key={r.province} value={r.province}>{r.province}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700" />

          <Select value={filters.district} onValueChange={(val) => setFilters({ ...filters, district: val })} disabled={filters.province === 'All'}>
            <SelectTrigger className="w-[130px] h-9 border-none focus:ring-0 shadow-none">
              <SelectValue placeholder="District" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Districts</SelectItem>
              {selectedProvinceData?.districts.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => setFilters({ ...filters })}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-blue-600"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 shadow-none">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
              <School className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Schools</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalSchools.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/20 shadow-none">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">S-T Ratio</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.studentTeacherRatio}:1</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 shadow-none">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg. Attendance</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.avgAttendance}%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20 shadow-none">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pass Rate</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.nationalPassRate}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

    <div className="grid lg:grid-cols-2 gap-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Institutional Types</CardTitle>
          <CardDescription>Breakdown of schools by level</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={Object.entries(stats.schoolTypeBreakdown).map(([name, value]) => ({ name, value }))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ownership Categories</CardTitle>
          <CardDescription>Distribution by institutional category</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={Object.entries(stats.schoolCategoryBreakdown).map(([name, value]) => ({ name, value }))}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {Object.entries(stats.schoolCategoryBreakdown).map((entry, index) => (
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

    <div className="mt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">School Metrics Explorer</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Drill-down into individual institution data</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/20">
          <Search className="h-4 w-4 text-slate-400" />
          <input 
            placeholder="Search school name..." 
            className="bg-transparent border-none outline-none text-sm font-medium w-48 text-slate-900 dark:text-white placeholder:text-slate-400" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-slate-50/50 dark:bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">School Name</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Level / Category</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">S-T Ratio</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Attendance</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Pass Rate</th>
              </tr>
            </thead>
              <tbody className="divide-y">
                {stats.schoolPerformanceMetrics
                  .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(school => (
                  <tr key={school.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{school.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{school.district}, {school.province}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className="w-fit text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-none">
                          {school.type}
                        </Badge>
                        <Badge variant="secondary" className="w-fit text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-none">
                          {school.category}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "text-sm font-bold",
                        school.studentTeacherRatio > 40 ? "text-orange-600" : "text-slate-900 dark:text-white"
                      )}>{school.studentTeacherRatio}:1</span>
                      <p className="text-[10px] text-slate-500 font-medium">{school.teacherCount} Staff</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{school.attendanceRate}%</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{school.passRate}%</span>
                    </td>
                  </tr>
                ))}
                {stats.schoolPerformanceMetrics.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 italic">No school performance data found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-50 dark:border-slate-700/50 p-6">
            <CardTitle className="text-base font-black uppercase tracking-tight">Regional Distribution</CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">Schools and students per province</CardDescription>
          </CardHeader>
          <CardContent className="h-72 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/50 p-6">
             <Map className="h-12 w-12 mb-3 opacity-20 text-blue-500" />
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Interactive Map Visualization Coming Soon</p>
             <div className="text-center w-full max-w-sm">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Data points configured for <span className="font-bold text-blue-600 dark:text-blue-400">{regions.length}</span> provinces. Map plotting is currently offline pending geospatial data update.
                </p>
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl">
          <CardHeader className="border-b border-slate-50 dark:border-slate-700/50 p-6">
            <CardTitle className="text-base font-black uppercase tracking-tight">National Alerts</CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">System anomalies requiring observation</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
             {stats.avgAttendance < 75 ? (
               <div className="flex items-start gap-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 transition-all hover:bg-orange-100/50 dark:hover:bg-orange-900/30">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                     <h4 className="font-black text-orange-900 dark:text-orange-300 uppercase tracking-tight text-sm">Low Attendance Warning</h4>
                     <p className="text-xs text-orange-700 dark:text-orange-400/80 mt-1 font-medium leading-relaxed">
                       {filters.province !== 'All' ? filters.province : 'National'} average attendance is critical ({stats.avgAttendance}%). Immediate intervention required.
                     </p>
                  </div>
               </div>
             ) : (
               <div className="flex items-start gap-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 transition-all hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 shrink-0">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                     <h4 className="font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-tight text-sm">Stable Attendance</h4>
                     <p className="text-xs text-emerald-700 dark:text-emerald-400/80 mt-1 font-medium leading-relaxed">
                       {filters.province !== 'All' ? filters.province : 'National'} attendance metrics are stable at {stats.avgAttendance}%.
                     </p>
                  </div>
               </div>
             )}
             
             {stats.totalStudents > 0 && (
             <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 transition-all hover:bg-blue-100/50 dark:hover:bg-blue-900/30">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                   <h4 className="font-black text-blue-900 dark:text-blue-300 uppercase tracking-tight text-sm">Enrollment Tracking</h4>
                   <p className="text-xs text-blue-700 dark:text-blue-400/80 mt-1 font-medium leading-relaxed">
                     Currently tracking {stats.totalStudents.toLocaleString()} active students across {stats.totalSchools} registered institutions.
                   </p>
                </div>
             </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


function PerformanceDashboard() {
  const [stats, setStats] = useState({ 
    nationalPassRate: 0, 
    topSchools: [] as any[], 
    topSubjects: [] as any[], 
    genderGradeDistribution: {} as any,
    genderBreakdown: { Male: 0, Female: 0, Other: 0 } as any
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ province: 'All', district: 'All' });
  const [regions, setRegions] = useState<{ province: string, districts: string[] }[]>([]);

  useEffect(() => {
    async function fetchRegions() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/government/regions', {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (res.ok) setRegions(await res.json());
      } catch (err) {
        console.error("Failed to fetch regions", err);
      }
    }
    fetchRegions();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        let url = '/api/government/overview?';
        if (filters.province !== 'All') url += `province=${encodeURIComponent(filters.province)}&`;
        if (filters.district !== 'All') url += `district=${encodeURIComponent(filters.district)}`;

        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (res.ok) setStats(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filters]);

  const selectedProvinceData = regions.find(r => r.province === filters.province);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Academic Performance</h2>
          <p className="text-slate-600 dark:text-slate-400">Analyze grades, subject pass rates, and historical trends.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <Select value={filters.province} onValueChange={(val) => setFilters({ ...filters, province: val, district: 'All' })}>
              <SelectTrigger className="w-[140px] h-9 border-none focus:ring-0 shadow-none">
                <SelectValue placeholder="Province" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Provinces</SelectItem>
                {regions.map(r => (
                  <SelectItem key={r.province} value={r.province}>{r.province}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700" />

          <Select value={filters.district} onValueChange={(val) => setFilters({ ...filters, district: val })} disabled={filters.province === 'All'}>
            <SelectTrigger className="w-[130px] h-9 border-none focus:ring-0 shadow-none">
              <SelectValue placeholder="District" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Districts</SelectItem>
              {selectedProvinceData?.districts.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => setFilters({ ...filters })}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 opacity-20" />
        </div>
      ) : (
        <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 10 Subjects</CardTitle>
            <CardDescription>Highest average scores across all regions</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topSubjects} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="average" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Grade Distribution by Gender</CardTitle>
            <CardDescription>Academic outcomes compared across demographics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full mt-4">
              {(() => {
                const genders = ['male', 'female'];
                const allLabelsSet = new Set<string>();
                genders.forEach(g => {
                  Object.keys(stats.genderGradeDistribution?.[g] || {}).forEach(l => allLabelsSet.add(l));
                });
                
                const allLabels = Array.from(allLabelsSet);
                // Custom sort order for Zambian grades if they exist
                const order = ['Distinction', 'Merit', 'Credit', 'Pass', 'Fail'];
                allLabels.sort((a, b) => {
                  const idxA = order.indexOf(a);
                  const idxB = order.indexOf(b);
                  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                  if (idxA !== -1) return -1;
                  if (idxB !== -1) return 1;
                  return a.localeCompare(b);
                });

                const chartData = genders.map(gender => {
                  const data = stats.genderGradeDistribution?.[gender] || {};
                  const total = Object.values(data).reduce((a: any, b: any) => a + b, 0) as number;
                  return {
                    name: gender.charAt(0).toUpperCase() + gender.slice(1),
                    total,
                    ...data
                  };
                }).filter(d => d.total > 0);

                if (chartData.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50 bg-slate-50/30 dark:bg-slate-900/10 rounded-xl border border-dashed">
                      <BarChart3 className="h-10 w-10 mb-2 opacity-20" />
                      <p className="text-sm italic">No gender distribution data available</p>
                    </div>
                  );
                }

                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 12 }} 
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                          padding: '12px'
                        }}
                      />
                      <Legend 
                         verticalAlign="top" 
                         align="right" 
                         wrapperStyle={{ paddingTop: '0px', paddingBottom: '20px' }}
                         iconType="circle"
                         iconSize={8}
                      />
                      {allLabels.map((label, idx) => (
                        <Bar 
                          key={label} 
                          dataKey={label} 
                          stackId="a" 
                          fill={COLORS[idx % COLORS.length]} 
                          radius={idx === allLabels.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} 
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card className="col-span-1 md:col-span-2 border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-50 dark:border-slate-700/50 p-6">
            <CardTitle className="text-lg">Top Performing Schools</CardTitle>
            <CardDescription>Institutions with the highest average pass rates</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
             {(stats as any).topSchools && (stats as any).topSchools.length > 0 ? (
               <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                 {(stats as any).topSchools.map((school, index) => (
                   <div key={school.id} className="flex items-center justify-between p-6 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                     <div className="flex items-center gap-4">
                       <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-100 dark:border-blue-800">
                         #{index + 1}
                       </div>
                       <div>
                         <h4 className="font-bold text-slate-900 dark:text-white">{school.name}</h4>
                         <div className="flex items-center gap-2 mt-1">
                           <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-none">
                             {school.province}
                           </Badge>
                           <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{school.district}</span>
                         </div>
                       </div>
                     </div>
                     <div className="text-right">
                       <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                         {school.passRate}%
                       </div>
                       <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Score</p>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="h-80 flex flex-col items-center justify-center text-slate-300 bg-slate-50/30 dark:bg-slate-900/50 p-6">
                 <School className="h-12 w-12 mb-3 opacity-20 text-blue-500" />
                 <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">No performance data available</p>
               </div>
             )}
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-blue-600 text-white rounded-2xl transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px]">
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-100 font-bold uppercase tracking-wider text-[10px]">Average Pass Rate</CardDescription>
              <CardTitle className="text-3xl font-bold tracking-tight">{stats.nationalPassRate}%</CardTitle>
            </CardHeader>
             <CardContent>
               <p className="text-[10px] font-bold uppercase tracking-wider text-blue-100">
                 {filters.province === 'All' && filters.district === 'All' ? 'National Average' : `${filters.district !== 'All' ? filters.district : filters.province} Average`}
               </p>
             </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Category Ranking</CardTitle>
              <CardDescription>Institutional performance by category</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {(stats as any).categoryPerformance?.map((cat, idx) => (
                  <div key={cat.category} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                      <span className="font-medium">{cat.category}</span>
                    </div>
                    <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border-none">
                      {cat.avgPassRate}% Avg
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </>
      )}
    </div>
  );
}


function FeedingDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ province: 'All', district: 'All' });
  const [regions, setRegions] = useState<{ province: string, districts: string[] }[]>([]);

  useEffect(() => {
    async function fetchRegions() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/government/regions', {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (res.ok) setRegions(await res.json());
      } catch (err) {
        console.error("Failed to fetch regions", err);
      }
    }
    fetchRegions();
  }, []);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const [statsRes, schoolsRes, reqRes] = await Promise.all([
          fetch('/api/government/feeding-program/stats', { headers: { 'Authorization': `Bearer ${session?.access_token}` } }),
          fetch(`/api/government/feeding-program/schools?province=${filters.province !== 'All' ? filters.province : ''}&district=${filters.district !== 'All' ? filters.district : ''}`, { headers: { 'Authorization': `Bearer ${session?.access_token}` } }),
          fetch('/api/government/feeding-program/procurements/pending', { headers: { 'Authorization': `Bearer ${session?.access_token}` } })
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (schoolsRes.ok) setSchools(await schoolsRes.json());
        if (reqRes.ok) setPendingRequests(await reqRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [filters]);

  const selectedProvinceData = regions.find(r => r.province === filters.province);

  return (
    <div className="space-y-6">
      {/* Premium Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">National Feeding Portal</h2>
          <p className="text-slate-600 dark:text-slate-400">Logistics, Supply Chain & Program Monitoring</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <Select value={filters.province} onValueChange={(val) => setFilters({ ...filters, province: val, district: 'All' })}>
              <SelectTrigger className="w-[140px] h-9 border-none focus:ring-0 shadow-none">
                <SelectValue placeholder="Province" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Provinces</SelectItem>
                {regions.map(r => (
                  <SelectItem key={r.province} value={r.province}>{r.province}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700" />

          <Select value={filters.district} onValueChange={(val) => setFilters({ ...filters, district: val })} disabled={filters.province === 'All'}>
            <SelectTrigger className="w-[130px] h-9 border-none focus:ring-0 shadow-none">
              <SelectValue placeholder="District" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Districts</SelectItem>
              {selectedProvinceData?.districts.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => setFilters({ ...filters })}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-blue-600"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Grid - Aligned with Overview styles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 shadow-none">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
              <Users2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Beneficiaries</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalBeneficiaries?.toLocaleString() || '0'}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 shadow-none">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Schools</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{schools.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20 shadow-none">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Maize Stock (Bags)</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.stockSummary?.Maize?.toLocaleString() || '0'}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20 shadow-none">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Requests</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.pendingProcurements || '0'}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Monitoring Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
         {/* Filter Card */}
         <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl h-fit">
            <CardHeader className="border-b border-slate-100 dark:border-slate-700/50 p-6">
               <CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-tight">
                  <Filter className="h-5 w-5 text-emerald-500" />
                  Regional Monitoring
               </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Province Selection</label>
                  <Select value={filters.province} onValueChange={(val) => setFilters({...filters, province: val, district: 'All'})}>
                     <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-900 border-none h-12 text-sm font-bold shadow-inner">
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="All" className="font-bold">All Provinces</SelectItem>
                        {regions.map(r => (
                          <SelectItem key={r.province} value={r.province}>{r.province}</SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">District Focus</label>
                  <Select value={filters.district} onValueChange={(val) => setFilters({...filters, district: val})} disabled={filters.province === 'All'}>
                     <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-900 border-none h-12 text-sm font-bold shadow-inner">
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="All" className="font-bold">All Districts</SelectItem>
                        {selectedProvinceData?.districts.map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>
               <Button className="w-full rounded-xl bg-slate-900 dark:bg-slate-700 text-white hover:bg-black dark:hover:bg-slate-600 h-12 font-black uppercase tracking-widest text-[10px] transition-all" onClick={() => setFilters({...filters})}>
                  Refresh Live Data
               </Button>
            </CardContent>
         </Card>

         {/* Logistics Feed */}
         <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Real-time Logistics</h3>
               <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all focus-within:ring-2 focus-within:ring-emerald-500/20">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input placeholder="Locate institution..." className="bg-transparent border-none outline-none text-sm font-medium w-32 md:w-48 text-slate-900 dark:text-white placeholder:text-slate-400" />
               </div>
            </div>

            <div className="space-y-4">
               {isLoading ? (
                  Array(3).fill(0).map((_, i) => <div key={i} className="h-28 bg-white dark:bg-slate-800 rounded-2xl animate-pulse border border-slate-100 dark:border-slate-700" />)
               ) : schools.length === 0 ? (
                  <div className="p-16 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 shadow-inner">
                    <Package className="h-12 w-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No institutions found</p>
                  </div>
               ) : (
                  schools.map(school => (
                     <Card key={school.id} className="group border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer bg-white dark:bg-slate-800 h-28 border border-white dark:border-slate-800 hover:border-emerald-500/30">
                        <div className="p-6 h-full flex flex-col md:flex-row md:items-center justify-between gap-4">
                           <div className="flex items-center gap-5">
                              <div className="h-16 w-16 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 transition-all group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-200 dark:group-hover:shadow-none shrink-0 border border-slate-100 dark:border-slate-700 group-hover:border-emerald-500">
                                 <School className="h-8 w-8" />
                              </div>
                              <div>
                                 <h4 className="text-lg font-bold group-hover:text-emerald-600 transition-colors text-slate-900 dark:text-white leading-tight">{school.name}</h4>
                                 <div className="flex items-center gap-3 mt-1.5 focus-visible:outline-none">
                                    <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-none">{school.province || 'National'}</Badge>
                                    <span className="text-slate-300 dark:text-slate-700">•</span>
                                    <div className="flex items-center gap-1.5">
                                       <Map className="h-3 w-3 text-emerald-500" />
                                       <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider leading-none">{school.district || 'Unassigned'}</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-8">
                              <div className="text-right hidden sm:block">
                                 <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Stock Status</p>
                                 <div className="flex items-center gap-2 justify-end">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Stable</span>
                                 </div>
                              </div>
                              <div className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 transition-all group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950 group-hover:translate-x-1">
                                <ArrowUpRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-600" />
                              </div>
                           </div>
                        </div>
                     </Card>
                  ))
               )}
            </div>

            <div className="pt-6 border-t mt-8">
               <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Pending Procurement Requests</h3>
               <div className="grid gap-4">
                  {pendingRequests.map(req => (
                     <Card key={req.id} className="p-4 border-none shadow-sm rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                           <h4 className="font-bold text-sm">{req.school?.name}</h4>
                           <span className="text-xs font-bold text-orange-500">ZK {req.estimated_cost}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">{req.quantity} {req.unit} of {req.item_name}</p>
                        <div className="flex gap-2">
                           <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={async () => {
                              const res = await fetch(`/api/government/feeding-program/procurements/${req.id}/approve`, {
                                 method: 'POST',
                                 headers: { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }
                              });
                              if(res.ok) setPendingRequests(prev => prev.filter(p => p.id !== req.id));
                           }}>Approve</Button>
                           <Button size="sm" variant="destructive" onClick={async () => {
                              const res = await fetch(`/api/government/feeding-program/procurements/${req.id}/reject`, {
                                 method: 'POST',
                                 headers: { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }
                              });
                              if(res.ok) setPendingRequests(prev => prev.filter(p => p.id !== req.id));
                           }}>Reject</Button>
                        </div>
                     </Card>
                  ))}
                  {pendingRequests.length === 0 && (
                     <div className="p-8 text-center text-muted-foreground italic bg-slate-50 rounded-xl">No pending requests.</div>
                  )}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}


// --- MAIN PORTAL COMPONENT --- //
export default function GovernmentPortal() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{full_name: string; role: string; secondary_role?: string} | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('full_name, role, secondary_role').eq('id', user.id).single();
        if (data) setUserProfile(data);
      }
    }
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const sidebarItems = [
    { id: "overview", label: "National Overview", icon: LayoutDashboard },
    { id: "performance", label: "Academic Performance", icon: TrendingUp },
    { id: "feeding", label: "National Feeding", icon: Package },
    { id: "settings", label: "Portal Settings", icon: Settings }
  ];

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg font-medium">Loading Government Portal...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <GovernmentNavbar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        userProfile={userProfile}
      />

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-transform duration-300 ease-in-out`}>
          <div className="flex flex-col h-full pt-16 lg:pt-0">
            <nav className="flex-1 px-4 py-6 space-y-2">
              <div className="mb-4 px-2">
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Core Monitoring</p>
              </div>
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={activeTab === item.id ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsSidebarOpen(false);
                    }}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">National Support</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  <p className="text-xs text-blue-600 dark:text-blue-300">All Systems Operational</p>
                </div>
                <Button size="sm" variant="outline" className="w-full text-xs">Support Center</Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto h-[calc(100vh-64px)] pb-24 lg:pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full space-y-8">
            <TabsContent value="overview" className="m-0 focus-visible:outline-none">
               <OverviewDashboard />
            </TabsContent>
            
            <TabsContent value="performance" className="m-0 focus-visible:outline-none">
               <PerformanceDashboard />
            </TabsContent>
            
            <TabsContent value="feeding" className="m-0 focus-visible:outline-none">
               <FeedingDashboard />
            </TabsContent>

            <TabsContent value="settings" className="m-0 focus-visible:outline-none">
                <div className="max-w-3xl">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Portal Settings</h2>
                    <p className="text-slate-600 mt-1">Manage your ministry official profile and portal preferences.</p>
                  </div>
                 <Card className="border-none shadow-xl bg-white dark:bg-slate-800 rounded-3xl overflow-hidden">
                    <CardHeader className="border-b dark:border-slate-700 p-8 bg-slate-50/50 dark:bg-slate-900/50">
                       <CardTitle className="text-xl font-bold">Account Preferences</CardTitle>
                       <CardDescription>Configure how you interact with the national monitoring systems.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                       <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                            National monitoring thresholds, automated report distribution, and regional access permissions will be configurable here in the next release.
                          </p>
                       </div>
                       <div className="flex justify-end gap-3 pt-4">
                          <Button variant="outline" className="rounded-xl px-6">Discard Changes</Button>
                          <Button className="rounded-xl px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-none">Save Settings</Button>
                       </div>
                    </CardContent>
                 </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-40 px-2 py-2 safe-area-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[64px] ${
                  activeTab === item.id 
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className={`h-5 w-5 mb-1 ${activeTab === item.id ? "scale-110" : "scale-100"} transition-transform`} />
                <span className="text-[10px] font-medium truncate max-w-full">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
