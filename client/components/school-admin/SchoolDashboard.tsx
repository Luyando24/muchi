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
  FileText
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

export default function SchoolDashboard() {
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

  const { overview, recentActivities, financialSummary, pendingApprovals, announcements } = data;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Admin Dashboard
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Overview of school performance and daily operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>

          <Dialog open={isAnnouncementOpen} onOpenChange={setIsAnnouncementOpen}>
            <DialogTrigger asChild>
              <Button>
                <Megaphone className="h-4 w-4 mr-2" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
                <DialogDescription>
                  Post a new announcement visible to teachers and students.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    placeholder="e.g., Parent-Teacher Meeting"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    placeholder="Details about the announcement..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAnnouncementOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateAnnouncement} disabled={submitting}>
                  {submitting ? "Posting..." : "Post Announcement"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Students */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Students</p>
                <h3 className="text-2xl font-bold mt-2">{overview.totalStudents.value}</h3>
              </div>
              <div className={`p-2 rounded-full ${overview.totalStudents.status === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {overview.totalStudents.status === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={overview.totalStudents.status === 'up' ? 'text-green-600' : 'text-red-600'}>
                {overview.totalStudents.trend}
              </span>
              <span className="text-slate-500 ml-2">from last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Teachers */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Teachers</p>
                <h3 className="text-2xl font-bold mt-2">{overview.totalTeachers.value}</h3>
              </div>
              <div className={`p-2 rounded-full ${overview.totalTeachers.status === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {overview.totalTeachers.status === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={overview.totalTeachers.status === 'up' ? 'text-green-600' : 'text-red-600'}>
                {overview.totalTeachers.trend}
              </span>
              <span className="text-slate-500 ml-2">from last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Revenue</p>
                <h3 className="text-2xl font-bold mt-2">{overview.revenue.value}</h3>
              </div>
              <div className={`p-2 rounded-full ${overview.revenue.status === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {overview.revenue.status === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={overview.revenue.status === 'up' ? 'text-green-600' : 'text-red-600'}>
                {overview.revenue.trend}
              </span>
              <span className="text-slate-500 ml-2">from last term</span>
            </div>
          </CardContent>
        </Card>

        {/* Attendance */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Attendance Rate</p>
                <h3 className="text-2xl font-bold mt-2">{overview.attendanceRate.value}</h3>
              </div>
              <div className={`p-2 rounded-full ${overview.attendanceRate.status === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {overview.attendanceRate.status === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={overview.attendanceRate.status === 'up' ? 'text-green-600' : 'text-red-600'}>
                {overview.attendanceRate.trend}
              </span>
              <span className="text-slate-500 ml-2">daily average</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Announcements - New Section */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Announcements</CardTitle>
                <CardDescription>Latest updates for the school community</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {announcements && announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex gap-4">
                      <div className="p-2 bg-blue-100 rounded-full h-fit">
                        <Megaphone className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{announcement.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{announcement.content}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                          <span>{announcement.author}</span>
                          <span>•</span>
                          <span>{announcement.date}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteAnnouncementId(announcement.id as string)}>
                      <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No active announcements
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
            <CardDescription>Income distribution by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {financialSummary.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{item.category}</p>
                    <p className="text-sm text-slate-500 text-muted-foreground">
                      {item.percentage}% of total income
                    </p>
                  </div>
                  <div className="font-medium">
                    K{item.amount.toLocaleString()}
                  </div>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>
                    K{financialSummary.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest system events and logs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.action}
                    </p>
                    <p className="text-sm text-slate-500 text-muted-foreground">
                      {activity.user} • {activity.time}
                    </p>
                  </div>
                  <div className="ml-auto font-medium text-xs text-slate-500 capitalize">
                    {activity.type}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Requests requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date</TableHead>
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
                      <TableCell>{approval.department}</TableCell>
                      <TableCell>{approval.date}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                          {approval.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleUpdateApproval(approval.id, 'Approved')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleUpdateApproval(approval.id, 'Rejected')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-slate-500">
                      No pending approvals
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
