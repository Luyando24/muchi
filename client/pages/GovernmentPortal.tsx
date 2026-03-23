
import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Map, 
  School, 
  AlertTriangle, 
  Filter, 
  Download,
  TrendingUp,
  Users,
  Package,
  ArrowUpRight,
  Search,
  Building2,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";

export default function GovernmentPortal() {
  const [stats, setStats] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ province: 'All', district: 'All' });
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
    fetchSchools();
  }, [filters]);

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/government/feeding-program/stats', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (response.ok) setStats(await response.json());
    } catch (error) {
      console.error('Error fetching government stats:', error);
    }
  };

  const fetchSchools = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let url = '/api/government/feeding-program/schools';
      const params = new URLSearchParams();
      if (filters.province !== 'All') params.append('province', filters.province);
      if (filters.district !== 'All') params.append('district', filters.district);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (response.ok) setSchools(await response.json());
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-8 space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-600 p-2 rounded-xl">
               <Building2 className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">National Feeding Portal</h1>
          </div>
          <p className="text-muted-foreground text-lg font-medium">Ministry of Education • Republic of Zambia</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" className="rounded-xl border-slate-200 shadow-sm"><Download className="h-4 w-4 mr-2" /> Export National Report</Button>
           <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200">Live Monitor</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg bg-emerald-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <Users className="h-20 w-20" />
          </div>
          <CardHeader>
            <CardDescription className="text-emerald-100 font-bold uppercase tracking-wider text-xs">Total Beneficiaries</CardDescription>
            <CardTitle className="text-4xl font-black">{stats?.totalBeneficiaries?.toLocaleString() || '0'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-emerald-100 text-xs font-semibold">
              <TrendingUp className="h-4 w-4" />
              <span>+12% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
          <CardHeader>
            <CardDescription className="text-xs font-bold uppercase text-slate-500">Active Schools</CardDescription>
            <CardTitle className="text-4xl font-black">{schools.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <Map className="h-4 w-4" />
              <span>Across 10 Provinces</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
          <CardHeader>
            <CardDescription className="text-xs font-bold uppercase text-blue-500">Maize Stock (National)</CardDescription>
            <CardTitle className="text-4xl font-black">{stats?.stockSummary?.Maize || '0'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 font-semibold italic">Aggregate bags in inventory</p>
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
               <span>Requires Immediate Review</span>
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
                     <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-800 border-none h-12">
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="All">All Provinces</SelectItem>
                        <SelectItem value="Lusaka">Lusaka</SelectItem>
                        <SelectItem value="Copperbelt">Copperbelt</SelectItem>
                        <SelectItem value="Central">Central</SelectItem>
                        <SelectItem value="Eastern">Eastern</SelectItem>
                        <SelectItem value="Northern">Northern</SelectItem>
                        <SelectItem value="Southern">Southern</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400">District</label>
                  <Select value={filters.district} onValueChange={(val) => setFilters({...filters, district: val})}>
                     <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-800 border-none h-12">
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
               <Button className="w-full rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 h-11">Apply Advanced Filters</Button>
            </CardContent>
         </Card>

         {/* School Feed */}
         <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="text-2xl font-black text-slate-900 dark:text-white">Monitoring Feed</h3>
               <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input placeholder="Search school name..." className="bg-transparent border-none outline-none text-sm w-40" />
               </div>
            </div>

            <div className="space-y-4">
               {isLoading ? (
                  Array(5).fill(0).map((_, i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />)
               ) : (
                  schools.map(school => (
                     <Card key={school.id} className="group border-none shadow-md hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden cursor-pointer bg-white dark:bg-slate-900">
                        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                           <div className="flex items-center gap-4">
                              <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                                 <School className="h-7 w-7" />
                              </div>
                              <div>
                                 <h4 className="text-xl font-black group-hover:text-emerald-600 transition-colors">{school.name}</h4>
                                 <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">{school.province}</Badge>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-xs text-muted-foreground font-medium">{school.district}</span>
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-6">
                              <div className="text-right">
                                 <p className="text-xs font-black uppercase text-slate-400 mb-1">Status</p>
                                 <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-sm font-bold text-emerald-600">Compliant</span>
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
