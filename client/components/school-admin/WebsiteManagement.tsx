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
  MapPin
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

export default function WebsiteManagement() {
  const [activeTab, setActiveTab] = useState("content");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState<WebsiteContent>({});
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const { toast } = useToast();

  // Blog Post Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { 'Authorization': `Bearer ${session.access_token}` };

      const [contentRes, postsRes] = await Promise.all([
        fetch('/api/school/website-content', { headers }),
        fetch('/api/school/blog-posts', { headers })
      ]);

      if (contentRes.ok) setContent(await contentRes.json());
      if (postsRes.ok) setPosts(await postsRes.json());
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
      setIsEditorOpen(false);
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

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Website Management</h2>
          <p className="text-muted-foreground text-lg">Manage your school's public presence and blog.</p>
        </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hero_title">Headline</Label>
                    <Input 
                      id="hero_title" 
                      value={content.hero_title || ''} 
                      onChange={e => setContent({...content, hero_title: e.target.value})}
                      placeholder="e.g. Empowering Future Leaders"
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hero_image_url">Hero Image URL</Label>
                    <Input 
                      id="hero_image_url" 
                      value={content.hero_image_url || ''} 
                      onChange={e => setContent({...content, hero_image_url: e.target.value})}
                      placeholder="https://..."
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="hero_subtitle">Sub-headline</Label>
                    <Input 
                      id="hero_subtitle" 
                      value={content.hero_subtitle || ''} 
                      onChange={e => setContent({...content, hero_subtitle: e.target.value})}
                      placeholder="e.g. Exceptional education for the modern world."
                      className="bg-white dark:bg-slate-800"
                    />
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
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Blog Posts</h3>
            <Button onClick={() => {
              setEditingPost({ status: 'Draft' });
              setIsEditorOpen(true);
            }} className="shadow-md hover:shadow-lg transition-all">
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
                <Button variant="outline" onClick={() => setIsEditorOpen(true)}>Create First Post</Button>
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
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditingPost(post);
                        setIsEditorOpen(true);
                      }} className="hover:text-primary transition-colors">
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
        </TabsContent>
      </Tabs>

      {/* Blog Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost?.id ? 'Edit Blog Post' : 'Create New Post'}</DialogTitle>
            <DialogDescription>
              Write and customize your school's blog article.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="post-title" className="text-right font-bold">Title</Label>
              <Input
                id="post-title"
                value={editingPost?.title || ''}
                onChange={e => setEditingPost({...editingPost, title: e.target.value})}
                className="col-span-3"
                placeholder="Enter article headline"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="post-status" className="text-right font-bold">Status</Label>
              <Select 
                value={editingPost?.status} 
                onValueChange={(val: any) => setEditingPost({...editingPost, status: val})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="post-image" className="text-right font-bold">Cover URL</Label>
              <Input
                id="post-image"
                value={editingPost?.cover_image_url || ''}
                onChange={e => setEditingPost({...editingPost, cover_image_url: e.target.value})}
                className="col-span-3"
                placeholder="Paste cover image link"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="post-excerpt" className="text-right font-bold">Excerpt</Label>
              <Input
                id="post-excerpt"
                value={editingPost?.excerpt || ''}
                onChange={e => setEditingPost({...editingPost, excerpt: e.target.value})}
                className="col-span-3"
                placeholder="Short summary for the list view"
              />
            </div>

            <div className="space-y-4">
              <Label htmlFor="post-content" className="font-bold">Article Content</Label>
              <Textarea
                id="post-content"
                value={editingPost?.content || ''}
                onChange={e => setEditingPost({...editingPost, content: e.target.value})}
                className="min-h-[300px] font-serif text-lg leading-relaxed p-6"
                placeholder="Start writing your story here..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
            <Button onClick={handlePostSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPost?.id ? 'Update Post' : 'Publish Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
