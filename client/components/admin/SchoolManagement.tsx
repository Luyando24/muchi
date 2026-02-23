import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Loader2,
  ExternalLink
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
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

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
  created_at: string;
  school_licenses?: License[];
}

export default function SchoolManagement() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  
  // License Management State
  const [isLicenseDialogOpen, setIsLicenseDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [licenseDuration, setLicenseDuration] = useState(1);
  const [generatingLicense, setGeneratingLicense] = useState(false);

  const { toast } = useToast();

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
      const { data, error } = await supabase
        .from('schools')
        .select('*, school_licenses(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchools(data || []);
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this school? This action cannot be undone.")) return;

    try {
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "School deleted successfully" });
      fetchSchools();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error.message,
      });
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

  const filteredSchools = schools.filter(school => 
    school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    school.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Schools Management</h2>
          <p className="text-muted-foreground">Manage registered schools and their configurations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
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

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search schools..." 
            className="pl-8 max-w-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>License</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
               <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredSchools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No schools found.
                </TableCell>
              </TableRow>
            ) : (
              filteredSchools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {school.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="bg-muted px-2 py-1 rounded text-xs font-mono">
                      {school.slug}
                    </span>
                  </TableCell>
                  <TableCell>{school.plan}</TableCell>
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
                  <TableCell>{new Date(school.created_at).toLocaleDateString()}</TableCell>
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
                        <DropdownMenuItem onClick={() => window.open(`/school/${school.slug}`, '_blank')}>
                          <ExternalLink className="mr-2 h-4 w-4" /> Visit Website
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEditDialog(school)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDelete(school.id)}
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
                  {selectedSchool?.school_licenses && selectedSchool.school_licenses.length > 0 ? (
                    selectedSchool.school_licenses
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((license) => (
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
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                        No licenses found.
                      </TableCell>
                    </TableRow>
                  )}
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
    </div>
  );
}
