import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreHorizontal, Users, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Api, Class, ClassFormData } from '@shared/api';
import { useAuth } from '@/lib/auth';

export default function ClassesTab() {
  const { session } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const fetchedClasses = await Api.listClasses({ schoolId: session?.schoolId });
      setClasses(fetchedClasses);
    } catch (error) {
      console.error("Failed to fetch classes", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdateClass = async (formData: ClassFormData) => {
    try {
      if (editingClass) {
        await Api.updateClass(editingClass.id, formData);
      } else {
        await Api.createClass({ ...formData, schoolId: session?.schoolId });
      }
      fetchClasses();
      setIsModalOpen(false);
      setEditingClass(null);
    } catch (error) {
      console.error("Failed to save class", error);
    }
  };

  const handleDeleteClass = async (id: string) => {
    try {
      await Api.deleteClass(id);
      fetchClasses();
    } catch (error) {
      console.error("Failed to delete class", error);
    }
  };

  const openModal = (cls: Class | null = null) => {
    setEditingClass(cls);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Classes Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all grades
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {classes.reduce((sum, cls) => sum + (cls.currentEnrollment || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Enrolled in all classes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Class Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {classes.length > 0 ? Math.round(classes.reduce((sum, cls) => sum + (cls.currentEnrollment || 0), 0) / classes.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Students per class
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Classes Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Classes</CardTitle>
              <CardDescription>Manage school classes and sections</CardDescription>
            </div>
            <Button onClick={() => openModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Class
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Class Teacher</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
              ) : (
                classes.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.className}</TableCell>
                    <TableCell>Grade {cls.gradeLevel}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {cls.currentEnrollment}
                      </div>
                    </TableCell>
                    <TableCell>{cls.teacherName || 'N/A'}</TableCell>
                    <TableCell>{cls.roomNumber || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cls.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}>
                        {cls.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openModal(cls)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClass(cls.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ClassFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClass(null);
        }}
        onSubmit={handleAddOrUpdateClass}
        initialData={editingClass}
      />
    </div>
  );
}

function ClassFormModal({ isOpen, onClose, onSubmit, initialData }) {
  const [formData, setFormData] = useState<ClassFormData>({
    className: '',
    gradeLevel: '',
    section: '',
    teacherId: '',
    roomNumber: '',
    capacity: 0,
    academicYear: new Date().getFullYear().toString(),
    ...initialData,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        className: initialData.className || '',
        gradeLevel: initialData.gradeLevel || '',
        section: initialData.section || '',
        teacherId: initialData.teacherId || '',
        roomNumber: initialData.roomNumber || '',
        capacity: initialData.capacity || 0,
        academicYear: initialData.academicYear || new Date().getFullYear().toString(),
      });
    } else {
      setFormData({
        className: '',
        gradeLevel: '',
        section: '',
        teacherId: '',
        roomNumber: '',
        capacity: 0,
        academicYear: new Date().getFullYear().toString(),
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
          <DialogTitle>{initialData ? 'Edit Class' : 'Add New Class'}</DialogTitle>
          <DialogDescription>
            Fill in the details for the class.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="className">Class Name</Label>
            <Input id="className" value={formData.className} onChange={(e) => setFormData({ ...formData, className: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="gradeLevel">Grade Level</Label>
            <Input id="gradeLevel" value={formData.gradeLevel} onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="section">Section</Label>
            <Input id="section" value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="roomNumber">Room Number</Label>
            <Input id="roomNumber" value={formData.roomNumber} onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="capacity">Capacity</Label>
            <Input id="capacity" type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) })} />
          </div>
          <Button type="submit">Save Class</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
