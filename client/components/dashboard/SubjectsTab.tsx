import React, { useState, useEffect } from 'react';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Api, Subject, SubjectFormData } from '@shared/api';
import { useAuth } from '@/lib/auth';

const SUBJECT_CATEGORIES = [
  { value: 'core', label: 'Core Subject', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'elective', label: 'Elective', color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'vocational', label: 'Vocational', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'extracurricular', label: 'Extracurricular', color: 'bg-orange-50 text-orange-700 border-orange-200' }
];

export default function SubjectsTab() {
  const { session } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const fetchedSubjects = await Api.listSubjects({ schoolId: session?.schoolId });
      setSubjects(fetchedSubjects);
    } catch (error) {
      console.error("Failed to fetch subjects", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdateSubject = async (formData: SubjectFormData) => {
    try {
      if (editingSubject) {
        await Api.updateSubject(editingSubject.id, formData);
      } else {
        await Api.createSubject({ ...formData, schoolId: session?.schoolId });
      }
      fetchSubjects();
      setIsModalOpen(false);
      setEditingSubject(null);
    } catch (error) {
      console.error("Failed to save subject", error);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      await Api.deleteSubject(id);
      fetchSubjects();
    } catch (error) {
      console.error("Failed to delete subject", error);
    }
  };

  const openModal = (subject: Subject | null = null) => {
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = 
      subject.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.subjectCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || subject.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

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
              {subjects.filter(s => s.isActive).length} active subjects
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
            <Button onClick={() => openModal()}>
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
                <TableHead>Credits</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
              ) : (
                filteredSubjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{subject.subjectName}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {subject.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {subject.subjectCode}
                      </code>
                    </TableCell>
                    <TableCell>{getCategoryBadge(subject.category)}</TableCell>
                    <TableCell>{subject.credits}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openModal(subject)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSubject(subject.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SubjectFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSubject(null);
        }}
        onSubmit={handleAddOrUpdateSubject}
        initialData={editingSubject}
      />
    </div>
  );
}

function SubjectFormModal({ isOpen, onClose, onSubmit, initialData }) {
  const [formData, setFormData] = useState<SubjectFormData>({
    subjectName: '',
    subjectCode: '',
    description: '',
    category: 'core',
    credits: 0,
    ...initialData,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        subjectName: initialData.subjectName || '',
        subjectCode: initialData.subjectCode || '',
        description: initialData.description || '',
        category: initialData.category || 'core',
        credits: initialData.credits || 0,
      });
    } else {
      setFormData({
        subjectName: '',
        subjectCode: '',
        description: '',
        category: 'core',
        credits: 0,
      });
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
          <DialogDescription>
            Fill in the details for the subject.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="subjectName">Subject Name</Label>
            <Input id="subjectName" value={formData.subjectName} onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="subjectCode">Subject Code</Label>
            <Input id="subjectCode" value={formData.subjectCode} onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
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
          <div>
            <Label htmlFor="credits">Credits</Label>
            <Input id="credits" type="number" value={formData.credits} onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value, 10) })} />
          </div>
          <Button type="submit">Save Subject</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}