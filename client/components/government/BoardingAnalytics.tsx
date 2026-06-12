import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Loader2, 
  Building2, 
  Bed, 
  Users, 
  AlertTriangle, 
  ShieldAlert,
  ArrowRightLeft,
  AlertCircle,
  RefreshCcw,
  CheckCircle2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  Cell
} from 'recharts';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { syncFetch } from '@/lib/syncService';

export default function BoardingAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const boardingData = await syncFetch('/api/government/boarding-analytics', { 
          headers: { 'Authorization': `Bearer ${session?.access_token}` },
          cacheKey: 'gov-boarding-analytics'
        });
        if (boardingData) {
          setData(boardingData);
        }
      } catch (err) {
        console.error('Error fetching boarding analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [refreshTrigger]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-slate-500 italic">
        Failed to load boarding analytics.
      </div>
    );
  }

  const { schoolDistribution, demographics, capacity, shortages, alerts } = data;

  const schoolPieData = [
    { name: 'Day School only', value: schoolDistribution.day, color: '#94a3b8' },
    { name: 'Boarding only', value: schoolDistribution.boarding, color: '#3b82f6' },
    { name: 'Day & Boarding (Both)', value: schoolDistribution.both, color: '#10b981' },
    { name: 'Not Configured', value: schoolDistribution.unconfigured || 0, color: '#f59e0b' }
  ].filter(item => item.value > 0);

  const capacityBarData = [
    {
      name: 'Male',
      Capacity: capacity.maleCapacity,
      Occupied: capacity.maleOccupied
    },
    {
      name: 'Female',
      Capacity: capacity.femaleCapacity,
      Occupied: capacity.femaleOccupied
    }
  ];

  const occupancyRate = capacity.totalCapacity > 0 
    ? Math.round((capacity.occupiedBeds / capacity.totalCapacity) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Boarding & Student Accommodation Analytics</h2>
          <p className="text-slate-600 dark:text-slate-400">National oversight of school boarding facilities, capacity utilization, and shortages.</p>
        </div>
        <button 
          onClick={() => setRefreshTrigger(p => p + 1)}
          className="p-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 shadow-none">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-slate-500">Total Boarders</h3>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{demographics.totalBoarders}</p>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              {demographics.maleBoarders} Boys / {demographics.femaleBoarders} Girls
            </p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 shadow-none">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-slate-500">Total Bed Capacity</h3>
              <Bed className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{capacity.totalCapacity}</p>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              {capacity.maleCapacity} Male / {capacity.femaleCapacity} Female beds
            </p>
          </CardContent>
        </Card>

        <Card className="bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 shadow-none">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-slate-500">National Occupancy</h3>
              <Building2 className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{capacity.occupiedBeds}</p>
              <span className="text-xs text-indigo-600 font-bold">({occupancyRate}%)</span>
            </div>
            <Progress value={occupancyRate} className="h-1.5 mt-2 bg-indigo-100/50" />
          </CardContent>
        </Card>

        <Card className={cn(
          "shadow-none border-red-100",
          shortages.length > 0 ? "bg-red-50/50 dark:bg-red-950/10" : "bg-slate-50 dark:bg-slate-900/50"
        )}>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-slate-500">Shortage alerts</h3>
              <ShieldAlert className="h-5 w-5 text-rose-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{shortages.length}</p>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              {shortages.reduce((acc: number, curr: any) => acc + curr.shortage, 0)} total beds required
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">School Boarding Statuses</CardTitle>
            <CardDescription>Day vs Boarding vs Mixed facilities distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] flex items-center justify-center">
            {schoolPieData.length > 0 ? (
              <div className="w-full h-full flex flex-col sm:flex-row items-center justify-around">
                <div className="h-[200px] w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={schoolPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {schoolPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 text-sm">
                  {schoolPieData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-slate-600 dark:text-slate-400">{entry.name}:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-slate-400 italic">No schools configured.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Hostel Allocation vs Bed Capacities</CardTitle>
            <CardDescription>Allocated beds vs total capacity by gender policy</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={capacityBarData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Capacity" fill="#a8a29e" radius={[4, 4, 0, 0]} barSize={35} />
                <Bar dataKey="Occupied" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Critical Shortage Alerts */}
      <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Critical Shortage Reports & Alerts
          </CardTitle>
          <CardDescription>Urgent alerts submitted directly by school administrators</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length > 0 ? (
            <div className="space-y-4">
              {alerts.map((alert: any) => (
                <div key={alert.id} className="flex gap-4 p-4 rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900/30">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{alert.title}</h4>
                      <Badge variant="outline" className="text-[10px]">
                        {new Date(alert.created_at).toLocaleString()}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {alert.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2 opacity-55" />
              <p className="italic text-sm">No critical alerts or warnings received.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Shortages Table */}
      <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Schools Experiencing Accommodation Shortages</CardTitle>
          <CardDescription>Day schools are excluded from the shortage calculations</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-xs text-slate-400 font-bold uppercase border-b">
                <tr>
                  <th className="py-4 px-6">School Name</th>
                  <th className="py-4 px-6">Province / District</th>
                  <th className="py-4 px-6 text-center">Boarding Type</th>
                  <th className="py-4 px-6 text-center">Total Boarders</th>
                  <th className="py-4 px-6 text-center">Bed Capacity</th>
                  <th className="py-4 px-6 text-center">Shortage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {shortages.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{s.name}</td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400">{s.province} / {s.district}</td>
                    <td className="py-4 px-6 text-center">
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                        {s.boardingStatus}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-center font-semibold">{s.boarders}</td>
                    <td className="py-4 px-6 text-center font-semibold">{s.capacity}</td>
                    <td className="py-4 px-6 text-center">
                      <Badge variant="destructive" className="font-black text-xs uppercase px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 border-red-200">
                        -{s.shortage} beds
                      </Badge>
                    </td>
                  </tr>
                ))}
                {shortages.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                      No schools reporting boarding accommodation shortages.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
