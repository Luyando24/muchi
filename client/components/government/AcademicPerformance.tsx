import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, Filter, AlertCircle, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { syncFetch } from '@/lib/syncService';

export default function AcademicPerformance() {
  const [data, setData] = useState({ performanceList: [] as any[] });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ province: 'All', district: 'All' });
  const [regions, setRegions] = useState<{ province: string, districts: string[] }[]>([]);

  useEffect(() => {
    async function fetchRegions() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const regionsData = await syncFetch('/api/government/regions', {
          headers: { 'Authorization': `Bearer ${session?.access_token}` },
          cacheKey: 'gov-regions'
        });
        if (regionsData) setRegions(regionsData);
      } catch (err) {}
    }
    fetchRegions();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let url = '/api/government/academic-performance?';
        if (filters.province !== 'All') url += `province=${encodeURIComponent(filters.province)}&`;
        if (filters.district !== 'All') url += `district=${encodeURIComponent(filters.district)}`;

        const resData = await syncFetch(url, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` },
          cacheKey: `gov-academic-performance-${filters.province}-${filters.district}`
        });
        if (resData) setData(resData);
      } catch (err) {
      } finally { setLoading(false); }
    }
    load();
  }, [filters]);

  if (loading && data.performanceList.length === 0) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600 opacity-20" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Academic Performance Analysis</h2>
          <p className="text-slate-600 dark:text-slate-400">Deep dive into performance drivers and comparative benchmarking.</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border shadow-sm">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select value={filters.province} onValueChange={(val) => setFilters({ ...filters, province: val, district: 'All' })}>
            <SelectTrigger className="w-[140px] h-9 border-none focus:ring-0 shadow-none"><SelectValue placeholder="Province" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Provinces</SelectItem>
              {regions.map(r => <SelectItem key={r.province} value={r.province}>{r.province}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700" />
          <Select value={filters.district} onValueChange={(val) => setFilters({ ...filters, district: val })} disabled={filters.province === 'All'}>
            <SelectTrigger className="w-[130px] h-9 border-none focus:ring-0 shadow-none"><SelectValue placeholder="District" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Districts</SelectItem>
              {regions.find(r => r.province === filters.province)?.districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-blue-500" /> Comparative Benchmarking & Drivers</CardTitle>
          <CardDescription>Rankings and correlated performance metrics.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-900/50">
                  <th className="py-3 px-4 font-bold text-slate-500">Rank</th>
                  <th className="py-3 px-4 font-bold text-slate-500">School</th>
                  <th className="py-3 px-4 font-bold text-slate-500">Pass Rate</th>
                  <th className="py-3 px-4 font-bold text-slate-500">Infra. Score</th>
                  <th className="py-3 px-4 font-bold text-slate-500">Absenteeism</th>
                  <th className="py-3 px-4 font-bold text-slate-500">Vulnerable %</th>
                  <th className="py-3 px-4 font-bold text-slate-500">Alerts</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.performanceList.map((s, i) => {
                  const showWarning = s.passRate < 40 && s.absenteeismRate > 10;
                  return (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="py-3 px-4 font-bold text-slate-400">#{i + 1}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium">{s.schoolName}</p>
                      <p className="text-xs text-slate-500">{s.district}</p>
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-600">{s.passRate}%</td>
                    <td className="py-3 px-4">{s.infrastructureScore}/100</td>
                    <td className="py-3 px-4">{s.absenteeismRate}%</td>
                    <td className="py-3 px-4">{s.vulnerablePct}%</td>
                    <td className="py-3 px-4">
                      {showWarning && (
                        <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-md text-[10px] font-bold">
                          <AlertCircle className="h-3 w-3" /> High Absenteeism Correlation
                        </div>
                      )}
                    </td>
                  </tr>
                )})}
                {data.performanceList.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400">No performance data found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
