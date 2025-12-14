import React from 'react';
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
import { Plus, MoreHorizontal, Users } from 'lucide-react';

// Mock data for classes
const mockClasses = [
  {
    id: '1',
    name: '9A',
    grade: '9',
    students: 32,
    teacher: 'Mr. Johnson',
    room: 'Room 101',
    schedule: 'Mon-Fri, 8:00-15:00',
    status: 'active'
  },
  {
    id: '2',
    name: '9B',
    grade: '9',
    students: 30,
    teacher: 'Mrs. Smith',
    room: 'Room 102',
    schedule: 'Mon-Fri, 8:00-15:00',
    status: 'active'
  },
  {
    id: '3',
    name: '10A',
    grade: '10',
    students: 28,
    teacher: 'Mr. Williams',
    room: 'Room 201',
    schedule: 'Mon-Fri, 8:00-15:00',
    status: 'active'
  },
  {
    id: '4',
    name: '10B',
    grade: '10',
    students: 29,
    teacher: 'Ms. Davis',
    room: 'Room 202',
    schedule: 'Mon-Fri, 8:00-15:00',
    status: 'active'
  },
  {
    id: '5',
    name: '11A',
    grade: '11',
    students: 25,
    teacher: 'Mr. Brown',
    room: 'Room 301',
    schedule: 'Mon-Fri, 8:00-15:00',
    status: 'active'
  }
];

export default function ClassesTab() {
  return (
    <div className="space-y-6">
      {/* Classes Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockClasses.length}</div>
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
              {mockClasses.reduce((sum, cls) => sum + cls.students, 0)}
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
              {Math.round(mockClasses.reduce((sum, cls) => sum + cls.students, 0) / mockClasses.length)}
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
            <Button>
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
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockClasses.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="font-medium">{cls.name}</TableCell>
                  <TableCell>Grade {cls.grade}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {cls.students}
                    </div>
                  </TableCell>
                  <TableCell>{cls.teacher}</TableCell>
                  <TableCell>{cls.room}</TableCell>
                  <TableCell>{cls.schedule}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {cls.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
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