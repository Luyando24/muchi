import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Building, 
  Globe, 
  AlertCircle,
  RefreshCw,
  CreditCard,
  Package,
  Pencil,
  Ticket,
  Check,
  ClipboardCopy
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LicenseCode, SchoolType } from '@shared/api';


export default function ConfigurationManagement() {
  const [categories, setCategories] = useState<SchoolCategory[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [schoolTypes, setSchoolTypes] = useState<SchoolType[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form fields
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newPrice, setNewPrice] = useState('0');
  const [newDescription, setNewDescription] = useState('');
  const [newBillingCycle, setNewBillingCycle] = useState('monthly');
  const [selectedCountryIds, setSelectedCountryIds] = useState<string[]>([]);
  const [newMinStudents, setNewMinStudents] = useState('0');
  const [newMaxStudents, setNewMaxStudents] = useState('');
  
  // Edit state
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // License Codes state
  const [licenseCodes, setLicenseCodes] = useState<LicenseCode[]>([]);
  const [newCodeDuration, setNewCodeDuration] = useState('12');
  const [newCodePlan, setNewCodePlan] = useState('');
  
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const fetchItem = async (url: string) => {
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          throw new Error(error.message || `Failed to fetch ${url}`);
        }
        return res.json();
      };

      // Fetch all in parallel but handle failures individually to prevent "disappearing data" issue
      const [catRes, countRes, planRes, codeRes, typeRes] = await Promise.allSettled([
        fetchItem('/api/admin/configurations/categories'),
        fetchItem('/api/admin/configurations/countries'),
        fetchItem('/api/admin/configurations/plans'),
        fetchItem('/api/admin/configurations/codes'),
        fetchItem('/api/admin/configurations/types')
      ]);

      if (catRes.status === 'fulfilled') setCategories(catRes.value);
      if (countRes.status === 'fulfilled') setCountries(countRes.value);
      if (planRes.status === 'fulfilled') setPlans(planRes.value);
      if (codeRes.status === 'fulfilled') setLicenseCodes(codeRes.value);
      if (typeRes.status === 'fulfilled') setSchoolTypes(typeRes.value);

      // Log any errors to console without breaking the UI flow
      [catRes, countRes, planRes, codeRes, typeRes].forEach((r, i) => {
        if (r.status === 'rejected') console.error(`Resource ${i} failed:`, r.reason);
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddType = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/configurations/types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ name: newName, description: newDescription })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add school type');
      }
      
      const newType = await res.json();
      setSchoolTypes(prev => [...prev, newType].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setNewDescription('');
      toast({ title: "Success", description: "School type added successfully" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this school type? Schools using it will be affected.')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/configurations/types/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (!res.ok) throw new Error('Failed to delete school type');
      
      setSchoolTypes(prev => prev.filter(t => t.id !== id));
      toast({ title: "Deleted", description: "School type removed successfully" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleAddCategory = async () => {

    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/configurations/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ name: newName })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add category');
      }
      
      const newCat = await res.json();
      setCategories(prev => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      toast({ title: "Success", description: "Category added successfully" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? Schools using it will be affected.')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/configurations/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (!res.ok) throw new Error('Failed to delete category');
      
      setCategories(prev => prev.filter(c => c.id !== id));
      toast({ title: "Deleted", description: "Category removed successfully" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleAddCountry = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/configurations/countries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ name: newName, code: newCode })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add country');
      }
      
      const newCountry = await res.json();
      setCountries(prev => [...prev, newCountry].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setNewCode('');
      toast({ title: "Success", description: "Country added successfully" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCountry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this country?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/configurations/countries/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (!res.ok) throw new Error('Failed to delete country');
      
      setCountries(prev => prev.filter(c => c.id !== id));
      toast({ title: "Deleted", description: "Country removed successfully" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleAddPlan = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/configurations/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          name: newName, 
          description: newDescription,
          price: parseFloat(newPrice),
          currency: 'ZMW',
          billing_cycle: newBillingCycle,
          is_active: true,
          country_ids: selectedCountryIds,
          min_students: parseInt(newMinStudents) || 0,
          max_students: newMaxStudents ? parseInt(newMaxStudents) : null
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add plan');
      }
      
      const newPlan = await res.json();
      setPlans(prev => [...prev, newPlan].sort((a, b) => a.price - b.price));
      setNewName('');
      setNewDescription('');
      setNewPrice('0');
      setNewBillingCycle('monthly');
      setSelectedCountryIds([]);
      setNewMinStudents('0');
      setNewMaxStudents('');
      toast({ title: "Success", description: "Subscription plan added successfully" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan || !newName.trim()) return;
    setIsAdding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/configurations/plans/${editingPlan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          name: newName, 
          description: newDescription,
          price: parseFloat(newPrice),
          currency: 'ZMW',
          billing_cycle: newBillingCycle,
          is_active: true,
          country_ids: selectedCountryIds,
          min_students: parseInt(newMinStudents) || 0,
          max_students: newMaxStudents ? parseInt(newMaxStudents) : null
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update plan');
      }
      
      const updated = await res.json();
      setPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
      setIsEditDialogOpen(false);
      setEditingPlan(null);
      toast({ title: "Success", description: "Subscription plan updated" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsAdding(false);
    }
  }

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription plan? Existing schools on this plan will remain mapped to it, but it will no longer be available for new selections.')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/configurations/plans/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (!res.ok) throw new Error('Failed to delete plan');
      
      setPlans(prev => prev.filter(p => p.id !== id));
      toast({ title: "Deleted", description: "Subscription plan removed successfully" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleGenerateCode = async () => {
    if (!newCodePlan) {
      toast({ variant: "warning", title: "Wait", description: "Please select a plan for this code" });
      return;
    }
    setIsAdding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/configurations/codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          plan_name: newCodePlan, 
          duration_months: parseInt(newCodeDuration),
          description: newDescription
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate code');
      }
      
      const newCodeData = await res.json();
      setLicenseCodes(prev => [newCodeData, ...prev]);
      setNewDescription('');
      toast({ title: "Code Generated", description: "The new license code is ready to use." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (!confirm('Revoke this unused license code?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/configurations/codes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (!res.ok) throw new Error('Failed to delete/revoke code');
      
      setLicenseCodes(prev => prev.filter(c => c.id !== id));
      toast({ title: "Revoked", description: "License code removed successfully" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Metadata Configuration</h2>
          <p className="text-slate-600 dark:text-slate-400">Manage global lists for categories and countries used across the system.</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Reload
        </Button>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl">
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="types" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Types
          </TabsTrigger>
          <TabsTrigger value="countries" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Countries
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="codes" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            License Codes
          </TabsTrigger>
        </TabsList>


        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Categories</CardTitle>
              <CardDescription>These options will appear during school registration and in settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="flex-1 space-y-2">
                  <Input 
                    placeholder="New category name (e.g. Technical School)" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                </div>
                <Button onClick={handleAddCategory} disabled={isAdding || !newName.trim()}>
                  {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Category
                </Button>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category Name</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                        </TableCell>
                      </TableRow>
                    ) : categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                          No categories found. Add one above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((cat) => (
                        <TableRow key={cat.id}>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell className="text-slate-500 text-sm">{new Date(cat.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Institution Types</CardTitle>
              <CardDescription>Configure primary, secondary, and other school types.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-end">
                <div className="space-y-2">
                  <Label>Type Name</Label>
                  <Input 
                    placeholder="e.g. Technical College" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grade Range / Description</Label>
                  <Input 
                    placeholder="e.g. (Grades 1-12)" 
                    value={newDescription} 
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddType} disabled={isAdding || !newName.trim()}>
                  {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Type
                </Button>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                        </TableCell>
                      </TableRow>
                    ) : schoolTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                          No school types found. Add one above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      schoolTypes.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell className="font-medium">{type.name}</TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">{type.description || '-'}</TableCell>
                          <TableCell className="text-slate-500 text-sm">{new Date(type.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteType(type.id)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="countries" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Countries</CardTitle>
              <CardDescription>Supported countries for system multi-tenancy.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Country Name</Label>
                  <Input 
                    placeholder="e.g. Kenya" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="w-24 space-y-2">
                  <Label>Code</Label>
                  <Input 
                    placeholder="KE" 
                    value={newCode} 
                    onChange={(e) => setNewCode(e.target.toUpperCase())}
                    maxLength={2}
                  />
                </div>
                <Button onClick={handleAddCountry} disabled={isAdding || !newName.trim()}>
                  {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Country
                </Button>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                        </TableCell>
                      </TableRow>
                    ) : countries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                          No countries found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      countries.map((country) => (
                        <TableRow key={country.id}>
                          <TableCell className="font-medium">{country.name}</TableCell>
                          <TableCell>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs">
                              {country.code || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm">{new Date(country.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteCountry(country.id)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Subscription Plans</CardTitle>
              <CardDescription>Available service tiers for institutions during registration.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Plan Name</Label>
                    <Input 
                      placeholder="e.g. Standard Plan" 
                      value={newName} 
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price (ZMW)</Label>
                    <Input 
                      type="number"
                      placeholder="e.g. 500" 
                      value={newPrice} 
                      onChange={(e) => setNewPrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Billing Cycle</Label>
                    <Input 
                      placeholder="e.g. monthly, yearly" 
                      value={newBillingCycle} 
                      onChange={(e) => setNewBillingCycle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Students</Label>
                    <Input 
                      type="number"
                      placeholder="0" 
                      value={newMinStudents} 
                      onChange={(e) => setNewMinStudents(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Students (Empty for Unlimited)</Label>
                    <Input 
                      type="number"
                      placeholder="Unlimited" 
                      value={newMaxStudents} 
                      onChange={(e) => setNewMaxStudents(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    placeholder="Short summary of features" 
                    value={newDescription} 
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assigned Countries (Optional - Leave empty for Global)</Label>
                  <div className="p-3 border rounded bg-white dark:bg-slate-950">
                    <ScrollArea className="h-[120px]">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {countries.map(country => (
                          <div key={country.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`country-${country.id}`} 
                              checked={selectedCountryIds.includes(country.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCountryIds(prev => [...prev, country.id]);
                                } else {
                                  setSelectedCountryIds(prev => prev.filter(id => id !== country.id));
                                }
                              }}
                            />
                            <label 
                              htmlFor={`country-${country.id}`}
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              {country.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
                <Button onClick={handleAddPlan} disabled={isAdding || !newName.trim()} className="w-full">
                  {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Subscription Plan
                </Button>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Availability</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                        </TableCell>
                      </TableRow>
                    ) : plans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                          No plans found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      plans.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-bold">{p.name}</TableCell>
                          <TableCell>
                            <span className="text-blue-600 font-medium">{p.currency} {p.price.toLocaleString()}</span>
                            <span className="text-slate-500 text-xs ml-1">/{p.billing_cycle}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-slate-700 text-sm">
                              {p.min_students || 0} - {p.max_students || '∞'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {p.country_ids && p.country_ids.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {p.country_ids.map(id => (
                                  <span key={id} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded">
                                    {countries.find(c => c.id === id)?.code || '...'}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-green-600 text-xs font-medium">Global</span>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-600 text-sm max-w-xs truncate">{p.description || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  setEditingPlan(p);
                                  setNewName(p.name);
                                  setNewDescription(p.description || '');
                                  setNewPrice(String(p.price));
                                  setNewBillingCycle(p.billing_cycle);
                                  setSelectedCountryIds(p.country_ids || []);
                                  setNewMinStudents(String(p.min_students || 0));
                                  setNewMaxStudents(p.max_students ? String(p.max_students) : '');
                                  setIsEditDialogOpen(true);
                                }}
                                className="text-slate-500 hover:text-blue-600"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeletePlan(p.id)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
        </TabsContent>
        <TabsContent value="codes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>License Codes</CardTitle>
              <CardDescription>Generate pre-paid codes for school subscription activation.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 border rounded-lg bg-slate-50 items-end">
                <div className="space-y-2">
                  <Label>Target Plan</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newCodePlan}
                    onChange={(e) => setNewCodePlan(e.target.value)}
                  >
                    <option value="">Select Plan</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Duration (Months)</Label>
                  <Input 
                    type="number"
                    value={newCodeDuration}
                    onChange={(e) => setNewCodeDuration(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Admin Notes</Label>
                  <Input 
                    placeholder="e.g. Batch for XYZ Donor"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
                <Button onClick={handleGenerateCode} disabled={isAdding || !newCodePlan}>
                  {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Generate Code
                </Button>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>License Code</TableHead>
                      <TableHead>Plan & Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Redeemed By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                        </TableCell>
                      </TableRow>
                    ) : licenseCodes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                          No license codes generated yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      licenseCodes.map((code) => (
                        <TableRow key={code.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                {code.code}
                              </span>
                              {!code.is_used && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6" 
                                  onClick={() => {
                                    navigator.clipboard.writeText(code.code);
                                    toast({ title: "Copied", description: "Code copied to clipboard" });
                                  }}
                                >
                                  <ClipboardCopy className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">{code.description}</p>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{code.plan_name}</span>
                            <p className="text-xs text-slate-500">{code.duration_months} Months</p>
                          </TableCell>
                          <TableCell>
                            {code.is_used ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                                <Check className="h-3 w-3 mr-1" /> Used
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Available
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {code.is_used ? (
                              <div>
                                <p className="text-sm font-medium">Auto-fetched from API</p>
                                <p className="text-[10px] text-slate-500">{code.redeemed_at && new Date(code.redeemed_at).toLocaleDateString()}</p>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!code.is_used && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteCode(code.id)}
                                className="text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Plan Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subscription Plan</DialogTitle>
            <DialogDescription>Modify tiers details and country availability.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Price (ZMW)</Label>
                <Input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Input value={newBillingCycle} onChange={(e) => setNewBillingCycle(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Students</Label>
                <Input type="number" value={newMinStudents} onChange={(e) => setNewMinStudents(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max Students (Empty for Unlimited)</Label>
                <Input type="number" value={newMaxStudents} onChange={(e) => setNewMaxStudents(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Assigned Countries (Optional)</Label>
              <div className="p-3 border rounded">
                <ScrollArea className="h-[120px]">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {countries.map(country => (
                      <div key={country.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`edit-country-${country.id}`} 
                          checked={selectedCountryIds.includes(country.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCountryIds(prev => [...prev, country.id]);
                            } else {
                              setSelectedCountryIds(prev => prev.filter(id => id !== country.id));
                            }
                          }}
                        />
                        <label htmlFor={`edit-country-${country.id}`} className="text-sm font-medium leading-none cursor-pointer">
                          {country.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdatePlan} disabled={isAdding}>
              {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="text-sm font-bold">Important Note</AlertTitle>
        <AlertDescription className="text-xs">
          Changes made here are global. Deleting a category or country will not remove it from existing schools, 
          but they will no longer be selectable for new registrations or settings updates.
        </AlertDescription>
      </Alert>
    </div>
  );
}
