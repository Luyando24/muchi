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
  Loader2
} from 'lucide-react';

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


// --- SUB-COMPONENTS --- //

function OverviewDashboard() {
  const [stats, setStats] = useState({ totalSchools: 0, totalStudents: 0, totalTeachers: 0, avgAttendance: 0, nationalPassRate: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/government/overview', {
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
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 opacity-20" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">National Overview</h2>
          <p className="text-slate-500 font-medium">Key indicators across the educational ecosystem.</p>
        </div>
        <Button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-100 dark:shadow-none font-bold h-11 px-8 transition-all hover:translate-y-[-1px]">
          <Download className="mr-2 h-4 w-4" /> Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <School className="h-3.5 w-3.5 text-blue-500"/> Total Schools
            </CardDescription>
            <CardTitle className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{stats.totalSchools.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">+12 Expansion Schools</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-emerald-500"/> Active Students
            </CardDescription>
            <CardTitle className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{stats.totalStudents.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">National Enrollment</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-orange-500"/> Avg. Attendance
            </CardDescription>
            <CardTitle className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{stats.avgAttendance}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">+2.4% Momentum</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-blue-600 text-white rounded-2xl relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px]">
          <div className="absolute top-0 right-0 p-4 opacity-10"><GraduationCap className="h-20 w-20" /></div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-blue-100 font-black uppercase tracking-widest text-[10px]">National Pass Rate</CardDescription>
            <CardTitle className="text-4xl font-black tracking-tight">{stats.nationalPassRate}%</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-[10px] text-blue-100 font-black uppercase tracking-widest">Composite Exams Result</p>
          </CardContent>
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
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Interactive Map Visualization</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl">
          <CardHeader className="border-b border-slate-50 dark:border-slate-700/50 p-6">
            <CardTitle className="text-base font-black uppercase tracking-tight">National Alerts</CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">System anomalies requiring observation</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
             <div className="flex items-start gap-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 transition-all hover:bg-orange-100/50 dark:hover:bg-orange-900/30">
                <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                   <h4 className="font-black text-orange-900 dark:text-orange-300 uppercase tracking-tight text-sm">Low Attendance Warning</h4>
                   <p className="text-xs text-orange-700 dark:text-orange-400/80 mt-1 font-medium leading-relaxed">Lusaka District reports &lt; 75% attendance in 4 institutions over the past 72 hours.</p>
                </div>
             </div>
             <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 transition-all hover:bg-blue-100/50 dark:hover:bg-blue-900/30">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                   <h4 className="font-black text-blue-900 dark:text-blue-300 uppercase tracking-tight text-sm">Enrollment Spike</h4>
                   <p className="text-xs text-blue-700 dark:text-blue-400/80 mt-1 font-medium leading-relaxed">Copperbelt region exhibiting a 5.2% incline in standard year secondary enrollments.</p>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


function PerformanceDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Academic Performance</h2>
          <p className="text-slate-500 font-medium">Analyze grades, subject pass rates, and historical trends.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2 border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-50 dark:border-slate-700/50 p-6">
            <CardTitle className="text-base font-black uppercase tracking-tight">Historical Pass Rates</CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comparison across last 4 academic cycles</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex flex-col items-center justify-center text-slate-300 bg-slate-50/30 dark:bg-slate-900/50 p-6">
             <TrendingUp className="h-12 w-12 mb-3 opacity-10 text-blue-500" />
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Longitudinal Data Visualization</p>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-blue-600 text-white rounded-2xl transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px]">
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-100 font-black uppercase tracking-widest text-[10px]">Top Performing Subject</CardDescription>
              <CardTitle className="text-3xl font-black tracking-tight">Science (84%)</CardTitle>
            </CardHeader>
             <CardContent>
               <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">National Average • Grade 12</p>
             </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-l-orange-500 transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px]">
            <CardHeader className="pb-2">
              <CardDescription className="text-orange-600 dark:text-orange-400 font-black uppercase tracking-widest text-[10px]">Critical Attention Required</CardDescription>
              <CardTitle className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Mathematics (42%)</CardTitle>
            </CardHeader>
             <CardContent>
               <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-relaxed">Fell 5% below target in primary rural districts</p>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


function FeedingDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ province: 'All', district: 'All' });

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const [statsRes, schoolsRes] = await Promise.all([
          fetch('/api/government/feeding-program/stats', { headers: { 'Authorization': `Bearer ${session?.access_token}` } }),
          fetch(`/api/government/feeding-program/schools?province=${filters.province !== 'All' ? filters.province : ''}&district=${filters.district !== 'All' ? filters.district : ''}`, { headers: { 'Authorization': `Bearer ${session?.access_token}` } })
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (schoolsRes.ok) setSchools(await schoolsRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [filters]);

  return (
    <div className="space-y-6">
      {/* Premium Header Banner */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-300">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
          <Package className="h-48 w-48 text-emerald-600 dark:text-emerald-400 rotate-12" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200 dark:shadow-none shrink-0 transition-transform hover:scale-105 duration-300">
               <Package className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">National Feeding Portal</h1>
              <p className="text-slate-500 font-medium text-sm md:text-base mt-0.5">Logistics, Supply Chain & Program Monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
             <Button variant="outline" className="flex-1 md:flex-none h-11 rounded-xl border-slate-200 dark:border-slate-700 font-bold px-6 bg-white dark:bg-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700">
               <Download className="h-4 w-4 mr-2" /> Export Data
             </Button>
             <Button className="flex-1 md:flex-none h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shadow-lg shadow-emerald-100 dark:shadow-none transition-all hover:translate-y-[-1px]">
               Live Monitor
             </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid - Aligned with Overview styles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-emerald-600 text-white rounded-2xl overflow-hidden group transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px]">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-100 font-black uppercase tracking-widest text-[10px]">Total Beneficiaries</CardDescription>
            <CardTitle className="text-4xl font-black tracking-tight">{stats?.totalBeneficiaries?.toLocaleString() || '0'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-emerald-100 text-[10px] font-black uppercase tracking-widest">
              <TrendingUp className="h-4 w-4 text-white" />
              <span>National Daily Average</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">Participating Schools</CardDescription>
            <CardTitle className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{schools.length}</CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Active Enrollment</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-blue-500">Maize Stock (Bags)</CardDescription>
            <CardTitle className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{stats?.stockSummary?.Maize?.toLocaleString() || '0'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Aggregate Inventory</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-l-orange-500 transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-orange-500">Pending Procurements</CardDescription>
            <CardTitle className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{stats?.pendingProcurements || '0'}</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-2 text-orange-600 text-[10px] font-black uppercase tracking-widest">
               <AlertTriangle className="h-3.5 w-3.5" />
               <span>Logistics Attention</span>
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
                  <Select value={filters.province} onValueChange={(val) => setFilters({...filters, province: val})}>
                     <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-900 border-none h-12 text-sm font-bold shadow-inner">
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="All" className="font-bold">All Provinces</SelectItem>
                        <SelectItem value="Lusaka">Lusaka</SelectItem>
                        <SelectItem value="Copperbelt">Copperbelt</SelectItem>
                        <SelectItem value="Central">Central</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">District Focus</label>
                  <Select value={filters.district} onValueChange={(val) => setFilters({...filters, district: val})}>
                     <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-900 border-none h-12 text-sm font-bold shadow-inner">
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="All" className="font-bold">All Districts</SelectItem>
                        <SelectItem value="Lusaka District">Lusaka District</SelectItem>
                        <SelectItem value="Ndola">Ndola</SelectItem>
                        <SelectItem value="Kitwe">Kitwe</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
               <Button className="w-full rounded-xl bg-slate-900 dark:bg-slate-700 text-white hover:bg-black dark:hover:bg-slate-600 h-12 font-black uppercase tracking-widest text-[10px] transition-all">
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
                                 <h4 className="text-lg font-black group-hover:text-emerald-600 transition-colors text-slate-900 dark:text-white leading-tight uppercase tracking-tight">{school.name}</h4>
                                 <div className="flex items-center gap-3 mt-1.5 focus-visible:outline-none">
                                    <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-none">{school.province || 'National'}</Badge>
                                    <span className="text-slate-300 dark:text-slate-700">•</span>
                                    <div className="flex items-center gap-1.5">
                                       <Map className="h-3 w-3 text-emerald-500" />
                                       <span className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest leading-none">{school.district || 'Unassigned'}</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-8">
                              <div className="text-right hidden sm:block">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Stock Status</p>
                                 <div className="flex items-center gap-2 justify-end">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Stable</span>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Sidebar - Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-700">
            <div className="bg-blue-600 p-1.5 rounded-lg mr-3">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">Ministry of Education</span>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            <div className="mb-4 px-2">
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Core Monitoring</p>
            </div>
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  className={`w-full justify-start font-bold h-11 transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400'}`}
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
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl">
              <p className="text-sm font-bold text-blue-800 dark:text-blue-200 mb-1">National Support</p>
              <p className="text-xs text-blue-600 dark:text-blue-300 mb-3">Priority helpdesk for Ministry staff.</p>
              <Button size="sm" variant="outline" className="w-full text-xs font-bold rounded-xl border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800">Support Center</Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-40">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-10 w-10 text-slate-500"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="flex items-center gap-2 md:gap-4 ml-auto">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-700">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Live</span>
            </div>
            
            <ThemeToggle />

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <Avatar className="h-9 w-9 border-2 border-slate-100 dark:border-slate-700 shadow-sm">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-bold uppercase">
                      {userProfile?.full_name?.substring(0, 2) || 'MO'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                      {userProfile?.full_name || 'Official'}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
                      {userProfile?.role?.replace('_', ' ') || 'Government'}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 shadow-xl border-slate-200 dark:border-slate-700">
                <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Management</DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem onClick={() => setActiveTab('settings')} className="rounded-lg h-10 cursor-pointer">
                  <Settings className="mr-3 h-4 w-4 text-slate-500" />
                  <span className="font-medium">Portal Settings</span>
                </DropdownMenuItem>
                
                {userProfile?.role === 'school_admin' || userProfile?.secondary_role === 'school_admin' ? (
                  <>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem 
                      className="rounded-lg h-10 cursor-pointer bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      onClick={() => {
                        window.location.href = '/school-admin';
                      }}
                    >
                      <ShieldAlert className="mr-3 h-4 w-4" />
                      <span className="font-bold">Switch to Admin Portal</span>
                    </DropdownMenuItem>
                  </>
                ) : null}

                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem onClick={handleLogout} className="rounded-lg h-10 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/10">
                  <LogOut className="mr-3 h-4 w-4" />
                  <span className="font-bold">Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
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
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Portal Settings</h2>
                    <p className="text-slate-500 mt-2">Manage your ministry official profile and portal preferences.</p>
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

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
