import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Heart, Filter, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { syncFetch } from '@/lib/syncService';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#71717a', '#ef4444', '#ec4899'];

export default function TeacherDisabilities() {
  const [data, setData] = useState({ disabilities: [] as any[], summary: {} as Record<string, number> });
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
        let url = '/api/government/teacher-disabilities?';
        if (filters.province !== 'All') url += `province=${encodeURIComponent(filters.province)}&`;
        if (filters.district !== 'All') url += `district=${encodeURIComponent(filters.district)}`;

        const resData = await syncFetch(url, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` },
          cacheKey: `gov-teacher-disabilities-${filters.province}-${filters.district}`
        });
        if (resData) setData(resData);
      } catch (err) {
      } finally { setLoading(false); }
    }
    load();
  }, [filters]);

  if (loading && data.disabilities.length === 0) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600 opacity-20" /></div>;

  const chartData = Object.entries(data.summary).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Teacher Disabilities & Accommodations</h2>
          <p className="text-slate-600 dark:text-slate-400">Tracking support provided to staff with disabilities.</p>
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

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Heart className="h-5 w-5 text-pink-500" /> Disability Types</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" /> Accommodation Gaps</CardTitle>
            <CardDescription>Teachers who require specific accommodations.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 font-bold text-slate-500">Teacher</th>
                    <th className="py-3 font-bold text-slate-500">Disability</th>
                    <th className="py-3 font-bold text-slate-500">Accommodation Provided</th>
                    <th className="py-3 font-bold text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.disabilities.map((t, i) => {
                    const isAccommodated = t.accommodation_provided && t.accommodation_provided !== 'None';
                    return (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="py-3 font-medium">{t.full_name}</td>
                      <td className="py-3"><Badge variant="outline">{t.disability_status}</Badge></td>
                      <td className="py-3 text-slate-600">{t.accommodation_provided || 'None'}</td>
                      <td className="py-3">
                        {isAccommodated ? <Badge className="bg-emerald-500">Supported</Badge> : <Badge className="bg-orange-500">Needs Support</Badge>}
                      </td>
                    </tr>
                  )})}
                  {data.disabilities.length === 0 && (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-400">No records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
