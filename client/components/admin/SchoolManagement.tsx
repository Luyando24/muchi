import React, { useState, useEffect } from 'react';
import {
  Building,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  ExternalLink,
  UserX,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import SchoolDetails from './SchoolDetails';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaginationControls } from '@/components/ui/pagination-controls';

// Schema for creating/editing a school
const schoolSchema = z.object({
  name: z.string().min(2, "School name is required"),
  slug: z.string().min(2, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase, numbers, and hyphens only"),
  plan: z.string().default('Standard'),
  address: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
});

interface License {
  id: string;
  status: 'active' | 'expired' | 'suspended' | 'pending';
  start_date: string;
  end_date: string;
  plan: string;
  license_key: string;
  created_at: string;
}

interface School {
  id: string;
  name: string;
  slug: string;
  plan: string;
  address?: string;
  contact_email?: string;
  status?: string;
  onboarding_status?: string;
  created_at: string;
  school_licenses?: License[];
  school_contact_logs?: { contacted_at: string; channel: string }[];
  teacher_count?: number;
  student_count?: number;
}

export default function SchoolManagement() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  const getDisplayOnboardingStatus = (school: School) => {
    const tc = school.teacher_count || 0;
    const sc = school.student_count || 0;
    if (school.onboarding_status === 'Active & Onboarded' || (tc > 20 && sc > 500)) {
      return 'Active & Onboarded';
    }
    if (school.onboarding_status === 'In Progress' || (tc >= 5 && sc >= 100)) {
      return 'In Progress';
    }
    return 'Pending';
  };

  // License Management State
  const [isLicenseDialogOpen, setIsLicenseDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [licenseDuration, setLicenseDuration] = useState(1);
  const [generatingLicense, setGeneratingLicense] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingSchool, setViewingSchool] = useState<School | null>(null);
  const [teacherDeleteTargetId, setTeacherDeleteTargetId] = useState<string | null>(null);
  const [isDeletingTeachers, setIsDeletingTeachers] = useState(false);

  const { toast } = useToast();

  // Tab & Pagination states for Schools Table
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Pagination states for Licenses Table
  const [licensePage, setLicensePage] = useState(1);
  const [licensePageSize, setLicensePageSize] = useState(5);

  // Reset page when tab or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // Reset license page when selectedSchool changes
  useEffect(() => {
    setLicensePage(1);
  }, [selectedSchool?.id]);

  const form = useForm<z.infer<typeof schoolSchema>>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: '',
      slug: '',
      plan: 'Standard',
      address: '',
      contact_email: '',
    },
  });

  // Fetch schools on mount
  useEffect(() => {
    fetchSchools();
  }, []);

  // Sync selectedSchool with schools list when it updates (to keep dialog data fresh)
  useEffect(() => {
    if (selectedSchool) {
      const updated = schools.find(s => s.id === selectedSchool.id);
      if (updated) {
        setSelectedSchool(updated);
      }
    }
  }, [schools]);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const [schoolsRes, countsRes] = await Promise.all([
        supabase
          .from('schools')
          .select('*, school_licenses(*), school_contact_logs(contacted_at, channel)')
          .order('created_at', { ascending: false }),
        supabase
          .from('school_profile_counts')
          .select('*')
      ]);

      if (schoolsRes.error) throw schoolsRes.error;
      if (countsRes.error) throw countsRes.error;

      const schoolTeacherCounts: Record<string, number> = {};
      const schoolStudentCounts: Record<string, number> = {};

      if (countsRes.data) {
        countsRes.data.forEach((row: any) => {
          schoolTeacherCounts[row.school_id] = row.teacher_count;
          schoolStudentCounts[row.school_id] = row.student_count;
        });
      }

      const schoolsWithCounts = (schoolsRes.data || []).map((s: any) => ({
        ...s,
        teacher_count: schoolTeacherCounts[s.id] || 0,
        student_count: schoolStudentCounts[s.id] || 0
      }));

      setSchools(schoolsWithCounts);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching schools",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getActiveLicense = (school: School) => {
    if (!school.school_licenses) return null;
    return school.school_licenses.find(l =>
      l.status === 'active' && new Date(l.end_date) > new Date()
    );
  };

  const handleGenerateLicense = async () => {
    if (!selectedSchool) return;

    setGeneratingLicense(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          schoolId: selectedSchool.id,
          plan: selectedSchool.plan,
          durationYears: licenseDuration
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate license');
      }

      toast({
        title: "Success",
        description: "License generated successfully",
      });

      // Keep dialog open to see the new license
      // setIsLicenseDialogOpen(false); 
      fetchSchools();
    } catch (error: any) {
      console.error('Error generating license:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate license",
        variant: "destructive"
      });
    } finally {
      setGeneratingLicense(false);
    }
  };

  const handleExtendLicense = async (licenseId: string, currentEndDate: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const newEndDate = new Date(currentEndDate);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);

      const response = await fetch(`/api/admin/licenses/${licenseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ end_date: newEndDate.toISOString() })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to extend license');
      }

      toast({ title: "License extended by 1 year" });
      fetchSchools();
    } catch (error: any) {
      console.error('Error extending license:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to extend license",
        variant: "destructive"
      });
    }
  };

  const handleRevokeLicense = async (licenseId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`/api/admin/licenses/${licenseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ status: 'suspended' })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to revoke license');
      }

      toast({ title: "License revoked successfully" });
      fetchSchools();
    } catch (error: any) {
      console.error('Error revoking license:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to revoke license",
        variant: "destructive"
      });
    }
  };

  const handleCreateOrUpdate = async (values: z.infer<typeof schoolSchema>) => {
    try {
      if (editingSchool) {
        // Update
        const { error } = await supabase
          .from('schools')
          .update(values)
          .eq('id', editingSchool.id);

        if (error) throw error;
        toast({ title: "School updated successfully" });
      } else {
        // Create (Call backend API for robust creation logic if needed, or direct DB)
        // Using direct DB here as System Admin has full access via RLS
        const { error } = await supabase
          .from('schools')
          .insert(values);

        if (error) throw error;
        toast({ title: "School created successfully" });
      }

      setIsDialogOpen(false);
      form.reset();
      setEditingSchool(null);
      fetchSchools();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Operation failed",
        description: error.message,
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`/api/admin/schools/${deleteTargetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete school');
      }

      toast({ title: "School deleted successfully" });
      setDeleteTargetId(null);
      fetchSchools();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error.message,
      });
    } finally {
      setIsDeleting(false);
    }
  };
  const handleDeleteTeachers = async () => {
    if (!teacherDeleteTargetId) return;
    setIsDeletingTeachers(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`/api/admin/schools/${teacherDeleteTargetId}/teachers/permanent`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete teachers');
      }

      toast({ title: "All teachers deleted permanently" });
      setTeacherDeleteTargetId(null);
      fetchSchools();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: error.message,
      });
    } finally {
      setIsDeletingTeachers(false);
    }
  };


  const openEditDialog = (school: School) => {
    setEditingSchool(school);
    form.reset({
      name: school.name,
      slug: school.slug,
      plan: school.plan,
      address: school.address || '',
      contact_email: school.contact_email || '',
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingSchool(null);
    form.reset({
      name: '',
      slug: '',
      plan: 'Standard',
      address: '',
      contact_email: '',
    });
    setIsDialogOpen(true);
  };

  // Sort and filter schools based on activeTab
  const getFilteredAndSortedSchools = () => {
    let result = [...schools];

    const hasActiveLicense = (s: School) => !!getActiveLicense(s);
    const hasExpiredLicense = (s: School) => {
      if (!s.school_licenses || s.school_licenses.length === 0) return false;
      return !getActiveLicense(s);
    };

    const isOverdueRegistration = (s: School) => {
      const createdTime = new Date(s.created_at).getTime();
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return createdTime < thirtyDaysAgo && !hasActiveLicense(s);
    };

    // Filter by search query first
    if (searchQuery) {
      result = result.filter(school =>
        school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        school.slug.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply active tab filtering / sorting
    switch (activeTab) {
      case 'new':
        // Sort by created_at descending (newest first)
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        // Sort by created_at ascending (oldest first)
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'paid':
        result = result.filter(s => hasActiveLicense(s));
        break;
      case 'overdue':
        result = result.filter(s => 
          hasExpiredLicense(s) || 
          isOverdueRegistration(s)
        );
        break;
      case 'unpaid':
        // Unpaid lists schools registered less than 30 days without an active license (not overdue yet)
        result = result.filter(s => 
          !hasActiveLicense(s) && 
          !isOverdueRegistration(s)
        );
        break;
      case 'active':
        result = result.filter(s => getDisplayOnboardingStatus(s) === 'Active & Onboarded');
        break;
      case 'in-progress':
        result = result.filter(s => getDisplayOnboardingStatus(s) === 'In Progress');
        break;
      case 'pending':
        result = result.filter(s => getDisplayOnboardingStatus(s) === 'Pending');
        break;
      case 'all':
      default:
        // Default sort: newest first
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return result;
  };

  const processedSchools = getFilteredAndSortedSchools();
  const totalItems = processedSchools.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedSchools = processedSchools.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (viewingSchool) {
    return (
      <SchoolDetails 
        schoolId={viewingSchool.id} 
        schoolName={viewingSchool.name} 
        onBack={() => setViewingSchool(null)} 
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Schools Management</h2>
          <p className="text-muted-foreground">Manage registered schools and their configurations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Add School
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSchool ? 'Edit School' : 'Add New School'}</DialogTitle>
              <DialogDescription>
                {editingSchool ? 'Update school details below.' : 'Enter the details for the new school.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateOrUpdate)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Chongwe Secondary" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Slug</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. chongwe-secondary" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subscription Plan</FormLabel>
                      <FormControl>
                        <Input placeholder="Standard, Premium, Enterprise" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input placeholder="admin@school.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="City, Country" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">
                    {editingSchool ? 'Save Changes' : 'Create School'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search schools..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full animate-in fade-in duration-300">
          <TabsList className="flex overflow-x-auto w-full max-w-full h-auto gap-1 bg-slate-100 p-1 dark:bg-slate-800 rounded-lg border scrollbar-none">
            <TabsTrigger value="all" className="font-bold text-sm py-2.5 px-4 shrink-0">All</TabsTrigger>
            <TabsTrigger value="new" className="font-bold text-sm py-2.5 px-4 shrink-0">Newest</TabsTrigger>
            <TabsTrigger value="oldest" className="font-bold text-sm py-2.5 px-4 shrink-0">Oldest</TabsTrigger>
            <TabsTrigger value="paid" className="font-bold text-sm py-2.5 px-4 shrink-0">Paid Subscriptions</TabsTrigger>
            <TabsTrigger value="overdue" className="font-bold text-sm py-2.5 px-4 shrink-0">Overdue & Grace</TabsTrigger>
            <TabsTrigger value="unpaid" className="font-bold text-sm py-2.5 px-4 shrink-0">Unpaid</TabsTrigger>
            <TabsTrigger value="active" className="font-bold text-sm py-2.5 px-4 shrink-0">Onboarded</TabsTrigger>
            <TabsTrigger value="in-progress" className="font-bold text-sm py-2.5 px-4 shrink-0">In Progress</TabsTrigger>
            <TabsTrigger value="pending" className="font-bold text-sm py-2.5 px-4 shrink-0">Pending Setup</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-md border overflow-x-auto w-full max-w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead colSpan={1}>Name</TableHead>
              <TableHead>Onboarding</TableHead>
              <TableHead className="hidden md:table-cell">Last Contact</TableHead>
              <TableHead className="hidden sm:table-cell">Plan</TableHead>
              <TableHead>License</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : paginatedSchools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No schools found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedSchools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {school.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const onboardingStatusDisplay = getDisplayOnboardingStatus(school);
                      return (
                        <Badge variant={
                          onboardingStatusDisplay === 'Active & Onboarded' ? 'default' :
                          onboardingStatusDisplay === 'In Progress' ? 'secondary' :
                          'outline'
                        } className={cn(
                          onboardingStatusDisplay === 'Active & Onboarded' && "bg-emerald-500 hover:bg-emerald-600 text-white font-semibold border-none",
                          onboardingStatusDisplay === 'In Progress' && "bg-blue-500 hover:bg-blue-600 text-white font-semibold border-none",
                          onboardingStatusDisplay === 'Pending' && "border-amber-500 text-amber-600 font-semibold"
                        )}>
                          {onboardingStatusDisplay}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {(() => {
                      if (!school.school_contact_logs || school.school_contact_logs.length === 0) {
                        return <span className="text-muted-foreground text-xs font-semibold">Never Contacted</span>;
                      }
                      
                      const latestContact = school.school_contact_logs.reduce((latest, current) => {
                        return new Date(current.contacted_at) > new Date(latest.contacted_at) ? current : latest;
                      }, school.school_contact_logs[0]);
                      
                      return (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold">{new Date(latestContact.contacted_at).toLocaleDateString()}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{latestContact.channel}</span>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{school.plan}</TableCell>
                  <TableCell>
                    {(() => {
                      const license = getActiveLicense(school);
                      if (license) {
                        return (
                          <Badge className="bg-green-500 hover:bg-green-600">
                            Active until {new Date(license.end_date).toLocaleDateString()}
                          </Badge>
                        );
                      } else {
                        return (
                          <Badge variant="destructive">
                            Expired / None
                          </Badge>
                        );
                      }
                    })()}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{new Date(school.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => {
                          setSelectedSchool(school);
                          setIsLicenseDialogOpen(true);
                        }}>
                          <Building className="mr-2 h-4 w-4" /> Manage License
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const url = `${window.location.origin}/${school.slug}`;
                          window.open(url, '_blank');
                        }}>
                          <ExternalLink className="mr-2 h-4 w-4" /> Visit Website (New)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-blue-600 focus:text-blue-600"
                          onClick={() => setViewingSchool(school)}
                        >
                          <Users className="mr-2 h-4 w-4" /> View Details & Staff
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEditDialog(school)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => setDeleteTargetId(school.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete School
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        totalItems={totalItems}
      />

      <Dialog open={isLicenseDialogOpen} onOpenChange={setIsLicenseDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage License - {selectedSchool?.name}</DialogTitle>
            <DialogDescription>
              View history and generate new licenses.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* License History */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const licenses = selectedSchool?.school_licenses || [];
                    const sortedLicenses = [...licenses].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    const totalLicenses = sortedLicenses.length;
                    const totalLicensePages = Math.ceil(totalLicenses / licensePageSize);
                    const paginatedLicenses = sortedLicenses.slice((licensePage - 1) * licensePageSize, licensePage * licensePageSize);

                    if (paginatedLicenses.length > 0) {
                      return (
                        <>
                          {paginatedLicenses.map((license) => (
                            <TableRow key={license.id}>
                              <TableCell>
                                <Badge variant={
                                  license.status === 'active' && new Date(license.end_date) > new Date()
                                    ? 'default'
                                    : 'destructive'
                                }>
                                  {license.status === 'active' && new Date(license.end_date) < new Date() ? 'expired' : license.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{license.license_key.substring(0, 8)}...</TableCell>
                              <TableCell>{new Date(license.start_date).toLocaleDateString()}</TableCell>
                              <TableCell>{new Date(license.end_date).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right space-x-2">
                                {license.status === 'active' && new Date(license.end_date) > new Date() && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleExtendLicense(license.id, license.end_date)}
                                    >
                                      Extend
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleRevokeLicense(license.id)}
                                    >
                                      Revoke
                                    </Button>
                                  </>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell colSpan={5} className="p-0">
                              <PaginationControls
                                currentPage={licensePage}
                                totalPages={totalLicensePages}
                                pageSize={licensePageSize}
                                onPageChange={setLicensePage}
                                onPageSizeChange={(size) => {
                                  setLicensePageSize(size);
                                  setLicensePage(1);
                                }}
                                totalItems={totalLicenses}
                              />
                            </TableCell>
                          </TableRow>
                        </>
                      );
                    } else {
                      return (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                            No licenses found.
                          </TableCell>
                        </TableRow>
                      );
                    }
                  })()}
                </TableBody>
              </Table>
            </div>

            {/* Generate New License */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="font-medium mb-4">Generate New License</h4>
              <div className="flex items-end gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="duration">Duration (Years)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      value={licenseDuration}
                      onChange={(e) => setLicenseDuration(parseInt(e.target.value) || 1)}
                      className="w-24"
                    />
                  </div>
                </div>

                <div className="flex-1 text-sm text-muted-foreground pb-3">
                  New license will expire on: <span className="font-medium text-foreground">{new Date(new Date().setFullYear(new Date().getFullYear() + licenseDuration)).toLocaleDateString()}</span>
                </div>

                <Button onClick={handleGenerateLicense} disabled={generatingLicense}>
                  {generatingLicense ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate License'
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLicenseDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete School"
        description="Are you sure you want to delete this school? This action cannot be undone and will remove all associated data."
        confirmLabel="Delete School"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={!!teacherDeleteTargetId}
        onOpenChange={(open) => !open && setTeacherDeleteTargetId(null)}
        title="Permanently Delete All Teachers"
        description="This will permanently delete ALL teachers in this school from both the database and authentication system. This action is IRREVERSIBLE. Are you absolutely sure?"
        confirmLabel="Permanently Delete Teachers"
        variant="danger"
        loading={isDeletingTeachers}
        onConfirm={handleDeleteTeachers}
      />
    </div>
  );
}
