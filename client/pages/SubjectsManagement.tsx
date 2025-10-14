import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Users, 
  Calendar,
  Clock,
  Eye,
  GraduationCap,
  FileText,
  CheckCircle,
  XCircle
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  category: 'core' | 'elective' | 'vocational' | 'extracurricular';
  level: 'primary' | 'secondary' | 'both';
  credits: number;
  status: 'active' | 'inactive' | 'archived';
  teacherCount: number;
  studentCount: number;
  classCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface SubjectFormData {
  name: string;
  code: string;
  description: string;
  category: 'core' | 'elective' | 'vocational' | 'extracurricular';
  level: 'primary' | 'secondary' | 'both';
  credits: number;
}

const SUBJECT_CATEGORIES = [
  { value: 'core', label: 'Core Subject', color: 'bg-blue-100 text-blue-800' },
  { value: 'elective', label: 'Elective', color: 'bg-green-100 text-green-800' },
  { value: 'vocational', label: 'Vocational', color: 'bg-purple-100 text-purple-800' },
  { value: 'extracurricular', label: 'Extracurricular', color: 'bg-orange-100 text-orange-800' }
];

const SUBJECT_LEVELS = [
  { value: 'primary', label: 'Primary Level' },
  { value: 'secondary', label: 'Secondary Level' },
  { value: 'both', label: 'Both Levels' }
];

const MOCK_SUBJECTS: Subject[] = [
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
    classCount: 18,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:22:00Z',
    createdBy: 'Admin User'
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
    classCount: 16,
    createdAt: '2024-01-10T09:15:00Z',
    updatedAt: '2024-01-19T16:45:00Z',
    createdBy: 'Admin User'
  },
  {
    id: '3',
    name: 'Computer Science',
    code: 'CS001',
    description: 'Introduction to programming and computer systems',
    category: 'elective',
    level: 'secondary',
    credits: 3,
    status: 'active',
    teacherCount: 4,
    studentCount: 180,
    classCount: 8,
    createdAt: '2024-01-05T08:00:00Z',
    updatedAt: '2024-01-18T12:30:00Z',
    createdBy: 'Admin User'
  },
  {
    id: '4',
    name: 'Art & Design',
    code: 'ART001',
    description: 'Creative arts and design fundamentals',
    category: 'extracurricular',
    level: 'both',
    credits: 2,
    status: 'active',
    teacherCount: 3,
    studentCount: 95,
    classCount: 5,
    createdAt: '2024-01-08T11:20:00Z',
    updatedAt: '2024-01-17T09:15:00Z',
    createdBy: 'Admin User'
  }
];

