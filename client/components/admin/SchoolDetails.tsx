import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Users, 
  Trash2, 
  Loader2, 
  Search,
  Key,
  FileSpreadsheet,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Phone,
  Mail,
  FileText,
  Check,
  Trash,
  PlusCircle,
  MessageSquare,
  Activity,
  Building,
  Briefcase,
  UserPlus,
  ArrowUpRight,
  CheckSquare,
  Square,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface Teacher {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  employment_status: string;
  staff_number?: string;
  created_at: string;
}

interface Task {
  id: string;
  school_id: string;
  title: string;
  description: string;
  status: string; // 'pending' | 'completed'
  category: string;
  due_date?: string;
  created_at: string;
  completed_at?: string;
}

interface Contact {
  id: string;
  school_id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  created_at: string;
}

interface ContactLog {
  id: string;
  school_id: string;
  contacted_at: string;
  contacted_by: string;
  contacted_with?: string;
  channel: string;
  summary: string;
  status_outcome: string;
  next_step: string;
  created_at: string;
  contacted_by_profile?: { id: string; full_name: string };
  school_contacts?: { id: string; name: string };
}

interface UsageStats {
  studentCount: number;
  teacherCount: number;
  classCount: number;
  active7d: number;
  active30d: number;
}

interface License {
  id: string;
  status: 'active' | 'expired' | 'suspended' | 'pending';
  start_date: string;
  end_date: string;
  plan: string;
  license_key: string;
  created_at: string;
}

interface SchoolDetailsProps {
  schoolId: string;
  schoolName: string;
  onBack: () => void;
}

