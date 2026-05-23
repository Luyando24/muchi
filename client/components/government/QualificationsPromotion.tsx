import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Award, Filter, Briefcase, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function QualificationsPromotion() {
  const [data, setData] = useState({ qualifications: [] as any[], distribution: {} as Record<string, number> });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ province: 'All', district: 'All' });
  const [regions, setRegions] = useState<{ province: string, districts: string[] }[]>([]);

  useEffect(() => {
    async function fetchRegions() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/government/regions', { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
        if (res.ok) setRegions(await res.json());
      } catch (err) {}
    }
    fetchRegions();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let url = '/api/government/qualifications?';
        if (filters.province !== 'All') url += `province=${encodeURIComponent(filters.province)}&`;
        if (filters.district !== 'All') url += `district=${encodeURIComponent(filters.district)}`;

        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
        if (res.ok) setData(await res.json());
      } catch (err) {
      } finally { setLoading(false); }
    }
    load();
  }, [filters]);

  if (loading && data.qualifications.length === 0) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600 opacity-20" /></div>;

  const chartData = Object.entries(data.distribution).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Qualifications & Promotion</h2>
          <p className="text-slate-600 dark:text-slate-400">Registry of teacher qualifications and promotion eligibility.</p>
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
            <CardTitle className="text-lg flex items-center gap-2"><GraduationCap className="h-5 w-5 text-blue-500" /> Qualification Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} style={{ fontSize: '10px' }} />
                 <Tooltip />
                 <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
               </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Award className="h-5 w-5 text-emerald-500" /> Promotion Readiness Tracker</CardTitle>
            <CardDescription>Teachers eligible for promotion based on tenure and qualifications.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 font-bold text-slate-500">Teacher</th>
                    <th className="py-3 font-bold text-slate-500">Current Role</th>
                    <th className="py-3 font-bold text-slate-500">Highest Qual.</th>
                    <th className="py-3 font-bold text-slate-500">Eligibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.qualifications.slice(0, 10).map((t, i) => {
                    // Mock eligibility logic for demo
                    const isEligible = t.highest_qualification === "Master's Degree" || t.highest_qualification === "PhD";
                    const isApproaching = t.highest_qualification === "Bachelor's Degree";
                    return (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="py-3 font-medium">{t.full_name}</td>
                      <td className="py-3"><Badge variant="outline">{t.current_role || 'Subject Teacher'}</Badge></td>
                      <td className="py-3 text-slate-600">{t.highest_qualification || 'Unknown'}</td>
                      <td className="py-3">
                        {isEligible ? <Badge className="bg-emerald-500">Eligible</Badge> : isApproaching ? <Badge className="bg-orange-500">Approaching</Badge> : <Badge className="bg-slate-300 text-slate-700">Not Eligible</Badge>}
                      </td>
                    </tr>
                  )})}
                  {data.qualifications.length === 0 && (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-400">No data found</td></tr>
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
