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
  Loader2,
  X,
  School as SchoolIcon // imported School for the type
} from 'lucide-react';
import { ZAMBIAN_REGIONS } from '@/lib/regions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { syncFetch } from '@/lib/syncService';
import ThemeToggle from '@/components/navigation/ThemeToggle';
import { School, SchoolCategory, Country } from '@shared/api';

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
    exam_types: [] as string[],
    email: '',
    phone: '',
    address: '',
    province: '',
    district: '',
    website: '',
    logo_url: '',
    signature_url: '',
    seal_url: '',
    coat_of_arms_url: '',
    headteacher_name: '',
    headteacher_title: 'Headteacher',
    school_type: 'Secondary School' as 'Primary School' | 'Secondary School' | 'Basic School' | 'Combined School',
    category: '',
    country: 'Zambia'
  });

  const [categories, setCategories] = useState<SchoolCategory[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);

  const [newExamType, setNewExamType] = useState('');

  const fetchMetadata = async () => {
    setIsLoadingMeta(true);
    try {
      const [catRes, countRes] = await Promise.all([
        fetch('/api/schools/metadata/categories'),
        fetch('/api/schools/metadata/countries')
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }
      
      if (countRes.ok) {
        const countData = await countRes.json();
        setCountries(countData);
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
    } finally {
      setIsLoadingMeta(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

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
        exam_types: data.exam_types || ['Mid Term', 'End of Term'],
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        province: data.province || '',
        district: data.district || '',
        website: data.website || '',
        logo_url: data.logo_url || '',
        signature_url: data.signature_url || '',
        seal_url: data.seal_url || '',
        coat_of_arms_url: data.coat_of_arms_url || '',
        headteacher_name: data.headteacher_name || '',
        headteacher_title: data.headteacher_title || 'Headteacher',
        school_type: data.school_type || 'Secondary School',
        category: data.category || '',
        country: data.country || 'Zambia'
      });
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      
      const isOfflineError = error.message?.includes('No connection and no cached data available');
      
      if (isOfflineError) {
        toast({
          title: "Offline Mode",
          description: "No cached school settings available. Please connect to sync.",
          variant: "destructive",
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

  const addExamType = () => {
    if (newExamType.trim() && !formData.exam_types.includes(newExamType.trim())) {
      setFormData(prev => ({
        ...prev,
        exam_types: [...prev.exam_types, newExamType.trim()]
      }));
      setNewExamType('');
    }
  };

  const removeExamType = (typeToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      exam_types: prev.exam_types.filter(type => type !== typeToRemove)
    }));
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
                      <Label htmlFor="school_type">School Type</Label>
                      <Select
                        value={formData.school_type}
                        onValueChange={(value: 'Primary School' | 'Secondary School' | 'Basic School' | 'Combined School') =>
                          setFormData(prev => ({ ...prev, school_type: value }))
                        }
                      >
                        <SelectTrigger id="school_type" className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Primary School">Primary School (Grades 1-7)</SelectItem>
                          <SelectItem value="Secondary School">Secondary School (Grades 8-12)</SelectItem>
                          <SelectItem value="Basic School">Basic School (Grades 1-9)</SelectItem>
                          <SelectItem value="Combined School">Combined School (Grades 1-12)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">School Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData(prev => ({ ...prev, category: value }))
                        }
                      >
                        <SelectTrigger id="category" className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingMeta ? (
                            <div className="p-2 flex justify-center">
                              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                            </div>
                          ) : categories.length > 0 ? (
                            categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="Government">Government / Public</SelectItem>
                              <SelectItem value="Private">Private School</SelectItem>
                              <SelectItem value="Mission">Mission School</SelectItem>
                              <SelectItem value="Community">Community School</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-slate-500 italic">* Collected for Ministry of Education statistical purposes.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="headteacher_title">Headteacher Qualifications (Title)</Label>
                      <Input
                        id="headteacher_title"
                        name="headteacher_title"
                        value={formData.headteacher_title}
                        onChange={handleInputChange}
                        placeholder="e.g. MA(Edn Mgt), BA(Edn)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="headteacher_name">Headteacher Name</Label>
                      <Input
                        id="headteacher_name"
                        name="headteacher_name"
                        value={formData.headteacher_name}
                        onChange={handleInputChange}
                        placeholder="e.g. Mr. John Doe"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Assessment/Exam Types</Label>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {formData.exam_types.map((type, idx) => (
                            <span 
                              key={idx} 
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                            >
                              {type}
                              <button
                                type="button"
                                onClick={() => removeExamType(type)}
                                className="text-indigo-500 hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                          {formData.exam_types.length === 0 && (
                            <span className="text-sm text-slate-500 italic">No custom exam types defined</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="e.g. Test 1, Mid-Term"
                            value={newExamType}
                            onChange={(e) => setNewExamType(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addExamType();
                              }
                            }}
                            className="max-w-xs"
                          />
                          <Button type="button" onClick={addExamType} variant="secondary">Add</Button>
                        </div>
                        <p className="text-xs text-slate-500">Press enter or click Add to create a new assessment type. These will be available when teachers enter grades.</p>
                      </div>
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

                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={formData.country}
                        onValueChange={(value) =>
                          setFormData(prev => ({ ...prev, country: value }))
                        }
                      >
                        <SelectTrigger id="country" className="w-full">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingMeta ? (
                            <div className="p-2 flex justify-center">
                              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                            </div>
                          ) : countries.length > 0 ? (
                            countries.map(country => (
                              <SelectItem key={country.id} value={country.name}>{country.name}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="Zambia">Zambia</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="province">Province</Label>
                      <Select
                        value={formData.province}
                        onValueChange={(value) =>
                          setFormData(prev => ({ ...prev, province: value, district: '' }))
                        }
                      >
                        <SelectTrigger id="province" className="w-full">
                          <SelectValue placeholder="Select Province" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(ZAMBIAN_REGIONS).map(province => (
                            <SelectItem key={province} value={province}>{province}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="district">District</Label>
                      <Select
                        value={formData.district}
                        onValueChange={(value) =>
                          setFormData(prev => ({ ...prev, district: value }))
                        }
                        disabled={!formData.province}
                      >
                        <SelectTrigger id="district" className="w-full">
                          <SelectValue placeholder="Select District" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.province && ZAMBIAN_REGIONS[formData.province as keyof typeof ZAMBIAN_REGIONS]?.map(district => (
                            <SelectItem key={district} value={district}>{district}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { id: 'logo_url', label: 'School Logo', description: 'Appears on headers and website' },
              { id: 'signature_url', label: 'Headteacher Signature', description: 'Official digitized signature' },
              { id: 'seal_url', label: 'Official School Seal', description: 'Used for report card authenticity' },
              { id: 'coat_of_arms_url', label: 'Coat of Arms Logo', description: 'Appears on top right of report card' }
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
