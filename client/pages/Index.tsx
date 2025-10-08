import { GraduationCap, Users, FileText, Search, BookOpen, Globe, QrCode, UserCheck, Menu, School, Calendar, BarChart3, DollarSign } from 'lucide-react';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/navigation/ThemeToggle";
import { useState } from 'react';

import Chatbot from '@/components/Landing/Chatbot';
import DemoModal from '@/components/Landing/DemoModal';

export default function Index() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Chatbot />
      <DemoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <header className="sticky top-0 border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 z-50 shadow-sm">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <Link to="/" className="flex items-center gap-2">
            <School className="h-10 w-10 text-primary" />
            <div>
              <span className="text-2xl font-bold">MUCHI</span>
              <p className="text-xs text-muted-foreground">School Management Information System</p>
          </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-base font-medium">
            <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</a>
            <a href="#benefits" className="text-muted-foreground hover:text-primary transition-colors">Benefits</a>
            <a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-primary transition-colors">Testimonials</a>
            <a href="#faq" className="text-muted-foreground hover:text-primary transition-colors">FAQ</a>
            <a href="#contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</a>
            
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" className="font-medium">
                <Link to="/dashboard">Free Trial</Link>
              </Button>
              <Button asChild variant="default" className="rounded-full font-medium">
                <Link to="/login">Sign In</Link>
              </Button>
              <ThemeToggle />
            </div>
          </nav>
          
          {/* Mobile Navigation */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Button asChild variant="default" className="rounded-full">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button variant="ghost" onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
        
        {isMenuOpen && (
          <div className="md:hidden bg-background border-t">
            <nav className="flex flex-col gap-4 p-4">
              <a href="#features" className="text-muted-foreground hover:text-primary transition-colors py-2">Features</a>
              <a href="#benefits" className="text-muted-foreground hover:text-primary transition-colors py-2">Benefits</a>
              <a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors py-2">Pricing</a>
              <a href="#testimonials" className="text-muted-foreground hover:text-primary transition-colors py-2">Testimonials</a>
              <a href="#faq" className="text-muted-foreground hover:text-primary transition-colors py-2">FAQ</a>
              <a href="#contact" className="text-muted-foreground hover:text-primary transition-colors py-2">Contact</a>
              <Button asChild variant="outline" className="mt-2 font-medium">
                <Link to="/register">Free Trial</Link>
              </Button>
            </nav>
          </div>
        )}
      </header>

      <section id="hero" className="relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/classroom.jpg')" }}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-purple-900/50 to-green-900/30 backdrop-blur-sm"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20"></div>
          <div className="container mx-auto relative min-h-[70vh] sm:min-h-[78vh] flex items-center justify-center px-4 z-10">
            <div className="text-center text-white max-w-4xl animate-fade-in">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tighter bg-gradient-to-r from-white via-blue-100 to-green-100 bg-clip-text text-transparent drop-shadow-2xl">
                Transform Your School Management
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-gray-100 drop-shadow-lg font-medium">
                MUCHI provides a comprehensive digital platform for schools to streamline student information, academic management, attendance tracking, and financial operations - all in one secure system.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="text-lg px-8 py-6 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all">
                  <Link to="/dashboard" className="flex items-center gap-2">Start Free Trial <GraduationCap className="ml-2" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-full bg-white/10 hover:bg-white/20 text-white border-white/30 shadow-lg hover:shadow-xl transition-all">
                  <a href="#pricing" className="flex items-center gap-2">View Pricing <FileText className="ml-2" /></a>
                </Button>
              </div>

          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 text-center">
            <div className="p-4 rounded-lg transition-all duration-300">
              <h3 className="text-4xl font-bold text-primary">5,000+</h3>
              <p className="text-muted-foreground mt-2">Students Managed</p>
            </div>
            <div className="p-4 rounded-lg transition-all duration-300">
              <h3 className="text-4xl font-bold text-primary">250+</h3>
              <p className="text-muted-foreground mt-2">Schools Using MUCHI</p>
            </div>
            <div className="p-4 rounded-lg transition-all duration-300">
              <h3 className="text-4xl font-bold text-primary">98%</h3>
              <p className="text-muted-foreground mt-2">Reporting Accuracy</p>
            </div>
            <div className="p-4 rounded-lg transition-all duration-300">
              <h3 className="text-4xl font-bold text-primary">75%</h3>
              <p className="text-muted-foreground mt-2">Admin Time Saved</p>
            </div>
            <div className="p-4 rounded-lg transition-all duration-300">
              <h3 className="text-4xl font-bold text-primary">Same Day</h3>
              <p className="text-muted-foreground mt-2">Report Generation</p>
            </div>
            <div className="p-4 rounded-lg transition-all duration-300">
              <h3 className="text-4xl font-bold text-primary">24/7</h3>
              <p className="text-muted-foreground mt-2">System Access</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="py-20 bg-background" id="features">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Key Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mt-2 leading-relaxed">Powerful tools designed specifically for school management.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group relative text-center p-6 rounded-2xl border bg-card hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden transform hover:scale-105 hover:-translate-y-2">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary mx-auto mb-4 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                <FileText className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">Student Information System</h3>
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Comprehensive student records management with academic history, contact information, and performance tracking.</p>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl">
                <Button asChild className="shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                  <Link to="/student-information-system">Learn More</Link>
                </Button>
              </div>
            </div>
            <div className="group relative text-center p-6 rounded-2xl border bg-card hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden transform hover:scale-105 hover:-translate-y-2">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary mx-auto mb-4 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                <UserCheck className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">Attendance Tracking</h3>
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Automated attendance system with real-time tracking, reports, and parent notifications.</p>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl">
                <Button asChild className="shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                  <Link to="/attendance-tracking">Learn More</Link>
                </Button>
              </div>
            </div>
            <div className="group relative text-center p-6 rounded-2xl border bg-card hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden transform hover:scale-105 hover:-translate-y-2">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary mx-auto mb-4 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                <Calendar className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">Academic Management</h3>
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Complete curriculum planning, grading system, and academic performance analytics.</p>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl">
                <Button asChild className="shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                  <Link to="/academic-management">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Categories Section */}
      <section className="py-20 bg-background animate-fade-in" id="benefits">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Why Choose MUCHI</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mt-2 leading-relaxed">Experience the benefits that make MUCHI the preferred choice for school management systems.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Benefit 1 */}
              <div className="group relative text-center p-6 rounded-2xl border bg-card hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary mx-auto mb-4 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"></path><path d="m9 12 2 2 4-4"></path></svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">Time-Saving Automation</h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Reduce administrative workload by up to 75% with automated attendance, grading, and reporting systems.</p>
              </div>
            {/* Benefit 2 */}
              <div className="group relative text-center p-6 rounded-2xl border bg-card hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary mx-auto mb-4 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8"><path d="M20 7h-9"></path><path d="M14 17H5"></path><circle cx="17" cy="17" r="3"></circle><circle cx="7" cy="7" r="3"></circle></svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">Seamless Integration</h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Easily connects with existing school systems and government reporting requirements including EMIS.</p>
              </div>
            {/* Benefit 3 */}
              <div className="group relative text-center p-6 rounded-2xl border bg-card hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary mx-auto mb-4 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8"><path d="M2 9V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1"></path><path d="M2 13h10"></path><path d="m9 16 3-3-3-3"></path></svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">Data-Driven Insights</h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Make informed decisions with comprehensive analytics and reporting on student performance and school operations.</p>
              </div>
            {/* Benefit 4 */}
              <div className="group relative text-center p-6 rounded-2xl border bg-card hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary mx-auto mb-4 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path><path d="m14.5 9-5 5"></path><path d="m9.5 9 5 5"></path></svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">Enhanced Security</h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Protect sensitive student data with enterprise-grade security features and role-based access controls.</p>
              </div>
            {/* Benefit 5 */}
              <div className="group relative text-center p-6 rounded-2xl border bg-card hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary mx-auto mb-4 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">Parent Engagement</h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Improve communication between schools and families with dedicated parent portals and real-time updates.</p>
              </div>
            {/* Benefit 6 */}
              <div className="group relative text-center p-6 rounded-2xl border bg-card hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary mx-auto mb-4 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8"><path d="M12 16c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6z"></path><path d="M12 16v6"></path><path d="M12 22h6"></path><path d="M18 16a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2"></path></svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">Scalable Solution</h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Grows with your institution from a single school to a multi-campus network without performance degradation.</p>
              </div>
          </div>
        </div>
      </section>
      <section className="py-20 bg-background animate-fade-in" id="services">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">School Management Modules</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mt-2 leading-relaxed">A comprehensive suite of tools designed to streamline every aspect of school administration.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-8">
            {/* Category 1 */}
              <div className="group relative text-center p-6 rounded-2xl border bg-card hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden transform hover:scale-105 hover:-translate-y-2">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary mx-auto mb-4 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                  <UserCheck className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">Student Records</h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Comprehensive student information management with academic history tracking.</p>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl">
                  <Button asChild className="shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                    <Link to="/student-information-system">Explore</Link>
                  </Button>
                </div>
              </div>
            {/* Category 2 */}
              <div className="group relative text-center p-6 rounded-2xl border bg-card hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden transform hover:scale-105 hover:-translate-y-2">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary mx-auto mb-4 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                  <Users className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">Staff Management</h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Track teacher qualifications, assignments, and performance evaluations.</p>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl">
                  <Button asChild className="shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                    <Link to="/staff-management">Explore</Link>
                  </Button>
                </div>
              </div>
            {/* Category 3 */}
              <div className="group relative text-center p-6 rounded-2xl border bg-card hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden transform hover:scale-105 hover:-translate-y-2">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary mx-auto mb-4 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                  <Users className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">Parent Portal</h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Engage parents with real-time access to student progress, attendance, and school communications.</p>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl">
                  <Button asChild className="shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                    <Link to="/parent-portal">Explore</Link>
                  </Button>
                </div>
              </div>
            {/* Category 4 */}
              <div className="group relative text-center p-6 rounded-2xl border bg-card hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden transform hover:scale-105 hover:-translate-y-2">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary mx-auto mb-4 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                  <BarChart3 className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">EMIS Integration</h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Export data to Education Management Information System for Ministry compliance.</p>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl">
                  <Button asChild className="shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                    <Link to="/emis-export">Explore</Link>
                  </Button>
                </div>
              </div>
            {/* Category 5 */}
              <div className="group relative text-center p-6 rounded-2xl border bg-card hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden transform hover:scale-105 hover:-translate-y-2">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary mx-auto mb-4 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                  <DollarSign className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">Finance Management</h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Track school fees, manage budgets, and generate financial reports.</p>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl">
                  <Button asChild className="shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                    <Link to="/finance-management">Explore</Link>
                  </Button>
                </div>
              </div>
            {/* Category 6 */}
            <div className="group relative text-center p-6 rounded-2xl border bg-card hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden transform hover:scale-105 hover:-translate-y-2">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary mx-auto mb-4 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                <BookOpen className="h-8 w-8 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">Library Management</h3>
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Catalog books, track loans, and manage digital resources for students.</p>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl">
                <Button asChild className="shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                  <Link to="/library-management">Explore</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-background" id="testimonials">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">What Schools Say About Us</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mt-2 leading-relaxed">Hear from educators who have transformed their school management with MUCHI</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Testimonial 1 */}
            <div className="bg-card p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  CM
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold">Chanda Mulenga</h4>
                  <p className="text-sm text-muted-foreground">Headteacher, Lusaka Secondary School</p>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex text-amber-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                </div>
              </div>
              <p className="text-sm italic">"MUCHI has revolutionized how we manage student data at our school in Lusaka. What used to take our staff hours now takes minutes. The parent portal has also dramatically improved our communication with families across Zambia."</p>
            </div>
            
            {/* Testimonial 2 */}
            <div className="bg-card p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  BN
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold">Bwalya Nkonde</h4>
                  <p className="text-sm text-muted-foreground">IT Manager, Kitwe Academy</p>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex text-amber-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                </div>
              </div>
              <p className="text-sm italic">"The Ministry of Education integration saved us countless hours of manual data entry. Implementation was smooth, and the support team was there every step of the way. I highly recommend MUCHI to any school in the Copperbelt Province."</p>
            </div>
            
            {/* Testimonial 3 */}
            <div className="bg-card p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  TM
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold">Thandiwe Mumba</h4>
                  <p className="text-sm text-muted-foreground">Administrator, Chipata Primary School</p>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex text-amber-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 opacity-40"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                </div>
              </div>
              <p className="text-sm italic">"As a small primary school in Eastern Province, we were worried about the cost and complexity of a new system. MUCHI's pricing in Kwacha was affordable, and the platform is intuitive enough that our entire staff was comfortable using it within days."</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-background" id="faq">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Frequently Asked Questions</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mt-2 leading-relaxed">Find answers to common questions about MUCHI School Management System</p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {/* FAQ Item 1 */}
            <div className="rounded-lg border bg-card">
              <div className="p-4 cursor-pointer">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">How long does implementation take?</h3>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m6 9 6 6 6-6"></path></svg>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Most schools are up and running within 2-4 weeks. Our implementation team will work with you to import your existing data, configure the system to your needs, and train your staff.
                </div>
              </div>
            </div>
            
            {/* FAQ Item 2 */}
            <div className="rounded-lg border bg-card">
              <div className="p-4 cursor-pointer">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Is my data secure with MUCHI?</h3>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m6 9 6 6 6-6"></path></svg>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Absolutely. We use industry-standard encryption and security practices to protect your data. Our system is compliant with major education data privacy regulations, and we never share your data with third parties without your explicit permission.
                </div>
              </div>
            </div>
            
            {/* FAQ Item 3 */}
            <div className="rounded-lg border bg-card">
              <div className="p-4 cursor-pointer">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Can MUCHI integrate with our existing systems?</h3>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m6 9 6 6 6-6"></path></svg>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Yes, MUCHI is designed to integrate with most common education systems, including EMIS platforms, financial software, and learning management systems. Our API allows for custom integrations as well.
                </div>
              </div>
            </div>
            
            {/* FAQ Item 4 */}
            <div className="rounded-lg border bg-card">
              <div className="p-4 cursor-pointer">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">What kind of support do you offer?</h3>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m6 9 6 6 6-6"></path></svg>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  All plans include email support with a 24-hour response time. Standard and Premium plans include phone support during business hours, and Premium plans include priority support with a dedicated account manager.
                </div>
              </div>
            </div>
            
            {/* FAQ Item 5 */}
            <div className="rounded-lg border bg-card">
              <div className="p-4 cursor-pointer">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Can we try MUCHI before committing?</h3>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m6 9 6 6 6-6"></path></svg>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Yes! We offer a 30-day free trial with full access to all features. No credit card required to start your trial.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-background/50" id="contact">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Get in Touch</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mt-2 leading-relaxed">Have questions or ready to transform your school management? Contact us today.</p>
          </div>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-card p-6 rounded-2xl border shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5 text-primary"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">+260 97 1234567</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5 text-primary"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">info@muchi.edu.zm</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5 text-primary"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <div>
                    <p className="font-medium">Office</p>
                    <p className="text-sm text-muted-foreground">45 Independence Avenue<br />Lusaka<br />Zambia</p>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <h4 className="font-medium mb-2">Follow Us</h4>
                <div className="flex space-x-4">
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                  </a>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
                  </a>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                  </a>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                  </a>
                </div>
              </div>
            </div>
            <div className="bg-card p-6 rounded-2xl border shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Send Us a Message</h3>
              <form className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
                  <input type="text" id="name" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" placeholder="Your name" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" id="email" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" placeholder="Your email" />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium mb-1">Subject</label>
                  <input type="text" id="subject" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" placeholder="Subject" />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-1">Message</label>
                  <textarea id="message" rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" placeholder="Your message"></textarea>
                </div>
                <Button className="w-full">Send Message</Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-background/50" id="pricing">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mt-2 leading-relaxed">Choose the plan that works best for your school's needs and budget</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Basic Plan */}
            <div className="relative rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg">
              <div className="absolute -top-5 left-0 right-0 mx-auto w-fit rounded-full bg-muted px-3 py-1 text-sm font-medium">
                Starter
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-xl font-semibold">Basic</h3>
                <div className="mt-4 flex items-baseline justify-center">
                  <span className="text-4xl font-bold">K2,475</span>
                  <span className="ml-1 text-muted-foreground">/month</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">For small schools just getting started</p>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 text-primary"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Up to 200 student records
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 text-primary"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Student Information System
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 text-primary"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Basic attendance tracking
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 text-primary"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Standard reports
                </li>
                <li className="flex items-center text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                  Parent portal
                </li>
                <li className="flex items-center text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                  Finance management
                </li>
              </ul>
              <Button className="mt-6 w-full" asChild>
                <Link to="/register">Start Free Trial</Link>
              </Button>
            </div>

            {/* Standard Plan */}
            <div className="relative rounded-2xl border bg-primary/5 p-6 shadow-md transition-all duration-300 hover:shadow-xl">
              <div className="absolute -top-5 left-0 right-0 mx-auto w-fit rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
                Most Popular
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-xl font-semibold">Standard</h3>
                <div className="mt-4 flex items-baseline justify-center">
                  <span className="text-4xl font-bold">K6,225</span>
                  <span className="ml-1 text-muted-foreground">/month</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">For growing schools with additional needs</p>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 text-primary"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Up to 500 student records
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 text-primary"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  All Basic features
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 text-primary"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Advanced attendance tracking
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 text-primary"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Parent portal
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 text-primary"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Basic finance management
                </li>
                <li className="flex items-center text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                  EMIS integration
                </li>
              </ul>
              <Button className="mt-6 w-full" asChild>
                <Link to="/register">Start Free Trial</Link>
              </Button>
            </div>

            {/* Premium Plan */}
            <div className="relative rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg">
              <div className="absolute -top-5 left-0 right-0 mx-auto w-fit rounded-full bg-muted px-3 py-1 text-sm font-medium">
                Enterprise
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-xl font-semibold">Premium</h3>
                <div className="mt-4 flex items-baseline justify-center">
                  <span className="text-4xl font-bold">K12,475</span>
                  <span className="ml-1 text-muted-foreground">/month</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">For large schools with comprehensive needs</p>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 text-primary"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Unlimited student records
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 text-primary"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  All Standard features
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 text-primary"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Full finance management
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 text-primary"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  EMIS integration
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 text-primary"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Library management
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 text-primary"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Priority support
                </li>
              </ul>
              <Button className="mt-6 w-full" asChild>
                <Link to="/register">Start Free Trial</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>









      <footer className="bg-gradient-to-br from-muted/50 to-muted/30 border-t border-border/50">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">About School Services</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/about" className="hover:text-primary transition-colors duration-300">About MUCHI</Link></li>
                <li><Link to="/mission" className="hover:text-primary transition-colors duration-300">Our Mission</Link></li>
                <li><Link to="/leadership" className="hover:text-primary transition-colors duration-300">School Leadership</Link></li>
                <li><Link to="/careers" className="hover:text-primary transition-colors duration-300">Teaching Careers</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Quick Access</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/students" className="hover:text-primary transition-colors duration-300">Student Records</Link></li>
                <li><Link to="/academics" className="hover:text-primary transition-colors duration-300">Academic Management</Link></li>
                <li><Link to="/attendance" className="hover:text-primary transition-colors duration-300">Attendance Tracking</Link></li>
                <li><Link to="/finance" className="hover:text-primary transition-colors duration-300">Finance & Fees</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Legal & Policies</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-primary transition-colors duration-300">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-primary transition-colors duration-300">Terms of Service</Link></li>
                <li><Link to="/security" className="hover:text-primary transition-colors duration-300">Security Guidelines</Link></li>
                <li><Link to="/accessibility" className="hover:text-primary transition-colors duration-300">Accessibility</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Connect With Us</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/contact" className="hover:text-primary transition-colors duration-300">Contact Support</Link></li>
                <li><Link to="/feedback" className="hover:text-primary transition-colors duration-300">Submit Feedback</Link></li>
                <li><Link to="/help" className="hover:text-primary transition-colors duration-300">Help Center</Link></li>
                <li><Link to="/updates" className="hover:text-primary transition-colors duration-300">System Updates</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 mt-12 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 MUCHI - School Management Information System. All rights reserved.</p>
          </div>
        </div>
      </footer>


      

    </div>
  );
}
