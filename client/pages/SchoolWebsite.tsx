import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { School, User, CalendarEvent } from '@shared/api';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, BookOpen, Users, Calendar, MapPin, Phone, Mail, Clock, Award, CheckCircle2, User as UserIcon, Globe, Facebook, Twitter, Instagram, Linkedin, FileText, Upload, Plus } from 'lucide-react';

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
  const [school, setSchool] = useState<School | null>(null);
  const [websiteContent, setWebsiteContent] = useState<WebsiteContent | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
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

    fetchSchool();
    fetchEvents();
    fetchWebsiteContent();
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
          <div className="flex items-center gap-3">
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
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#about" className="text-slate-600 hover:text-primary transition-colors">About</a>
            <a href="#academics" className="text-slate-600 hover:text-primary transition-colors">Academics</a>
            <a href="#admissions" className="text-slate-600 hover:text-primary transition-colors">Admissions</a>
            <a href="#contact" className="text-slate-600 hover:text-primary transition-colors">Contact</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="outline" size="sm">Portal Login</Button>
            </Link>
            <Button size="sm" className="hidden sm:inline-flex" onClick={() => document.getElementById('admissions')?.scrollIntoView({ behavior: 'smooth' })}>
              Apply Now
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow">
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
                <Button size="lg" className="bg-primary hover:bg-primary/90 min-w-[160px]" onClick={() => document.getElementById('admissions')?.scrollIntoView({ behavior: 'smooth' })}>
                  {websiteContent?.apply_button_text || "Apply Now"}
                </Button>
              )}
              <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white/10 min-w-[160px]" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>
                Learn More
              </Button>
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

        {/* Main Content Grid */}
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* Left Column: Info */}
            <div className="lg:col-span-2 space-y-16">
              {/* About Section */}
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

              {/* Academics Section */}
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

              {/* Contact Info (Embedded) */}
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
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <p className="font-medium text-slate-900">Location</p>
                        <p className="text-slate-600">{websiteContent?.address || school.address || "123 Education Lane, Knowledge City, ZM"}</p>
                      </div>
                    </div>
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
                        <p className="text-slate-600">Monday - Friday: 07:30 - 16:30</p>
                        <p className="text-slate-600">Saturday: 08:00 - 12:00</p>
                        <p className="text-slate-600">Sunday: Closed</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Admissions & Events */}
            <div className="lg:col-span-1 space-y-8">
              {/* Admissions Form */}
              {websiteContent?.admissions_open === false ? (
                <Card id="admissions" className="scroll-mt-24 shadow-lg border-t-4 border-t-slate-300">
                  <CardHeader className="text-center p-8">
                    <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <CardTitle>Admissions Closed</CardTitle>
                    <CardDescription>
                      Applications are currently closed. Please check back later or contact the admissions office for more information.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <Card id="admissions" className="scroll-mt-24 shadow-lg border-t-4 border-t-primary sticky top-24">
                  <CardHeader>
                    <CardTitle>{websiteContent?.admissions_title || "Online Admission"}</CardTitle>
                    <CardDescription>
                      {websiteContent?.admissions_text || `Apply for the ${new Date().getFullYear() + 1} academic year.`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleApply} className="space-y-4">
                      {/* Standard Fields */}
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input 
                          id="name" 
                          placeholder="Student's Name" 
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          required
                          className="bg-slate-50"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input 
                            id="email" 
                            type="email" 
                            placeholder="student@example.com" 
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            required
                            className="bg-slate-50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input 
                            id="phone" 
                            placeholder="+260..." 
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            className="bg-slate-50"
                          />
                        </div>
                      </div>

                      {/* Dynamic Form Fields */}
                      {(websiteContent?.admission_form_fields || []).map((field) => (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={field.name}>{field.label} {field.required && <span className="text-rose-500">*</span>}</Label>
                          <Input 
                            id={field.name}
                            type={field.type}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            required={field.required}
                            value={formData.dynamicFields[field.name] || ''}
                            onChange={(e) => setFormData({
                              ...formData, 
                              dynamicFields: { ...formData.dynamicFields, [field.name]: e.target.value }
                            })}
                            className="bg-slate-50"
                          />
                        </div>
                      ))}

                      {/* Document Uploads */}
                      {(websiteContent?.admission_required_documents || []).length > 0 && (
                        <div className="space-y-4 pt-4 border-t">
                          <Label className="flex items-center gap-2 font-bold mb-2">
                            <Upload className="h-4 w-4" /> Required Documents
                          </Label>
                          <div className="grid gap-3">
                            {(websiteContent?.admission_required_documents || []).map((doc) => (
                              <div key={doc.id} className="space-y-1.5 p-3 rounded-lg border bg-slate-50">
                                <Label htmlFor={`doc-${doc.id}`} className="text-xs font-medium">
                                  {doc.label} {doc.required && <span className="text-rose-500">*</span>}
                                </Label>
                                <div className="flex items-center gap-2">
                                  <Input 
                                    id={`doc-${doc.id}`}
                                    type="file"
                                    required={doc.required}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      documents: { ...formData.documents, [doc.name]: e.target.files?.[0] || null }
                                    })}
                                    className="h-8 text-[10px] file:text-[10px] file:px-2 file:h-6"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Submitting...
                          </>
                        ) : (
                          websiteContent?.apply_button_text || "Submit Application"
                        )}
                      </Button>
                      <p className="text-xs text-center text-slate-500 mt-4">
                        By applying, you agree to our Terms of Service and Privacy Policy.
                      </p>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Events Section */}
              {events.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Upcoming Events</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {events.map((event) => (
                      <div key={event.id} className="flex gap-3 border-b pb-3 last:border-0 last:pb-0">
                        <div className="bg-slate-100 rounded-lg p-2 text-center min-w-[60px]">
                          <span className="block text-xs text-slate-500 font-bold uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                          <span className="block text-xl font-bold text-slate-900">{new Date(event.date).getDate()}</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900 text-sm">{event.title}</h4>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{event.description}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            <span>{event.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Need Help?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 space-y-2">
                  <p>For admissions inquiries, please contact our admissions office:</p>
                  <p className="font-medium text-primary">{websiteContent?.contact_email || school.email || "admissions@school.edu"}</p>
                  <p className="font-medium text-primary">{websiteContent?.contact_phone || school.phone || "+260 97 000 0000"}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                {school.logo_url || school.logo ? (
                  <img 
                    src={school.logo_url || school.logo} 
                    alt={`${school.name} Logo`} 
                    className="h-10 w-10 object-contain bg-white rounded-lg p-1"
                  />
                ) : (
                  <GraduationCap className="h-8 w-8 text-primary" />
                )}
                <span className="text-xl font-bold text-white">{school.name}</span>
              </div>
              <p className="mb-4 max-w-sm">
                Dedicated to providing quality education and fostering an environment of academic excellence.
              </p>
              <div className="flex gap-4">
                {websiteContent?.facebook_url && (
                  <a href={websiteContent.facebook_url} target="_blank" rel="noopener noreferrer" className="h-8 w-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer">
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {websiteContent?.twitter_url && (
                  <a href={websiteContent.twitter_url} target="_blank" rel="noopener noreferrer" className="h-8 w-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer">
                    <Twitter className="h-4 w-4" />
                  </a>
                )}
                {websiteContent?.instagram_url && (
                  <a href={websiteContent.instagram_url} target="_blank" rel="noopener noreferrer" className="h-8 w-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer">
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {websiteContent?.linkedin_url && (
                  <a href={websiteContent.linkedin_url} target="_blank" rel="noopener noreferrer" className="h-8 w-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer">
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#about" className="hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#academics" className="hover:text-primary transition-colors">Academics</a></li>
                <li><a href="#admissions" className="hover:text-primary transition-colors">Admissions</a></li>
                <li><Link to="/login" className="hover:text-primary transition-colors">Portal Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>{websiteContent?.address || school.address || "123 Education Lane, Knowledge City"}</li>
                <li>{websiteContent?.contact_phone || school.phone || "+260 97 000 0000"}</li>
                <li>{websiteContent?.contact_email || school.email || "info@school.edu"}</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} {school.name}. All rights reserved.</p>
            <p className="mt-2 text-slate-600">Powered by MUCHI School Management System</p>
          </div>
        </div>
      </footer>
    </div>
  );
}