import { GraduationCap, Users, BookOpen, Calendar, Award, MapPin, Phone, Mail, Menu, X, ChevronRight, Star, Clock, Globe, ArrowLeft, FileText, DollarSign, CheckCircle, Download, Upload, User, GraduationCap as GradCap } from 'lucide-react';
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ThemeToggle from "@/components/navigation/ThemeToggle";
import { useState } from 'react';

export default function SchoolAdmissions() {
  const navigate = useNavigate();
  const { schoolId } = useParams();
  const [selectedGrade, setSelectedGrade] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const schoolData = {
    name: "Chongwe Secondary School",
    tagline: "Excellence in Education Since 1995"
  };

  const admissionSteps = [
    {
      step: 1,
      title: "Submit Application",
      description: "Complete our comprehensive online application form with all required information and documents.",
      timeline: "Rolling admissions",
      requirements: ["Completed application form", "Academic transcripts", "Birth certificate", "Immunization records"]
    },
    {
      step: 2,
      title: "Document Review",
      description: "Our admissions team reviews your application and supporting documents.",
      timeline: "1-2 weeks",
      requirements: ["Application fee payment", "All required documents submitted", "Previous school records"]
    },
    {
      step: 3,
      title: "Assessment & Interview",
      description: "Student assessment and family interview with our admissions team.",
      timeline: "Scheduled within 2 weeks",
      requirements: ["Academic assessment", "Student interview", "Parent/guardian meeting"]
    },
    {
      step: 4,
      title: "Admission Decision",
      description: "Receive your admission decision and enrollment information.",
      timeline: "Within 1 week of interview",
      requirements: ["Admission letter", "Enrollment packet", "Tuition information"]
    }
  ];

  const tuitionFees = [
    {
      grade: "Grade 8",
      tuition: "ZMW 8,500",
      fees: "ZMW 1,200",
      total: "ZMW 9,700"
    },
    {
      grade: "Grade 9",
      tuition: "ZMW 9,200",
      fees: "ZMW 1,400",
      total: "ZMW 10,600"
    },
    {
      grade: "Grade 10",
      tuition: "ZMW 10,500",
      fees: "ZMW 1,600",
      total: "ZMW 12,100"
    },
    {
      grade: "Grade 11",
      tuition: "ZMW 11,800",
      fees: "ZMW 1,800",
      total: "ZMW 13,600"
    },
    {
      grade: "Grade 12",
      tuition: "ZMW 12,500",
      fees: "ZMW 2,000",
      total: "ZMW 14,500"
    }
  ];

  const importantDates = [
    { date: "December 1", event: "Application Opens", status: "completed" },
    { date: "January 15", event: "Priority Application Deadline", status: "upcoming" },
    { date: "February 28", event: "Regular Application Deadline", status: "upcoming" },
    { date: "March 15", event: "Admission Decisions Released", status: "upcoming" },
    { date: "April 1", event: "Enrollment Deposit Due", status: "upcoming" },
    { date: "August 15", event: "New Student Orientation", status: "upcoming" }
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
              <Link to={`/school/${schoolId}/faculty`} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                Faculty
              </Link>
              <Link to={`/school/${schoolId}/admissions`} className="text-blue-600 font-medium">
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
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Faculty
                </Link>
                <Link 
                  to={`/school/${schoolId}/admissions`} 
                  className="text-blue-600 font-medium"
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
            <h1 className="text-4xl font-bold mb-4">Admissions</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Join our community of learners and begin your journey toward academic excellence
            </p>
          </div>
        </div>
      </div>

      {/* Application Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-8 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Start Your Application
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Ready to join our community? Complete this form to begin your admission journey
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-8">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="studentFirstName" className="text-slate-900 dark:text-white">Student First Name *</Label>
                    <Input id="studentFirstName" placeholder="Enter first name" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                  </div>
                  <div>
                    <Label htmlFor="studentLastName" className="text-slate-900 dark:text-white">Student Last Name *</Label>
                    <Input id="studentLastName" placeholder="Enter last name" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dateOfBirth" className="text-slate-900 dark:text-white">Date of Birth *</Label>
                    <Input id="dateOfBirth" type="date" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                  </div>
                  <div>
                    <Label htmlFor="gradeApplying" className="text-slate-900 dark:text-white">Grade Applying For *</Label>
                    <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                      <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="k">Kindergarten</SelectItem>
                        <SelectItem value="1">Grade 1</SelectItem>
                        <SelectItem value="2">Grade 2</SelectItem>
                        <SelectItem value="3">Grade 3</SelectItem>
                        <SelectItem value="4">Grade 4</SelectItem>
                        <SelectItem value="5">Grade 5</SelectItem>
                        <SelectItem value="6">Grade 6</SelectItem>
                        <SelectItem value="7">Grade 7</SelectItem>
                        <SelectItem value="8">Grade 8</SelectItem>
                        <SelectItem value="9">Grade 9</SelectItem>
                        <SelectItem value="10">Grade 10</SelectItem>
                        <SelectItem value="11">Grade 11</SelectItem>
                        <SelectItem value="12">Grade 12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="parentFirstName" className="text-slate-900 dark:text-white">Parent/Guardian First Name *</Label>
                    <Input id="parentFirstName" placeholder="Enter first name" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                  </div>
                  <div>
                    <Label htmlFor="parentLastName" className="text-slate-900 dark:text-white">Parent/Guardian Last Name *</Label>
                    <Input id="parentLastName" placeholder="Enter last name" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email" className="text-slate-900 dark:text-white">Email Address *</Label>
                    <Input id="email" type="email" placeholder="Enter email address" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-slate-900 dark:text-white">Phone Number *</Label>
                    <Input id="phone" type="tel" placeholder="Enter phone number" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="currentSchool" className="text-slate-900 dark:text-white">Current School</Label>
                  <Input id="currentSchool" placeholder="Enter current school name" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                </div>
                
                <div>
                  <Label htmlFor="interests" className="text-slate-900 dark:text-white">Student Interests & Activities</Label>
                  <Textarea 
                    id="interests" 
                    placeholder="Tell us about your child's interests, hobbies, and extracurricular activities..."
                    rows={4}
                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                  />
                </div>
                
                <div>
                  <Label htmlFor="whyApplying" className="text-slate-900 dark:text-white">Why are you interested in Chongwe Secondary School?</Label>
                  <Textarea 
                    id="whyApplying" 
                    placeholder="Share what attracts you to our school and what you hope your child will gain from the experience..."
                    rows={4}
                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                  />
                </div>
                
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center bg-slate-50 dark:bg-slate-800">
                  <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">Upload Required Documents</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Please upload academic transcripts, birth certificate, and immunization records
                  </p>
                  <Button variant="outline" className="border-slate-300 dark:border-slate-600">
                    Choose Files
                  </Button>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                    Submit Application
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" type="button" className="flex-1 border-slate-300 dark:border-slate-600">
                    Save as Draft
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>

        {/* Admission Process */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 text-center">
            Admission Process
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 text-center max-w-2xl mx-auto mb-8">
            Our streamlined admission process is designed to get to know your child and family while ensuring the best fit for our community
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {admissionSteps.map((step) => (
              <Card key={step.step} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{step.step}</span>
                  </div>
                  <CardTitle className="text-lg text-slate-900 dark:text-white">
                    {step.title}
                  </CardTitle>
                  <Badge variant="secondary" className="w-fit mx-auto bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {step.timeline}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
                    {step.description}
                  </p>
                  <div>
                    <h4 className="font-semibold mb-2 text-sm text-slate-900 dark:text-white">Requirements:</h4>
                    <ul className="space-y-1">
                      {step.requirements.map((req, index) => (
                        <li key={index} className="text-xs text-slate-600 dark:text-slate-400 flex items-start space-x-2">
                          <CheckCircle className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Important Dates */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 text-center">
            Important Dates
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 text-center max-w-2xl mx-auto mb-8">
            Stay on track with key admission deadlines and events for the 2024-2025 academic year
          </p>
          
          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              {importantDates.map((item, index) => (
                <Card key={index} className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 ${item.status === 'completed' ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                        item.status === 'completed' 
                          ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' 
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                      }`}>
                        {item.status === 'completed' ? (
                          <CheckCircle className="h-6 w-6" />
                        ) : (
                          <Calendar className="h-6 w-6" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{item.event}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{item.date}</p>
                      </div>
                    </div>
                    <Badge variant={item.status === 'completed' ? 'secondary' : 'default'} 
                           className={item.status === 'completed' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'}>
                      {item.status === 'completed' ? 'Completed' : 'Upcoming'}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Tuition & Fees */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 text-center">
            Tuition & Fees
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 text-center max-w-2xl mx-auto mb-8">
            Transparent pricing for quality education. Financial aid and payment plans are available
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {tuitionFees.map((fee, index) => (
              <Card key={index} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center p-6 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-lg text-slate-900 dark:text-white">{fee.grade}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
                      <span>Annual Tuition:</span>
                      <span className="font-semibold">{fee.tuition}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
                      <span>Fees & Materials:</span>
                      <span className="font-semibold">{fee.fees}</span>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-2">
                      <div className="flex justify-between font-bold text-blue-600 dark:text-blue-400">
                        <span>Total Annual Cost:</span>
                        <span>{fee.total}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Financial aid is available for qualifying families. Payment plans and sibling discounts also offered.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" className="flex items-center space-x-2 border-slate-300 dark:border-slate-600">
                <Download className="h-4 w-4" />
                <span>Download Fee Schedule</span>
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2">
                <span>Apply for Financial Aid</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Application Form */}
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-8 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Start Your Application
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Ready to join our community? Complete this form to begin your admission journey
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-8">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="studentFirstName" className="text-slate-900 dark:text-white">Student First Name *</Label>
                    <Input id="studentFirstName" placeholder="Enter first name" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                  </div>
                  <div>
                    <Label htmlFor="studentLastName" className="text-slate-900 dark:text-white">Student Last Name *</Label>
                    <Input id="studentLastName" placeholder="Enter last name" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dateOfBirth" className="text-slate-900 dark:text-white">Date of Birth *</Label>
                    <Input id="dateOfBirth" type="date" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                  </div>
                  <div>
                    <Label htmlFor="gradeApplying" className="text-slate-900 dark:text-white">Grade Applying For *</Label>
                    <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                      <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="k">Kindergarten</SelectItem>
                        <SelectItem value="1">Grade 1</SelectItem>
                        <SelectItem value="2">Grade 2</SelectItem>
                        <SelectItem value="3">Grade 3</SelectItem>
                        <SelectItem value="4">Grade 4</SelectItem>
                        <SelectItem value="5">Grade 5</SelectItem>
                        <SelectItem value="6">Grade 6</SelectItem>
                        <SelectItem value="7">Grade 7</SelectItem>
                        <SelectItem value="8">Grade 8</SelectItem>
                        <SelectItem value="9">Grade 9</SelectItem>
                        <SelectItem value="10">Grade 10</SelectItem>
                        <SelectItem value="11">Grade 11</SelectItem>
                        <SelectItem value="12">Grade 12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="parentFirstName" className="text-slate-900 dark:text-white">Parent/Guardian First Name *</Label>
                    <Input id="parentFirstName" placeholder="Enter first name" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                  </div>
                  <div>
                    <Label htmlFor="parentLastName" className="text-slate-900 dark:text-white">Parent/Guardian Last Name *</Label>
                    <Input id="parentLastName" placeholder="Enter last name" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email" className="text-slate-900 dark:text-white">Email Address *</Label>
                    <Input id="email" type="email" placeholder="Enter email address" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-slate-900 dark:text-white">Phone Number *</Label>
                    <Input id="phone" type="tel" placeholder="Enter phone number" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="currentSchool" className="text-slate-900 dark:text-white">Current School</Label>
                  <Input id="currentSchool" placeholder="Enter current school name" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                </div>
                
                <div>
                  <Label htmlFor="interests" className="text-slate-900 dark:text-white">Student Interests & Activities</Label>
                  <Textarea 
                    id="interests" 
                    placeholder="Tell us about your child's interests, hobbies, and extracurricular activities..."
                    rows={4}
                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                  />
                </div>
                
                <div>
                  <Label htmlFor="whyApplying" className="text-slate-900 dark:text-white">Why are you interested in Chongwe Secondary School?</Label>
                  <Textarea 
                    id="whyApplying" 
                    placeholder="Share what attracts you to our school and what you hope your child will gain from the experience..."
                    rows={4}
                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                  />
                </div>
                
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center bg-slate-50 dark:bg-slate-800">
                  <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">Upload Required Documents</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Please upload academic transcripts, birth certificate, and immunization records
                  </p>
                  <Button variant="outline" className="border-slate-300 dark:border-slate-600">
                    Choose Files
                  </Button>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                    Submit Application
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" type="button" className="flex-1 border-slate-300 dark:border-slate-600">
                    Save as Draft
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>

        {/* Contact Information */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Questions About Admissions?
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
            Our admissions team is here to help you through every step of the process
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center p-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">Call Us</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Speak directly with our admissions team
              </p>
              <a href="tel:+260971234567" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                +260 97 123 4567
              </a>
            </Card>
            
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center p-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">Email Us</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Send us your questions anytime
              </p>
              <a href="mailto:admissions@chongwesecondary.edu.zm" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                admissions@chongwesecondary.edu.zm
              </a>
            </Card>
            
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center p-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">Schedule a Visit</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Tour our campus and meet our team
              </p>
              <Button variant="outline" size="sm" className="border-slate-300 dark:border-slate-600">
                Book a Tour
              </Button>
            </Card>
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
                <span className="text-xl font-bold">Chongwe Secondary School</span>
              </div>
              <p className="text-slate-400 text-sm">Excellence in Education Since 1995</p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Admissions</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Application Process</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tuition & Fees</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Financial Aid</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Campus Tours</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to={`/school/${schoolId}`} className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to={`/school/${schoolId}/faculty`} className="hover:text-white transition-colors">Faculty</Link></li>
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
                  <span>info@chongwesecondary.edu.zm</span>
                </div>
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <div>
                    <div>Plot 123 Education Road</div>
                    <div>Chongwe, Lusaka Province</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-8 pt-8 text-center">
            <p className="text-slate-400 text-sm">
              &copy; 2024 Chongwe Secondary School. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}