import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  FileText, 
  Plus, 
  Save, 
  Loader2, 
  Trash2, 
  Edit, 
  Eye, 
  Image as ImageIcon,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  Settings,
  List,
  Upload,
  X,
  ArrowLeft,
  Bold,
  Italic,
  Link as LinkIcon,
  Heading1,
  Heading2,
  List as ListIcon,
  ListOrdered,
  Quote,
  Code,
  Eraser,
  Briefcase,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Tender } from '@shared/api';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface WebsiteContent {
  hero_title?: string;
  hero_subtitle?: string;
  hero_image_url?: string;
  about_text?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  facebook_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
  admissions_open?: boolean;
  admissions_title?: string;
  admissions_text?: string;
  apply_button_text?: string;
  admission_form_fields?: Array<{
    id: string;
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'email' | 'tel';
    required: boolean;
  }>;
  admission_required_documents?: Array<{
    id: string;
    name: string;
    label: string;
    required: boolean;
  }>;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  cover_image_url?: string;
  status: 'Draft' | 'Published';
  published_at?: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface School {
  id: string;
  name: string;
  slug: string;
}

export default function WebsiteManagement() {
  const [activeTab, setActiveTab] = useState("content");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [school, setSchool] = useState<School | null>(null);
  const [content, setContent] = useState<WebsiteContent>({});
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const { toast } = useToast();

  // Blog Post Editor State
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isPreviewFormOpen, setIsPreviewFormOpen] = useState(false);
  
  // Tender Editor State
  const [editingTender, setEditingTender] = useState<Partial<Tender> | null>(null);
  const isTenderEditorOpen = !!editingTender;

  const isEditorOpen = !!editingPost;
  const setIsEditorOpen = (open: boolean) => {
    if (!open) setEditingPost(null);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { 'Authorization': `Bearer ${session.access_token}` };

      const [contentRes, postsRes, schoolRes] = await Promise.all([
        fetch('/api/school/website-content', { headers }),
        fetch('/api/school/blog-posts', { headers }),
        fetch('/api/school/settings', { headers })
      ]);

      if (contentRes.ok) setContent(await contentRes.json());
      if (postsRes.ok) setPosts(await postsRes.json());
      if (schoolRes.ok) setSchool(await schoolRes.json());
      
      const tendersRes = await fetch('/api/school/tenders', { headers });
      if (tendersRes.ok) setTenders(await tendersRes.json());
    } catch (error) {
      console.error('Error fetching website data:', error);
      toast({ title: "Error", description: "Failed to load website data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/school/website-content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(content)
      });

      if (!res.ok) throw new Error('Failed to update content');
      toast({ title: "Success", description: "Website content updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostSave = async () => {
    if (!editingPost?.title || !editingPost?.content) {
      toast({ title: "Validation Error", description: "Title and content are required", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const method = editingPost.id ? 'PUT' : 'POST';
      const url = editingPost.id ? `/api/school/blog-posts/${editingPost.id}` : '/api/school/blog-posts';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(editingPost)
      });

      if (!res.ok) throw new Error('Failed to save post');
      
      toast({ title: "Success", description: `Post ${editingPost.id ? 'updated' : 'created'} successfully` });
      setEditingPost(null);
      fetchData(); // Refresh list
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/school/blog-posts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (!res.ok) throw new Error('Failed to delete post');
      setPosts(posts.filter(p => p.id !== id));
      toast({ title: "Success", description: "Post deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `blog-covers/${fileName}`;

      const { data, error } = await supabase.storage
        .from('school-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('school-assets')
        .getPublicUrl(data.path);

      if (editingPost) {
        setEditingPost({ ...editingPost, cover_image_url: publicUrl });
      }
      
      toast({ title: "Success", description: "Image uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Upload Error", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `hero_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `hero-images/${fileName}`;

      const { data, error } = await supabase.storage
        .from('school-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('school-assets')
        .getPublicUrl(data.path);

      setContent({ ...content, hero_image_url: publicUrl });
      toast({ title: "Success", description: "Hero image uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Upload Error", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleTenderSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTender?.title || !editingTender?.description || !editingTender?.deadline) {
      toast({ title: "Validation Error", description: "All marked fields are required", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const method = editingTender.id ? 'PUT' : 'POST';
      const url = editingTender.id ? `/api/school/tenders/${editingTender.id}` : '/api/school/tenders';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(editingTender)
      });

      if (!res.ok) throw new Error('Failed to save tender');
      
      toast({ title: "Success", description: `Tender ${editingTender.id ? 'updated' : 'published'} successfully` });
      setEditingTender(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTender = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tender?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/school/tenders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (!res.ok) throw new Error('Failed to delete tender');
      setTenders(tenders.filter(t => t.id !== id));
      toast({ title: "Success", description: "Tender deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Website Management</h2>
          <p className="text-muted-foreground text-lg">Manage your school's public presence and blog.</p>
        </div>
        {school?.slug && (
          <Button 
            variant="outline" 
            className="flex items-center gap-2 group transition-all hover:border-primary hover:text-primary"
            onClick={() => {
              const protocol = window.location.protocol;
              const hostname = window.location.hostname;
              let url = '';
              if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
                url = `${protocol}//${school.slug}.localhost:5173`;
              } else {
                url = `${protocol}//${school.slug}.muchi.vercel.app`;
              }
              window.open(url, '_blank');
            }}
          >
            <Globe className="h-4 w-4 group-hover:rotate-12 transition-transform" />
            View Website
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
          <TabsTrigger value="content" className="flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
            <Globe className="h-4 w-4" />
            Website Content
          </TabsTrigger>
          <TabsTrigger value="blog" className="flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
            <FileText className="h-4 w-4" />
            Blog System
          </TabsTrigger>
          <TabsTrigger value="tenders" className="flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
            <Briefcase className="h-4 w-4" />
            Tenders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          <form onSubmit={handleContentSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="md:col-span-2 overflow-hidden border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
              <CardHeader className="border-b bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-blue-500" />
                  Hero Section
                </CardTitle>
                <CardDescription>Content that appears at the top of your homepage.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="md:col-span-2 lg:col-span-2 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="hero_title">Headline</Label>
                      <Input 
                        id="hero_title" 
                        value={content.hero_title || ''} 
                        onChange={e => setContent({...content, hero_title: e.target.value})}
                        placeholder="e.g. Empowering Future Leaders"
                        className="bg-white dark:bg-slate-800 text-lg font-semibold h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hero_subtitle">Sub-headline</Label>
                      <Textarea 
                        id="hero_subtitle" 
                        value={content.hero_subtitle || ''} 
                        onChange={e => setContent({...content, hero_subtitle: e.target.value})}
                        placeholder="e.g. Exceptional education for the modern world."
                        className="bg-white dark:bg-slate-800 min-h-[100px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Hero Image</Label>
                    <div className="space-y-3">
                      <div className="aspect-video relative rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden bg-white dark:bg-slate-800 group transition-all hover:border-primary/50">
                        {content.hero_image_url ? (
                          <>
                            <img src={content.hero_image_url} alt="Hero Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                              <Button size="sm" variant="secondary" type="button" onClick={() => document.getElementById('hero-image-upload')?.click()}>Replace</Button>
                              <Button size="sm" variant="destructive" type="button" onClick={() => setContent({...content, hero_image_url: ''})}>Remove</Button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-4">
                            <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                              <ImageIcon className="h-5 w-5 text-slate-400" />
                            </div>
                            <p className="text-[10px] text-muted-foreground mb-4">Recommended: 1920x1080px</p>
                            <Button size="sm" variant="outline" type="button" onClick={() => document.getElementById('hero-image-upload')?.click()} disabled={isUploading}>
                              {isUploading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Upload className="h-3 w-3 mr-2" />}
                              Upload Hero Image
                            </Button>
                          </div>
                        )}
                        <Input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          id="hero-image-upload" 
                          onChange={handleHeroImageUpload}
                        />
                      </div>
                      <Input
                        id="hero_image_url" 
                        value={content.hero_image_url || ''} 
                        onChange={e => setContent({...content, hero_image_url: e.target.value})}
                        placeholder="Or paste image URL..."
                        className="text-xs bg-white dark:bg-slate-800 h-8"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-500" />
                  About Our School
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label htmlFor="about_text">Detailed Description</Label>
                <Textarea 
                  id="about_text" 
                  value={content.about_text || ''} 
                  onChange={e => setContent({...content, about_text: e.target.value})}
                  className="min-h-[200px] bg-white dark:bg-slate-800"
                  placeholder="Share your school's history, mission, and vision..."
                />
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-emerald-500" />
                  Contact & Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Public Email</Label>
                  <Input 
                    id="contact_email" 
                    value={content.contact_email || ''} 
                    onChange={e => setContent({...content, contact_email: e.target.value})}
                    placeholder="contact@school.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Phone Number</Label>
                  <Input 
                    id="contact_phone" 
                    value={content.contact_phone || ''} 
                    onChange={e => setContent({...content, contact_phone: e.target.value})}
                    placeholder="+260..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input 
                    id="address" 
                    value={content.address || ''} 
                    onChange={e => setContent({...content, address: e.target.value})}
                    placeholder="123 Education Way, Lusaka"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-orange-500" />
                  Admissions Customization
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if(confirm('Are you sure you want to clear all custom fields and documents?')) {
                        setContent({...content, admission_form_fields: [], admission_required_documents: []});
                      }
                    }}
                    className="text-rose-500 hover:text-rose-600"
                  >
                    <Trash2 className="h-3 w-3 mr-2" /> Clear All
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm"
                    onClick={() => setIsPreviewFormOpen(true)}
                  >
                    <Eye className="h-3 w-3 mr-2" /> Preview Form
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                      <div className="space-y-0.5">
                        <Label>Admissions Open</Label>
                        <p className="text-xs text-muted-foreground">Toggle visibility of the application form.</p>
                      </div>
                      <Button 
                        type="button"
                        variant={content.admissions_open ? "default" : "outline"}
                        onClick={() => setContent({...content, admissions_open: !content.admissions_open})}
                      >
                        {content.admissions_open ? "Open" : "Closed"}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adm_title">Form Title</Label>
                      <Input 
                        id="adm_title" 
                        value={content.admissions_title || ''} 
                        onChange={e => setContent({...content, admissions_title: e.target.value})}
                        placeholder="Online Admission"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adm_text">Form Description</Label>
                      <Textarea 
                        id="adm_text" 
                        value={content.admissions_text || ''} 
                        onChange={e => setContent({...content, admissions_text: e.target.value})}
                        placeholder="Apply for the upcoming academic year."
                        className="h-20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="btn_text">Button Text</Label>
                      <Input 
                        id="btn_text" 
                        value={content.apply_button_text || ''} 
                        onChange={e => setContent({...content, apply_button_text: e.target.value})}
                        placeholder="Apply Now"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 font-bold"><List className="h-4 w-4" /> Custom Form Fields</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const fields = content.admission_form_fields || [];
                            setContent({
                              ...content, 
                              admission_form_fields: [
                                ...fields, 
                                { id: Math.random().toString(36).substr(2, 9), name: '', label: '', type: 'text', required: true }
                              ]
                            });
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Field
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {(content.admission_form_fields || []).map((field, idx) => (
                          <div key={field.id} className="flex gap-2 items-start p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                            <div className="grid grid-cols-2 gap-2 flex-grow">
                              <Input 
                                placeholder="Label (e.g. Full Name)" 
                                value={field.label}
                                onChange={e => {
                                  const fields = [...(content.admission_form_fields || [])];
                                  fields[idx].label = e.target.value;
                                  fields[idx].name = e.target.value.toLowerCase().replace(/\s+/g, '_');
                                  setContent({...content, admission_form_fields: fields});
                                }}
                                className="h-8 text-xs"
                              />
                              <Select 
                                value={field.type} 
                                onValueChange={val => {
                                  const fields = [...(content.admission_form_fields || [])];
                                  fields[idx].type = val as any;
                                  setContent({...content, admission_form_fields: fields});
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="date">Date</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="tel">Phone</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-rose-500"
                              onClick={() => {
                                const fields = (content.admission_form_fields || []).filter((_, i) => i !== idx);
                                setContent({...content, admission_form_fields: fields});
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 font-bold"><Upload className="h-4 w-4" /> Required Documents</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const docs = content.admission_required_documents || [];
                            setContent({
                              ...content, 
                              admission_required_documents: [
                                ...docs, 
                                { id: Math.random().toString(36).substr(2, 9), name: '', label: '', required: true }
                              ]
                            });
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Doc
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {(content.admission_required_documents || []).map((doc, idx) => (
                          <div key={doc.id} className="flex gap-2 items-start p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                            <Input 
                              placeholder="Doc Name (e.g. Birth Certificate)" 
                              value={doc.label}
                              onChange={e => {
                                const docs = [...(content.admission_required_documents || [])];
                                docs[idx].label = e.target.value;
                                docs[idx].name = e.target.value.toLowerCase().replace(/\s+/g, '_');
                                setContent({...content, admission_required_documents: docs});
                              }}
                              className="h-8 text-xs flex-grow"
                            />
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-rose-500"
                              onClick={() => {
                                const docs = (content.admission_required_documents || []).filter((_, i) => i !== idx);
                                setContent({...content, admission_required_documents: docs});
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-purple-500" />
                  Social Media Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Facebook className="h-4 w-4" /> Facebook</Label>
                    <Input 
                      value={content.facebook_url || ''} 
                      onChange={e => setContent({...content, facebook_url: e.target.value})}
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Twitter className="h-4 w-4" /> Twitter</Label>
                    <Input 
                      value={content.twitter_url || ''} 
                      onChange={e => setContent({...content, twitter_url: e.target.value})}
                      placeholder="https://twitter.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Instagram className="h-4 w-4" /> Instagram</Label>
                    <Input 
                      value={content.instagram_url || ''} 
                      onChange={e => setContent({...content, instagram_url: e.target.value})}
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Linkedin className="h-4 w-4" /> LinkedIn</Label>
                    <Input 
                      value={content.linkedin_url || ''} 
                      onChange={e => setContent({...content, linkedin_url: e.target.value})}
                      placeholder="https://linkedin.com/..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="md:col-span-2 flex justify-end pt-4">
              <Button size="lg" type="submit" disabled={isSaving} className="w-full md:w-auto px-12 transition-all hover:scale-105 active:scale-95">
                {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                Save Website Settings
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="blog" className="space-y-6">
          {!editingPost ? (
            <>
              <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div>
                  <h3 className="text-xl font-bold">Blog Posts</h3>
                  <p className="text-sm text-muted-foreground">Manage and publish articles for your school.</p>
                </div>
                <Button onClick={() => setEditingPost({ status: 'Draft', content: '' })} className="shadow-md hover:shadow-lg transition-all">
                  <Plus className="h-4 w-4 mr-2" /> New Post
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.length === 0 ? (
                  <Card className="col-span-full border-dashed p-12 text-center bg-slate-50 dark:bg-slate-900/50">
                    <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <FileText className="h-6 w-6 text-slate-400" />
                    </div>
                    <h4 className="text-lg font-medium">No posts found</h4>
                    <p className="text-muted-foreground mb-6">Start by creating your first blog article.</p>
                    <Button variant="outline" onClick={() => setEditingPost({ status: 'Draft', content: '' })}>Create First Post</Button>
                  </Card>
                ) : (
                  posts.map(post => (
                    <Card key={post.id} className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="aspect-video relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                        {post.cover_image_url ? (
                          <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-300">
                            <ImageIcon className="h-10 w-10 opacity-20" />
                          </div>
                        )}
                        <Badge className={`absolute top-3 right-3 shadow-sm ${post.status === 'Published' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'}`}>
                          {post.status}
                        </Badge>
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle className="line-clamp-1">{post.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          {post.profiles?.full_name || 'Admin'} • {new Date(post.created_at).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <p className="text-sm text-muted-foreground line-clamp-2 italic mb-4">
                          {post.excerpt || "No excerpt provided."}
                        </p>
                        <div className="flex justify-between gap-2 border-t pt-4">
                          <Button variant="ghost" size="sm" onClick={() => setEditingPost(post)} className="hover:text-primary transition-colors">
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeletePost(post.id)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </>
          ) : (
            <Card className="border-none shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b flex flex-row items-center justify-between space-y-0 py-4">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" onClick={() => setEditingPost(null)} className="h-8 w-8 p-0 rounded-full">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <CardTitle className="text-xl">{editingPost.id ? 'Edit Blog Post' : 'Create New Post'}</CardTitle>
                    <CardDescription>Draft and customize your school's article.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => setEditingPost(null)} disabled={isSaving}>Cancel</Button>
                  <Button onClick={handlePostSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {editingPost.id ? 'Update Changes' : 'Publish Article'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Post Details */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="post-title" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Title</Label>
                      <Input
                        id="post-title"
                        value={editingPost.title || ''}
                        onChange={e => setEditingPost({...editingPost, title: e.target.value})}
                        className="text-2xl font-bold h-14 bg-white dark:bg-slate-800"
                        placeholder="Enter a compelling headline..."
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Article Content</Label>
                        <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 p-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Bold" onClick={() => document.execCommand('bold')}><Bold className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Italic" onClick={() => document.execCommand('italic')}><Italic className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Heading 1" onClick={() => document.execCommand('formatBlock', false, 'H1')}><Heading1 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Heading 2" onClick={() => document.execCommand('formatBlock', false, 'H2')}><Heading2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Bullet List" onClick={() => document.execCommand('insertUnorderedList')}><ListIcon className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Ordered List" onClick={() => document.execCommand('insertOrderedList')}><ListOrdered className="h-3.5 w-3.5" /></Button>
                          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Quote" onClick={() => document.execCommand('formatBlock', false, 'BLOCKQUOTE')}><Quote className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Code" onClick={() => document.execCommand('formatBlock', false, 'PRE')}><Code className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Link" onClick={() => {
                            const url = prompt('Enter URL:');
                            if (url) document.execCommand('createLink', false, url);
                          }}><LinkIcon className="h-3.5 w-3.5" /></Button>
                          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500" title="Clear Formatting" onClick={() => document.execCommand('removeFormat')}><Eraser className="h-3.5 w-3.5" /></Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant={isPreview ? "default" : "outline"} 
                            size="sm" 
                            className="h-8"
                            onClick={() => setIsPreview(!isPreview)}
                          >
                            {isPreview ? <Edit className="h-3 w-3 mr-2" /> : <Eye className="h-3 w-3 mr-2" />}
                            {isPreview ? "Edit Mode" : "Preview"}
                          </Button>
                        </div>
                      </div>
                      
                      {isPreview ? (
                        <div className="min-h-[500px] p-8 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 prose dark:prose-invert max-w-none transition-all animate-in fade-in zoom-in-95 duration-300">
                          <h1 className="text-4xl font-extrabold mb-4">{editingPost.title || 'Untitled Post'}</h1>
                          {editingPost.cover_image_url && (
                            <img src={editingPost.cover_image_url} alt="Cover" className="w-full aspect-video object-cover rounded-2xl mb-8 shadow-xl" />
                          )}
                          <div dangerouslySetInnerHTML={{ __html: editingPost.content || '<p className="text-muted-foreground italic">No content yet...</p>' }} />
                        </div>
                      ) : (
                        <>
                          <div 
                            className="min-h-[500px] p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:border-primary transition-colors outline-none overflow-y-auto prose dark:prose-invert max-w-none"
                            contentEditable
                            onBlur={(e) => setEditingPost({...editingPost, content: e.currentTarget.innerHTML})}
                            dangerouslySetInnerHTML={{ __html: editingPost.content || '' }}
                          />
                          <div className="flex justify-between items-center mt-2">
                            <p className="text-[10px] text-muted-foreground italic">Press Ctrl+B for bold, Ctrl+I for italic. Use the toolbar for more options.</p>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-muted-foreground">
                                {editingPost.content?.replace(/<[^>]*>/g, '').length || 0} characters
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Settings & Sidebar */}
                  <div className="space-y-6">
                    <Card className="bg-slate-50 dark:bg-slate-900 border-none shadow-inner p-4 space-y-6">
                      <div className="space-y-4">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status & Visibility</Label>
                        <Select 
                          value={editingPost.status} 
                          onValueChange={(val: any) => setEditingPost({...editingPost, status: val})}
                        >
                          <SelectTrigger className="bg-white dark:bg-slate-800">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="Published">Published</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cover Image</Label>
                        <div className="space-y-3">
                          <div className="aspect-video relative rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden bg-white dark:bg-slate-800 group transition-all hover:border-primary/50">
                            {editingPost.cover_image_url ? (
                              <>
                                <img src={editingPost.cover_image_url} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                                  <Button size="sm" variant="secondary" onClick={() => document.getElementById('blog-image-upload')?.click()}>Replace</Button>
                                  <Button size="sm" variant="destructive" onClick={() => setEditingPost({...editingPost, cover_image_url: ''})}>Remove</Button>
                                </div>
                              </>
                            ) : (
                              <div className="text-center p-4">
                                <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                                  <Upload className="h-5 w-5 text-slate-400" />
                                </div>
                                <p className="text-xs text-muted-foreground mb-4">Recomended size: 1200x630px</p>
                                <Button size="sm" variant="outline" onClick={() => document.getElementById('blog-image-upload')?.click()} disabled={isUploading}>
                                  {isUploading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Upload className="h-3 w-3 mr-2" />}
                                  Upload Image
                                </Button>
                              </div>
                            )}
                            <Input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              id="blog-image-upload" 
                              onChange={handleImageUpload}
                            />
                          </div>
                          <Input
                            id="post-image-url"
                            value={editingPost.cover_image_url || ''}
                            onChange={e => setEditingPost({...editingPost, cover_image_url: e.target.value})}
                            className="text-xs bg-white dark:bg-slate-800"
                            placeholder="Or paste external image URL..."
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="post-excerpt" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Excerpt</Label>
                        <Textarea
                          id="post-excerpt"
                          value={editingPost.excerpt || ''}
                          onChange={e => setEditingPost({...editingPost, excerpt: e.target.value})}
                          className="text-sm bg-white dark:bg-slate-800 min-h-[100px] resize-none"
                          placeholder="A brief summary of the article..."
                        />
                      </div>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tenders" className="space-y-6">
          {!editingTender ? (
            <>
              <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div>
                  <h3 className="text-xl font-bold">Supply Tenders</h3>
                  <p className="text-sm text-muted-foreground">Manage supply opportunities displayed on your public website.</p>
                </div>
                <Button onClick={() => setEditingTender({ status: 'Open', category: 'Food Supplies' })}>
                  <Plus className="h-4 w-4 mr-2" /> New Tender
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tenders.length === 0 ? (
                  <Card className="col-span-full border-dashed p-12 text-center bg-slate-50 dark:bg-slate-900/50">
                    <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium">No active tenders</h4>
                    <p className="text-muted-foreground mb-4">Display supply opportunities for the feeding program or other needs.</p>
                    <Button variant="outline" onClick={() => setEditingTender({ status: 'Open', category: 'Food Supplies' })}>
                      Post First Tender
                    </Button>
                  </Card>
                ) : (
                  tenders.map(tender => (
                    <Card key={tender.id} className="relative overflow-hidden group border-none shadow-md hover:shadow-lg transition-all">
                      <div className="p-1 bg-primary/10 absolute top-0 left-0 right-0 h-1" />
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">{tender.category}</Badge>
                          <Badge className={
                            tender.status === 'Open' ? 'bg-emerald-500' : 
                            tender.status === 'Closed' ? 'bg-slate-500' : 'bg-blue-500'
                          }>
                            {tender.status}
                          </Badge>
                        </div>
                        <CardTitle className="line-clamp-1">{tender.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3" />
                          Deadline: {new Date(tender.deadline).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 min-h-[60px]">
                          {tender.description}
                        </p>
                        <div className="flex gap-2 pt-4 border-t">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingTender(tender)}>
                            <Edit className="h-3 w-3 mr-2" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDeleteTender(tender.id)}>
                            <Trash2 className="h-3 w-3 mr-2" /> Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </>
          ) : (
            <Card className="border-none shadow-xl overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b flex flex-row items-center justify-between space-y-0 py-4">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" onClick={() => setEditingTender(null)} className="h-8 w-8 p-0 rounded-full">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <CardTitle className="text-xl">{editingTender.id ? 'Edit Tender' : 'New Supply Opportunity'}</CardTitle>
                    <CardDescription>Details for suppliers and service providers.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleTenderSave} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="tender-title">Tender Title <span className="text-rose-500">*</span></Label>
                        <Input 
                          id="tender-title" 
                          value={editingTender.title || ''} 
                          onChange={e => setEditingTender({...editingTender, title: e.target.value})}
                          placeholder="e.g. Supply of Grade A Maize (50kg bags)"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Category <span className="text-rose-500">*</span></Label>
                          <Select 
                            value={editingTender.category} 
                            onValueChange={val => setEditingTender({...editingTender, category: val})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Food Supplies">Food Supplies</SelectItem>
                              <SelectItem value="Stationery">Stationery</SelectItem>
                              <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                              <SelectItem value="IT Equipment">IT Equipment</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select 
                            value={editingTender.status} 
                            onValueChange={(val: any) => setEditingTender({...editingTender, status: val})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Open">Open</SelectItem>
                              <SelectItem value="Closed">Closed</SelectItem>
                              <SelectItem value="Awarded">Awarded</SelectItem>
                              <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tender-deadline">Submission Deadline <span className="text-rose-500">*</span></Label>
                        <Input 
                          id="tender-deadline" 
                          type="datetime-local"
                          value={editingTender.deadline ? new Date(editingTender.deadline).toISOString().slice(0, 16) : ''} 
                          onChange={e => setEditingTender({...editingTender, deadline: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="tender-description">Detailed Description <span className="text-rose-500">*</span></Label>
                        <Textarea 
                          id="tender-description" 
                          className="min-h-[150px]"
                          value={editingTender.description || ''} 
                          onChange={e => setEditingTender({...editingTender, description: e.target.value})}
                          placeholder="Provide full specifications, requirements and submission process..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tender-contact">Contact Information</Label>
                        <Input 
                          id="tender-contact" 
                          value={editingTender.contact_info || ''} 
                          onChange={e => setEditingTender({...editingTender, contact_info: e.target.value})}
                          placeholder="Email or Phone for inquiries"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tender-doc">Document URL</Label>
                        <div className="flex gap-2">
                          <Input 
                            id="tender-doc" 
                            value={editingTender.document_url || ''} 
                            onChange={e => setEditingTender({...editingTender, document_url: e.target.value})}
                            placeholder="Link to full PDF document"
                          />
                          <Button type="button" variant="outline" size="icon"><Upload className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t">
                    <Button type="button" variant="outline" onClick={() => setEditingTender(null)}>Cancel</Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      {editingTender.id ? 'Update Tender' : 'Publish Tender'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Admission Form Preview Dialog */}
      <Dialog open={isPreviewFormOpen} onOpenChange={setIsPreviewFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{content.admissions_title || 'Online Admission'}</DialogTitle>
            <DialogDescription>{content.admissions_text || 'Apply for our school.'}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            <Card className="border shadow-none">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Standard Fields (Simulated) */}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Student Name (Standard)</Label>
                    <Input disabled placeholder="Full Legal Name" className="bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Date of Birth (Standard)</Label>
                    <Input disabled type="date" className="bg-slate-50" />
                  </div>
                </div>

                {/* Custom Fields */}
                {(content.admission_form_fields || []).map((field) => (
                  <div key={field.id} className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <Label className="flex items-center gap-1">
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </Label>
                    <Input 
                      type={field.type} 
                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                      className="bg-white border-primary/20"
                    />
                  </div>
                ))}

                {/* Document Uploads */}
                {(content.admission_required_documents || []).length > 0 && (
                  <div className="pt-4 space-y-4">
                    <Label className="text-sm font-bold border-b pb-2 block">Required Documents</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(content.admission_required_documents || []).map((doc) => (
                        <div key={doc.id} className="p-3 border-2 border-dashed rounded-lg flex items-center justify-between text-sm bg-slate-50/50">
                          <span className="flex items-center gap-2 italic uppercase text-[10px] font-bold text-slate-500">
                            <Plus className="h-3 w-3" /> {doc.label}
                          </span>
                          <Badge variant="outline" className="text-[10px] bg-white">PDF/JPG</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Button className="w-full h-12 text-lg shadow-lg shadow-primary/20" onClick={() => setIsPreviewFormOpen(false)}>
              {content.apply_button_text || 'Apply Now'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
