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
  const [data, setData] = useState<SchoolDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Announcement Form State
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleteAnnouncementId, setDeleteAnnouncementId] = useState<string | null>(null);
  const [isDeletingAnnouncement, setIsDeletingAnnouncement] = useState(false);

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
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
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
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
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
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-orange-500">
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
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
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