export default function SchoolDetails({ schoolId, schoolName, onBack }: SchoolDetailsProps) {
  // Directory States
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetTeacher, setResetTeacher] = useState<Teacher | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Pagination States for Teachers Table
  const [teacherPage, setTeacherPage] = useState(1);
  const [teacherPageSize, setTeacherPageSize] = useState(10);

  // Reset page when search or school changes
  useEffect(() => {
    setTeacherPage(1);
  }, [searchQuery, schoolId]);

  // Project Management States
  const [projectLoading, setProjectLoading] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState('Pending');
  const [licenses, setLicenses] = useState<License[]>([]);
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);

  const getDisplayOnboardingStatus = () => {
    if (!stats) return onboardingStatus;
    const tc = stats.teacherCount || 0;
    const sc = stats.studentCount || 0;
    if (onboardingStatus === 'Active & Onboarded' || (tc > 20 && sc > 500)) {
      return 'Active & Onboarded';
    }
    if (onboardingStatus === 'In Progress' || (tc >= 5 && sc >= 100)) {
      return 'In Progress';
    }
    return 'Pending';
  };

  // Tasks States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('general');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Contacts States
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Contact Logs States
  const [contactLogs, setContactLogs] = useState<ContactLog[]>([]);
  const [logContactedWith, setLogContactedWith] = useState('general');
  const [logChannel, setLogChannel] = useState('Call');
  const [logSummary, setLogSummary] = useState('');
  const [logOutcome, setLogOutcome] = useState('');
  const [logNextStep, setLogNextStep] = useState('');
  const [isLoggingContact, setIsLoggingContact] = useState(false);

  // Stats State
  const [stats, setStats] = useState<UsageStats | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchTeachers();
    fetchProjectDetails();
  }, [schoolId]);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/schools/${schoolId}/teachers`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch teachers');
      const data = await response.json();
      setTeachers(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetails = async () => {
    setProjectLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/schools/${schoolId}/project-details`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch school project details');
      const data = await response.json();
      
      const tc = data.stats?.teacherCount || 0;
      const sc = data.stats?.studentCount || 0;
      let computedStatus = data.school.onboarding_status || 'Pending';
      if (computedStatus === 'Active & Onboarded' || (tc > 20 && sc > 500)) {
        computedStatus = 'Active & Onboarded';
      } else if (computedStatus === 'In Progress' || (tc >= 5 && sc >= 100)) {
        computedStatus = 'In Progress';
      } else {
        computedStatus = 'Pending';
      }

      setOnboardingStatus(computedStatus);
      setLicenses(data.school.school_licenses || []);
      setAdminNotes(data.school.admin_notes || '');
      setTasks(data.tasks);
      setContacts(data.contacts);
      setContactLogs(data.contactLogs);
      setStats(data.stats);
    } catch (error: any) {
      console.error('Error fetching project details:', error);
      toast({
        variant: "destructive",
        title: "Error fetching project details",
        description: error.message,
      });
    } finally {
      setProjectLoading(false);
    }
  };

  const handleUpdateProjectDetails = async () => {
    setIsUpdatingProject(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/schools/${schoolId}/project-details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          onboarding_status: onboardingStatus,
          admin_notes: adminNotes
        })
      });

      if (!response.ok) throw new Error('Failed to update project status');
      toast({
        title: "Project details updated",
        description: "Status and notes saved successfully.",
      });
      fetchProjectDetails();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
    } finally {
      setIsUpdatingProject(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) return;

    setIsAddingTask(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/schools/${schoolId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          title: taskTitle,
          category: taskCategory,
          due_date: taskDueDate || null
        })
      });

      if (!response.ok) throw new Error('Failed to create task');
      toast({ title: "Task added successfully" });
      setTaskTitle('');
      setTaskDueDate('');
      setTaskCategory('general');
      fetchProjectDetails();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to add task",
        description: error.message,
      });
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleToggleTaskStatus = async (task: Task) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
      const response = await fetch(`/api/admin/schools/${schoolId}/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!response.ok) throw new Error('Failed to update task');
      fetchProjectDetails();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating task",
        description: error.message,
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/schools/${schoolId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete task');
      toast({ title: "Task deleted" });
      fetchProjectDetails();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting task",
        description: error.message,
      });
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName) return;

    setIsAddingContact(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const isEditing = !!editingContact;
      const url = isEditing 
        ? `/api/admin/schools/${schoolId}/contacts/${editingContact.id}` 
        : `/api/admin/schools/${schoolId}/contacts`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          name: contactName,
          role: contactRole,
          phone: contactPhone,
          email: contactEmail
        })
      });

      if (!response.ok) throw new Error(isEditing ? 'Failed to update contact' : 'Failed to add contact');
      toast({ title: isEditing ? "Contact updated successfully" : "Contact added successfully" });
      
      // Reset contact fields
      setContactName('');
      setContactRole('');
      setContactPhone('');
      setContactEmail('');
      setEditingContact(null);
      setIsContactDialogOpen(false);
      fetchProjectDetails();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving contact",
        description: error.message,
      });
    } finally {
      setIsAddingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/schools/${schoolId}/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete contact');
      toast({ title: "Contact deleted" });
      
      // If logging with target was this contact, reset it
      if (logContactedWith === contactId) {
        setLogContactedWith('general');
      }
      fetchProjectDetails();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting contact",
        description: error.message,
      });
    }
  };

  const handleLogContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logSummary) return;

    setIsLoggingContact(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/schools/${schoolId}/contact-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          contacted_with: logContactedWith === 'general' ? null : logContactedWith,
          channel: logChannel,
          summary: logSummary,
          status_outcome: logOutcome,
          next_step: logNextStep
        })
      });

      if (!response.ok) throw new Error('Failed to log interaction');
      toast({ title: "Interaction logged successfully" });
      setLogSummary('');
      setLogOutcome('');
      setLogNextStep('');
      setLogContactedWith('general');
      fetchProjectDetails();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error logging interaction",
        description: error.message,
      });
    } finally {
      setIsLoggingContact(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/schools/${schoolId}/contact-logs/${logId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete interaction log');
      toast({ title: "Interaction log deleted" });
      fetchProjectDetails();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting log",
        description: error.message,
      });
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(teachers.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    setDeletionProgress(0);
    const BATCH_SIZE = 10;
    const totalToDelete = selectedIds.length;
    let deletedCount = 0;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session found.');

      for (let i = 0; i < totalToDelete; i += BATCH_SIZE) {
        const batch = selectedIds.slice(i, i + BATCH_SIZE);
        
        const response = await fetch(`/api/admin/schools/${schoolId}/teachers/bulk-delete-permanent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ teacherIds: batch })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Deletion batch failed');
        }

        const result = await response.json();
        deletedCount += result.deletedCount || batch.length;
        
        const progress = Math.min(Math.round(((i + batch.length) / totalToDelete) * 100), 100);
        setDeletionProgress(progress);
      }
      
      toast({
        title: "Purge Complete",
        description: `Successfully removed ${deletedCount} teacher accounts permanently.`,
      });
      
      setSelectedIds([]);
      fetchTeachers();
    } catch (error: any) {
      console.error('Bulk deletion error:', error);
      toast({
        variant: "destructive",
        title: "Partial Deletion or Error",
        description: error.message,
      });
    } finally {
      setIsDeleting(false);
      setDeletionProgress(0);
      setShowDeleteConfirm(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTeacher || !newPassword) return;
    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: "Password must be at least 6 characters long.",
      });
      return;
    }

    setIsResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session found.');

      const response = await fetch(`/api/admin/users/${resetTeacher.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ password: newPassword })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset password');
      }

      toast({
        title: "Password Reset",
        description: `Successfully updated password for ${resetTeacher.full_name}.`,
      });
      
      setShowResetDialog(false);
      setNewPassword('');
      setResetTeacher(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportToExcel = () => {
    if (teachers.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no teacher records available for export.",
        variant: "destructive"
      });
      return;
    }

    try {
      const exportData = teachers.map(teacher => ({
        'Full Name': teacher.full_name,
        'Email': teacher.email || 'N/A',
        'Staff Number': teacher.staff_number || 'PENDING',
        'Status': teacher.employment_status,
        'Joined Date': new Date(teacher.created_at).toLocaleDateString()
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Teachers Directory");

      const fileName = `${schoolName.replace(/\s+/g, '_')}_Teachers_Directory.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Export Successful",
        description: `Teacher directory has been exported to ${fileName}`,
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "An error occurred while exporting the data.",
        variant: "destructive"
      });
    }
  };

  const openAddContactDialog = () => {
    setEditingContact(null);
    setContactName('');
    setContactRole('');
    setContactPhone('');
    setContactEmail('');
    setIsContactDialogOpen(true);
  };

  const openEditContactDialog = (contact: Contact) => {
    setEditingContact(contact);
    setContactName(contact.name);
    setContactRole(contact.role);
    setContactPhone(contact.phone);
    setContactEmail(contact.email);
    setIsContactDialogOpen(true);
  };

  const filteredTeachers = teachers.filter(t => 
    t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.staff_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalTeachers = filteredTeachers.length;
  const totalTeacherPages = Math.ceil(totalTeachers / teacherPageSize);
  const paginatedTeachers = filteredTeachers.slice((teacherPage - 1) * teacherPageSize, teacherPage * teacherPageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={isDeleting} className="hover:bg-slate-200 dark:hover:bg-slate-800 font-semibold">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Schools
        </Button>
      </div>

      <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{schoolName}</h2>
            <div className="flex items-center gap-2 mt-2">
              {(() => {
                const onboardingStatusDisplay = getDisplayOnboardingStatus();
                return (
                  <Badge variant={
                    onboardingStatusDisplay === 'Active & Onboarded' ? 'default' :
                    onboardingStatusDisplay === 'In Progress' ? 'secondary' :
                    'outline'
                  } className={cn(
                    onboardingStatusDisplay === 'Active & Onboarded' && "bg-emerald-500 hover:bg-emerald-600 text-white border-none font-semibold",
                    onboardingStatusDisplay === 'In Progress' && "bg-blue-500 hover:bg-blue-600 text-white border-none font-semibold",
                    onboardingStatusDisplay === 'Pending' && "border-amber-500 text-amber-600 font-semibold"
                  )}>
                    {onboardingStatusDisplay}
                  </Badge>
                );
              })()}
              {(() => {
                const activeLicense = licenses.find(l =>
                  l.status === 'active' && new Date(l.end_date) > new Date()
                );
                return activeLicense ? (
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none font-semibold">
                    Active License: {activeLicense.plan} (Expires {new Date(activeLicense.end_date).toLocaleDateString()})
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 text-white border-none font-semibold">
                    No Active License
                  </Badge>
                );
              })()}
            </div>
          </div>
          
          {selectedIds.length > 0 && !isDeleting && (
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteConfirm(true)}
              className="shadow-lg shadow-red-500/20 font-semibold"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Permanently Remove ({selectedIds.length})
            </Button>
          )}
        </div>

        {isDeleting && (
          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
            <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                Purging accounts...
              </span>
              <span>{deletionProgress}%</span>
            </div>
            <Progress value={deletionProgress} className="h-2 bg-slate-100 dark:bg-slate-800" />
            <p className="text-xs text-slate-500 font-medium">Please do not close this window while the operation is in progress.</p>
          </div>
        )}
      </div>

      <Tabs defaultValue="directory" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg h-auto">
          <TabsTrigger value="directory" className="rounded-md font-bold text-sm py-2.5">
            <Users className="h-4 w-4 mr-1.5 shrink-0" />
            <span className="hidden sm:inline">Staff Directory</span>
            <span className="sm:hidden">Staff</span>
          </TabsTrigger>
          <TabsTrigger value="project" className="rounded-md font-bold text-sm py-2.5">
            <Briefcase className="h-4 w-4 mr-1.5 shrink-0" />
            <span className="hidden sm:inline">Onboarding & Tasks</span>
            <span className="sm:hidden">Onboarding</span>
          </TabsTrigger>
          <TabsTrigger value="engagement" className="rounded-md font-bold text-sm py-2.5">
            <MessageSquare className="h-4 w-4 mr-1.5 shrink-0" />
            <span className="hidden sm:inline">CRM & Engagement</span>
            <span className="sm:hidden">CRM</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: STAFF DIRECTORY */}
        <TabsContent value="directory">
          <Card className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Staff Records</CardTitle>
                  <CardDescription>Manage permanent teacher accounts for this institution.</CardDescription>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by name, email or staff #..."
                      className="pl-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleExportToExcel}
                    className="w-full md:w-auto border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                    Export to Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto w-full max-w-full">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={teachers.length > 0 && selectedIds.length === teachers.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="font-semibold">Full Name</TableHead>
                      <TableHead className="font-semibold hidden sm:table-cell">Email / Login</TableHead>
                      <TableHead className="font-semibold">Staff Number</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right pr-6 hidden md:table-cell">Joined Date</TableHead>
                      <TableHead className="w-20 text-right pr-6 font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <p className="text-slate-500 animate-pulse">Loading staff directory...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedTeachers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <Users className="h-12 w-12 text-slate-300" />
                            <p className="text-slate-500 text-lg font-medium">No matching records found</p>
                            <p className="text-slate-400 text-sm">Try adjusting your search criteria</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedTeachers.map((teacher) => (
                        <TableRow key={teacher.id} className={`${selectedIds.includes(teacher.id) ? "bg-blue-50/50 dark:bg-blue-900/20" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/50"} transition-colors`}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedIds.includes(teacher.id)}
                              onCheckedChange={() => handleToggleSelect(teacher.id)}
                            />
                          </TableCell>
                          <TableCell className="font-bold text-slate-900 dark:text-white">{teacher.full_name}</TableCell>
                          <TableCell className="text-slate-650 dark:text-slate-400 font-medium hidden sm:table-cell">{teacher.email || 'N/A'}</TableCell>
                          <TableCell>
                            <code className="bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs font-bold font-mono border border-blue-100 dark:border-blue-900/50">
                              {teacher.staff_number || 'PENDING'}
                            </code>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-inset ${
                              teacher.employment_status === 'Active' 
                                ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {teacher.employment_status}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500 dark:text-slate-400 text-right pr-6 font-medium hidden md:table-cell">
                            {new Date(teacher.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              onClick={() => {
                                setResetTeacher(teacher);
                                setShowResetDialog(true);
                              }}
                              title="Change Password"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls
                currentPage={teacherPage}
                totalPages={totalTeacherPages}
                pageSize={teacherPageSize}
                onPageChange={setTeacherPage}
                onPageSizeChange={(size) => {
                  setTeacherPageSize(size);
                  setTeacherPage(1);
                }}
                totalItems={totalTeachers}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: PROJECT & ONBOARDING */}
        <TabsContent value="project">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Status updates, Notes, and Stats */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Onboarding & Subscription Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Status & Onboarding Management</CardTitle>
                  <CardDescription>Track subscription status, implementation phases and log administrative notes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {projectLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <>
                      <div className="max-w-md space-y-2">
                        <Label htmlFor="onboarding-status">Onboarding Phase</Label>
                        <Select value={onboardingStatus} onValueChange={setOnboardingStatus}>
                          <SelectTrigger id="onboarding-status">
                            <SelectValue placeholder="Select phase" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending (Not Started)</SelectItem>
                            <SelectItem value="In Progress">In Progress (Active setup)</SelectItem>
                            <SelectItem value="Active & Onboarded">Active & Fully Onboarded</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="admin-notes">Private Administrator Notes</Label>
                        <Textarea 
                          id="admin-notes"
                          placeholder="Log subscription reminders, key stakeholder notes, special implementation rules..."
                          rows={4}
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                        />
                      </div>

                      <Button 
                        onClick={handleUpdateProjectDetails} 
                        disabled={isUpdatingProject}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      >
                        {isUpdatingProject && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
                        Save Project Details
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Usage Metrics Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" /> Active System Usage
                  </CardTitle>
                  <CardDescription>Real-time statistics indicating how actively the institution is using MUCHI.</CardDescription>
                </CardHeader>
                <CardContent>
                  {projectLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : stats ? (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-center border">
                        <Users className="h-5 w-5 text-indigo-505 mx-auto mb-2 text-indigo-600" />
                        <span className="text-2xl font-black text-slate-850 dark:text-slate-100">{stats.studentCount}</span>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">Students</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-center border">
                        <Users className="h-5 w-5 text-blue-505 mx-auto mb-2 text-blue-600" />
                        <span className="text-2xl font-black text-slate-850 dark:text-slate-100">{stats.teacherCount}</span>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">Teachers</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-center border">
                        <Building className="h-5 w-5 text-amber-505 mx-auto mb-2 text-amber-600" />
                        <span className="text-2xl font-black text-slate-855 dark:text-slate-100">{stats.classCount}</span>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">Classes</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-center border">
                        <CheckCircle2 className="h-5 w-5 text-emerald-505 mx-auto mb-2 text-emerald-600" />
                        <span className="text-2xl font-black text-slate-850 dark:text-slate-100">{stats.active7d}</span>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">7d Active</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-center border col-span-2 md:col-span-1">
                        <Clock className="h-5 w-5 text-pink-505 mx-auto mb-2 text-pink-600" />
                        <span className="text-2xl font-black text-slate-850 dark:text-slate-100">{stats.active30d}</span>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">30d Active</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center">Failed to load statistics.</p>
                  )}
                </CardContent>
              </Card>

            </div>

            {/* Task Checklist & Reminders Card */}
            <div className="lg:col-span-1">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle>Implementation Checklist</CardTitle>
                  <CardDescription>Track critical setup duties and onboarding actions for this school.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  {/* Task Form */}
                  <form onSubmit={handleAddTask} className="space-y-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border">
                    <div className="space-y-1">
                      <Label htmlFor="task-title" className="text-xs font-bold">New Task Title</Label>
                      <Input 
                        id="task-title"
                        placeholder="e.g. Upload timetables"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="task-category" className="text-xs font-bold">Category</Label>
                        <Select value={taskCategory} onValueChange={setTaskCategory}>
                          <SelectTrigger id="task-category" className="h-8 text-xs">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="onboarding">Onboarding</SelectItem>
                            <SelectItem value="billing">Billing</SelectItem>
                            <SelectItem value="support">Support</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="task-due" className="text-xs font-bold">Due Date</Label>
                        <Input 
                          id="task-due"
                          type="date"
                          value={taskDueDate}
                          onChange={(e) => setTaskDueDate(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isAddingTask || !taskTitle}
                      className="w-full h-8 bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white"
                    >
                      {isAddingTask ? 'Adding...' : 'Add Task'}
                    </Button>
                  </form>

                  {/* Tasks List */}
                  {projectLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                      <CheckCircle2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-medium">All tasks completed!</p>
                      <p className="text-[10px] text-muted-foreground">Log a task above to start tracking onboarding setup.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto max-h-[350px] pr-1">
                      {tasks.map((task) => (
                        <div 
                          key={task.id} 
                          className={cn(
                            "flex items-start justify-between gap-2 p-2.5 rounded-lg border text-sm transition-all",
                            task.status === 'completed' 
                              ? "bg-slate-50 dark:bg-slate-800/30 border-slate-100 text-slate-400 line-through" 
                              : "bg-white dark:bg-slate-900 border-slate-200 text-slate-700"
                          )}
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <Checkbox 
                              checked={task.status === 'completed'}
                              onCheckedChange={() => handleToggleTaskStatus(task)}
                              className="mt-0.5"
                            />
                            <div className="min-w-0">
                              <p className="font-bold leading-tight break-words text-xs">{task.title}</p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className={cn(
                                  "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
                                  task.category === 'onboarding' ? 'bg-blue-100 text-blue-800' :
                                  task.category === 'billing' ? 'bg-amber-100 text-amber-800' :
                                  task.category === 'support' ? 'bg-purple-100 text-purple-800' :
                                  'bg-slate-100 text-slate-800'
                                )}>
                                  {task.category}
                                </span>
                                {task.due_date && (
                                  <span className="text-[10px] text-muted-foreground flex items-center font-semibold">
                                    <Calendar className="h-3 w-3 mr-0.5" /> 
                                    {new Date(task.due_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteTask(task.id)}
                            className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 mt-[-2px] shrink-0"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        </TabsContent>

        {/* TAB 3: CONTACTS & ENGAGEMENT */}
        <TabsContent value="engagement">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Contacts list & Logger Form */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* School Representatives (Contacts) Directory */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <div>
                    <CardTitle>School Contacts</CardTitle>
                    <CardDescription>Key stakeholders at the school.</CardDescription>
                  </div>
                  <Button size="icon" variant="outline" onClick={openAddContactDialog} className="h-8 w-8 text-blue-600 border-blue-200">
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {projectLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : contacts.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <UserPlus className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold">No contacts registered yet.</p>
                      <Button variant="link" size="sm" onClick={openAddContactDialog} className="text-blue-500 text-xs">
                        Add Representative
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
                      {contacts.map((contact) => (
                        <div key={contact.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border flex flex-col gap-1.5 relative group hover:border-slate-300 transition-all">
                          <div className="flex items-start justify-between pr-14">
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white text-sm">{contact.name}</p>
                              <p className="text-xs text-muted-foreground font-semibold">{contact.role || 'Representative'}</p>
                            </div>
                          </div>

                          <div className="space-y-0.5 mt-1.5 border-t pt-1.5">
                            {contact.phone && (
                              <p className="text-xs text-slate-600 flex items-center font-medium">
                                <Phone className="h-3 w-3 text-slate-400 mr-1.5" /> {contact.phone}
                              </p>
                            )}
                            {contact.email && (
                              <p className="text-xs text-slate-600 flex items-center font-medium truncate">
                                <Mail className="h-3 w-3 text-slate-400 mr-1.5" /> {contact.email}
                              </p>
                            )}
                          </div>

                          <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => openEditContactDialog(contact)}
                              className="h-6 w-6 text-slate-500 hover:text-blue-600 hover:bg-slate-200"
                            >
                              <Key className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteContact(contact.id)}
                              className="h-6 w-6 text-slate-500 hover:text-red-600 hover:bg-slate-200"
                            >
                              <Trash className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Log Communication Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Log Interaction</CardTitle>
                  <CardDescription>Record call, email, or meeting details for auditing and CRM timelines.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogContact} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="log-contact" className="text-xs font-bold">Contacted Person</Label>
                        <Select value={logContactedWith} onValueChange={setLogContactedWith}>
                          <SelectTrigger id="log-contact" className="h-9">
                            <SelectValue placeholder="Select contact" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General (No Specific Contact)</SelectItem>
                            {contacts.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="log-channel" className="text-xs font-bold">Channel</Label>
                        <Select value={logChannel} onValueChange={setLogChannel}>
                          <SelectTrigger id="log-channel" className="h-9">
                            <SelectValue placeholder="Select channel" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Call">Call</SelectItem>
                            <SelectItem value="Email">Email</SelectItem>
                            <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                            <SelectItem value="In-Person">In-Person</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="log-summary" className="text-xs font-bold">Discussion Summary</Label>
                      <Textarea 
                        id="log-summary"
                        placeholder="What did you discuss? What issues did they mention?"
                        value={logSummary}
                        onChange={(e) => setLogSummary(e.target.value)}
                        rows={3}
                        className="text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="log-outcome" className="text-xs font-bold">Outcome Status</Label>
                        <Input 
                          id="log-outcome"
                          placeholder="e.g. Satisfied, Promised payment"
                          value={logOutcome}
                          onChange={(e) => setLogOutcome(e.target.value)}
                          className="h-9 text-xs font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="log-next" className="text-xs font-bold">Next Action Steps</Label>
                        <Input 
                          id="log-next"
                          placeholder="e.g. Call back on Monday"
                          value={logNextStep}
                          onChange={(e) => setLogNextStep(e.target.value)}
                          className="h-9 text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isLoggingContact || !logSummary} 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      {isLoggingContact ? 'Saving Record...' : 'Log Engagement'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

            </div>

            {/* Engagement Timeline History */}
            <div className="lg:col-span-2">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle>Engagement History Timeline</CardTitle>
                  <CardDescription>Chronological logs of correspondence with the administration.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  {projectLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : contactLogs.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">
                      <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-lg font-bold">No engagement logs recorded.</p>
                      <p className="text-sm">Use the form on the left to record the first communication detail.</p>
                    </div>
                  ) : (
                    <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-6 max-h-[700px] overflow-y-auto pr-1">
                      {contactLogs.map((log) => (
                        <div key={log.id} className="relative animate-in slide-in-from-left-2 duration-300">
                          {/* Timeline Dot */}
                          <div className={cn(
                            "absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white dark:border-slate-950 flex items-center justify-center",
                            log.channel === 'Call' ? 'bg-blue-500' :
                            log.channel === 'Email' ? 'bg-amber-500' :
                            log.channel === 'WhatsApp' ? 'bg-emerald-500' :
                            'bg-indigo-500'
                          )} />

                          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border relative group hover:border-slate-300 transition-all">
                            {/* Header */}
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <span className={cn(
                                  "text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider text-white",
                                  log.channel === 'Call' ? 'bg-blue-500' :
                                  log.channel === 'Email' ? 'bg-amber-500' :
                                  log.channel === 'WhatsApp' ? 'bg-emerald-500' :
                                  'bg-indigo-500'
                                )}>
                                  {log.channel}
                                </span>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1.5 flex items-center gap-1.5 flex-wrap">
                                  <span>Logged by {log.contacted_by_profile?.full_name || 'System Admin'}</span>
                                  {log.school_contacts && (
                                    <>
                                      <span className="text-slate-400 font-medium">with</span>
                                      <span className="underline decoration-indigo-300 font-extrabold">{log.school_contacts.name}</span>
                                    </>
                                  )}
                                </h4>
                              </div>
                              <span className="text-xs text-muted-foreground font-bold shrink-0">
                                {new Date(log.contacted_at).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>

                            {/* Summary */}
                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-2.5 leading-relaxed break-words whitespace-pre-line bg-white dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/50 font-medium">
                              {log.summary}
                            </p>

                            {/* Metadata outcomes / next step */}
                            {(log.status_outcome || log.next_step) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-3 pt-3 border-t">
                                {log.status_outcome && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground font-bold uppercase tracking-wider block text-[9px]">Outcome Status</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{log.status_outcome}</span>
                                  </div>
                                )}
                                {log.next_step && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground font-bold uppercase tracking-wider block text-[9px]">Next Action Step</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                      <ArrowUpRight className="h-3.5 w-3.5 text-blue-500 shrink-0" /> {log.next_step}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Delete Log Button */}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteLog(log.id)}
                              className="absolute right-2 top-2 h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        </TabsContent>
      </Tabs>

      {/* dialog for adding/editing school representatives */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Edit Contact Representative' : 'Add Representative'}</DialogTitle>
            <DialogDescription>
              Provide contact details of school stakeholders for project follow-ups.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddContact} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Full Name</Label>
              <Input
                id="contact-name"
                placeholder="e.g. Mr. John Phiri"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-role">Position / Role</Label>
              <Input
                id="contact-role"
                placeholder="e.g. Head Teacher, ICT Coordinator, Bursar"
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Phone Number</Label>
                <Input
                  id="contact-phone"
                  placeholder="e.g. +260977000000"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email Address</Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="e.g. john@school.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsContactDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isAddingContact || !contactName}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {isAddingContact && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
                {editingContact ? 'Save Changes' : 'Create Contact'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="CRITICAL ACTION REQUIRED"
        description={`You are about to initiate a PERMANENT DESTruction of ${selectedIds.length} teacher accounts. This process will purge all database profiles and cloud authentication records associated with these individuals. THIS OPERATION IS IRREVERSIBLE.`}
        confirmLabel="Destroy Accounts Permanently"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleBulkDelete}
      />

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter a new login password for {resetTeacher?.full_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResetPassword} 
              disabled={isResetting || !newPassword || newPassword.length < 6}
            >
              {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
