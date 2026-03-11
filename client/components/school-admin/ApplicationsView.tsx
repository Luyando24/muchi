import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  UserPlus, 
  Mail, 
  Phone, 
  GraduationCap, 
  Building, 
  MoreVertical,
  Search,
  Filter,
  Eye,
  Check,
  X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { syncFetch } from '@/lib/syncService';

interface Application {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  grade_level: string;
  previous_school: string;
  guardian_name: string;
  guardian_phone: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function ApplicationsView() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [enrollForm, setEnrollForm] = useState({
    classId: '',
    academicYear: new Date().getFullYear().toString(),
    password: Math.random().toString(36).slice(-8) // Generate a random temporary password
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchApplications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const data = await syncFetch('/api/school/applications', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      setApplications(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const data = await syncFetch('/api/school/classes', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchClasses();
  }, []);

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await syncFetch(`/api/school/applications/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ status })
      });

      toast({ title: "Status Updated", description: `Application ${status} successfully.` });
      fetchApplications();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEnroll = async () => {
    if (!selectedApp) return;
    if (!enrollForm.classId || !enrollForm.academicYear || !enrollForm.password) {
      toast({ title: "Error", description: "Please fill in all enrollment details", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/applications/${selectedApp.id}/approve-enroll`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}` 
        },
        body: JSON.stringify(enrollForm)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to enroll student");
      }

      toast({ 
        title: "Student Enrolled", 
        description: (
          <div className="flex flex-col gap-2">
            <p>{selectedApp.full_name} has been enrolled successfully.</p>
            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs font-mono space-y-1">
              <p>Email: {data.email}</p>
              <p>Student #: {data.studentNumber}</p>
              <p>Password: {enrollForm.password}</p>
            </div>
            <p className="text-[10px] text-slate-500 italic">Please share these credentials with the student.</p>
          </div>
        )
      });
      setIsEnrollDialogOpen(false);
      setSelectedApp(null);
      fetchApplications();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         app.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Approved</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Rejected</Badge>;
      default: return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Student Applications</h2>
          <p className="text-slate-500 dark:text-slate-400">Review and manage online admission requests.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by name or email..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 dark:border-slate-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Guardian</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10">Loading applications...</TableCell></TableRow>
                ) : filteredApplications.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10">No applications found.</TableCell></TableRow>
                ) : (
                  filteredApplications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div className="font-medium text-slate-900 dark:text-white">{app.full_name}</div>
                        <div className="text-xs text-slate-500">{app.previous_school || 'No previous school'}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{app.grade_level}</Badge></TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs gap-1">
                          <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {app.email}</div>
                          <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {app.phone_number || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{app.guardian_name || 'N/A'}</div>
                        <div className="text-xs text-slate-500">{app.guardian_phone || ''}</div>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(app.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedApp(app)}><Eye className="h-4 w-4" /></Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Application Details</DialogTitle>
                                <DialogDescription>Full application for {app.full_name}</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div><Label className="text-xs uppercase text-slate-500">Full Name</Label><p>{app.full_name}</p></div>
                                  <div><Label className="text-xs uppercase text-slate-500">Grade Level</Label><p>{app.grade_level}</p></div>
                                  <div><Label className="text-xs uppercase text-slate-500">Email</Label><p>{app.email}</p></div>
                                  <div><Label className="text-xs uppercase text-slate-500">Phone</Label><p>{app.phone_number || 'N/A'}</p></div>
                                  <div><Label className="text-xs uppercase text-slate-500">Guardian Name</Label><p>{app.guardian_name || 'N/A'}</p></div>
                                  <div><Label className="text-xs uppercase text-slate-500">Guardian Phone</Label><p>{app.guardian_phone || 'N/A'}</p></div>
                                  <div className="col-span-2"><Label className="text-xs uppercase text-slate-500">Previous School</Label><p>{app.previous_school || 'N/A'}</p></div>
                                </div>
                              </div>
                              <DialogFooter className="flex-col sm:flex-row gap-2">
                                {app.status === 'pending' && (
                                  <>
                                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleUpdateStatus(app.id, 'rejected')}>
                                      <X className="h-4 w-4 mr-2" /> Reject
                                    </Button>
                                    <Button onClick={() => { setSelectedApp(app); setIsEnrollDialogOpen(true); }}>
                                      <Check className="h-4 w-4 mr-2" /> Approve & Enroll
                                    </Button>
                                  </>
                                )}
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Enroll Dialog */}
      <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve & Enroll Student</DialogTitle>
            <DialogDescription>
              Assign {selectedApp?.full_name} to a class and create their portal account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Assigned Class</Label>
              <Select value={enrollForm.classId} onValueChange={(v) => setEnrollForm({...enrollForm, classId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name} ({cls.level})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Input 
                value={enrollForm.academicYear} 
                onChange={(e) => setEnrollForm({...enrollForm, academicYear: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Temporary Portal Password</Label>
              <Input 
                value={enrollForm.password} 
                onChange={(e) => setEnrollForm({...enrollForm, password: e.target.value})}
              />
              <p className="text-[10px] text-slate-500">The student will use this password for their first login.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEnrollDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEnroll} disabled={submitting}>
              {submitting ? "Enrolling..." : "Complete Enrollment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
