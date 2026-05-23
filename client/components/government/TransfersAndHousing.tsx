import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Home, ArrowRightLeft, HeartHandshake, Filter, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#71717a', '#ef4444'];

export default function TransfersAndHousing() {
  const [data, setData] = useState({
    housingStats: {} as any,
    transfers: [] as any[],
    reunions: [] as any[],
    transferFlowStats: { RuralToUrban: 0, UrbanToRural: 0, RuralToRural: 0, UrbanToUrban: 0 }
  });
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
        let url = '/api/government/transfers-housing?';
        if (filters.province !== 'All') url += `province=${encodeURIComponent(filters.province)}&`;
        if (filters.district !== 'All') url += `district=${encodeURIComponent(filters.district)}`;

        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
        if (res.ok) setData(await res.json());
      } catch (err) {
      } finally { setLoading(false); }
    }
    load();
  }, [filters]);

  if (loading && Object.keys(data.housingStats).length === 0) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600 opacity-20" /></div>;

  const housingChartData = [
    { name: 'Government House', value: data.housingStats.Government || 0 },
    { name: 'Private Rental', value: data.housingStats.Private || 0 },
    { name: 'Own Home', value: data.housingStats.OwnHome || 0 },
    { name: 'Unknown', value: data.housingStats.Unknown || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Transfers & Housing</h2>
          <p className="text-slate-600 dark:text-slate-400">Teacher mobility, housing status, and couple reunions.</p>
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
            <CardTitle className="text-lg flex items-center gap-2"><Home className="h-5 w-5 text-blue-500" /> Housing Distribution</CardTitle>
            <CardDescription>{data.housingStats.SeparatedFromSpouse || 0} teachers separated from spouses.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={housingChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {housingChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-emerald-500" /> Transfer Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-slate-500">Teacher</th>
                    <th className="py-2 text-slate-500">From</th>
                    <th className="py-2 text-slate-500">To</th>
                    <th className="py-2 text-slate-500">Reason</th>
                    <th className="py-2 text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.transfers.map((t, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="py-2 font-medium">{t.profiles?.full_name}</td>
                      <td className="py-2 text-slate-600">{t.origin?.name}</td>
                      <td className="py-2 text-slate-600">{t.dest?.name}</td>
                      <td className="py-2 text-xs truncate max-w-[150px]">{t.reason}</td>
                      <td className="py-2">
                        <Badge className={t.status === 'Approved' ? 'bg-emerald-500' : t.status === 'Rejected' ? 'bg-red-500' : 'bg-orange-500'}>{t.status}</Badge>
                      </td>
                    </tr>
                  ))}
                  {data.transfers.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">No transfer requests found.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Deployment Flow Analytics */}
        <Card className="lg:col-span-3 border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-500" /> Deployment Flow Analytics
            </CardTitle>
            <CardDescription>
              Monitoring rural-to-urban teacher migration and staffing distribution flows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const flowStats = data.transferFlowStats || { RuralToUrban: 0, UrbanToRural: 0, RuralToRural: 0, UrbanToUrban: 0 };
              const totalFlows = flowStats.RuralToUrban + flowStats.UrbanToRural + flowStats.RuralToRural + flowStats.UrbanToUrban;
              const ruralToUrbanPct = totalFlows > 0 ? (flowStats.RuralToUrban / totalFlows) * 100 : 0;
              const u2rPct = totalFlows > 0 ? (flowStats.UrbanToRural / totalFlows) * 100 : 0;
              const r2rPct = totalFlows > 0 ? (flowStats.RuralToRural / totalFlows) * 100 : 0;
              const u2uPct = totalFlows > 0 ? (flowStats.UrbanToUrban / totalFlows) * 100 : 0;

              return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Highlight Card for Rural to Urban */}
                  <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 p-5 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Rural to Urban</span>
                      <h4 className="text-4xl font-extrabold text-amber-900 dark:text-amber-200 mt-2">{flowStats.RuralToUrban}</h4>
                      <p className="text-xs text-slate-500 mt-1">Transfers out of rural schools</p>
                    </div>
                    {flowStats.RuralToUrban > flowStats.UrbanToRural && (
                      <div className="mt-4 p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-start gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-[10px] font-bold text-red-800 dark:text-red-300">Asymmetric Flow</h5>
                          <p className="text-[9px] text-red-600 dark:text-red-400 leading-tight mt-0.5">
                            More teachers are leaving rural environments than entering them.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Flow Breakdown */}
                  <div className="md:col-span-3 space-y-4">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Teacher Distribution Flow Channels</h4>
                    
                    {/* Rural to Urban */}
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span className="text-slate-600 dark:text-slate-400">Rural to Urban (Village to Town)</span>
                        <span className="font-bold text-amber-600">{flowStats.RuralToUrban} ({ruralToUrbanPct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div style={{ width: `${ruralToUrbanPct}%` }} className="h-full bg-amber-500 rounded-full" />
                      </div>
                    </div>

                    {/* Urban to Rural */}
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span className="text-slate-600 dark:text-slate-400">Urban to Rural (Town to Village)</span>
                        <span className="font-bold text-emerald-600">{flowStats.UrbanToRural} ({u2rPct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div style={{ width: `${u2rPct}%` }} className="h-full bg-emerald-500 rounded-full" />
                      </div>
                    </div>

                    {/* Rural to Rural */}
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span className="text-slate-600 dark:text-slate-400">Rural to Rural</span>
                        <span className="font-bold text-blue-600">{flowStats.RuralToRural} ({r2rPct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div style={{ width: `${r2rPct}%` }} className="h-full bg-blue-500 rounded-full" />
                      </div>
                    </div>

                    {/* Urban to Urban */}
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span className="text-slate-600 dark:text-slate-400">Urban to Urban</span>
                        <span className="font-bold text-slate-600 dark:text-slate-400">{flowStats.UrbanToUrban} ({u2uPct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div style={{ width: `${u2uPct}%` }} className="h-full bg-slate-500 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-sm bg-pink-50 dark:bg-pink-900/10 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-pink-700 dark:text-pink-400"><HeartHandshake className="h-5 w-5" /> Couple Reunion Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.reunions.map((r, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-pink-100 dark:border-pink-900/30">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold">{r.profiles?.full_name}</h4>
                    <Badge variant="outline" className="text-xs bg-pink-100 text-pink-700 border-none">{r.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">Spouse: <span className="font-medium text-slate-700 dark:text-slate-300">{r.spouse_name} ({r.spouse_employer_school})</span></p>
                  <p className="text-xs text-slate-500">Separation: <span className="font-medium text-slate-700 dark:text-slate-300">{r.duration_of_separation_months} months / {r.current_separation_distance}km</span></p>
                </div>
              ))}
              {data.reunions.length === 0 && <p className="text-sm text-slate-400 py-4 col-span-3 text-center">No active couple reunion applications.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
