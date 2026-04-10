import React, { useEffect, useState } from 'react';
import { useParams, Link, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { School, User, CalendarEvent } from '@shared/api';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, BookOpen, Users, Calendar, MapPin, Phone, Mail, Clock, Award, CheckCircle2, User as UserIcon, Globe, Facebook, Twitter, Instagram, Linkedin, FileText, Upload, Plus, ArrowRight, User as AuthorIcon, Briefcase } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  cover_image_url?: string;
  published_at: string;
  profiles?: {
    full_name: string;
  };
}

interface Tender {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: string;
  requirements?: any;
}

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

export default function SchoolWebsite() {
  const { slug } = useParams<{ slug: string }>();
  const basePath = `/${slug}`;
  const [school, setSchool] = useState<School | null>(null);
  const [websiteContent, setWebsiteContent] = useState<WebsiteContent | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Application State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    grade: '',
    previousSchool: '',
    guardianName: '',
    guardianPhone: '',
    dynamicFields: {} as Record<string, string>,
    documents: {} as Record<string, File | null>
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Fetch school details by slug
    const fetchSchool = async () => {
      try {
        // Try Supabase first if connected
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .eq('slug', slug)
          .single();

        if (data && !error) {
          setSchool(data as any); // Cast to match Shared School type
        } else {
           setSchool(null);
        }
      } catch (error) {
        console.error('Error fetching school:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchEvents = async () => {
      try {
        const res = await fetch(`/api/school/public-events?schoolSlug=${slug}`);
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    const fetchWebsiteContent = async () => {
      try {
        const res = await fetch(`/api/school/public-website-content?schoolSlug=${slug}`);
        if (res.ok) {
          const data = await res.json();
          setWebsiteContent(data);
        }
      } catch (error) {
        console.error('Error fetching website content:', error);
      }
    };

    const fetchBlogPosts = async () => {
      try {
        const res = await fetch(`/api/school/public-blog-posts?schoolSlug=${slug}`);
        if (res.ok) {
          const data = await res.json();
          setBlogPosts(data);
        }
      } catch (error) {
        console.error('Error fetching blog posts:', error);
      }
    };

    const fetchTenders = async () => {
      try {
        const res = await fetch(`/api/school/public-tenders?schoolSlug=${slug}`);
        if (res.ok) {
          const data = await res.json();
          setTenders(data);
        }
      } catch (error) {
        console.error('Error fetching tenders:', error);
      }
    };

    fetchSchool();
    fetchEvents();
    fetchWebsiteContent();
    fetchBlogPosts();
    fetchTenders();
  }, [slug]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 1. Upload documents first
      const uploadedDocs: Record<string, string> = {};
      const docEntries = Object.entries(formData.documents);
      
      for (const [docName, file] of docEntries) {
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
          const filePath = `applications/${slug}/${fileName}`;
          
          const { data, error } = await supabase.storage
            .from('school-assets')
            .upload(filePath, file);
            
          if (error) throw error;
          
          const { data: { publicUrl } } = supabase.storage
            .from('school-assets')
            .getPublicUrl(data.path);
            
          uploadedDocs[docName] = publicUrl;
        }
      }

      // 2. Submit application
      const response = await fetch('/api/school/public-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          documents: uploadedDocs,
          schoolSlug: slug
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Application Submitted",
          description: "Thank you! Our admissions office will review your application and contact you soon.",
        });
        setFormData({ 
          name: '', email: '', phone: '', grade: '', 
          previousSchool: '', guardianName: '', guardianPhone: '',
          dynamicFields: {},
          documents: {}
        });
      } else {
        toast({
          title: "Application Failed",
          description: data.message || "Something went wrong.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-slate-500">Loading School Website...</p>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center space-y-4">
          <GraduationCap className="h-16 w-16 text-slate-300 mx-auto" />
          <h2 className="text-2xl font-bold text-slate-900">School Not Found</h2>
          <p className="text-slate-500">The school you are looking for does not exist or has been removed.</p>
          <Link to="/">
            <Button variant="outline">Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            {school.logo_url || school.logo ? (
              <img 
                src={school.logo_url || school.logo} 
                alt={`${school.name} Logo`} 
                className="h-10 w-10 object-contain"
              />
            ) : (
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-none">{school.name}</h1>
              <p className="text-xs text-slate-500 mt-1">Excellence in Education</p>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to={`${basePath}/#about`} className="text-slate-600 hover:text-primary transition-colors">About</Link>
            <Link to={`${basePath}/#academics`} className="text-slate-600 hover:text-primary transition-colors">Academics</Link>
            <Link to={`${basePath}/news`} className="text-slate-600 hover:text-primary transition-colors">News</Link>
            {tenders.length > 0 && <Link to={`${basePath}/tenders`} className="text-slate-600 hover:text-primary transition-colors">Tenders</Link>}
            <Link to={`${basePath}/#admissions`} className="text-slate-600 hover:text-primary transition-colors">Admissions</Link>
            <Link to={`${basePath}/#contact`} className="text-slate-600 hover:text-primary transition-colors">Contact</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="outline" size="sm">Portal Login</Button>
            </Link>
            <Link to="/#admissions">
              <Button size="sm" className="hidden sm:inline-flex">
                Apply Now
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <Routes>
          <Route index element={
            <>
              {/* Hero Section */}
              <section className="relative bg-slate-900 text-white py-24 lg:py-32 overflow-hidden">
                <div className="absolute inset-0 z-0">
                  <img 
                    src={websiteContent?.hero_image_url || "/images/herobg.jpg"} 
                    alt="School Campus" 
                    className="w-full h-full object-cover opacity-20"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
                </div>
                
                <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl mx-auto">
                  {websiteContent?.admissions_open !== false && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary-foreground text-sm font-medium mb-6 border border-primary/30">
                      <Award className="h-4 w-4" />
                      <span>{websiteContent?.admissions_title || "Admissions Open"} for {new Date().getFullYear() + 1} Academic Year</span>
                    </div>
                  )}
                  <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                    {websiteContent?.hero_title || `Welcome to ${school.name}`}
                  </h2>
                  <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                    {websiteContent?.hero_subtitle || "Empowering students to achieve academic excellence, character development, and lifelong success through innovative education."}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    {websiteContent?.admissions_open !== false && (
                      <Link to={`${basePath}/#admissions`}>
                        <Button size="lg" className="bg-primary hover:bg-primary/90 min-w-[160px]">
                          {websiteContent?.apply_button_text || "Apply Now"}
                        </Button>
                      </Link>
                    )}
                    <Link to={`${basePath}/#about`}>
                      <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white/10 min-w-[160px]">
                        Learn More
                      </Button>
                    </Link>
                    <Link to="/check-results">
                      <Button size="lg" variant="outline" className="bg-emerald-500/20 hover:bg-emerald-500/30 text-white border-emerald-500/40 min-w-[160px] gap-2">
                        <FileText className="h-5 w-5" />
                        Check Results
                      </Button>
                    </Link>
                  </div>
                </div>
              </section>

              {/* Stats Section */}
              <section className="py-12 bg-white border-b">
                <div className="container mx-auto px-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <div className="space-y-2">
                      <h3 className="text-4xl font-bold text-primary">{school.students || "500"}+</h3>
                      <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Students Enrolled</p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-4xl font-bold text-primary">50+</h3>
                      <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Expert Teachers</p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-4xl font-bold text-primary">100%</h3>
                      <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Pass Rate</p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-4xl font-bold text-primary">25+</h3>
                      <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Years of Excellence</p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="container mx-auto px-4 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2 space-y-16">
                    <section id="about" className="scroll-mt-24">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                          <Users className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">About Our School</h3>
                      </div>
                      <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
                        <div dangerouslySetInnerHTML={{ __html: websiteContent?.about_text || `
                          <p class="mb-4">
                            ${school.name} is a premier institution dedicated to fostering academic excellence and character development. 
                            Established with a vision to nurture future leaders, we provide a holistic education that balances academic rigor with co-curricular activities.
                          </p>
                          <p>
                            Our campus provides a safe and stimulating environment where every student is encouraged to explore their potential.
                            With state-of-the-art facilities and a team of dedicated educators, we ensure that learning is an engaging and transformative experience.
                          </p>
                        ` }} />
                        <div className="grid sm:grid-cols-2 gap-4 mt-8">
                          {['Modern Classrooms', 'Science Laboratories', 'Sports Complex', 'Digital Library', 'Art & Music Studios', 'Transport Facility'].map((feature) => (
                            <div key={feature} className="flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>

                    <section id="academics" className="scroll-mt-24">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                          <BookOpen className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">Academic Programs</h3>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                          <CardHeader>
                            <CardTitle className="text-lg">Sciences & Technology</CardTitle>
                          </CardHeader>
                          <CardContent className="text-slate-600">
                            Comprehensive curriculum covering Physics, Chemistry, Biology, and Computer Science with hands-on laboratory experience.
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
                          <CardHeader>
                            <CardTitle className="text-lg">Arts & Humanities</CardTitle>
                          </CardHeader>
                          <CardContent className="text-slate-600">
                            Rich programs in History, Literature, Languages, and Social Studies fostering critical thinking and creativity.
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                          <CardHeader>
                            <CardTitle className="text-lg">Commercial Studies</CardTitle>
                          </CardHeader>
                          <CardContent className="text-slate-600">
                            Practical education in Business Studies, Accounting, and Economics preparing students for the corporate world.
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
                          <CardHeader>
                            <CardTitle className="text-lg">Co-Curricular Activities</CardTitle>
                          </CardHeader>
                          <CardContent className="text-slate-600">
                            Diverse options including Sports, Music, Drama, Debate Club, and Community Service initiatives.
                          </CardContent>
                        </Card>
                      </div>
                    </section>

                    {/* News Preview on Home */}
                    {blogPosts.length > 0 && (
                      <section id="news" className="scroll-mt-24">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                              <FileText className="h-6 w-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">Latest News</h3>
                          </div>
                          <Link to={`${basePath}/news`}>
                             <Button variant="ghost" className="text-primary font-medium hover:bg-primary/5">
                               View All News <ArrowRight className="ml-2 h-4 w-4" />
                             </Button>
                           </Link>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-8">
                          {blogPosts.slice(0, 2).map((post) => (
                            <Card key={post.id} className="group overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white">
                              <div className="aspect-video relative overflow-hidden bg-slate-100">
                                {post.cover_image_url ? (
                                  <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                ) : (
                                  <div className="flex items-center justify-center h-full text-slate-300">
                                    <GraduationCap className="h-12 w-12 opacity-20" />
                                  </div>
                                )}
                              </div>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                                  {post.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pb-6">
                                <p className="text-slate-600 text-sm line-clamp-2 mb-4">
                                  {post.excerpt || 'Read the latest updates from our school.'}
                                </p>
                                <Link to={`${basePath}/news/${post.slug}`}>
                                  <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-white transition-all">
                                    Read More
                                  </Button>
                                </Link>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </section>
                    )}

                    <section id="contact" className="bg-slate-50 rounded-2xl p-8 border scroll-mt-24">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 bg-slate-200 rounded-lg flex items-center justify-center text-slate-700">
                          <MapPin className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">Contact Us</h3>
                      </div>
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <Mail className="h-5 w-5 text-primary mt-1" />
                            <div>
                              <p className="font-medium text-slate-900">Email</p>
                              <p className="text-slate-600">{websiteContent?.contact_email || school.email || `info@${school.slug || 'school'}.edu.zm`}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-primary mt-1" />
                            <div>
                              <p className="font-medium text-slate-900">Location</p>
                              <p className="text-slate-600">{websiteContent?.address || school.address || "123 Education Lane, Knowledge City, ZM"}</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <Phone className="h-5 w-5 text-primary mt-1" />
                            <div>
                              <p className="font-medium text-slate-900">Phone</p>
                              <p className="text-slate-600">{websiteContent?.contact_phone || school.phone || "+260 97 000 0000"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Clock className="h-5 w-5 text-primary mt-1" />
                            <div>
                              <p className="font-medium text-slate-900">Office Hours</p>
                              <p className="text-sm text-slate-600">Mon - Fri: 07:30 - 16:30</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="lg:col-span-1 space-y-8">
                    {/* Admissions Section */}
                    <Card id="admissions" className="scroll-mt-24 shadow-lg border-t-4 border-t-primary">
                      <CardHeader>
                        <CardTitle>{websiteContent?.admissions_title || "Admissions"}</CardTitle>
                        <CardDescription>{websiteContent?.admissions_text || "Apply now to join our institution."}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleApply} className="space-y-4">
                           <div className="space-y-2">
                             <Label htmlFor="name">Full Name</Label>
                             <Input id="name" placeholder="Student Name" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                           </div>
                           <div className="space-y-2">
                             <Label htmlFor="email">Email</Label>
                             <Input id="email" type="email" placeholder="Email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                           </div>
                           <Button type="submit" className="w-full" disabled={submitting}>
                             {submitting ? 'Submitting...' : 'Apply Now'}
                           </Button>
                        </form>
                      </CardContent>
                    </Card>

                    {/* Events Section */}
                    {events.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Upcoming Events
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {events.slice(0, 3).map((event) => (
                            <div key={event.id} className="flex gap-3 border-b pb-3 last:border-0 last:pb-0 font-sans">
                              <div className="bg-primary/10 rounded flex flex-col items-center justify-center h-12 w-12 shrink-0">
                                <span className="text-[10px] uppercase font-bold text-primary">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                                <span className="text-lg font-bold leading-none">{new Date(event.date).getDate()}</span>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold line-clamp-1">{event.title}</h4>
                                <p className="text-xs text-muted-foreground line-clamp-1">{event.time}</p>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            </>
          } />

          {/* News List Page */}
          <Route path="news" element={
            <div className="container mx-auto px-4 py-12">
              <div className="mb-12">
                <nav className="flex mb-4 text-sm text-slate-500 gap-2 items-center">
                  <Link to="/" className="hover:text-primary">Home</Link>
                  <span>/</span>
                  <span className="text-slate-900 font-medium">News</span>
                </nav>
                <h2 className="text-4xl font-bold text-slate-900 mb-4">Latest News & Updates</h2>
                <p className="text-lg text-slate-600 max-w-2xl">
                  Stay updated with the latest happenings, academic achievements, and community stories from {school.name}.
                </p>
              </div>

              {blogPosts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border flex flex-col items-center gap-4">
                  <FileText className="h-12 w-12 text-slate-200" />
                  <p className="text-slate-500">No news articles published yet.</p>
                  <Link to="/">
                    <Button variant="outline">Back to Home</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {blogPosts.map((post) => (
                    <Card key={post.id} className="group overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white flex flex-col">
                      <div className="aspect-video relative overflow-hidden bg-slate-100">
                        {post.cover_image_url ? (
                          <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-300">
                            <GraduationCap className="h-12 w-12 opacity-20" />
                          </div>
                        )}
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-white/90 text-slate-900 backdrop-blur-sm">
                            {new Date(post.published_at).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                      <CardHeader className="flex-grow">
                        <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2">
                          {post.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                          <AuthorIcon className="h-3 w-3" />
                          <span>{post.profiles?.full_name || 'School Admin'}</span>
                        </div>
                        <p className="text-slate-600 text-sm line-clamp-3 mt-4">
                          {post.excerpt || 'Click to read the full article and stay updated.'}
                        </p>
                      </CardHeader>
                      <CardFooter className="pt-0 pb-6">
                        <Link to={`${basePath}/news/${post.slug}`} className="w-full">
                          <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-white transition-all">
                            Read Full Article
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          } />

          {/* Tenders Page */}
          <Route path="tenders" element={
            <div className="container mx-auto px-4 py-12">
              <div className="mb-12">
                <nav className="flex mb-4 text-sm text-slate-500 gap-2 items-center">
                  <Link to="/" className="hover:text-primary">Home</Link>
                  <span>/</span>
                  <span className="text-slate-900 font-medium">Tenders</span>
                </nav>
                <h2 className="text-4xl font-bold text-slate-900 mb-4">Supply Tenders & Opportunities</h2>
                <p className="text-lg text-slate-600 max-w-2xl">
                  View open procurement notices and supply opportunities for {school.name}.
                </p>
              </div>

              {tenders.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border flex flex-col items-center gap-4">
                  <Briefcase className="h-12 w-12 text-slate-200" />
                  <p className="text-slate-500">No active tenders at this time.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-8">
                  {tenders.map((tender) => (
                    <Card key={tender.id} className="border-none shadow-md bg-white overflow-hidden group">
                      <CardHeader className="bg-slate-50 border-b">
                         <div className="flex justify-between items-start">
                            <CardTitle className="text-xl group-hover:text-primary transition-colors">{tender.title}</CardTitle>
                            <Badge className={tender.status === 'Open' ? 'bg-emerald-500' : 'bg-slate-500'}>
                               {tender.status}
                            </Badge>
                         </div>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <p className="text-slate-600 text-sm mb-6 line-clamp-3">
                           {tender.description}
                        </p>
                        <div className="space-y-3">
                           <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Calendar className="h-4 w-4" />
                              <span className="font-semibold">Deadline:</span>
                              <span>{new Date(tender.deadline).toLocaleDateString()}</span>
                           </div>
                           <div className="flex items-center gap-2 text-sm text-slate-500">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="font-semibold">ID:</span>
                              <span className="font-mono">{tender.id.slice(0, 8)}</span>
                           </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-slate-50 border-t py-4">
                         <Button className="w-full">Download Tender Documents</Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          } />

          {/* News Detail Page */}
          <Route path="news/:postSlug" element={<NewsDetailRoute blogPosts={blogPosts} school={school} />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                {school.logo_url || school.logo ? (
                  <img src={school.logo_url || school.logo} alt={school.name} className="h-10 w-10 object-contain bg-white rounded p-1" />
                ) : (
                  <GraduationCap className="h-8 w-8 text-primary" />
                )}
                <span className="text-xl font-bold text-white">{school.name}</span>
              </div>
              <p className="mb-4 max-w-sm">Nurturing excellence and integrity in every student.</p>
              <div className="flex gap-4">
                {websiteContent?.facebook_url && <a href={websiteContent.facebook_url} className="hover:text-white"><Facebook className="h-5 w-5" /></a>}
                {websiteContent?.twitter_url && <a href={websiteContent.twitter_url} className="hover:text-white"><Twitter className="h-5 w-5" /></a>}
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Navigation</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to={`${basePath}/#about`} className="hover:text-white">About Us</Link></li>
                <li><Link to={`${basePath}/news`} className="hover:text-white">Latest News</Link></li>
                <li><Link to={`${basePath}/#admissions`} className="hover:text-white">Admissions</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Contact</h4>
              <p className="text-sm">{websiteContent?.contact_email || school.email}</p>
              <p className="text-sm">{websiteContent?.contact_phone || school.phone}</p>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} {school.name}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Sub-component for News Detail view to use hooks
function NewsDetailRoute({ blogPosts, school }: { blogPosts: BlogPost[], school: School }) {
  const { postSlug } = useParams<{ postSlug: string }>();
  const post = blogPosts.find(p => p.slug === postSlug);
  const navigate = useNavigate();

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Post Not Found</h2>
        <Button onClick={() => navigate('/news')}>Back to News</Button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <nav className="flex mb-8 text-sm text-slate-500 gap-2 items-center">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <Link to="/news" className="hover:text-primary">News</Link>
          <span>/</span>
          <span className="text-slate-900 font-medium line-clamp-1">{post.title}</span>
        </nav>

        <article>
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl mb-12 shadow-xl ring-1 ring-slate-200">
            {post.cover_image_url ? (
              <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full bg-slate-50 text-slate-300">
                <GraduationCap className="h-20 w-20 opacity-20" />
              </div>
            )}
          </div>

          <header className="mb-12">
            <Badge className="mb-4 bg-primary text-white border-none py-1 px-3">
              {new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-slate-600">
               <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                 <AuthorIcon className="h-6 w-6" />
               </div>
               <div>
                 <p className="text-sm font-semibold text-slate-900">{post.profiles?.full_name || 'School Staff'}</p>
                 <p className="text-xs uppercase tracking-wider font-medium opacity-70">Published by {school.name}</p>
               </div>
            </div>
          </header>

          <div 
            className="prose prose-slate max-w-none text-slate-600 leading-relaxed text-lg
              prose-headings:text-slate-900 prose-headings:font-bold prose-headings:mt-8 prose-headings:mb-4
              prose-p:mb-6 prose-li:mb-2 prose-img:rounded-2xl prose-img:shadow-lg"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <div className="mt-16 pt-12 border-t border-slate-100">
            <Button variant="outline" onClick={() => navigate('/news')} className="gap-2">
              <ArrowRight className="h-4 w-4 rotate-180" /> Back to All News
            </Button>
          </div>
        </article>
      </div>
    </div>
  );
}