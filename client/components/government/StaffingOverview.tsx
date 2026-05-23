import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, AlertTriangle, Filter, Search, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function StaffingOverview() {
  const [data, setData] = useState({
    headcount: 0,
    genderBreakdown: { Male: 0, Female: 0, Other: 0 },
    locationBreakdown: { Rural: 0, Urban: 0 },
    mortality: [] as any[],
    vacancies: [] as any[],
    alerts: [] as any[]
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
      } catch (err) {}
    }
    fetchRegions();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let url = '/api/government/staffing-overview?';
        if (filters.province !== 'All') url += `province=${encodeURIComponent(filters.province)}&`;
        if (filters.district !== 'All') url += `district=${encodeURIComponent(filters.district)}`;

        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
        if (res.ok) setData(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filters]);

  if (loading && data.headcount === 0) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600 opacity-20" /></div>;

  const totalGender = data.genderBreakdown.Male + data.genderBreakdown.Female + data.genderBreakdown.Other;
  const malePct = totalGender > 0 ? (data.genderBreakdown.Male / totalGender) * 100 : 0;
  const femalePct = totalGender > 0 ? (data.genderBreakdown.Female / totalGender) * 100 : 0;

  const totalLocation = (data.locationBreakdown?.Rural || 0) + (data.locationBreakdown?.Urban || 0);
  const ruralPct = totalLocation > 0 ? ((data.locationBreakdown?.Rural || 0) / totalLocation) * 100 : 0;
  const urbanPct = totalLocation > 0 ? ((data.locationBreakdown?.Urban || 0) / totalLocation) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Staffing Overview</h2>
          <p className="text-slate-600 dark:text-slate-400">Workforce distribution, mortality, and staffing gaps.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 shadow-none">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-slate-500">Total Teachers</h3>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">{data.headcount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Location Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm font-bold mb-2">
              <span className="text-emerald-600">Urban: {data.locationBreakdown?.Urban || 0} ({urbanPct.toFixed(1)}%)</span>
              <span className="text-orange-600">Rural: {data.locationBreakdown?.Rural || 0} ({ruralPct.toFixed(1)}%)</span>
            </div>
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div style={{ width: `${urbanPct}%` }} className="bg-emerald-500" />
              <div style={{ width: `${ruralPct}%` }} className="bg-orange-500" />
            </div>
            {ruralPct < 30 && ruralPct > 0 && (
              <p className="text-[10px] text-red-500 font-semibold mt-2 animate-pulse flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Rural teacher ratio is low! Possible deployment shortage.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Gender Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm font-bold mb-2">
              <span className="text-blue-600">Male: {data.genderBreakdown.Male} ({malePct.toFixed(1)}%)</span>
              <span className="text-pink-600">Female: {data.genderBreakdown.Female} ({femalePct.toFixed(1)}%)</span>
            </div>
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div style={{ width: `${malePct}%` }} className="bg-blue-500" />
              <div style={{ width: `${femalePct}%` }} className="bg-pink-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500"/> Staffing Alerts (PTR)</CardTitle>
            <CardDescription>Schools understaffed based on pupil-teacher ratio</CardDescription>
          </CardHeader>
          <CardContent>
            {data.alerts.length === 0 ? (
              <p className="text-sm text-slate-500">No critical staffing alerts.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data.alerts.map((a, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border rounded-lg bg-orange-50 dark:bg-orange-900/10">
                    <div>
                      <p className="font-bold">{a.schoolName}</p>
                      <p className="text-xs text-slate-500">{a.district}</p>
                    </div>
                    <Badge variant="destructive" className="bg-red-500">PTR {a.ptr}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><UserMinus className="h-5 w-5 text-slate-500"/> Deceased Teachers Log</CardTitle>
            <CardDescription>Mortality tracking and causes</CardDescription>
          </CardHeader>
          <CardContent>
            {data.mortality.length === 0 ? (
              <p className="text-sm text-slate-500">No records found.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data.mortality.map((m, i) => (
                  <div key={i} className="flex flex-col p-3 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold">{m.profiles?.full_name}</span>
                      <span className="text-xs text-slate-500">{new Date(m.date_of_death).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600">{m.cause_category}</span>
                      <Badge variant="secondary" className="text-[10px]">{m.profiles?.gender}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
