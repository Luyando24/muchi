import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ThemeToggle from '@/components/navigation/ThemeToggle';
import { 
  GraduationCap, 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Send, 
  Building, 
  Users, 
  Calendar, 
  MessageSquare,
  BookOpen,
  Shield,
  Bus,
  Heart,
  Menu,
  X
} from 'lucide-react';

export default function SchoolContact() {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const [inquiryType, setInquiryType] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const schoolData = {
    name: "Chongwe Secondary School",
    tagline: "Excellence in Education Since 1995"
  };

  const contactInfo = [
    {
      icon: Phone,
      title: 'Main Office',
      details: [
        { label: 'Phone', value: '+260 211 234567' },
        { label: 'Mobile', value: '+260 977 123456' },
        { label: 'Hours', value: 'Mon-Fri: 7:30 AM - 4:30 PM' }
      ]
    },
    {
      icon: Mail,
      title: 'Email Contact',
      details: [
        { label: 'General', value: 'info@chongwesecondary.edu.zm' },
        { label: 'Admissions', value: 'admissions@chongwesecondary.edu.zm' },
        { label: 'Head Teacher', value: 'headteacher@chongwesecondary.edu.zm' }
      ]
    },
    {
      icon: MapPin,
      title: 'School Address',
      details: [
        { label: 'Street', value: 'Plot 123 Education Road' },
        { label: 'City', value: 'Chongwe, Lusaka Province' },
        { label: 'District', value: 'Chongwe District' }
      ]
    },
    {
      icon: Clock,
      title: 'School Hours',
      details: [
        { label: 'Classes', value: '7:30 AM - 3:00 PM' },
        { label: 'Study Hall', value: '3:00 PM - 5:00 PM' },
        { label: 'Office', value: '7:00 AM - 4:30 PM' }
      ]
    }
  ];

  const departments = [
    {
      name: 'Admissions Office',
      description: 'New student enrollment, school tours, and admission requirements',
      contact: 'Mrs. Grace Mwanza, Admissions Officer',
      phone: '+260 211 234568',
      email: 'admissions@chongwesecondary.edu.zm',
      icon: BookOpen
    },
    {
      name: 'Head Teacher\'s Office',
      description: 'School leadership, policies, and general academic matters',
      contact: 'Mr. Joseph Banda, Head Teacher',
      phone: '+260 211 234569',
      email: 'headteacher@chongwesecondary.edu.zm',
      icon: Shield
    },
    {
      name: 'Student Services',
      description: 'Counseling, guidance, and student welfare support',
      contact: 'Mrs. Mercy Phiri, Guidance Counselor',
      phone: '+260 211 234570',
      email: 'studentservices@chongwesecondary.edu.zm',
      icon: Heart
    },
    {
      name: 'Transportation',
      description: 'School transport, routes, and safety protocols',
      contact: 'Mr. Patrick Tembo, Transport Coordinator',
      phone: '+260 211 234571',
      email: 'transport@chongwesecondary.edu.zm',
      icon: Bus
    },
    {
      name: 'Finance Office',
      description: 'School fees, bursaries, and financial assistance',
      contact: 'Mrs. Ruth Sakala, Bursar',
      phone: '+260 211 234572',
      email: 'finance@chongwesecondary.edu.zm',
      icon: Building
    },
    {
      name: 'Sports Department',
      description: 'Sports programs, inter-school competitions, and athletics',
      contact: 'Mr. David Mulenga, Sports Coordinator',
      phone: '+260 211 234573',
      email: 'sports@chongwesecondary.edu.zm',
      icon: Users
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
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
              <Link to={`/school/${schoolId}/faculty`} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                Faculty
              </Link>
              <Link to={`/school/${schoolId}/admissions`} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                Admissions
              </Link>
              <Link to={`/school/${schoolId}/contact`} className="text-blue-600 font-medium">
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
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
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
                  className="text-blue-600 font-medium"
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

      {/* Hero Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Contact Chongwe Secondary
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
            We welcome your questions and look forward to connecting with you. Our dedicated staff is here to support students, families, and the community.
          </p>
        </div>
      </section>

      {/* Contact Information Cards */}
      <section className="py-16 -mt-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((info, index) => (
              <Card key={index} className="bg-white shadow-lg border-0 hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600 mx-auto mb-4">
                    <info.icon className="h-8 w-8" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-800 mb-4">{info.title}</h3>
                  <div className="space-y-2">
                    {info.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="text-sm">
                        <p className="font-medium text-slate-600">{detail.label}</p>
                        <p className="text-slate-800">{detail.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              Send Us a Message
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Have a question or need assistance? Complete the form below and we'll respond within one business day.
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-lg border-0">
              <CardContent className="p-8">
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-slate-700 font-medium">First Name *</Label>
                      <Input id="firstName" placeholder="Enter your first name" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-slate-700 font-medium">Last Name *</Label>
                      <Input id="lastName" placeholder="Enter your last name" className="mt-1" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email" className="text-slate-700 font-medium">Email Address *</Label>
                      <Input id="email" type="email" placeholder="Enter your email" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-slate-700 font-medium">Phone Number</Label>
                      <Input id="phone" type="tel" placeholder="Enter your phone number" className="mt-1" />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="inquiryType" className="text-slate-700 font-medium">Inquiry Type *</Label>
                    <Select value={inquiryType} onValueChange={setInquiryType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select inquiry type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admissions">Admissions & Enrollment</SelectItem>
                        <SelectItem value="academics">Academics & Curriculum</SelectItem>
                        <SelectItem value="student-services">Student Services & Support</SelectItem>
                        <SelectItem value="finance">Tuition & Financial Aid</SelectItem>
                        <SelectItem value="transportation">Transportation & Bus Routes</SelectItem>
                        <SelectItem value="athletics">Athletics & Extracurriculars</SelectItem>
                        <SelectItem value="general">General Information</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="subject" className="text-slate-700 font-medium">Subject *</Label>
                    <Input id="subject" placeholder="Brief subject of your inquiry" className="mt-1" />
                  </div>
                  
                  <div>
                    <Label htmlFor="message" className="text-slate-700 font-medium">Message *</Label>
                    <Textarea 
                      id="message" 
                      placeholder="Please provide details about your inquiry..."
                      rows={6}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="preferredContact" className="text-slate-700 font-medium">Preferred Contact Method</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="How would you like us to respond?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone Call</SelectItem>
                        <SelectItem value="either">Either Email or Phone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="newsletter" className="rounded" />
                    <Label htmlFor="newsletter" className="text-sm text-slate-600">
                      I would like to receive school updates and newsletters
                    </Label>
                  </div>
                  
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Department Contacts */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              Department Directory
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Connect directly with our specialized departments for specific inquiries and support.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept, index) => (
              <Card key={index} className="bg-white shadow-lg border-0 hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <dept.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg text-slate-800">{dept.name}</CardTitle>
                  </div>
                  <CardDescription className="text-sm text-slate-600">
                    {dept.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-slate-700">{dept.contact}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <a href={`tel:${dept.phone}`} className="text-slate-700 hover:text-blue-600 transition-colors">
                      {dept.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <a href={`mailto:${dept.email}`} className="text-slate-700 hover:text-blue-600 transition-colors break-all">
                      {dept.email}
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Campus Location & Directions */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              Visit Our Campus
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Located in the heart of Learning City, our campus is easily accessible and welcomes visitors.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="shadow-lg border-0">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Campus Information</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <p className="font-bold text-slate-800">Chongwe Secondary School</p>
                      <p className="text-slate-600">Plot 123 Education Road</p>
                      <p className="text-slate-600">Chongwe, Lusaka Province</p>
                      <p className="text-slate-600">Chongwe District</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-6">
                    <h4 className="font-bold text-slate-800 mb-3">Directions & Parking</h4>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li>• From Lusaka: Take Great East Road towards Chongwe, turn left at Chongwe Roundabout onto Education Road</li>
                      <li>• From Chongwe Town: Head north on Main Road, turn right onto Education Road (opposite Chongwe Market)</li>
                      <li>• Public Transport: Take minibus from Lusaka Inter-City Terminal to Chongwe, alight at Education Road junction</li>
                      <li>• Free parking available in school compound (enter through main gate)</li>
                      <li>• Visitor parking spaces located near administration block</li>
                      <li>• Accessible entrances and parking available for persons with disabilities</li>
                    </ul>
                  </div>
                  
                  <div className="border-t pt-6">
                    <h4 className="font-bold text-slate-800 mb-3">Schedule a Campus Tour</h4>
                    <p className="text-sm text-slate-600 mb-4">
                      Experience our facilities firsthand with a guided tour led by our admissions team. Tours include classrooms, library, cafeteria, gymnasium, and outdoor spaces.
                    </p>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      <Calendar className="mr-2 h-4 w-4" />
                      Schedule a Campus Tour
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-lg border-0">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Campus Map</h3>
                <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center mb-6">
                  <div className="text-center">
                    <MapPin className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Interactive Campus Map</p>
                    <p className="text-sm text-slate-500">Click to view detailed campus layout</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-50">
                    View Campus Map
                  </Button>
                  <Button variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-50">
                    Get Directions
                  </Button>
                  <Button variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-50">
                    Virtual Campus Tour
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Find quick answers to common questions about our school, programs, and policies.
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                question: "What are your school hours and calendar?",
                answer: "Regular school hours are 8:00 AM to 3:30 PM, Monday through Friday. Extended care is available from 7:00 AM to 6:00 PM. We follow the Metropolitan School District calendar with 180 instructional days."
              },
              {
                question: "How do I enroll my child at Greenwood Academy?",
                answer: "Contact our Admissions Office at (555) 123-4568 to schedule a campus tour and receive enrollment materials. We accept applications year-round, with priority enrollment periods in spring for fall admission."
              },
              {
                question: "What is your student-to-teacher ratio?",
                answer: "We maintain small class sizes with an average student-to-teacher ratio of 15:1 in elementary grades and 18:1 in middle school to ensure personalized attention and academic support."
              },
              {
                question: "Do you provide transportation services?",
                answer: "Yes, we offer bus transportation throughout the Learning City area. Contact our Transportation Department at (555) 123-4571 for route information, schedules, and registration."
              },
              {
                question: "What extracurricular activities and sports are available?",
                answer: "We offer a comprehensive program including athletics (basketball, soccer, track), fine arts (band, choir, drama), academic clubs (debate, science olympiad), and community service opportunities."
              },
              {
                question: "How can I stay informed about school news and events?",
                answer: "Subscribe to our weekly newsletter, follow our social media accounts, and check our website regularly. We also use our parent portal system for important announcements and updates."
              }
            ].map((faq, index) => (
              <Card key={index} className="bg-white shadow-lg border-0">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 mb-2">{faq.question}</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <p className="text-slate-600 mb-4">Need more information?</p>
            <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
              View Complete FAQ
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <span className="text-lg font-bold">Greenwood Academy</span>
              </div>
              <p className="text-sm text-slate-300 mb-4">Excellence in Education Since 1985</p>
              <p className="text-xs text-slate-400">Accredited by the State Board of Education</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contact Information</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>Phone: (555) 123-4567</li>
                <li>Email: info@greenwoodacademy.edu</li>
                <li>123 Education Street</li>
                <li>Learning City, LC 12345</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li><Link to={`/school/${schoolId}`} className="hover:text-blue-400 transition-colors">Home</Link></li>
                  <li><Link to={`/school/${schoolId}/faculty`} className="hover:text-blue-400 transition-colors">Faculty</Link></li>
                  <li><Link to={`/school/${schoolId}/admissions`} className="hover:text-blue-400 transition-colors">Admissions</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">School Resources</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li><a href="#" className="hover:text-blue-400 transition-colors">Parent Portal</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Student Handbook</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">School Calendar</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Emergency Procedures</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 mt-8 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2024 Greenwood Academy. All rights reserved. | Privacy Policy | Non-Discrimination Policy</p>
          </div>
        </div>
      </footer>
    </div>
  );
}