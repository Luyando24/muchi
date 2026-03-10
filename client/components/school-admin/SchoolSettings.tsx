import React, { useState, useEffect } from 'react';
import {
  Building2,
  Globe,
  Mail,
  Phone,
  Save,
  Shield,
  Bell,
  Palette,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { syncFetch } from '@/lib/syncService';
import ThemeToggle from '@/components/navigation/ThemeToggle';
import { School } from '@shared/api';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminManagement from './AdminManagement';

export default function SchoolSettings() {
  const [school, setSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    academic_year: '',
    current_term: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    logo_url: '',
    signature_url: '',
    seal_url: ''
  });

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const data = await syncFetch('/api/school/settings', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        cacheKey: 'school-settings'
      });

      setSchool(data);
      setFormData({
        name: data.name || '',
        academic_year: data.academic_year || '',
        current_term: data.current_term || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        website: data.website || '',
        logo_url: data.logo_url || '',
        signature_url: data.signature_url || '',
        seal_url: data.seal_url || ''
      });
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      
      const isOfflineError = error.message?.includes('No connection and no cached data available');
      
      if (isOfflineError) {
        toast({
          title: "Offline Mode",
          description: "No cached school settings available. Please connect to sync.",
          variant: "warning",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load school settings.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/school/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update settings');
      }

      const updatedSchool = await response.json();
      setSchool(updatedSchool);
      toast({
        title: "Success",
        description: "School settings updated successfully.",
      });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">System Settings</h2>
          <p className="text-slate-600 dark:text-slate-400">Configure school parameters and preferences.</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .asset-upload-card {
          transition: all 0.3s ease;
        }
        .asset-upload-card:hover {
          border-color: #4f46e5;
          background-color: rgba(79, 70, 229, 0.02);
        }
      `}} />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="certification">Official Certification</TabsTrigger>
          <TabsTrigger value="admins">Admin Access</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>General Configuration</CardTitle>
                <CardDescription>School information and academic year</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">School Name</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="pl-9"
                          placeholder="Enter school name"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>School ID</Label>
                      <Input value={school?.id || ''} disabled className="bg-slate-50 font-mono text-sm" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="academic_year">Academic Year</Label>
                      <Input
                        id="academic_year"
                        name="academic_year"
                        value={formData.academic_year}
                        onChange={handleInputChange}
                        placeholder="e.g. 2024"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="current_term">Current Term</Label>
                      <Input
                        id="current_term"
                        name="current_term"
                        value={formData.current_term}
                        onChange={handleInputChange}
                        placeholder="e.g. Term 1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Contact Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="pl-9"
                          placeholder="info@school.edu"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="pl-9"
                          placeholder="+260..."
                        />
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="School physical address"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="website">Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="website"
                          name="website"
                          value={formData.website}
                          onChange={handleInputChange}
                          className="pl-9"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize interface theme</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Theme Mode</Label>
                      <p className="text-sm text-slate-500">Switch between light and dark mode</p>
                    </div>
                    <ThemeToggle />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>System alerts and emails</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Email Alerts</Label>
                      <p className="text-sm text-slate-500">Receive daily summaries</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">System Notifications</Label>
                      <p className="text-sm text-slate-500">In-app alerts for critical events</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Access control settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Two-Factor Auth</Label>
                      <p className="text-sm text-slate-500">Secure your account</p>
                    </div>
                    <Switch />
                  </div>
                  <Button variant="outline" className="w-full">
                    <Shield className="mr-2 h-4 w-4" />
                    Manage Access Logs
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="certification">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: 'logo_url', label: 'School Logo', description: 'Appears on headers and website' },
              { id: 'signature_url', label: 'Headteacher Signature', description: 'Official digitized signature' },
              { id: 'seal_url', label: 'Official School Seal', description: 'Used for report card authenticity' }
            ].map((asset) => (
              <Card key={asset.id} className="asset-upload-card overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{asset.label}</CardTitle>
                  <CardDescription className="text-xs">{asset.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-32 w-full bg-slate-50 dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center relative group">
                      {(formData as any)[asset.id] ? (
                        <img
                          src={(formData as any)[asset.id]}
                          alt={asset.label}
                          className="max-h-full max-w-full object-contain p-2"
                        />
                      ) : (
                        <div className="text-slate-300 flex flex-col items-center gap-2">
                          <Building2 className="h-8 w-8 opacity-20" />
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">No Image</span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl backdrop-blur-[2px]">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 text-xs font-bold"
                          onClick={() => document.getElementById(`upload-${asset.id}`)?.click()}
                        >
                          Change Image
                        </Button>
                      </div>
                    </div>

                    <input
                      type="file"
                      id={`upload-${asset.id}`}
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        setIsSaving(true);
                        try {
                          const fileExt = file.name.split('.').pop();
                          const fileName = `${asset.id}-${Date.now()}.${fileExt}`;

                          // Read file as base64
                          const reader = new FileReader();
                          const fileDataPromise = new Promise<string>((resolve) => {
                            reader.onload = () => resolve(reader.result as string);
                            reader.readAsDataURL(file);
                          });

                          const fileData = await fileDataPromise;

                          // Get session for auth header
                          const { data: { session } } = await supabase.auth.getSession();

                          const response = await fetch('/api/school/upload-asset', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${session?.access_token}`
                            },
                            body: JSON.stringify({
                              fileName,
                              fileData,
                              contentType: file.type
                            })
                          });

                          if (!response.ok) {
                            const errData = await response.json();
                            throw new Error(errData.message || 'Failed to upload asset');
                          }

                          const { publicUrl } = await response.json();
                          setFormData(prev => ({ ...prev, [asset.id]: publicUrl }));
                          toast({ title: "Success", description: `${asset.label} uploaded temporarily. Save changes to finalise.` });
                        } catch (err: any) {
                          toast({ title: "Upload Error", description: err.message, variant: "destructive" });
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                    />

                    {(formData as any)[asset.id] && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-7 text-[10px] font-bold uppercase"
                        onClick={() => setFormData(prev => ({ ...prev, [asset.id]: '' }))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="md:col-span-3 flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Official Assets
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="admins">
          <AdminManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
