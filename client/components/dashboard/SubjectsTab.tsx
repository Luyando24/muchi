import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Users, 
  GraduationCap,
  MoreHorizontal
} from 'lucide-react';

// Mock data
const SUBJECT_CATEGORIES = [
  { value: 'core', label: 'Core Subject', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'elective', label: 'Elective', color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'vocational', label: 'Vocational', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'extracurricular', label: 'Extracurricular', color: 'bg-orange-50 text-orange-700 border-orange-200' }
];

const SUBJECT_LEVELS = [
  { value: 'primary', label: 'Primary Level' },
  { value: 'secondary', label: 'Secondary Level' },
  { value: 'both', label: 'Both Levels' }
];

const MOCK_SUBJECTS = [
  {
    id: '1',
    name: 'Mathematics',
    code: 'MATH001',
    description: 'Core mathematics curriculum covering arithmetic, algebra, and geometry',
    category: 'core',
    level: 'both',
    credits: 4,
    status: 'active',
    teacherCount: 12,
    studentCount: 450,
    classCount: 18
  },
  {
    id: '2',
    name: 'English Language',
    code: 'ENG001',
    description: 'English language and literature studies',
    category: 'core',
    level: 'both',
    credits: 4,
    status: 'active',
    teacherCount: 8,
    studentCount: 420,
    classCount: 16
  },
  {
    id: '3',
    name: 'Computer Science',
    code: 'CS001',
    description: 'Introduction to computer science and programming',
    category: 'elective',
    level: 'secondary',
    credits: 3,
    status: 'active',
    teacherCount: 4,
    studentCount: 180,
    classCount: 6
  },
  {
    id: '4',
    name: 'Physical Education',
    code: 'PE001',
    description: 'Physical fitness and sports activities',
    category: 'core',
    level: 'both',
    credits: 2,
    status: 'active',
    teacherCount: 6,
    studentCount: 400,
    classCount: 16
  },
  {
    id: '5',
    name: 'Art & Design',
    code: 'ART001',
    description: 'Creative arts and design principles',
    category: 'elective',
    level: 'both',
    credits: 2,
    status: 'active',
    teacherCount: 3,
    studentCount: 120,
    classCount: 5
  }
];

export default function SubjectsTab() {
  const [subjects] = useState(MOCK_SUBJECTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Filter subjects based on search term and category
  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = 
      subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || subject.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Helper function to get category badge
  const getCategoryBadge = (category: string) => {
    const categoryInfo = SUBJECT_CATEGORIES.find(c => c.value === category);
    return (
      <Badge variant="outline" className={categoryInfo?.color}>
        {categoryInfo?.label || category}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subjects.length}</div>
            <p className="text-xs text-muted-foreground">
              {subjects.filter(s => s.status === 'active').length} active subjects
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subjects.reduce((sum, s) => sum + s.teacherCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all subjects
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subjects.reduce((sum, s) => sum + s.studentCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Enrolled in subjects
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Class Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(subjects.reduce((sum, s) => sum + s.studentCount, 0) / 
                subjects.reduce((sum, s) => sum + s.classCount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Students per class
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Subject Filters</CardTitle>
          <CardDescription>Filter and search subjects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {SUBJECT_CATEGORIES.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subjects Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subjects ({filteredSubjects.length})</CardTitle>
              <CardDescription>Manage academic subjects and curriculum</CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Teachers</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{subject.name}</div>
                      <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {subject.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {subject.code}
                    </code>
                  </TableCell>
                  <TableCell>{getCategoryBadge(subject.category)}</TableCell>
                  <TableCell>
                    {subject.level === 'primary' ? 'Primary' : 
                     subject.level === 'secondary' ? 'Secondary' : 'Both Levels'}
                  </TableCell>
                  <TableCell>{subject.credits}</TableCell>
                  <TableCell>{subject.teacherCount}</TableCell>
                  <TableCell>{subject.studentCount}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}