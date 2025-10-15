import { GraduationCap, Users, BookOpen, Calendar, Award, MapPin, Phone, Mail, Menu, X, ChevronRight, Star, Clock, Globe, Building, Trophy, Heart, Camera, ChevronLeft } from 'lucide-react';
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/navigation/ThemeToggle";
import { useState } from 'react';

export default function SchoolWebsite() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentGalleryImage, setCurrentGalleryImage] = useState(0);
  const [currentNewsSlide, setCurrentNewsSlide] = useState(0);
  const { schoolId } = useParams();

  // This would typically come from props or API based on school ID
  const schoolData = {
    name: "Chongwe Secondary School",
    tagline: "Excellence in Education Since 1995",
    description: "Nurturing young Zambian minds to become tomorrow's leaders through quality education and strong moral values in the heart of Chongwe District.",
    address: "Plot 123, Great East Road, Chongwe District, Lusaka Province, Zambia",
    phone: "+260 211 123-456",
    email: "info@chongwesecondary.edu.zm",
    established: "1995",
    students: "850+",
    teachers: "45+",
    programs: "12+",
    achievements: "95%"
  };

  const campusImages = [
    {
      url: "https://images.unsplash.com/photo-1562774053-701939374585?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Main Academic Block",
      description: "Our modern classrooms equipped with the latest learning facilities"
    },
    {
      url: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80", 
      title: "School Library",
      description: "Well-stocked library with over 5,000 books and digital resources"
    },
    {
      url: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Science Laboratory",
      description: "Fully equipped science labs for Physics, Chemistry, and Biology"
    },
    {
      url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Sports Ground",
      description: "Spacious playground for football, netball, and athletics"
    },
    {
      url: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Student Dormitories",
      description: "Comfortable boarding facilities for students from distant areas"
    },
    {
      url: "https://images.unsplash.com/photo-1567521464027-f127ff144326?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Dining Hall",
      description: "Clean and spacious dining facility serving nutritious meals"
    }
  ];

  const newsItems = [
    {
      image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
      badge: "Event",
      badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      title: "Annual Science Exhibition 2024",
      date: "March 15, 2024",
      icon: Calendar,
      description: "Join us for our annual science exhibition showcasing innovative projects from our talented students across all grade levels, featuring experiments in Physics, Chemistry, and Biology."
    },
    {
      image: "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80", 
      badge: "Achievement",
      badgeColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      title: "Provincial Mathematics Olympiad Winners",
      date: "2 days ago",
      icon: Trophy,
      description: "Congratulations to our Grade 12 students who won first place in the Lusaka Province Mathematics Olympiad, bringing pride to Chongwe Secondary School."
    },
    {
      image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
      badge: "Announcement", 
      badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      title: "New Computer Lab Opening",
      date: "April 1, 2024",
      icon: Building,
      description: "Our new state-of-the-art computer laboratory will open next month, featuring 30 modern computers and high-speed internet connectivity for digital learning."
    }
  ];

  const nextGalleryImage = () => {
    setCurrentGalleryImage((prev) => (prev + 1) % campusImages.length);
  };

  const prevGalleryImage = () => {
    setCurrentGalleryImage((prev) => (prev - 1 + campusImages.length) % campusImages.length);
  };

  const nextNewsSlide = () => {
    setCurrentNewsSlide((prev) => (prev + 1) % newsItems.length);
  };

  const prevNewsSlide = () => {
    setCurrentNewsSlide((prev) => (prev - 1 + newsItems.length) % newsItems.length);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-md border-b-4 border-blue-600">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <Link to="/school" className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-blue-800 dark:text-blue-300">{schoolData.name}</span>
              <p className="text-sm text-slate-600 dark:text-slate-400">{schoolData.tagline}</p>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-base font-medium">
            <a href="#gallery" className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-2 px-3 rounded">Gallery</a>
            <Link to={`/school/${schoolId}/faculty`} className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-2 px-3 rounded">Faculty</Link>
            <Link to={`/school/${schoolId}/admissions`} className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-2 px-3 rounded">Admissions</Link>
            <a href="#news" className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-2 px-3 rounded">News</a>
            <Link to={`/school/${schoolId}/contact`} className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-2 px-3 rounded">Contact</Link>
            
            <div className="flex items-center gap-3 ml-4 border-l border-slate-300 dark:border-slate-600 pl-4">
              <Button asChild variant="outline" className="w-full font-medium border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900">
                <Link to="/student-portal">Student Portal</Link>
              </Button>
              <Button asChild className="font-medium bg-blue-600 hover:bg-blue-700 text-white">
                <Link to={`/school/${schoolId}/admissions`}>Apply Now</Link>
              </Button>
              <ThemeToggle />
            </div>
          </nav>
          
          {/* Mobile Navigation */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Button variant="ghost" onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
        
        {isMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-800 border-t">
            <nav className="flex flex-col gap-2 p-4">
              <a href="#gallery" className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-3 px-2 rounded">Gallery</a>
              <Link to={`/school/${schoolId}/faculty`} className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-3 px-2 rounded">Faculty</Link>
              <Link to={`/school/${schoolId}/admissions`} className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-3 px-2 rounded">Admissions</Link>
              <a href="#news" className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-3 px-2 rounded">News</a>
              <Link to={`/school/${schoolId}/contact`} className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-3 px-2 rounded">Contact</Link>
              <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button asChild variant="outline" className="font-medium border-blue-600 text-blue-600">
                  <Link to="/student-portal">Student Portal</Link>
                </Button>
                <Button asChild className="font-medium bg-blue-600 hover:bg-blue-700 text-white">
                  <Link to={`/school/${schoolId}/admissions`}>Apply Now</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="hero" className="relative bg-blue-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80" 
            alt="Chongwe Secondary School Campus" 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              console.log('Hero image failed to load');
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 via-blue-800/80 to-blue-900/90"></div>
        </div>
        <div className="container mx-auto relative py-24 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Welcome to {schoolData.name}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 font-light leading-relaxed">
              {schoolData.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 py-4 bg-white text-blue-900 hover:bg-blue-50 font-semibold">
                <Link to={`/school/${schoolId}/admissions`} className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Apply for Admission
                </Link>
              </Button>
              <Button size="lg" className="text-lg px-8 py-4 bg-blue-600 text-white hover:bg-blue-700 font-semibold">
                <Link to="/student-portal" className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Student Portal
                </Link>
              </Button>
              <Button size="lg" className="text-lg px-8 py-4 bg-blue-500 text-white hover:bg-blue-600 border-2 border-blue-400 font-semibold">
                <Link to="/login" className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Staff Login
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center p-6 rounded-lg bg-slate-50 dark:bg-slate-700">
              <div className="text-4xl font-bold text-blue-600 mb-2">{schoolData.students}</div>
              <div className="text-slate-600 dark:text-slate-400 font-medium">Students Enrolled</div>
            </div>
            <div className="text-center p-6 rounded-lg bg-slate-50 dark:bg-slate-700">
              <div className="text-4xl font-bold text-blue-600 mb-2">{schoolData.teachers}</div>
              <div className="text-slate-600 dark:text-slate-400 font-medium">Qualified Teachers</div>
            </div>
            <div className="text-center p-6 rounded-lg bg-slate-50 dark:bg-slate-700">
              <div className="text-4xl font-bold text-blue-600 mb-2">{schoolData.programs}</div>
              <div className="text-slate-600 dark:text-slate-400 font-medium">Academic Subjects</div>
            </div>
            <div className="text-center p-6 rounded-lg bg-slate-50 dark:bg-slate-700">
              <div className="text-4xl font-bold text-blue-600 mb-2">{schoolData.achievements}</div>
              <div className="text-slate-600 dark:text-slate-400 font-medium">Pass Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Campus Gallery Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900" id="gallery">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">Campus Gallery</h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Take a virtual tour of our beautiful campus facilities and see what makes {schoolData.name} a great place to learn and grow.
            </p>
          </div>
          
          {/* Main Gallery Display */}
          <div className="relative mb-8">
            <div className="relative h-96 md:h-[500px] rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700">
              <img 
                src={campusImages[currentGalleryImage].url} 
                alt={campusImages[currentGalleryImage].title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <h3 className="text-2xl font-bold mb-2">{campusImages[currentGalleryImage].title}</h3>
                <p className="text-lg opacity-90">{campusImages[currentGalleryImage].description}</p>
              </div>
              
              {/* Navigation Arrows */}
              <button 
                onClick={prevGalleryImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 text-white transition-all"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button 
                onClick={nextGalleryImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 text-white transition-all"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
            
            {/* Gallery Thumbnails */}
            <div className="flex gap-4 mt-6 overflow-x-auto pb-2">
              {campusImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentGalleryImage(index)}
                  className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentGalleryImage 
                      ? 'border-blue-600 ring-2 ring-blue-200 dark:ring-blue-800' 
                      : 'border-slate-300 dark:border-slate-600 hover:border-blue-400'
                  }`}
                >
                  <img 
                    src={image.url} 
                    alt={image.title}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
          
          {/* Gallery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">Modern Facilities</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Our campus features modern classrooms, well-equipped laboratories, and comfortable boarding facilities for students from across Chongwe District.
              </p>
            </div>
            <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">Safe Environment</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                We provide a secure and nurturing environment where students can focus on their studies and personal development in a supportive community.
              </p>
            </div>
            <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">Community Spirit</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Our school fosters strong community bonds, encouraging students to participate in cultural activities and community service projects.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section className="py-20 bg-white dark:bg-slate-800" id="programs">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">Academic Programs</h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Comprehensive educational programs designed to nurture every student's potential and prepare them for future success.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-slate-900 dark:text-slate-100">Primary Education</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Foundation years focusing on core subjects and character development for grades K-5.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                    Mathematics & Science Fundamentals
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                    Language Arts & Literature
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                    Social Studies & History
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                    Arts & Physical Education
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                  <GraduationCap className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-slate-900 dark:text-slate-100">Secondary Education</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Advanced curriculum preparing students for higher education and careers in grades 6-12.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Advanced Mathematics & Sciences
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Literature & Creative Writing
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Technology & Computer Science
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Career Preparation Programs
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-slate-900 dark:text-slate-100">Special Programs</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Enrichment programs for gifted students and specialized learning needs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                    Gifted & Talented Program
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                    Special Education Support
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                    International Baccalaureate
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                    Arts & Music Excellence
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* News & Events Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900" id="news">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">Latest News & Events</h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Stay updated with the latest happenings, achievements, and upcoming events at {schoolData.name}.
            </p>
          </div>
          {/* News Slider */}
          <div className="relative">
            <div className="overflow-hidden rounded-lg">
              <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentNewsSlide * 100}%)` }}>
                {newsItems.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <div key={index} className="w-full flex-shrink-0">
                      <Card className="border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow mx-auto max-w-4xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                          <div className="relative h-64 md:h-auto">
                            <img 
                              src={item.image} 
                              alt={item.title}
                              className="w-full h-full object-cover rounded-t-lg md:rounded-l-lg md:rounded-t-none"
                            />
                          </div>
                          <div className="p-8">
                            <CardHeader className="p-0 mb-4">
                              <Badge variant="secondary" className={`w-fit ${item.badgeColor}`}>{item.badge}</Badge>
                              <CardTitle className="text-slate-900 dark:text-slate-100 text-2xl">{item.title}</CardTitle>
                              <CardDescription className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                <IconComponent className="h-4 w-4" />
                                {item.date}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                {item.description}
                              </p>
                            </CardContent>
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Navigation Arrows */}
            <button 
              onClick={prevNewsSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full p-3 shadow-lg transition-all"
            >
              <ChevronLeft className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </button>
            <button 
              onClick={nextNewsSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full p-3 shadow-lg transition-all"
            >
              <ChevronRight className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </button>
            
            {/* Slide Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {newsItems.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentNewsSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentNewsSlide 
                      ? 'bg-blue-600' 
                      : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white dark:bg-slate-800" id="contact">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">Contact Us</h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Get in touch with us for admissions, inquiries, or more information about our programs.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">School Address</h3>
                  <p className="text-slate-600 dark:text-slate-400">{schoolData.address}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Phone Number</h3>
                  <p className="text-slate-600 dark:text-slate-400">{schoolData.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Email Address</h3>
                  <p className="text-slate-600 dark:text-slate-400">{schoolData.email}</p>
                </div>
              </div>
            </div>
            <Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-slate-100">Send us a message</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  We'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Full Name</label>
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        placeholder="Enter your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Email Address</label>
                      <input 
                        type="email" 
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Subject</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      placeholder="What is this regarding?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Message</label>
                    <textarea 
                      rows={4} 
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      placeholder="Please provide details about your inquiry"
                    ></textarea>
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium">
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-lg font-bold">{schoolData.name}</span>
                </div>
              </div>
              <p className="text-slate-300 mb-2">{schoolData.tagline}</p>
              <p className="text-slate-400 text-sm">Established {schoolData.established}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Quick Links</h4>
              <ul className="space-y-3 text-slate-300">
                <li><a href="#gallery" className="hover:text-white transition-colors">Campus Gallery</a></li>
                <li><Link to={`/school/${schoolId}/faculty`} className="hover:text-white transition-colors">Faculty</Link></li>
                <li><Link to={`/school/${schoolId}/admissions`} className="hover:text-white transition-colors">Admissions</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Resources</h4>
              <ul className="space-y-3 text-slate-300">
                <li><Link to="/login" className="hover:text-white transition-colors">Student Portal</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Parent Portal</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Library</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Academic Calendar</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Contact Info</h4>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {schoolData.phone}
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {schoolData.email}
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                  <span className="text-sm">{schoolData.address}</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8 text-center">
            <p className="text-slate-400">&copy; 2024 {schoolData.name}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}