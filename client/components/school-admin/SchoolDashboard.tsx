import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Download,
  UserPlus,
  CreditCard,
  Settings,
  GraduationCap,
  Users,
  Megaphone,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Play
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { SchoolDashboardStats, Announcement } from '@shared/api';
import LicenseAccessDenied from '@/components/common/LicenseAccessDenied';
import { cn } from "@/lib/utils";
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { syncFetch } from '@/lib/syncService';
import { useNavigate } from 'react-router-dom';
import { isOnSubdomain } from '@/lib/subdomain';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface SchoolDashboardProps {
  onRelaunchTutorial?: () => void;
}

export default function SchoolDashboard({ onRelaunchTutorial }: SchoolDashboardProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<SchoolDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [isCompletionWarningOpen, setIsCompletionWarningOpen] = useState(false);
  const [isTeacherCompletionWarningOpen, setIsTeacherCompletionWarningOpen] = useState(false);

  // Announcement Form State
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleteAnnouncementId, setDeleteAnnouncementId] = useState<string | null>(null);
  const [isDeletingAnnouncement, setIsDeletingAnnouncement] = useState(false);

  const checkTeacherProfilesCompleteness = () => {
    if (data && data.teacherProfilesCompletion && !data.teacherProfilesCompletion.isComplete) {
      const dismissed = sessionStorage.getItem('teacher_completion_warning_dismissed');
      if (!dismissed) {
        setIsTeacherCompletionWarningOpen(true);
      }
    }
  };

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      const result = await syncFetch('/api/school/dashboard', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      setData(result);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (data && data.settingsCompletion && !data.settingsCompletion.isComplete) {
      const dismissed = sessionStorage.getItem('settings_completion_warning_dismissed');
      if (!dismissed) {
        setIsCompletionWarningOpen(true);
      }
    } else {
      checkTeacherProfilesCompleteness();
    }
  }, [data]);

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      const result = await syncFetch('/api/school/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(newAnnouncement)
      });

      if (result.offline) {
        toast({
          title: "Offline Mode",
          description: "Announcement queued and will be posted when you are back online.",
        });
      } else {
        toast({
          title: "Success",
          description: "Announcement posted successfully",
        });
      }

      setIsAnnouncementOpen(false);
      setNewAnnouncement({ title: '', content: '' });
      fetchDashboardData(); // Refresh data
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!deleteAnnouncementId) return;
    setIsDeletingAnnouncement(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      const result = await syncFetch(`/api/school/announcements/${deleteAnnouncementId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (result.offline) {
        toast({
          title: "Offline Mode",
          description: "Deletion queued and will be processed when you are back online.",
        });
      } else {
        toast({
          title: "Success",
          description: "Announcement deleted successfully",
        });
      }

      setDeleteAnnouncementId(null);
      fetchDashboardData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsDeletingAnnouncement(false);
    }
  };

  const handleUpdateApproval = async (id: string | number, status: 'Approved' | 'Rejected') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      const response = await fetch(`/api/school/approvals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error(`Failed to ${status.toLowerCase()} request`);

      toast({
        title: "Success",
        description: `Request ${status.toLowerCase()} successfully`
      });

      fetchDashboardData(); // Refresh data
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    const isLicenseError = error.toLowerCase().includes('license');
    if (isLicenseError) {
      return <LicenseAccessDenied message={error} />;
    }

    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-600 gap-4">
        <p>Error: {error}</p>
        <Button onClick={() => { setLoading(true); fetchDashboardData(); }}>
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  // Defensive check for data structure
  if (!data.overview) {
    console.error('Invalid dashboard data structure:', data);
    return <div className="p-4 text-red-500">Error: Invalid data structure received from server.</div>;
  }

  const { overview, recentActivities, financialSummary, pendingApprovals, announcements, academicPerformance, enrollmentDistribution, financeTrends } = data;

  return (
    <div className="space-y-6 pb-10">
      {data.settingsCompletion && !data.settingsCompletion.isComplete && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
              <Settings className="h-5 w-5 text-amber-500 animate-pulse" />
              <span>School Profile Settings Incomplete ({data.settingsCompletion.percentage}%)</span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Your settings are incomplete. Missing fields: <span className="font-semibold">{data.settingsCompletion.missingFields.join(', ')}</span>.
            </p>
          </div>
          <Button
            onClick={() => {
              navigate(`${isOnSubdomain() ? '' : '/school-admin'}/settings`);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white border-0 font-bold shrink-0 shadow-md text-xs uppercase tracking-wider"
          >
            Configure Now
          </Button>
        </div>
      )}

      <Dialog open={isCompletionWarningOpen} onOpenChange={setIsCompletionWarningOpen}>
        <DialogContent className="sm:max-w-[500px] border border-amber-200 dark:border-amber-900 bg-white dark:bg-slate-900">
          <DialogHeader>
            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mb-4 border border-amber-200 dark:border-amber-900/50">
              <Settings className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              Complete School Profile Settings
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400 text-sm mt-2">
              Your school's profile settings are currently <span className="font-bold text-amber-600 dark:text-amber-400">{data?.settingsCompletion?.percentage}% complete</span>. To unlock full features (such as report card generation, official document exports, and communication tools), you must complete at least 90% of the mandatory fields.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Setup Progress</span>
                <span>{data?.settingsCompletion?.percentage}%</span>
              </div>
              <Progress value={data?.settingsCompletion?.percentage || 0} className="h-2 bg-slate-100 dark:bg-slate-800" />
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Missing Mandatory Fields
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                {data?.settingsCompletion?.missingFields.map((field, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                    {field}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => {
                sessionStorage.setItem('settings_completion_warning_dismissed', 'true');
                setIsCompletionWarningOpen(false);
                checkTeacherProfilesCompleteness();
              }}
              className="font-bold uppercase tracking-wider text-xs"
            >
              Remind Me Later
            </Button>
            <Button
              onClick={() => {
                sessionStorage.setItem('settings_completion_warning_dismissed', 'true');
                setIsCompletionWarningOpen(false);
                navigate(`${isOnSubdomain() ? '' : '/school-admin'}/settings`);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs shadow-md"
            >
              Go to Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTeacherCompletionWarningOpen} onOpenChange={setIsTeacherCompletionWarningOpen}>
        <DialogContent className="sm:max-w-[500px] border border-amber-200 dark:border-amber-900 bg-white dark:bg-slate-900">
          <DialogHeader>
            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mb-4 border border-amber-200 dark:border-amber-900/50">
              <Users className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              Incomplete Teacher Profiles Detected
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400 text-sm mt-2">
              We found that <span className="font-bold text-amber-600 dark:text-amber-400">{data?.teacherProfilesCompletion?.incompleteCount} out of {data?.teacherProfilesCompletion?.totalTeachers} teacher profiles</span> are less than 100% complete. Completing these profiles is necessary for government reporting, RLS access control, and official records.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 my-4 text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
            Please make sure that all demographic details, location types, highest qualifications, and contact details are filled in for each teacher in your school.
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => {
                sessionStorage.setItem('teacher_completion_warning_dismissed', 'true');
                setIsTeacherCompletionWarningOpen(false);
              }}
              className="font-bold uppercase tracking-wider text-xs"
            >
              Remind Me Later
            </Button>
            <Button
              onClick={() => {
                sessionStorage.setItem('teacher_completion_warning_dismissed', 'true');
                setIsTeacherCompletionWarningOpen(false);
                navigate(`${isOnSubdomain() ? '' : '/school-admin'}/teachers`);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs shadow-md"
            >
              Go to Teachers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
            Admin Dashboard
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            Overview of school performance and daily operations
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto h-11 sm:h-10 text-base sm:text-sm font-bold shadow-sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>

          <Button 
            onClick={onRelaunchTutorial}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 h-11 sm:h-10 text-base sm:text-sm font-bold shadow-md group"
          >
            <Play className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
            Tutorial
          </Button>

        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Students */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Students</p>
                <div className={`p-1.5 rounded-full ${overview.totalStudents.status === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {overview.totalStudents.status === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </div>
              </div>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl sm:text-3xl font-black">{overview.totalStudents.value}</h3>
                <span className={`text-xs font-bold ${overview.totalStudents.status === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {overview.totalStudents.trend}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teachers */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Teachers</p>
                <div className={`p-1.5 rounded-full ${overview.totalTeachers.status === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {overview.totalTeachers.status === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </div>
              </div>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl sm:text-3xl font-black">{overview.totalTeachers.value}</h3>
                <span className={`text-xs font-bold ${overview.totalTeachers.status === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {overview.totalTeachers.trend}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Classes */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Active Classes</p>
                <div className={`p-1.5 rounded-full ${overview.activeClasses.status === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {overview.activeClasses.status === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </div>
              </div>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl sm:text-3xl font-black">{overview.activeClasses.value}</h3>
                <span className={`text-xs font-bold ${overview.activeClasses.status === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {overview.activeClasses.trend}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Attendance Rate</p>
                <div className={`p-1.5 rounded-full ${overview.attendanceRate.status === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {overview.attendanceRate.status === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </div>
              </div>
              <div className="flex items-end justify-between">
                <h3 className="text-2xl sm:text-3xl font-black">{overview.attendanceRate.value}</h3>
                <span className={`text-xs font-bold ${overview.attendanceRate.status === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {overview.attendanceRate.trend}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Academic Performance Chart */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Academic Performance</CardTitle>
            <CardDescription>Term-by-term average grades</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={academicPerformance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="term" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="average" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Enrollment Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Enrollment by Grade</CardTitle>
            <CardDescription>Student distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={enrollmentDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="grade"
                >
                  {enrollmentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Finance Trends */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Financial Trends</CardTitle>
            <CardDescription>Monthly income vs expenses</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Legend verticalAlign="top" align="right" height={36}/>
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card className="col-span-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Announcements</CardTitle>
                <CardDescription>Latest updates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {announcements && announcements.length > 0 ? (
              <div className="space-y-4 max-h-[230px] overflow-y-auto pr-2">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex gap-3">
                      <div className="p-1.5 bg-blue-100 rounded-full h-fit mt-1">
                        <Megaphone className="h-3 w-3 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{announcement.title}</h4>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{announcement.content}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">{announcement.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500 italic text-sm">
                No active announcements
              </div>
            )}
            <Button variant="ghost" className="w-full mt-4 text-xs font-bold text-blue-600 uppercase tracking-widest" onClick={() => setIsAnnouncementOpen(true)}>
              Post Announcement
            </Button>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Requests requiring your attention</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Type</TableHead>
                    <TableHead className="min-w-[150px]">Applicant</TableHead>
                    <TableHead className="hidden md:table-cell">Department</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApprovals.length > 0 ? (
                    pendingApprovals.map((approval) => (
                      <TableRow key={approval.id}>
                        <TableCell className="font-medium">{approval.type}</TableCell>
                        <TableCell>{approval.applicant}</TableCell>
                        <TableCell className="hidden md:table-cell">{approval.department}</TableCell>
                        <TableCell className="hidden sm:table-cell">{approval.date}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-[10px] uppercase font-bold">
                            {approval.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 sm:gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8 sm:h-auto sm:w-auto p-0 sm:px-3 sm:py-2"
                              onClick={() => handleUpdateApproval(approval.id, 'Approved')}
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4 sm:mr-1" />
                              <span className="hidden sm:inline">Approve</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 sm:h-auto sm:w-auto p-0 sm:px-3 sm:py-2"
                              onClick={() => handleUpdateApproval(approval.id, 'Rejected')}
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4 sm:mr-1" />
                              <span className="hidden sm:inline">Reject</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500 italic">
                        No pending approvals
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={!!deleteAnnouncementId}
        onOpenChange={(open) => !open && setDeleteAnnouncementId(null)}
        title="Delete Announcement?"
        description="Are you sure you want to delete this announcement? It will be removed for all teachers and students immediately."
        confirmLabel="Delete Announcement"
        variant="danger"
        loading={isDeletingAnnouncement}
        onConfirm={handleDeleteAnnouncement}
      />
    </div>
  );
}
