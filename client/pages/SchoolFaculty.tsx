import { GraduationCap, Mail, Phone, Award, BookOpen, Users, ArrowLeft, MapPin, Calendar, Star, ChevronRight, Menu, X } from 'lucide-react';
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ThemeToggle from "@/components/navigation/ThemeToggle";
import { useState } from 'react';

export default function SchoolFaculty() {
  const navigate = useNavigate();
  const { schoolId } = useParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const schoolData = {
    name: "Chongwe Secondary School",
    tagline: "Excellence in Education Since 1995"
  };

  const facultyMembers = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      position: "Principal",
      department: "Administration",
      email: "s.johnson@greenwoodacademy.edu",
      phone: "(555) 123-4567",
      education: ["Ph.D. in Educational Leadership - Harvard University", "M.Ed. in Curriculum & Instruction - Stanford University"],
      experience: "15+ years in educational leadership",
      specialties: ["Educational Leadership", "Curriculum Development", "School Administration"],
      bio: "Dr. Johnson brings over 15 years of educational leadership experience to Greenwood Academy. She is passionate about creating inclusive learning environments that foster academic excellence and character development.",
      image: "/images/faculty/sarah-johnson.jpg",
      achievements: ["National Principal of the Year 2022", "Educational Innovation Award 2021"]
    },
    {
      id: 2,
      name: "Prof. Michael Chen",
      position: "Mathematics Department Head",
      department: "Mathematics",
      email: "m.chen@greenwoodacademy.edu",
      phone: "(555) 123-4568",
      education: ["Ph.D. in Mathematics - MIT", "M.S. in Applied Mathematics - Caltech"],
      experience: "12+ years teaching experience",
      specialties: ["Advanced Calculus", "Statistics", "Mathematical Modeling"],
      bio: "Professor Chen is dedicated to making mathematics accessible and engaging for all students. His innovative teaching methods have helped countless students develop a love for mathematical thinking.",
      image: "/images/faculty/michael-chen.jpg",
      achievements: ["Excellence in Teaching Award 2023", "Published 25+ research papers"]
    },
    {
      id: 3,
      name: "Dr. Emily Rodriguez",
      position: "Science Department Head",
      department: "Science",
      email: "e.rodriguez@greenwoodacademy.edu",
      phone: "(555) 123-4569",
      education: ["Ph.D. in Biology - UC Berkeley", "M.S. in Environmental Science - Yale"],
      experience: "10+ years in education and research",
      specialties: ["Biology", "Environmental Science", "Research Methods"],
      bio: "Dr. Rodriguez combines her passion for scientific research with innovative teaching methods. She leads our school's environmental sustainability initiatives and mentors students in scientific research projects.",
      image: "/images/faculty/emily-rodriguez.jpg",
      achievements: ["Environmental Educator of the Year 2022", "NSF Research Grant Recipient"]
    },
    {
      id: 4,
      name: "Mr. David Thompson",
      position: "English Literature Teacher",
      department: "English",
      email: "d.thompson@greenwoodacademy.edu",
      phone: "(555) 123-4570",
      education: ["M.A. in English Literature - Oxford University", "B.A. in Creative Writing - Columbia University"],
      experience: "8+ years teaching experience",
      specialties: ["British Literature", "Creative Writing", "Literary Analysis"],
      bio: "Mr. Thompson inspires students to explore the power of language and literature. His creative writing workshops have produced several award-winning student publications.",
      image: "/images/faculty/david-thompson.jpg",
      achievements: ["Teacher of the Year 2023", "Published novelist"]
    },
    {
      id: 5,
      name: "Ms. Lisa Park",
      position: "Art & Design Teacher",
      department: "Arts",
      email: "l.park@greenwoodacademy.edu",
      phone: "(555) 123-4571",
      education: ["M.F.A. in Fine Arts - RISD", "B.A. in Art History - NYU"],
      experience: "6+ years teaching experience",
      specialties: ["Digital Art", "Traditional Painting", "Art History"],
      bio: "Ms. Park brings contemporary art practices into the classroom while honoring traditional techniques. Her students regularly win regional and national art competitions.",
      image: "/images/faculty/lisa-park.jpg",
      achievements: ["Regional Art Educator Award 2023", "Featured artist in 15+ exhibitions"]
    },
    {
      id: 6,
      name: "Coach Robert Martinez",
      position: "Athletics Director",
      department: "Physical Education",
      email: "r.martinez@greenwoodacademy.edu",
      phone: "(555) 123-4572",
      education: ["M.S. in Kinesiology - UCLA", "B.S. in Sports Science - University of Texas"],
      experience: "9+ years in education and coaching",
      specialties: ["Athletic Training", "Sports Psychology", "Health Education"],
      bio: "Coach Martinez promotes physical fitness and sportsmanship while building character through athletics. Under his leadership, our teams have won multiple state championships.",
      image: "/images/faculty/robert-martinez.jpg",
      achievements: ["State Championship Coach 2022", "Athletic Director of the Year 2021"]
    }
  ];

  const departments = [
    { name: "Administration", count: 5, head: "Dr. Sarah Johnson", description: "School leadership and administrative services" },
    { name: "Mathematics", count: 8, head: "Prof. Michael Chen", description: "Algebra, Geometry, Calculus, and Statistics" },
    { name: "Science", count: 10, head: "Dr. Emily Rodriguez", description: "Biology, Chemistry, Physics, and Environmental Science" },
    { name: "English", count: 7, head: "Mr. David Thompson", description: "Literature, Writing, and Communication Skills" },
    { name: "Social Studies", count: 6, head: "Dr. Amanda Wilson", description: "History, Geography, and Civic Education" },
    { name: "Arts", count: 5, head: "Ms. Lisa Park", description: "Visual Arts, Music, and Creative Expression" },
    { name: "Physical Education", count: 4, head: "Coach Robert Martinez", description: "Athletics, Health, and Wellness Programs" },
    { name: "Special Education", count: 6, head: "Ms. Jennifer Adams", description: "Individualized learning support and services" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and School Name */}
            <Link to={`/school/${schoolId}`} className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <GraduationCap className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{schoolData.name}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">{schoolData.tagline}</p>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link to={`/school/${schoolId}`} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                Home
              </Link>
              <Link to={`/school/${schoolId}/faculty`} className="text-blue-600 font-medium">
                Faculty
              </Link>
              <Link to={`/school/${schoolId}/admissions`} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                Admissions
              </Link>
              <Link to={`/school/${schoolId}/contact`} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                Contact
              </Link>
              <ThemeToggle />
            </nav>
            
            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Button variant="outline" size="sm">
                Student Portal
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Apply Now
              </Button>
              <ThemeToggle />
            </div>
            
            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          
          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-slate-200 dark:border-slate-700 py-4">
              <nav className="flex flex-col space-y-4">
                <Link 
                  to={`/school/${schoolId}`} 
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </Link>
                <Link 
                  to={`/school/${schoolId}/faculty`} 
                  className="text-blue-600 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Faculty
                </Link>
                <Link 
                  to={`/school/${schoolId}/admissions`} 
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Admissions
                </Link>
                <Link 
                  to={`/school/${schoolId}/contact`} 
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Contact
                </Link>
                <div className="flex flex-col space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Button variant="outline" size="sm" onClick={() => setIsMenuOpen(false)}>
                    Student Portal
                  </Button>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsMenuOpen(false)}>
                    Apply Now
                  </Button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Page Title */}
      <div className="bg-blue-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Faculty & Staff</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Meet our dedicated team of educators committed to academic excellence and student success
            </p>
          </div>
        </div>
      </div>

      {/* Academic Departments */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 text-center">
            Academic Departments
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 text-center max-w-2xl mx-auto mb-8">
            Our comprehensive academic departments provide specialized education across all grade levels
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {departments.map((dept, index) => (
              <Card key={index} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-lg text-slate-900 dark:text-white">{dept.name}</CardTitle>
                  <CardDescription className="text-sm text-slate-600 dark:text-slate-400">
                    {dept.count} Faculty Members
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                    {dept.description}
                  </p>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    <strong>Department Head:</strong> {dept.head}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Featured Faculty */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 text-center">
            Featured Faculty
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 text-center max-w-2xl mx-auto mb-8">
            Get to know some of our outstanding educators who are making a difference every day
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {facultyMembers.map((faculty) => (
              <Card key={faculty.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
                <CardHeader className="text-center">
                  <Avatar className="h-20 w-20 mx-auto mb-4 border-4 border-blue-100 dark:border-blue-900">
                    <AvatarImage src={faculty.image} alt={faculty.name} />
                    <AvatarFallback className="text-lg font-semibold bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                      {faculty.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-xl text-slate-900 dark:text-white">
                    {faculty.name}
                  </CardTitle>
                  <CardDescription className="font-medium text-blue-600 dark:text-blue-400">
                    {faculty.position}
                  </CardDescription>
                  <Badge variant="secondary" className="w-fit mx-auto bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {faculty.department}
                  </Badge>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {faculty.bio}
                  </p>
                  
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center">
                      <BookOpen className="h-4 w-4 text-blue-600 mr-2" />
                      Education
                    </h4>
                    <ul className="space-y-1">
                      {faculty.education.map((edu, index) => (
                        <li key={index} className="text-xs text-slate-600 dark:text-slate-400">
                          • {edu}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center">
                      <Award className="h-4 w-4 text-blue-600 mr-2" />
                      Specialties
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {faculty.specialties.map((specialty, index) => (
                        <Badge key={index} variant="outline" className="text-xs border-slate-300 dark:border-slate-600">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center">
                      <Calendar className="h-4 w-4 text-blue-600 mr-2" />
                      Experience
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{faculty.experience}</p>
                  </div>
                  
                  {faculty.achievements && (
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center">
                        <Star className="h-4 w-4 text-blue-600 mr-2" />
                        Achievements
                      </h4>
                      <ul className="space-y-1">
                        {faculty.achievements.map((achievement, index) => (
                          <li key={index} className="text-xs text-slate-600 dark:text-slate-400">
                            • {achievement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                      <Mail className="h-4 w-4 text-blue-600 mr-2" />
                      <a href={`mailto:${faculty.email}`} className="hover:text-blue-600 transition-colors">
                        {faculty.email}
                      </a>
                    </div>
                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                      <Phone className="h-4 w-4 text-blue-600 mr-2" />
                      <a href={`tel:${faculty.phone}`} className="hover:text-blue-600 transition-colors">
                        {faculty.phone}
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Join Our Team */}
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Join Our Faculty
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-6 max-w-2xl mx-auto">
            Are you passionate about education and making a difference in students' lives? 
            We're always looking for dedicated educators to join our team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              View Open Positions
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" className="border-slate-300 dark:border-slate-600">
              Submit Your Resume
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <GraduationCap className="h-8 w-8 text-blue-400" />
                <span className="text-xl font-bold">Greenwood Academy</span>
              </div>
              <p className="text-slate-400 text-sm">Excellence in Education Since 1985</p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Faculty</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Department Heads</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Teaching Staff</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support Staff</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Administration</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to={`/school/${schoolId}`} className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to={`/school/${schoolId}/admissions`} className="hover:text-white transition-colors">Admissions</Link></li>
                <li><Link to={`/school/${schoolId}/contact`} className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Information</h4>
              <div className="space-y-2 text-sm text-slate-400">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>(555) 123-4567</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>info@greenwoodacademy.edu</span>
                </div>
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <div>
                    <div>123 Education Street</div>
                    <div>Learning City, LC 12345</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-8 pt-8 text-center">
            <p className="text-slate-400 text-sm">
              &copy; 2024 Greenwood Academy. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}