export default function SubjectsManagement() {
  const [subjects, setSubjects] = useState<Subject[]>(MOCK_SUBJECTS);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>(MOCK_SUBJECTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState<SubjectFormData>({
    name: '',
    code: '',
    description: '',
    category: 'core',
    level: 'primary',
    credits: 1
  });

  // Filter subjects based on search and filters
  useEffect(() => {
    let filtered = subjects.filter(subject => {
      const matchesSearch = subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          subject.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = filterCategory === 'all' || subject.category === filterCategory;
      const matchesLevel = filterLevel === 'all' || subject.level === filterLevel;
      const matchesStatus = filterStatus === 'all' || subject.status === filterStatus;
      
      return matchesSearch && matchesCategory && matchesLevel && matchesStatus;
    });
    
    setFilteredSubjects(filtered);
  }, [subjects, searchTerm, filterCategory, filterLevel, filterStatus]);

  const handleCreateSubject = () => {
    const newSubject: Subject = {
      id: Date.now().toString(),
      ...formData,
      status: 'active',
      teacherCount: 0,
      studentCount: 0,
      classCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'Current User'
    };
    
    setSubjects([...subjects, newSubject]);
    setIsCreateDialogOpen(false);
    resetForm();
    toast.success('Subject created successfully');
  };

  const handleEditSubject = () => {
    if (!selectedSubject) return;
    
    const updatedSubjects = subjects.map(subject =>
      subject.id === selectedSubject.id
        ? { ...subject, ...formData, updatedAt: new Date().toISOString() }
        : subject
    );
    
    setSubjects(updatedSubjects);
    setIsEditDialogOpen(false);
    setSelectedSubject(null);
    resetForm();
    toast.success('Subject updated successfully');
  };

  const handleDeleteSubject = () => {
    if (!selectedSubject) return;
    
    setSubjects(subjects.filter(subject => subject.id !== selectedSubject.id));
    setIsDeleteDialogOpen(false);
    setSelectedSubject(null);
    toast.success('Subject deleted successfully');
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (subject: Subject) => {
    setSelectedSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code,
      description: subject.description,
      category: subject.category,
      level: subject.level,
      credits: subject.credits
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsViewDialogOpen(true);
  };

  const openDeleteDialog = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      category: 'core',
      level: 'primary',
      credits: 1
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', color: 'bg-green-100 text-green-800' },
      inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
      archived: { label: 'Archived', color: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getCategoryBadge = (category: string) => {
    const categoryConfig = SUBJECT_CATEGORIES.find(cat => cat.value === category);
    return <Badge className={categoryConfig?.color || 'bg-gray-100 text-gray-800'}>{categoryConfig?.label || category}</Badge>;
  };

  const getLevelBadge = (level: string) => {
    const levelConfig = SUBJECT_LEVELS.find(lvl => lvl.value === level);
    return <Badge variant="outline">{levelConfig?.label || level}</Badge>;
  };

  // Statistics cards data
  const totalSubjects = subjects.length;
  const activeSubjects = subjects.filter(s => s.status === 'active').length;
  const totalTeachers = subjects.reduce((sum, s) => sum + s.teacherCount, 0);
  const totalStudents = subjects.reduce((sum, s) => sum + s.studentCount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Subjects Management</h1>
            <p className="text-muted-foreground">
              Manage academic subjects, curriculum, and course offerings
            </p>
          </div>
          <Button onClick={openCreateDialog} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Subject
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSubjects}</div>
              <p className="text-xs text-muted-foreground">
                {activeSubjects} active subjects
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTeachers}</div>
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
              <div className="text-2xl font-bold">{totalStudents}</div>
              <p className="text-xs text-muted-foreground">
                Enrolled in subjects
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalSubjects > 0 ? Math.round((activeSubjects / totalSubjects) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Subject activation rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Subjects</CardTitle>
            <CardDescription>
              Manage and organize academic subjects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subjects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Category" />
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
                
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {SUBJECT_LEVELS.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subjects Table */}
        <Card>
          <CardContent className="p-0">
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell>{getLevelBadge(subject.level)}</TableCell>
                    <TableCell>{subject.credits}</TableCell>
                    <TableCell>{subject.teacherCount}</TableCell>
                    <TableCell>{subject.studentCount}</TableCell>
                    <TableCell>{getStatusBadge(subject.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openViewDialog(subject)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(subject)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(subject)}
                        >
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

        {/* Create Subject Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Subject</DialogTitle>
              <DialogDescription>
                Add a new subject to the curriculum
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Subject Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter subject name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Subject Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., MATH001"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter subject description"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value: any) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECT_CATEGORIES.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Select value={formData.level} onValueChange={(value: any) => setFormData({ ...formData, level: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECT_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="credits">Credits</Label>
                  <Input
                    id="credits"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSubject}>Create Subject</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Subject Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Subject</DialogTitle>
              <DialogDescription>
                Update subject information
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Subject Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter subject name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-code">Subject Code</Label>
                  <Input
                    id="edit-code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., MATH001"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter subject description"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Select value={formData.category} onValueChange={(value: any) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECT_CATEGORIES.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-level">Level</Label>
                  <Select value={formData.level} onValueChange={(value: any) => setFormData({ ...formData, level: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECT_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-credits">Credits</Label>
                  <Input
                    id="edit-credits"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSubject}>Update Subject</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Subject Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Subject Details</DialogTitle>
              <DialogDescription>
                View complete subject information
              </DialogDescription>
            </DialogHeader>
            {selectedSubject && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Subject Name</Label>
                    <p className="text-sm">{selectedSubject.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Subject Code</Label>
                    <p className="text-sm font-mono">{selectedSubject.code}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm">{selectedSubject.description}</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                    <div className="mt-1">{getCategoryBadge(selectedSubject.category)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Level</Label>
                    <div className="mt-1">{getLevelBadge(selectedSubject.level)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Credits</Label>
                    <p className="text-sm">{selectedSubject.credits}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Teachers</Label>
                    <p className="text-sm">{selectedSubject.teacherCount}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Students</Label>
                    <p className="text-sm">{selectedSubject.studentCount}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Classes</Label>
                    <p className="text-sm">{selectedSubject.classCount}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-sm">{new Date(selectedSubject.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-sm">{new Date(selectedSubject.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedSubject.status)}</div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the subject
                "{selectedSubject?.name}" and remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSubject}>
                Delete Subject
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}