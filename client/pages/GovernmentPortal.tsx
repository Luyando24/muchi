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
  GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/components/ui/use-toast";
import ThemeToggle from '@/components/navigation/ThemeToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading National Overview...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">National Overview</h2>
          <p className="text-slate-500">Key metrics across all educational institutions.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md">
          <Download className="mr-2 h-4 w-4" /> Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-md bg-white dark:bg-slate-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2"><School className="h-4 w-4 text-blue-500"/> Total Schools</CardDescription>
            <CardTitle className="text-4xl font-black">{stats.totalSchools.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400 font-medium">+12 this academic year</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white dark:bg-slate-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2"><Users className="h-4 w-4 text-emerald-500"/> Enrolled Students</CardDescription>
            <CardTitle className="text-4xl font-black">{stats.totalStudents.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400 font-medium">Across all provinces</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white dark:bg-slate-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-orange-500"/> Avg. Attendance</CardDescription>
            <CardTitle className="text-4xl font-black">{stats.avgAttendance}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-emerald-600 font-medium">+2.4% from last term</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-blue-600 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><GraduationCap className="h-20 w-20" /></div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-blue-100 font-bold uppercase text-xs">National Pass Rate</CardDescription>
            <CardTitle className="text-4xl font-black">{stats.nationalPassRate}%</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-xs text-blue-100 font-medium">Based on recent term results</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Regional Distribution</CardTitle>
            <CardDescription>Schools and students per province</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl m-6 mt-0">
             <Map className="h-10 w-10 mb-2 opacity-50" />
             <p className="text-sm font-medium">Regional Map Visualization</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>System anomalies requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-start gap-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30">
                <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                   <h4 className="font-bold text-orange-900 dark:text-orange-300">Low Attendance Warning</h4>
                   <p className="text-sm text-orange-700 dark:text-orange-400/80 mt-1">Lusaka District reports &lt; 75% attendance in 4 schools over the past 3 days.</p>
                </div>
             </div>
             <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30">
                <Users className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                   <h4 className="font-bold text-blue-900 dark:text-blue-300">Enrollment Spike</h4>
                   <p className="text-sm text-blue-700 dark:text-blue-400/80 mt-1">Copperbelt region showing a 5% increase in grade 8 enrollments.</p>
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
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Academic Performance</h2>
          <p className="text-slate-500">Analyze grades, subject pass rates, and historical trends.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2 border-none shadow-md">
          <CardHeader>
            <CardTitle>Historical Pass Rates</CardTitle>
            <CardDescription>Comparison across last 4 academic years</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl m-6 mt-0 bg-slate-50 dark:bg-slate-900/50">
             <TrendingUp className="h-10 w-10 mb-2 opacity-50" />
             <p className="text-sm font-medium">Line Chart Visualization</p>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card className="border-none shadow-md bg-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-100 font-bold uppercase text-xs">Top Performing Subject</CardDescription>
              <CardTitle className="text-3xl font-black">Science (84%)</CardTitle>
            </CardHeader>
             <CardContent>
               <p className="text-xs text-blue-100">National average, Grade 12</p>
             </CardContent>
          </Card>
          <Card className="border-none shadow-md bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-200">
            <CardHeader className="pb-2">
              <CardDescription className="text-orange-700 dark:text-orange-400 font-bold uppercase text-xs">Critical Attention</CardDescription>
              <CardTitle className="text-3xl font-black">Mathematics (42%)</CardTitle>
            </CardHeader>
             <CardContent>
               <p className="text-xs text-orange-800 dark:text-orange-300">Fell 5% below target in rural districts</p>
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-600 p-2 rounded-xl">
               <Package className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">National Feeding Portal</h1>
          </div>
          <p className="text-muted-foreground text-lg font-medium">Logistics, Supply Chain & Program Monitoring</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" className="rounded-xl border-slate-200 shadow-sm"><Download className="h-4 w-4 mr-2" /> Export Data</Button>
           <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 text-white">Live Monitor</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg bg-emerald-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Users className="h-20 w-20" /></div>
          <CardHeader>
            <CardDescription className="text-emerald-100 font-bold uppercase tracking-wider text-xs">Total Beneficiaries</CardDescription>
            <CardTitle className="text-4xl font-black">{stats?.totalBeneficiaries?.toLocaleString() || '0'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-emerald-100 text-xs font-semibold">
              <TrendingUp className="h-4 w-4" />
              <span>Fed daily on average</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
          <CardHeader>
            <CardDescription className="text-xs font-bold uppercase text-slate-500">Participating Schools</CardDescription>
            <CardTitle className="text-4xl font-black">{schools.length}</CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-xs text-slate-400 font-medium italic">Enrolled in feeding program</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
          <CardHeader>
            <CardDescription className="text-xs font-bold uppercase text-blue-500">Maize Stock (Bags)</CardDescription>
            <CardTitle className="text-4xl font-black">{stats?.stockSummary?.Maize?.toLocaleString() || '0'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400 font-medium italic">Aggregate inventory</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
          <CardHeader>
            <CardDescription className="text-xs font-bold uppercase text-orange-500">Pending Procurements</CardDescription>
            <CardTitle className="text-4xl font-black">{stats?.pendingProcurements || '0'}</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-2 text-orange-500 text-xs font-bold">
               <AlertTriangle className="h-4 w-4" />
               <span>Requires Review</span>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Monitoring Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Filter Sidebar */}
         <Card className="border-none shadow-xl bg-white dark:bg-slate-900 h-fit">
            <CardHeader className="border-b dark:border-slate-800">
               <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="h-5 w-5 text-emerald-500" />
                  Geographic Filter
               </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400">Province</label>
                  <Select value={filters.province} onValueChange={(val) => setFilters({...filters, province: val})}>
                     <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-800 border-none h-12 text-slate-900 dark:text-white">
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="All">All Provinces</SelectItem>
                        <SelectItem value="Lusaka">Lusaka</SelectItem>
                        <SelectItem value="Copperbelt">Copperbelt</SelectItem>
                        <SelectItem value="Central">Central</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400">District</label>
                  <Select value={filters.district} onValueChange={(val) => setFilters({...filters, district: val})}>
                     <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-800 border-none h-12 text-slate-900 dark:text-white">
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="All">All Districts</SelectItem>
                        <SelectItem value="Lusaka District">Lusaka District</SelectItem>
                        <SelectItem value="Ndola">Ndola</SelectItem>
                        <SelectItem value="Kitwe">Kitwe</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
               <Button className="w-full rounded-xl bg-slate-900 text-white hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 h-11">Apply Advanced Filters</Button>
            </CardContent>
         </Card>

         {/* School Feed */}
         <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="text-2xl font-black text-slate-900 dark:text-white">Logistics Feed</h3>
               <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input placeholder="Search school..." className="bg-transparent border-none outline-none text-sm w-32 md:w-48 text-slate-900 dark:text-white" />
               </div>
            </div>

            <div className="space-y-4">
               {isLoading ? (
                  Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />)
               ) : schools.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                    No schools found for this filter.
                  </div>
               ) : (
                  schools.map(school => (
                     <Card key={school.id} className="group border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden cursor-pointer bg-white dark:bg-slate-900">
                        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                           <div className="flex items-center gap-4">
                              <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white shrink-0">
                                 <School className="h-7 w-7" />
                              </div>
                              <div>
                                 <h4 className="text-xl font-black group-hover:text-emerald-600 transition-colors text-slate-900 dark:text-white">{school.name}</h4>
                                 <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">{school.province || 'Unknown'}</Badge>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-xs text-muted-foreground font-medium">{school.district || 'Unknown'}</span>
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-6">
                              <div className="text-right hidden sm:block">
                                 <p className="text-xs font-black uppercase text-slate-400 mb-1">Status</p>
                                 <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-sm font-bold text-emerald-600">Active</span>
                                 </div>
                              </div>
                              <ArrowUpRight className="h-6 w-6 text-slate-300 group-hover:text-emerald-600 transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
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
  const [userProfile, setUserProfile] = useState<{full_name: string; role: string} | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single();
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Navbar */}
      <nav className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-6 fixed top-0 w-full z-50">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg hidden sm:block text-slate-900 dark:text-white">Ministry of Education</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="hidden md:flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-4">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{userProfile?.full_name || 'Official'}</p>
              <p className="text-xs text-slate-500 capitalize">{userProfile?.role.replace('_', ' ') || 'Government'}</p>
            </div>
            <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-800">
              <AvatarImage src="" />
              <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                {userProfile?.full_name?.substring(0,2).toUpperCase() || 'MO'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 mt-16 lg:mt-0 z-40 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out border-r border-slate-800 h-[calc(100vh-64px)] overflow-y-auto`}>
          <div className="flex flex-col h-full">
            <nav className="flex-1 px-4 py-6 space-y-2">
              <div className="mb-6 px-2">
                <p className="text-xs font-black tracking-wider text-slate-500 uppercase">Core Systems</p>
              </div>
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={activeTab === item.id ? "secondary" : "ghost"}
                    className={`w-full justify-start ${activeTab === item.id ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-slate-800 hover:text-white'}`}
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
            <div className="p-4 border-t border-slate-800">
              <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/30" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden top-16"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto h-[calc(100vh-64px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsContent value="overview" className="h-full m-0">
               <OverviewDashboard />
            </TabsContent>
            
            <TabsContent value="performance" className="h-full m-0">
               <PerformanceDashboard />
            </TabsContent>
            
            <TabsContent value="feeding" className="h-full m-0">
               <FeedingDashboard />
            </TabsContent>

            <TabsContent value="settings" className="m-0">
              <div className="max-w-2xl">
                 <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-6">Portal Settings</h2>
                 <Card className="border-none shadow-md">
                   <CardHeader>
                     <CardTitle>Preferences</CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-4">
                     <p className="text-sm text-slate-500">Government portal settings and API access management will be configured here.</p>
                     <Button variant="outline">Manage Preferences</Button>
                   </CardContent>
                 </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
