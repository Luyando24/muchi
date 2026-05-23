
import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Building, 
  Users, 
  Server, 
  Cpu, 
  CheckCircle, 
  AlertTriangle, 
  Plus,
  X,
  RefreshCw,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface SystemStats {
  totalSchools: number;
  activeUsers: number;
  totalRevenue: number;
  onlineUsers: number;
}

interface ServiceHealth {
  name: string;
  status: 'Operational' | 'Maintenance' | 'Degraded';
  load: number;
  latency: string;
}

interface Alert {
  id: string;
  type: 'Warning' | 'Error' | 'Info';
  message: string;
  time: string;
  source: string;
}

interface SystemDashboardProps {
  onNavigate?: (tab: string) => void;
}

export default function SystemDashboard({ onNavigate }: SystemDashboardProps) {
  const [stats, setStats] = useState<SystemStats>({
    totalSchools: 0,
    activeUsers: 0,
    totalRevenue: 0,
    onlineUsers: 0
  });
  
  interface RecentSchool {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    school_licenses: Array<{
      status: string;
      plan: string;
    }>;
    student_count: number;
    teacher_count: number;
  }

  interface ActivityLog {
    id: string;
    type: 'Warning' | 'Error' | 'Info' | 'Success';
    message: string;
    time: string;
    source: string;
  }

  interface UsageSchool {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    student_count: number;
    teacher_count: number;
    sign_ins_7d: number;
    sign_ins_30d: number;
  }

  const [recentSchools, setRecentSchools] = useState<RecentSchool[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [inactiveSchools, setInactiveSchools] = useState<UsageSchool[]>([]);
  const [topPerformingSchools, setTopPerformingSchools] = useState<UsageSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15 * 60 * 1000); // Refresh every 15 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/dashboard', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Dashboard fetch failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to fetch dashboard data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data.stats);
      setRecentSchools(data.recentSchools || []);
      setActivities(data.activities || []);
      setInactiveSchools(data.inactiveSchools || []);
      setTopPerformingSchools(data.topPerformingSchools || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (loading) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load system dashboard",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProvisionSchool = () => {
    if (onNavigate) {
      onNavigate('schools');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            System Overview
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Real-time monitoring of platform health and performance
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={fetchDashboardData} className="flex-1 sm:flex-none">
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-700 flex-1 sm:flex-none" onClick={handleProvisionSchool}>
            <Plus className="h-4 w-4 mr-2" />
            Provision School
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Schools</p>
                <h3 className="text-2xl font-bold mt-2">{stats.totalSchools}</h3>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                <Building className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-green-600">All Operational</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Active Users</p>
                <h3 className="text-2xl font-bold mt-2">{stats.activeUsers.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-purple-600">Registered Accounts</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Platform Revenue (Lifetime)</p>
                <h3 className="text-2xl font-bold mt-2">
                  {new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW' }).format(stats.totalRevenue)}
                </h3>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-slate-500">Total contract value from licenses</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Online Users</p>
                <h3 className="text-2xl font-bold mt-2 flex items-center gap-2">
                  {stats.onlineUsers}
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                </h3>
              </div>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-slate-500">Active sessions in the last 15 minutes</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tenants */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent School Tenants</CardTitle>
            <CardDescription>Newly provisioned schools and their active subscription status.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSchools.length === 0 ? (
              <div className="text-center text-slate-500 py-8 italic text-sm">
                No recent school tenants found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                  <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3">School Name</th>
                      <th className="px-4 py-3">Date Registered</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">License Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSchools.map((school) => {
                      const license = school.school_licenses?.[0];
                      const planName = license?.plan || 'No License';
                      const status = license?.status || 'inactive';
                      
                      const fiveDaysAgo = new Date();
                      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
                      const isGracePeriodOver = new Date(school.created_at) < fiveDaysAgo;
                      const isLowEnrollment = isGracePeriodOver && (school.student_count ?? 0) < 500;
                      const isUnderstaffed = isGracePeriodOver && (school.teacher_count ?? 0) < 20;
                      
                      return (
                        <tr 
                          key={school.id} 
                          className={`bg-white dark:bg-slate-900 border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 ${
                            (isLowEnrollment || isUnderstaffed) ? 'border-l-2 border-l-orange-500 bg-orange-50/10 dark:bg-orange-950/5' : ''
                          }`}
                        >
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                            <div className="flex flex-col gap-1">
                              <span>{school.name}</span>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {isLowEnrollment && (
                                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[9px] py-0 px-1 font-semibold">
                                    Low Enrollment ({school.student_count} students)
                                  </Badge>
                                )}
                                {isUnderstaffed && (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] py-0 px-1 font-semibold">
                                    Understaffed ({school.teacher_count} teachers)
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">{new Date(school.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-xs">
                              {planName}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={
                              status === 'active' 
                                ? 'bg-green-50 text-green-700 border-green-200 font-bold uppercase text-[9px]' 
                                : 'bg-slate-50 text-slate-500 border-slate-200 font-bold uppercase text-[9px]'
                            }>
                              {status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Platform Activity Feed</CardTitle>
            <CardDescription>Real-time audit log of system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center text-slate-500 py-8 italic text-sm">
                  No recent activities recorded.
                </div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 items-start p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs">
                    {activity.type === 'Warning' ? (
                      <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
                    ) : activity.type === 'Error' ? (
                      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                    ) : activity.type === 'Success' ? (
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-blue-500 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-slate-950 dark:text-white leading-normal pr-2">
                        {activity.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {activity.source}
                        </Badge>
                        <span className="text-[10px] text-slate-500">
                          {new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding and Usage Analysis Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Activity Alert Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-orange-600 dark:text-orange-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Low Activity Alerts
            </CardTitle>
            <CardDescription>
              Schools with no login in past 7 days OR less than 20 logins in past 30 days. Max 30 items.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {inactiveSchools.length === 0 ? (
              <div className="text-center text-slate-500 py-8 italic text-sm">
                No inactive schools flagged.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                  <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 bg-slate-50 dark:bg-slate-800">School Name</th>
                      <th className="px-4 py-3 bg-slate-50 dark:bg-slate-800 text-center">Active (7d)</th>
                      <th className="px-4 py-3 bg-slate-50 dark:bg-slate-800 text-center">Active (30d)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactiveSchools.map((school) => {
                      const isNoLogins7d = school.sign_ins_7d === 0;
                      const isLowLogins30d = school.sign_ins_30d < 20;

                      return (
                        <tr 
                          key={school.id} 
                          className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                            <div className="flex flex-col gap-1">
                              <span>{school.name}</span>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {isNoLogins7d && (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[8px] py-0 px-1 font-semibold uppercase">
                                    No Logins (7d)
                                  </Badge>
                                )}
                                {isLowLogins30d && (
                                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[8px] py-0 px-1 font-semibold uppercase">
                                    Low Activity ({school.sign_ins_30d} logins/30d)
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                            {school.sign_ins_7d}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                            {school.sign_ins_30d}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Usage Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Usage Performance
            </CardTitle>
            <CardDescription>
              Schools ranked by active users in the past 30 days. Max 30 items.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topPerformingSchools.length === 0 ? (
              <div className="text-center text-slate-500 py-8 italic text-sm">
                No active usage records.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                  <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 bg-slate-50 dark:bg-slate-800">School Name</th>
                      <th className="px-4 py-3 bg-slate-50 dark:bg-slate-800 text-center">Active (7d)</th>
                      <th className="px-4 py-3 bg-slate-50 dark:bg-slate-800 text-center">Active (30d)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPerformingSchools.map((school, idx) => {
                      const rank = idx + 1;
                      return (
                        <tr 
                          key={school.id} 
                          className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-400 w-4">
                                {rank}.
                              </span>
                              <span>{school.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                            {school.sign_ins_7d}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                            {school.sign_ins_30d}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
