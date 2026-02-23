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
import { GraduationCap, BookOpen, Users, Calendar, MapPin, Phone, Mail, Clock, Award, CheckCircle2, User as UserIcon, Globe } from 'lucide-react';

export default function SchoolWebsite() {
  const { slug } = useParams<{ slug: string }>();
  const [school, setSchool] = useState<School | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Registration State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    grade: '',
  });
  const [registering, setRegistering] = useState(false);

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

    fetchSchool();
    fetchEvents();
  }, [slug]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);

    try {
      const response = await fetch('/api/school/public-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          schoolSlug: slug
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Registration Successful",
          description: "Welcome! You can now log in to the student portal.",
        });
        setFormData({ name: '', email: '', password: '', grade: '' });
      } else {
        toast({
          title: "Registration Failed",
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
      setRegistering(false);
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
              src="/images/herobg.jpg" 
              alt="School Campus" 
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
          </div>
          
          <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary-foreground text-sm font-medium mb-6 border border-primary/30">
              <Award className="h-4 w-4" />
              <span>Admissions Open for {new Date().getFullYear() + 1} Academic Year</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Welcome to <span className="text-primary">{school.name}</span>
            </h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Empowering students to achieve academic excellence, character development, and lifelong success through innovative education.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 min-w-[160px]" onClick={() => document.getElementById('admissions')?.scrollIntoView({ behavior: 'smooth' })}>
                Apply Now
              </Button>
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
                  <p className="mb-4">
                    {school.name} is a premier institution dedicated to fostering academic excellence and character development. 
                    Established with a vision to nurture future leaders, we provide a holistic education that balances academic rigor with co-curricular activities.
                  </p>
                  <p>
                    Our campus provides a safe and stimulating environment where every student is encouraged to explore their potential.
                    With state-of-the-art facilities and a team of dedicated educators, we ensure that learning is an engaging and transformative experience.
                  </p>
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
                      <MapPin className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <p className="font-medium text-slate-900">Address</p>
                        <p className="text-slate-600">{school.address || "123 Education Lane, Knowledge City, ZM"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <p className="font-medium text-slate-900">Phone</p>
                        <p className="text-slate-600">{school.phone || "+260 97 000 0000"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <p className="font-medium text-slate-900">Email</p>
                        <p className="text-slate-600">{school.email || `info@${school.slug || 'school'}.edu.zm`}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
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
              <Card id="admissions" className="scroll-mt-24 shadow-lg border-t-4 border-t-primary sticky top-24">
                <CardHeader>
                  <CardTitle>Online Admission</CardTitle>
                  <CardDescription>
                    Apply for the {new Date().getFullYear() + 1} academic year.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
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
                      <Label htmlFor="grade">Applying For Grade</Label>
                      <select 
                        id="grade"
                        className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.grade}
                        onChange={(e) => setFormData({...formData, grade: e.target.value})}
                        required
                      >
                        <option value="">Select Grade</option>
                        <option value="Grade 8">Grade 8</option>
                        <option value="Grade 9">Grade 9</option>
                        <option value="Grade 10">Grade 10</option>
                        <option value="Grade 11">Grade 11</option>
                        <option value="Grade 12">Grade 12</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Create Password</Label>
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••" 
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required
                        className="bg-slate-50"
                      />
                    </div>
                    <Button type="submit" className="w-full" size="lg" disabled={registering}>
                      {registering ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Registering...
                        </>
                      ) : (
                        "Submit Application"
                      )}
                    </Button>
                    <p className="text-xs text-center text-slate-500 mt-4">
                      By registering, you agree to our Terms of Service and Privacy Policy.
                    </p>
                  </form>
                </CardContent>
              </Card>

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
                  <p className="font-medium text-primary">{school.email || "admissions@school.edu"}</p>
                  <p className="font-medium text-primary">{school.phone || "+260 97 000 0000"}</p>
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
                {/* Social Icons Placeholder */}
                <div className="h-8 w-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer">
                  <Globe className="h-4 w-4" />
                </div>
                <div className="h-8 w-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="h-8 w-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer">
                  <Phone className="h-4 w-4" />
                </div>
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
                <li>{school.address || "123 Education Lane, Knowledge City"}</li>
                <li>{school.phone || "+260 97 000 0000"}</li>
                <li>{school.email || "info@school.edu"}</li>
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